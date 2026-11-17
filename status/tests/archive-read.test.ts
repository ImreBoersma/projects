import { describe, expect, test } from "bun:test";
import { buildArchiveQuery, readArchive } from "../src/archive/read";
import type { Project } from "../src/types";

const p = (id: string, repo: string): Project => ({ id, name: id, repo, status: "active" });
const env = { STATUS_READ_TOKEN: "own-token", STATUS_READ_TOKEN_HOB: "hob-token" };
const labels = (names: string[] = []) => ({ nodes: names.map((name) => ({ name })) });
const botCommit = (date: string) => ({
  committedDate: date,
  author: { user: { login: "renovate[bot]" } },
  associatedPullRequests: { nodes: [{ author: { __typename: "Bot" }, labels: labels() }] },
});
const personCommit = (date: string) => ({
  committedDate: date,
  author: { user: { login: "someone" } },
  associatedPullRequests: { nodes: [] },
});
const history = (nodes: unknown[], next: string | null = null) => ({
  defaultBranchRef: {
    target: { history: { pageInfo: { hasNextPage: next !== null, endCursor: next }, nodes } },
  },
});
const item = (type: string, createdAt = "2026-01-01T00:00:00Z", names: string[] = []) => ({
  createdAt,
  author: { __typename: type },
  labels: labels(names),
});
const repo = (over: Record<string, unknown> = {}) => ({
  createdAt: "2024-01-01T00:00:00Z",
  ...history([botCommit("2026-11-10T00:00:00Z"), personCommit("2026-03-01T00:00:00Z")]),
  pullRequests: { nodes: [item("Bot")] },
  issues: { nodes: [] },
  openPrs: { pageInfo: { hasNextPage: false }, nodes: [item("Bot")] },
  openIssues: { pageInfo: { hasNextPage: false }, nodes: [] },
  ...over,
});

// A fake GraphQL endpoint: `answer(query, token)` gives the body object or a status number.
function fake(answer: (query: string, token: string) => unknown) {
  const calls: { query: string; token: string; init?: RequestInit }[] = [];
  const fetch = async (_url: string, init?: RequestInit) => {
    const token = String(
      (init?.headers as Record<string, string> | undefined)?.Authorization,
    ).replace("Bearer ", "");
    const query = JSON.parse(String(init?.body)).query as string;
    calls.push({ query, token, init });
    const a = answer(query, token);
    if (typeof a === "number") return new Response(null, { status: a });
    return new Response(JSON.stringify(a), { status: 200 });
  };
  return { fetch: fetch as unknown as typeof globalThis.fetch, calls };
}

describe("buildArchiveQuery (research §2, FR-009)", () => {
  test("asks for dates, author types and labels only", () => {
    const q = buildArchiveQuery([{ repo: "ImreBoersma/one" }]);
    for (const part of [
      "createdAt",
      "history(first: 100)",
      "committedDate author { user { login } }",
      "associatedPullRequests(first: 1) { nodes { author { __typename } labels(first: 10) { nodes { name } } } }",
      "pullRequests(first: 20, orderBy: { field: CREATED_AT, direction: DESC })",
      "issues(first: 20, orderBy: { field: CREATED_AT, direction: DESC })",
      "openPrs: pullRequests(states: OPEN, first: 50) { pageInfo { hasNextPage }",
      "openIssues: issues(states: OPEN, first: 50) { pageInfo { hasNextPage }",
    ]) {
      expect(q).toContain(part);
    }
    for (const field of ["title", "body", "message", "headRefName"]) expect(q).not.toContain(field);
  });

  test("a next page asks only for the commits, with after:", () => {
    const q = buildArchiveQuery([{ repo: "a/b", after: "C1" }]);
    expect(q).toContain('history(first: 100, after: "C1")');
    expect(q).not.toContain("pullRequests(");
  });
});

