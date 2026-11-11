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

  test("links Renovate PRs to the PRs of the Renovate apps, only when there are some", () => {
    expect(
      rowLinks(status({ renovatePrCount: 2, renovateApps: ["renovate"] }), none).renovate,
    ).toBe("https://github.com/ImreBoersma/one/pulls?q=is%3Apr+is%3Aopen+author%3Aapp%2Frenovate");
    expect(
      rowLinks(status({ renovatePrCount: 1, renovateApps: ["imreboersma-homelab-renovate"] }), none)
        .renovate,
    ).toContain("author%3Aapp%2Fimreboersma-homelab-renovate");
    // Spec 007 T024: PRs of two apps give one link with both authors.
    expect(
      rowLinks(
        status({ renovatePrCount: 3, renovateApps: ["renovate", "imreboersma-homelab-renovate"] }),
        none,
      ).renovate,
    ).toBe(
      "https://github.com/ImreBoersma/one/pulls?q=is%3Apr+is%3Aopen+author%3Aapp%2Frenovate+author%3Aapp%2Fimreboersma-homelab-renovate",
    );
    expect(rowLinks(status({ renovatePrCount: 0, renovateApps: [] }), none).renovate).toBeNull();
  });

  test("links a problem to its open issue, only when the issue exists", () => {
    const s = status({
      problems: [
        { projectId: "one", reason: "ci-failed", key: "one/ci-failed" },
        { projectId: "one", reason: "inactive", key: "one/inactive" },
      ],
    });
    const links = rowLinks(s, new Map([["one/ci-failed", 12]]));
    expect(links.problems.get("one/ci-failed")).toBe(
      "https://github.com/ImreBoersma/projects/issues/12",
    );
    expect(links.problems.has("one/inactive")).toBe(false);
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
      renovateApps: ["renovate"],
      deploy: { at: now, result: "succeeded" },
    });
    const links = rowLinks(s, none);
    expect(links.project).toBe("https://github.com/ImreBoersma/one");
    expect([links.ci, links.deploy, links.renovate]).toEqual([null, null, null]);
  });
});

describe("shortcuts (spec 020 US4)", () => {
  const { shortcuts, STATUS_WORKFLOW } = require("../src/links") as typeof import("../src/links");
  test("the 4 GitHub pages of a repo; none without a repo", () => {
    expect(shortcuts("ImreBoersma/one")).toEqual([
      { label: "CI runs", url: "https://github.com/ImreBoersma/one/actions" },
      { label: "Deployments", url: "https://github.com/ImreBoersma/one/deployments" },
      {
        label: "Renovate dashboard",
        url: "https://github.com/ImreBoersma/one/issues?q=is%3Aissue+is%3Aopen+in%3Atitle+%22Dependency+Dashboard%22",
      },
      { label: "Issues", url: "https://github.com/ImreBoersma/one/issues" },
    ]);
    expect(shortcuts(null)).toEqual([]);
    expect(STATUS_WORKFLOW).toBe(
      "https://github.com/ImreBoersma/projects/actions/workflows/status-page.yml",
    );
  });
});
