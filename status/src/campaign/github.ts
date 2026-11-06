// Spec 015, research.md §1 and §4: the GitHub calls of the campaign command. Write calls run only
// on the Maintainer's machine with the `gh` login (FR-006).
import type { PrInfo } from "./plan";

export class NoAccess extends Error {}

export function client(token: string, fetch: typeof globalThis.fetch = globalThis.fetch) {
  const call = async (method: string, path: string, body?: unknown, raw = false) => {
    const res = await fetch(`https://api.github.com${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: raw ? "application/vnd.github.raw" : "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return res;
  };
  const json = async (method: string, path: string, body?: unknown) => {
    const res = await call(method, path, body);
    if (res.status === 403 || res.status === 404)
      throw new NoAccess(`${method} ${path}: HTTP ${res.status}`);
    if (!res.ok) throw new Error(`${method} ${path}: HTTP ${res.status}`);
    return res.status === 204 ? null : res.json();
  };

  return {
    async defaultHead(repo: string) {
      const meta = await json("GET", `/repos/${repo}`);
      const ref = await json("GET", `/repos/${repo}/git/ref/heads/${meta.default_branch}`);
      return { branch: meta.default_branch as string, sha: ref.object.sha as string };
    },
    async readFiles(repo: string, sha: string, paths: string[]) {
      const files = new Map<string, string | null>();
      for (const path of paths) {
        const res = await call(
          "GET",
          `/repos/${repo}/contents/${path}?ref=${sha}`,
          undefined,
          true,
        );
        if (res.status === 404) files.set(path, null);
        else if (res.ok) files.set(path, await res.text());
        else throw new Error(`read ${path}: HTTP ${res.status}`);
      }
      return files;
    },
    async findPr(repo: string, branch: string): Promise<PrInfo | null> {
      const owner = repo.split("/")[0];
      const list = (await json(
        "GET",
        `/repos/${repo}/pulls?head=${owner}:${branch}&state=all&sort=created&direction=desc&per_page=1`,
      )) as { number: number; state: string; merged_at: string | null }[];
      const pr = list[0];
      if (!pr) return null;
      return {
        number: pr.number,
        state: pr.merged_at ? "merged" : (pr.state as "open" | "closed"),
      };
    },
    // True when the branch has only the one commit that the command makes (message = title).
    async branchIsOurs(repo: string, base: string, branch: string, title: string) {
      const cmp = await json("GET", `/repos/${repo}/compare/${base}...${branch}`);
      const commits = cmp.commits as { commit: { message: string } }[];
      return cmp.ahead_by === 1 && commits[0]?.commit.message === title;
    },
    async writeCommit(repo: string, baseSha: string, files: Map<string, string>, message: string) {
      const base = await json("GET", `/repos/${repo}/git/commits/${baseSha}`);
      const tree = await json("POST", `/repos/${repo}/git/trees`, {
        base_tree: base.tree.sha,
        tree: [...files].map(([path, content]) => ({
          path,
          mode: "100644",
          type: "blob",
          content,
        })),
      });
      const commit = await json("POST", `/repos/${repo}/git/commits`, {
        message,
        tree: tree.sha,
        parents: [baseSha],
      });
      return commit.sha as string;
    },
    async setBranch(repo: string, branch: string, sha: string) {
      const res = await call("PATCH", `/repos/${repo}/git/refs/heads/${branch}`, {
        sha,
        force: true,
      });
      if (res.ok) return;
      await json("POST", `/repos/${repo}/git/refs`, { ref: `refs/heads/${branch}`, sha });
    },
    async openPr(repo: string, branch: string, base: string, title: string, body: string) {
      const pr = await json("POST", `/repos/${repo}/pulls`, { head: branch, base, title, body });
      return pr.number as number;
    },
    async reopenPr(repo: string, number: number) {
      await json("PATCH", `/repos/${repo}/pulls/${number}`, { state: "open" });
    },
    // Research.md §4: make the label only in an own repo; never in a repo of another owner.
    async addLabel(repo: string, number: number, own: boolean) {
      const exists = (await call("GET", `/repos/${repo}/labels/campaign`)).ok;
      if (!exists && !own) return;
      if (!exists) {
        await json("POST", `/repos/${repo}/labels`, {
          name: "campaign",
          color: "6e7781",
          description: "A change for many repos (projects, spec 015)",
        });
      }
      await json("POST", `/repos/${repo}/issues/${number}/labels`, { labels: ["campaign"] });
    },
  };
}
