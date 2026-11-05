import { describe, expect, test } from "bun:test";
import { buildQuery, mapRepo, tokenFor } from "../src/github";
import type { Project } from "../src/types";
import fixture from "./fixtures/graphql-response.json";

const project = (id: string): Project => ({
  id,
  name: id,
  repo: `ImreBoersma/${id}`,
  status: "active",
});
const data = fixture.data as Record<string, unknown>;
const map = (alias: string) => mapRepo(data[alias] as never, project(alias));

describe("mapRepo", () => {
  test("maps CI states", () => {
    expect(map("r0").ci).toBe("passed");
    expect(map("r1").ci).toBe("failed");
    expect(map("r2").ci).toBe("unknown");
  });

  test.each([
    ["ERROR", "failed"],
    ["PENDING", "unknown"],
    ["EXPECTED", "unknown"],
  ])("maps CI state %s to %s", (state, expected) => {
    const node = {
      defaultBranchRef: {
        target: { committedDate: "2026-10-01T00:00:00Z", statusCheckRollup: { state } },
      },
      pullRequests: { totalCount: 0, nodes: [] },
      deployments: { nodes: [] },
    };
    expect(mapRepo(node, project("x")).ci).toBe(expected as never);
  });

  test("maps the production deployment", () => {
    expect(map("r0").deploy).toEqual({ at: new Date("2026-10-27T11:00:00Z"), result: "succeeded" });
    expect(map("r2").deploy).toEqual({ at: new Date("2026-06-01T11:00:00Z"), result: "failed" });
    expect(map("r1").deploy).toBe("unknown");
  });

  test.each([
    ["ERROR", "failed"],
    ["IN_PROGRESS", "in-progress"],
    ["QUEUED", "in-progress"],
  ])("maps deployment state %s to %s", (state, expected) => {
    const node = {
      defaultBranchRef: null,
      pullRequests: { totalCount: 0, nodes: [] },
      deployments: { nodes: [{ createdAt: "2026-10-01T00:00:00Z", latestStatus: { state } }] },
    };
    expect(mapRepo(node, project("x")).deploy).toMatchObject({ result: expected });
  });

  test("counts Renovate PRs by renovate and renovate[bot]", () => {
    const status = map("r1");
    expect(status.openPrCount).toBe(2);
    expect(status.renovatePrCount).toBe(2);
    expect(status.oldestRenovatePrAt).toEqual(new Date("2026-10-08T00:00:00Z"));
    expect(map("r0").renovatePrCount).toBe(0);
  });

  test("counts the PRs of a self-hosted Renovate app", () => {
    const logins = [
      "renovate",
      "renovate[bot]",
      "imreboersma-homelab-renovate",
      "imreboersma-homelab-renovate[bot]",
      "renovatefan",
      "some-person",
    ];
    const node = {
      defaultBranchRef: null,
      pullRequests: {
        totalCount: logins.length,
        nodes: logins.map((login) => ({ createdAt: "2026-10-01T00:00:00Z", author: { login } })),
      },
      deployments: { nodes: [] },
    };
    expect(mapRepo(node, project("x")).renovatePrCount).toBe(4);
  });

  test("keeps the commit id for the CI link (spec 007)", () => {
    expect(map("r0").commitOid).toBe("a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2");
    expect(map("r4").commitOid).toBeNull();
  });

  test("keeps the login of the Renovate app, without [bot] (spec 007)", () => {
    const node = (login: string) => ({
      defaultBranchRef: null,
      pullRequests: {
        totalCount: 1,
        nodes: [{ createdAt: "2026-10-01T00:00:00Z", author: { login } }],
      },
      deployments: { nodes: [] },
    });
    expect(mapRepo(node("renovate[bot]"), project("x")).renovateApp).toBe("renovate");
    expect(mapRepo(node("imreboersma-homelab-renovate"), project("x")).renovateApp).toBe(
      "imreboersma-homelab-renovate",
    );
    expect(mapRepo(node("some-person"), project("x")).renovateApp).toBeNull();
  });

  test("a null alias is unavailable", () => {
    expect(map("r3").availability).toBe("unavailable");
  });

  test("a repo without commits has no commit date and unknown CI", () => {
    expect(map("r4").lastCommitAt).toBeNull();
    expect(map("r4").ci).toBe("unknown");
  });
});

describe("tokenFor", () => {
  const env = { STATUS_READ_TOKEN: "a", STATUS_READ_TOKEN_HOB: "b" };
  test("selects the token by owner", () => {
    expect(tokenFor("ImreBoersma", env)).toBe("a");
    expect(tokenFor("harmonieorkest-brummen", env)).toBe("b");
    expect(tokenFor("someone-else", env)).toBeUndefined();
    expect(tokenFor("harmonieorkest-brummen", {})).toBeUndefined();
  });
});

describe("buildQuery", () => {
  test("requests no text fields of private repos", () => {
    const query = buildQuery(["ImreBoersma/one", "ImreBoersma/two"]);
    expect(query).toContain('r0: repository(owner: "ImreBoersma", name: "one")');
    expect(query).toContain('r1: repository(owner: "ImreBoersma", name: "two")');
    for (const field of ["message", "title", "headRefName", "body"]) {
      expect(query).not.toMatch(new RegExp(`\\b${field}\\b`));
    }
  });

  test("requests the commit id", () => {
    expect(buildQuery(["ImreBoersma/a"])).toContain("oid committedDate");
  });

  test("reads GitHub Pages deploys", () => {
    expect(buildQuery(["ImreBoersma/a"])).toContain(
      'environments: ["production", "Production", "github-pages"]',
    );
  });
});
