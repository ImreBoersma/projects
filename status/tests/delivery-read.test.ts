import { describe, expect, test } from "bun:test";
import { buildDeliveryQuery, readDelivery } from "../src/delivery/read";
import type { Project } from "../src/types";

const now = new Date("2026-11-10T12:00:00Z");
const p = (id: string, repo: string): Project => ({ id, name: id, repo, status: "active" });
const env = { STATUS_READ_TOKEN: "own-token", STATUS_READ_TOKEN_HOB: "hob-token" };
const page = <T>(nodes: T[], next: string | null = null) => ({
  pageInfo: { hasNextPage: next !== null, endCursor: next },
  nodes,
});
const prNode = (merged: string, type = "Bot") => ({
  createdAt: "2026-11-01T00:00:00Z",
  mergedAt: merged,
  updatedAt: merged,
  author: type ? { __typename: type } : null,
});

// A fake GraphQL endpoint: `answer(query, token)` gives the `data` object or a status number.
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
    return new Response(JSON.stringify({ data: a }), { status: 200 });
  };
  return { fetch: fetch as unknown as typeof globalThis.fetch, calls };
}

describe("buildDeliveryQuery (FR-008)", () => {
  test("asks for times and the author type only, and the production environments", () => {
    const q = buildDeliveryQuery([{ repo: "ImreBoersma/one" }]);
    expect(q).toContain("createdAt mergedAt updatedAt author { __typename }");
    expect(q).toContain('deployments(environments: ["production", "Production", "github-pages"]');
    expect(q).not.toContain("Preview");
    for (const field of ["title", "headRefName", "body", "login"]) expect(q).not.toContain(field);
  });

  test("a next page uses after:, a null cursor leaves the part out", () => {
    const q = buildDeliveryQuery([{ repo: "a/b", prs: "C1", deploys: null }]);
    expect(q).toContain('after: "C1"');
    expect(q).not.toContain("deployments(");
  });
});

describe("readDelivery", () => {
  test("one query for each token; bot and deleted authors; the window", async () => {
    const { fetch, calls } = fake((_q, token) =>
      token === "own-token"
        ? {
            r0: {
              pullRequests: page([
                prNode("2026-11-09T00:00:00Z"),
                prNode("2026-11-08T00:00:00Z", "User"),
                prNode("2026-11-07T00:00:00Z", ""),
                prNode("2026-07-01T00:00:00Z"),
              ]),
              deployments: page([
                { createdAt: "2026-11-02T00:00:00Z" },
                { createdAt: "2026-07-01T00:00:00Z" },
              ]),
            },
            r1: { pullRequests: page([]), deployments: page([]) },
          }
        : { r0: { pullRequests: page([]), deployments: page([]) } },
    );
    const map = await readDelivery(
      [
        p("one", "ImreBoersma/one"),
        p("two", "ImreBoersma/two"),
        p("hob", "harmonieorkest-brummen/hob"),
      ],
      env,
      now,
      fetch,
    );
    expect(calls.map((c) => c.token).sort()).toEqual(["hob-token", "own-token"]);
    const one = map.get("one");
    if (one === "not-available" || !one) throw new Error("expected data");
    expect(one.prs.map((x) => x.bot)).toEqual([true, false, false]);
    expect(one.deploys).toEqual(["2026-11-02T00:00:00Z"]);
    expect(map.get("hob")).toEqual({ prs: [], deploys: [] });
    for (const c of calls) expect(c.query).not.toContain("own-token");
  });

  test("reads a next page only while the last node is in the window, at most 5 pages", async () => {
    let n = 0;
    const { fetch, calls } = fake(() => {
      n++;
      return {
        r0: {
          pullRequests: page([prNode("2026-11-09T00:00:00Z")], `C${n}`),
          deployments: page([], null),
        },
      };
    });
    const map = await readDelivery([p("one", "ImreBoersma/one")], env, now, fetch);
    expect(calls.length).toBe(5);
    expect(calls[1].query).toContain('after: "C1"');
    expect(calls[1].query).not.toContain("deployments(");
    const one = map.get("one");
    expect(one !== "not-available" && one?.prs.length).toBe(5);

    const old = fake(() => ({
      r0: { pullRequests: page([prNode("2026-07-01T00:00:00Z")], "C1"), deployments: page([]) },
    }));
    await readDelivery([p("one", "ImreBoersma/one")], env, now, old.fetch);
    expect(old.calls.length).toBe(1);
  });

  test("not available: no token, HTTP error, a null repository, a failed next page", async () => {
    const none = await readDelivery([p("x", "someone/x")], env, now, fake(() => ({})).fetch);
    expect(none.get("x")).toBe("not-available");
    const http = await readDelivery([p("one", "ImreBoersma/one")], env, now, fake(() => 502).fetch);
    expect(http.get("one")).toBe("not-available");
    const nul = await readDelivery(
      [p("one", "ImreBoersma/one")],
      env,
      now,
      fake(() => ({ r0: null })).fetch,
    );
    expect(nul.get("one")).toBe("not-available");
    let call = 0;
    const second = fake(() =>
      ++call === 1
        ? {
            r0: {
              pullRequests: page([prNode("2026-11-09T00:00:00Z")], "C1"),
              deployments: page([]),
            },
          }
        : 500,
    );
    expect(
      (await readDelivery([p("one", "ImreBoersma/one")], env, now, second.fetch)).get("one"),
    ).toBe("not-available");
  });
});
