import { describe, expect, test } from "bun:test";
import { client } from "../src/campaign/github";
import { diff, prBody, runCampaign } from "../src/campaign/run";
import type { Campaign } from "../src/types";

const campaign: Campaign = {
  id: "node-24",
  title: "chore: use Node 24",
  reason: "Node 22 leaves active support.",
  started: "2026-11-10",
  repos: "all",
  changes: [{ kind: "replace", path: ".nvmrc", old: "22", new: "24" }],
};
const targets = [
  { id: "a", repo: "ImreBoersma/a" }, // needs the change, no PR
  { id: "b", repo: "ImreBoersma/b" }, // needs the change, open PR #5
  { id: "c", repo: "ImreBoersma/c" }, // already has the change
  { id: "d", repo: "org/d" }, // no access
];

// A fake GitHub API: records each call, answers by repo.
function fakeGitHub(handFix = false, upToDate = false) {
  const calls: string[] = [];
  const fetch = (async (url: string, init: RequestInit = {}) => {
    const method = init.method ?? "GET";
    const path = url.replace("https://api.github.com", "");
    calls.push(`${method} ${path}`);
    const repo = path.split("/").slice(2, 4).join("/");
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
    if (repo === "org/d") return json({}, 404);
    if (path === `/repos/${repo}`) return json({ default_branch: "main" });
    if (path.endsWith("/git/ref/heads/main")) return json({ object: { sha: "base" } });
    if (path.includes("/contents/.nvmrc?ref=campaign/"))
      return new Response(upToDate ? "24\n" : "22\n");
    if (path.includes("/contents/.nvmrc"))
      return new Response(repo.endsWith("/c") ? "24\n" : "22\n");
    if (path.includes("/pulls?head="))
      return json(repo.endsWith("/b") ? [{ number: 5, state: "open", merged_at: null }] : []);
    if (path.includes("/compare/main...campaign/"))
      return json({
        ahead_by: handFix ? 2 : 1,
        commits: [{ commit: { message: "chore: use Node 24" } }],
      });
    if (path.endsWith("/git/commits/base")) return json({ tree: { sha: "tree0" } });
    if (path.endsWith("/git/trees")) return json({ sha: "tree1" });
    if (path.endsWith("/git/commits")) return json({ sha: "commit1" });
    if (method === "PATCH" && path.includes("/git/refs/heads/"))
      return json({}, repo.endsWith("/a") ? 422 : 200);
    if (method === "POST" && path.endsWith("/git/refs")) return json({});
    if (method === "POST" && path.endsWith("/pulls")) return json({ number: 9 });
    if (path.endsWith("/labels/campaign")) return json({}, 404);
    return json({});
  }) as unknown as typeof globalThis.fetch;
  return { calls, gh: client("token", fetch) };
}

describe("runCampaign (US1)", () => {
  test("opens, updates, skips and goes on after a repo without access", async () => {
    const { calls, gh } = fakeGitHub();
    const lines: string[] = [];
    const results = await runCampaign(campaign, targets, gh, { dryRun: false, reopen: null }, (l) =>
      lines.push(l),
    );
    expect(results.get("ImreBoersma/a")).toEqual({ kind: "opened", pr: 9 });
    expect(results.get("ImreBoersma/b")).toEqual({ kind: "updated", pr: 5 });
    expect(results.get("ImreBoersma/c")).toEqual({ kind: "not-needed" });
    expect(results.get("org/d")).toEqual({ kind: "no-access" });
    expect(calls).toContain("POST /repos/ImreBoersma/a/git/refs");
    expect(calls).toContain("POST /repos/ImreBoersma/a/pulls");
    expect(calls).toContain("POST /repos/ImreBoersma/a/labels");
    expect(calls).toContain("PATCH /repos/ImreBoersma/b/git/refs/heads/campaign/node-24");
    expect(calls).not.toContain("POST /repos/ImreBoersma/b/pulls");
    expect(calls.filter((c) => c.includes("/ImreBoersma/c/") && !c.startsWith("GET"))).toEqual([]);
    expect(lines.map((l) => l.replace(/\s+/g, " "))).toEqual([
      "a opened #9",
      "b updated #5",
      "c not needed",
      "d no access",
    ]);
  });

  test("a dry run writes nothing and shows a diff", async () => {
    const { calls, gh } = fakeGitHub();
    const lines: string[] = [];
    await runCampaign(campaign, targets.slice(0, 2), gh, { dryRun: true, reopen: null }, (l) =>
      lines.push(l),
    );
    expect(calls.filter((c) => !c.startsWith("GET"))).toEqual([]);
    expect(lines.join("\n")).toContain("would open");
    expect(lines.join("\n")).toContain("would update #5");
    expect(lines.join("\n")).toContain("    - 22\n    + 24");
  });
});

describe("hand fixes (side note 2026-11-06)", () => {
  test("a branch with a commit that the command did not make is not overwritten", async () => {
    const { calls, gh } = fakeGitHub(true);
    const lines: string[] = [];
    const results = await runCampaign(
      campaign,
      [targets[1]],
      gh,
      { dryRun: false, reopen: null },
      (l) => lines.push(l),
    );
    expect(results.get("ImreBoersma/b")).toEqual({ kind: "changed-by-hand", pr: 5 });
    expect(calls.filter((c) => !c.startsWith("GET"))).toEqual([]);
    expect(lines[0]).toContain("--overwrite b");
  });

  test("--overwrite updates it anyway", async () => {
    const { calls, gh } = fakeGitHub(true);
    await runCampaign(
      campaign,
      [targets[1]],
      gh,
      { dryRun: false, reopen: null, overwrite: "b" },
      () => {},
    );
    expect(calls).toContain("PATCH /repos/ImreBoersma/b/git/refs/heads/campaign/node-24");
  });
});

describe("an open PR that is up to date", () => {
  test("no new commit, so no new CI run", async () => {
    const { calls, gh } = fakeGitHub(false, true);
    const lines: string[] = [];
    const results = await runCampaign(
      campaign,
      [targets[1]],
      gh,
      { dryRun: false, reopen: null },
      (l) => lines.push(l),
    );
    expect(results.get("ImreBoersma/b")).toEqual({ kind: "up-to-date", pr: 5 });
    expect(calls.filter((c) => !c.startsWith("GET"))).toEqual([]);
    expect(lines[0]).toContain("up to date #5");
  });
});

describe("helpers", () => {
  test("the PR body has the reason and the links", () => {
    const body = prBody(campaign);
    expect(body).toStartWith("Node 22 leaves active support.\n");
    expect(body).toContain("campaigns/node-24.yaml");
    expect(body).toContain("head%3Acampaign%2Fnode-24");
  });

  test("diff of a new file", () => {
    expect(diff("x", null, "a")).toBe("    --- x (new file)\n    + a");
  });
});
