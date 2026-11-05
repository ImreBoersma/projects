import { describe, expect, test } from "bun:test";
import { rowLinks } from "../src/links";
import { status } from "./helpers";

const oid = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";
const now = new Date("2026-11-05T10:17:00Z");
const none = new Map<string, number>();

describe("rowLinks", () => {
  test("links the project name to the repo", () => {
    expect(rowLinks(status(), none).project).toBe("https://github.com/ImreBoersma/one");
  });

  test("links a project without a repo to its site, or to nothing", () => {
    const noRepo = (domain: string | null) =>
      status({
        availability: "no-repo",
        project: { id: "p", name: "P", repo: null, status: "active", domain },
      });
    expect(rowLinks(noRepo("pretband.nl"), none).project).toBe("https://pretband.nl/");
    expect(rowLinks(noRepo(null), none).project).toBeNull();
    const links = rowLinks(noRepo("pretband.nl"), none);
    expect([links.ci, links.deploy, links.renovate]).toEqual([null, null, null]);
  });

  test("links CI to the checks of the last commit, only with a result and a commit id", () => {
    expect(rowLinks(status({ commitOid: oid }), none).ci).toBe(
      `https://github.com/ImreBoersma/one/commit/${oid}/checks`,
    );
    expect(rowLinks(status({ commitOid: oid, ci: "unknown" }), none).ci).toBeNull();
    expect(rowLinks(status({ commitOid: null }), none).ci).toBeNull();
  });

  test("links the deploy to the deployments, only when a deploy is known", () => {
    expect(rowLinks(status({ deploy: { at: now, result: "failed" } }), none).deploy).toBe(
      "https://github.com/ImreBoersma/one/deployments",
    );
    expect(rowLinks(status(), none).deploy).toBeNull();
  });

  test("links Renovate PRs to the PRs of the Renovate app, only when there are some", () => {
    expect(rowLinks(status({ renovatePrCount: 2, renovateApp: "renovate" }), none).renovate).toBe(
      "https://github.com/ImreBoersma/one/pulls?q=is%3Apr+is%3Aopen+author%3Aapp%2Frenovate",
    );
    expect(
      rowLinks(status({ renovatePrCount: 1, renovateApp: "imreboersma-homelab-renovate" }), none)
        .renovate,
    ).toContain("author%3Aapp%2Fimreboersma-homelab-renovate");
    expect(rowLinks(status({ renovatePrCount: 0, renovateApp: null }), none).renovate).toBeNull();
  });

  test("links a problem to its open issue, only when the issue exists", () => {
    const s = status({
      problems: [
        { projectId: "one", reason: "ci-failed", key: "one/ci-failed" },
        { projectId: "one", reason: "inactive", key: "one/inactive" },
      ],
    });
    const links = rowLinks(s, new Map([["one/ci-failed", 12]]));
    expect(links.problems.get("ci-failed")).toBe(
      "https://github.com/ImreBoersma/projects/issues/12",
    );
    expect(links.problems.has("inactive")).toBe(false);
  });

  test("links the site to the domain", () => {
    const s = status({
      project: {
        id: "one",
        name: "One",
        repo: "ImreBoersma/one",
        status: "active",
        domain: "imreboersma.nl",
      },
      uptime: { state: "not-available", at: now },
    });
    expect(rowLinks(s, none).site).toBe("https://imreboersma.nl/");
    expect(rowLinks(status(), none).site).toBeNull();
  });

  test("without repo data, the name links to the repo and the data cells have no link", () => {
    const s = status({
      availability: "unavailable",
      commitOid: oid,
      renovatePrCount: 1,
      renovateApp: "renovate",
      deploy: { at: now, result: "succeeded" },
    });
    const links = rowLinks(s, none);
    expect(links.project).toBe("https://github.com/ImreBoersma/one");
    expect([links.ci, links.deploy, links.renovate]).toEqual([null, null, null]);
  });
});