describe("readArchive", () => {
  test("one query for each repo, with the token of its owner; the person commit after a bot commit", async () => {
    const { fetch, calls } = fake((_q, token) => ({
      data: { r0: repo(token === "hob-token" ? { createdAt: "2025-01-01T00:00:00Z" } : {}) },
    }));
    const result = await readArchive(
      [p("one", "ImreBoersma/one"), p("hob", "harmonieorkest-brummen/hob-nl"), p("none", "")],
      env,
      fetch,
    );
    expect(calls.map((c) => c.token).sort()).toEqual(["hob-token", "own-token"]);
    expect(result.get("one")).toEqual({
      createdAt: "2024-01-01T00:00:00Z",
      lastPersonCommit: "2026-03-01T00:00:00Z",
      oldestCommitRead: "2026-03-01T00:00:00Z",
      historyComplete: true,
      lastPersonPr: null,
      lastPersonIssue: null,
      openPersonWork: false,
      listsComplete: true,
      notSureReason: null,
    });
    expect(result.has("none")).toBe(false);
    // The token is only in the Authorization header.
    for (const c of calls) expect(c.query).not.toContain(c.token);
  });

  test("reads next commit pages only while no person commit is found, at most 5", async () => {
    const { fetch, calls } = fake((q) => ({
      data: {
        r0: q.includes("after:")
          ? history([botCommit("2025-01-01T00:00:00Z")], "N")
          : repo(history([botCommit("2026-11-10T00:00:00Z")], "N")),
      },
    }));
    const raw = (await readArchive([p("one", "ImreBoersma/one")], env, fetch)).get("one");
    expect(calls).toHaveLength(5);
    expect(raw).toMatchObject({
      lastPersonCommit: null,
      oldestCommitRead: "2025-01-01T00:00:00Z",
      historyComplete: false,
    });
    const found = fake(() => ({
      data: { r0: repo(history([personCommit("2026-11-01T00:00:00Z")], "N")) },
    }));
    await readArchive([p("one", "ImreBoersma/one")], env, found.fetch);
    expect(found.calls).toHaveLength(1);
  });

  test("open work, campaign PRs and lists that are not complete", async () => {
    const read = async (over: Record<string, unknown>) =>
      (
        await readArchive(
          [p("one", "ImreBoersma/one")],
          env,
          fake(() => ({ data: { r0: repo(over) } })).fetch,
        )
      ).get("one");
    // An old open PR by a person that is not in the newest 20 is still open work.
    expect(
      await read({
        pullRequests: { nodes: Array.from({ length: 20 }, () => item("Bot")).concat() },
        openPrs: {
          pageInfo: { hasNextPage: false },
          nodes: [item("User", "2023-01-01T00:00:00Z")],
        },
      }),
    ).toMatchObject({ openPersonWork: true });
    expect(
      await read({
        openPrs: {
          pageInfo: { hasNextPage: false },
          nodes: [item("User", undefined, ["campaign"])],
        },
      }),
    ).toMatchObject({ openPersonWork: false });
    expect(
      await read({ openIssues: { pageInfo: { hasNextPage: false }, nodes: [item("User")] } }),
    ).toMatchObject({ openPersonWork: true });
    // 20 newest issues without a person, or an open list with a next page: not sure. 20 bot PRs
    // are complete: a merged person PR is also a person commit (pretband-backend, 2026-11-16).
    expect(
      await read({ issues: { nodes: Array.from({ length: 20 }, () => item("Bot")) } }),
    ).toMatchObject({ listsComplete: false, notSureReason: "lists" });
    expect(
      await read({ pullRequests: { nodes: Array.from({ length: 20 }, () => item("Bot")) } }),
    ).toMatchObject({ lastPersonPr: null, listsComplete: true });
    expect(
      await read({ openIssues: { pageInfo: { hasNextPage: true }, nodes: [] } }),
    ).toMatchObject({ listsComplete: false, notSureReason: "lists" });
    // The newest PR by a person, not a campaign PR.
    expect(
      await read({
        pullRequests: {
          nodes: [
            item("User", "2026-10-01T00:00:00Z", ["campaign"]),
            item("User", "2026-02-01T00:00:00Z"),
          ],
        },
      }),
    ).toMatchObject({ lastPersonPr: "2026-02-01T00:00:00Z", listsComplete: true });
  });

  test("no Issues permission: no issue data, not 'not available'", async () => {
    const { fetch } = fake(() => ({
      data: { r0: repo({ issues: null, openIssues: null }) },
      errors: [{ type: "FORBIDDEN", message: "Resource not accessible by personal access token" }],
    }));
    expect((await readArchive([p("one", "ImreBoersma/one")], env, fetch)).get("one")).toMatchObject(
      { lastPersonIssue: null, listsComplete: false, notSureReason: "no-issue-data" },
    );
  });

  test("an empty repo has a complete history without commits", async () => {
    const { fetch } = fake(() => ({ data: { r0: repo({ defaultBranchRef: null }) } }));
    expect((await readArchive([p("one", "ImreBoersma/one")], env, fetch)).get("one")).toMatchObject(
      { lastPersonCommit: null, oldestCommitRead: null, historyComplete: true },
    );
  });

  test("no token, an HTTP error, a null repository or a failed next page: not available", async () => {
    expect(
      (await readArchive([p("one", "ImreBoersma/one")], {}, fake(() => ({})).fetch)).get("one"),
    ).toBe("not-available");
    expect(
      (await readArchive([p("one", "ImreBoersma/one")], env, fake(() => 502).fetch)).get("one"),
    ).toBe("not-available");
    expect(
      (
        await readArchive(
          [p("one", "ImreBoersma/one")],
          env,
          fake(() => ({ data: { r0: null } })).fetch,
        )
      ).get("one"),
    ).toBe("not-available");
    const next = fake((q) =>
      q.includes("after:")
        ? 502
        : { data: { r0: repo(history([botCommit("2026-01-01T00:00:00Z")], "N")) } },
    );
    expect((await readArchive([p("one", "ImreBoersma/one")], env, next.fetch)).get("one")).toBe(
      "not-available",
    );
  });
});
