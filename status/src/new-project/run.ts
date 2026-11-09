// Spec 011 contracts/command.md: `bun run new-project --id … --name … --repo … --visibility …
// --stack … --host … [--dry-run]`. Runs on the Maintainer's machine with the `gh` login; never in
// CI (FR-010). It never reads a secret value: the table gives the commands that ask for them.
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { parseArgs } from "node:util";
import { client } from "../campaign/github";
import { type Deps, OWNER, runNewProject, type Settings, TEMPLATE_COMMIT, validate } from "./steps";
import { type NewProject, templateFiles } from "./template";

const PROJECTS = `${OWNER}/projects`;

export function realDeps(token: string): Deps {
  const gh = client(token);
  const api = (method: string, path: string, body?: unknown) =>
    fetch(`https://api.github.com${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  const must = async (res: Promise<Response>, what: string) => {
    const r = await res;
    if (!r.ok) throw new Error(`${what}: HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
    return r;
  };
  const sh = async (args: string[], cwd: string) => {
    const p = Bun.spawn(args, { cwd, stdin: "ignore", stdout: "pipe", stderr: "pipe" });
    if ((await p.exited) !== 0)
      throw new Error(
        `${args.slice(0, 3).join(" ")}: ${(await new Response(p.stderr).text()).trim()}`,
      );
  };

  return {
    async login() {
      const user = await (await must(api("GET", "/user"), "read the login")).json();
      const repo = await (await must(api("GET", `/repos/${PROJECTS}`), "read projects")).json();
      return { user: user.login, projectsAdmin: repo.permissions?.admin === true };
    },
    async catalog() {
      const head = await gh.defaultHead(PROJECTS);
      const text = (await gh.readFiles(PROJECTS, head.sha, ["projects.yaml"])).get("projects.yaml");
      if (!text) throw new Error("projects.yaml is not on main.");
      return { text, sha: head.sha };
    },
    async repoCommits(repo) {
      const meta = await api("GET", `/repos/${repo}`);
      if (meta.status === 404) return null;
      const res = await api("GET", `/repos/${repo}/commits?per_page=100`);
      if (res.status === 409) return []; // an empty repo
      const list = (await (await must(Promise.resolve(res), "read the commits")).json()) as {
        commit: { message: string };
      }[];
      return list.map((c) => c.commit.message.split("\n")[0]);
    },
    async settings(repo): Promise<Settings> {
      const meta = await (await must(api("GET", `/repos/${repo}`), "read the repo")).json();
      const alerts = await api("GET", `/repos/${repo}/vulnerability-alerts`);
      const fixes = await api("GET", `/repos/${repo}/automated-security-fixes`);
      const pages = await api("GET", `/repos/${repo}/pages`);
      return {
        hasIssues: meta.has_issues === true,
        vulnerabilityAlerts: alerts.status === 204,
        securityFixes: fixes.ok ? (await fixes.json()).enabled === true : false,
        pages: pages.ok,
      };
    },
    async openCatalogPr(branch) {
      const pr = await gh.findPr(PROJECTS, branch);
      return pr?.state === "open" ? pr.number : null;
    },
    async makeRepo(input: NewProject) {
      const dir = await mkdtemp(join(tmpdir(), "new-project-"));
      try {
        for (const [path, text] of await templateFiles(input)) {
          await mkdir(dirname(join(dir, path)), { recursive: true });
          await Bun.write(join(dir, path), text);
        }
        await sh(["bun", "install"], dir);
        await sh(["git", "init", "-b", "main"], dir);
        await sh(["git", "add", "-A"], dir);
        await sh(["git", "commit", "-m", TEMPLATE_COMMIT], dir);
        await sh(
          [
            "gh",
            "repo",
            "create",
            `${OWNER}/${input.repo}`,
            `--${input.visibility}`,
            "--description",
            input.name,
            "--source",
            dir,
            "--push",
          ],
          dir,
        );
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
    async setSettings(repo, input, now) {
      if (!now.hasIssues)
        await must(api("PATCH", `/repos/${repo}`, { has_issues: true }), "turn on issues");
      if (!now.vulnerabilityAlerts)
        await must(
          api("PUT", `/repos/${repo}/vulnerability-alerts`),
          "turn on vulnerability alerts",
        );
      if (now.securityFixes)
        await must(
          api("DELETE", `/repos/${repo}/automated-security-fixes`),
          "turn off security updates",
        );
      if (input.host === "pages" && !now.pages)
        await must(
          api("POST", `/repos/${repo}/pages`, { build_type: "workflow" }),
          "turn on Pages",
        );
    },
    async openPr(branch, baseSha, text, title, body) {
      const sha = await gh.writeCommit(
        PROJECTS,
        baseSha,
        new Map([["projects.yaml", text]]),
        title,
      );
      await gh.setBranch(PROJECTS, branch, sha);
      return gh.openPr(PROJECTS, branch, "main", title, body);
    },
  };
}

if (import.meta.main) {
  try {
    const { values } = parseArgs({
      options: {
        id: { type: "string" },
        name: { type: "string" },
        repo: { type: "string" },
        visibility: { type: "string" },
        stack: { type: "string" },
        host: { type: "string" },
        "dry-run": { type: "boolean", default: false },
      },
    });
    const input = validate(values);
    for (const tool of ["git", "gh"])
      if (!Bun.which(tool)) throw new Error(`${tool} is not installed.`);
    const token = (await Bun.$`gh auth token`.text()).trim();
    const code = await runNewProject(
      input,
      realDeps(token),
      { dryRun: values["dry-run"] === true },
      console.log,
    );
    process.exit(code);
  } catch (e) {
    console.error((e as Error).message);
    process.exit(1);
  }
}
