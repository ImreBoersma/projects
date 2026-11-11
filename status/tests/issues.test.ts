import { describe, expect, test } from "bun:test";
import {
  issueContent,
  keepsOpen,
  type OpenIssue,
  parseMarker,
  planIssueActions,
} from "../src/issues";
import type { Problem, Project } from "../src/types";

const project: Project = { id: "one", name: "One", repo: "ImreBoersma/one", status: "active" };
const projects = new Map([[project.id, project]]);
const today = "2026-10-28";
const problem = (reason: Problem["reason"], projectId = "one"): Problem => ({
  projectId,
  reason,
  key: `${projectId}/${reason}`,
});
const issue = (number: number, key: string): OpenIssue => ({
  number,
  body: `<!-- status-problem: ${key} -->\nText`,
});
const plan = (
  problems: Problem[],
  open: OpenIssue[],
  unavailable: string[] = [],
  uptimeNotAvailable = false,
  setupUnavailable: string[] = [],
  keep: string[] = [],
) =>
  planIssueActions(
    problems,
    open,
    new Set(unavailable),
    uptimeNotAvailable,
    new Set(setupUnavailable),
    new Set(keep),
    projects,
    today,
  );

describe("parseMarker", () => {
  test("reads the key from line 1", () => {
    expect(parseMarker("<!-- status-problem: one/ci-failed -->\nText")).toBe("one/ci-failed");
  });
  test("ignores a body without a marker", () => {
    expect(parseMarker("Some issue")).toBeNull();
    expect(parseMarker(null)).toBeNull();
  });
});

describe("issueContent", () => {
  test("gives the title and the body of the contract", () => {
    const { title, body } = issueContent(problem("ci-failed"), project, today);
    expect(title).toBe("One: The last CI run failed.");
    expect(body.split("\n")[0]).toBe("<!-- status-problem: one/ci-failed -->");
    expect(body).toContain("The status update found this problem on 2026-10-28.");
    expect(body).toContain("The next update closes this issue when the problem stops.");
  });
});

describe("planIssueActions", () => {
  test("a new problem opens one issue", () => {
    const actions = plan([problem("ci-failed")], []);
    expect(actions.open.map((a) => a.title)).toEqual(["One: The last CI run failed."]);
    expect(actions.close).toEqual([]);
  });

  test("a problem with an open issue gives no action", () => {
    expect(plan([problem("ci-failed")], [issue(5, "one/ci-failed")])).toEqual({
      open: [],
      close: [],
    });
  });

  test("an issue without a problem closes", () => {
    const actions = plan([], [issue(5, "one/ci-failed")]);
    expect(actions.close.map((a) => a.number)).toEqual([5]);
    expect(actions.close[0].comment).toBe(
      "The status update on 2026-10-28 did not find this problem. The update closes this issue.",
    );
  });

  test("an issue of an unavailable project does not change", () => {
    expect(plan([], [issue(5, "one/ci-failed")], ["one"])).toEqual({ open: [], close: [] });
  });

  test("two problems of one project open two issues", () => {
    expect(plan([problem("ci-failed"), problem("inactive")], []).open).toHaveLength(2);
  });

  test("an issue without a marker is ignored", () => {
    expect(plan([], [{ number: 9, body: "Manual issue" }])).toEqual({ open: [], close: [] });
  });
});

describe("planIssueActions for site-down (spec 005)", () => {
  test("a site that is down opens one issue", () => {
    expect(plan([problem("site-down")], []).open.map((a) => a.title)).toEqual([
      "One: The site does not respond correctly.",
    ]);
  });

  test("a site that stays down opens no second issue", () => {
    expect(plan([problem("site-down")], [issue(7, "one/site-down")])).toEqual({
      open: [],
      close: [],
    });
  });

  test("a site that is up again closes the issue", () => {
    expect(plan([], [issue(7, "one/site-down")]).close.map((c) => c.number)).toEqual([7]);
  });

  test("the repo data rule does not keep a site-down issue", () => {
    expect(plan([], [issue(7, "one/site-down")], ["one"]).close.map((c) => c.number)).toEqual([7]);
  });

  test("when the check is not available, site-down issues stay and other issues follow their rules", () => {
    const actions = plan([], [issue(7, "one/site-down"), issue(8, "one/ci-failed")], [], true);
    expect(actions.close.map((c) => c.number)).toEqual([8]);
  });
});

describe("not-conformant issues (spec 008)", () => {
  const nc: Problem = {
    projectId: "one",
    reason: "not-conformant",
    key: "one/not-conformant",
    detail: ["R4 Renovate preset", "R6 Issues on"],
  };

  test("the issue lists the failed rules with links to the repair steps", () => {
    const { title, body } = issueContent(nc, project, today);
    expect(title).toBe("One: The repo does not follow the shared setup.");
    expect(body).toStartWith("<!-- status-problem: one/not-conformant -->");
    expect(body).toContain(
      "- R4 Renovate preset: https://github.com/ImreBoersma/projects/blob/main/docs/conformance.md#r4-renovate-preset",
    );
    expect(body).toContain(
      "- R6 Issues on: https://github.com/ImreBoersma/projects/blob/main/docs/conformance.md#r6-issues-on",
    );
    expect(body).toContain("The status page shows the current list.");
  });

  test("closes when the rules pass, also when the repo data is unavailable", () => {
    expect(plan([], [issue(9, "one/not-conformant")], ["one"]).close.map((c) => c.number)).toEqual([
      9,
    ]);
  });

  test("stays open when the setup check of the repo is not available", () => {
    expect(plan([], [issue(9, "one/not-conformant")], [], false, ["one"]).close).toEqual([]);
  });
});

describe("expiry issues (spec 009)", () => {
  const cert: Problem = {
    projectId: "one",
    reason: "cert-expiring",
    key: "one/cert-expiring",
    text: "The TLS certificate expires in 10 days.",
  };
  const renewal = (source: "catalog" | "registry"): Problem => ({
    projectId: "one",
    reason: "renewal-due",
    key: "one/renewal-due/hosting",
    text: "Renewal of Hosting is due in 20 days.",
    source,
  });

  test("the title uses the text with the days, and the body has the steps", () => {
    const c = issueContent(cert, project, today);
    expect(c.title).toBe("One: The TLS certificate expires in 10 days.");
    expect(c.body).toContain("2. Find why the automatic renewal of the certificate failed.");
    expect(issueContent(renewal("catalog"), project, today).body).toContain(
      "1. Renew Hosting.\n2. Enter the next date in `projects.yaml`, field `renewal`.",
    );
    expect(issueContent(renewal("registry"), project, today).body).toContain(
      "1. Renew the domain at the registrar.",
    );
  });

  test("the key with the renewal name is read back from the marker", () => {
    expect(parseMarker(issueContent(renewal("catalog"), project, today).body)).toBe(
      "one/renewal-due/hosting",
    );
  });

  test("an issue stays open when its value is not known; else it closes", () => {
    const open = [issue(4, "one/cert-expiring")];
    expect(plan([], open, [], false, [], ["one/cert-expiring"]).close).toEqual([]);
    expect(plan([], open).close.map((c) => c.number)).toEqual([4]);
  });
});

describe("secret issues (spec 013)", () => {
  const secret = (projectId: string, name: string): Problem => ({
    projectId,
    reason: "secret-expiring",
    key: `${projectId}/secret-expiring/${name.toLowerCase()}`,
    text: `The secret ${name} expires in 20 days.`,
    secret: {
      kind: "actions-secret",
      where: "ImreBoersma/projects",
      date: "2026-11-17",
      source: "both",
    },
  });

  test("a shared secret opens one issue for the Shared setup", () => {
    const actions = plan([secret("shared", "TOKEN_A")], []);
    expect(actions.open).toHaveLength(1);
    const { title, body } = actions.open[0];
    expect(title).toBe("Shared setup: The secret TOKEN_A expires in 20 days.");
    expect(body).toContain("<!-- status-problem: shared/secret-expiring/token_a -->");
    expect(body).toContain(
      "Where: actions-secret in ImreBoersma/projects\nDate: 2026-11-17 (catalog and token)\n\nDo these steps:",
    );
    expect(body).toContain("2. Set it in ImreBoersma/projects (actions-secret).");
  });

  test("a project secret uses the project name", () => {
    expect(plan([secret("one", "SSH")], []).open[0].title).toBe(
      "One: The secret SSH expires in 20 days.",
    );
  });

  test("the issue closes when the problem stops, and stays with a keep key", () => {
    const open = [issue(7, "shared/secret-expiring/token_a")];
    expect(plan([], open).close.map((c) => c.number)).toEqual([7]);
    expect(plan([], open, [], false, [], ["shared/secret-expiring/token_a"]).close).toEqual([]);
  });
});

describe("keepsOpen (spec 009 T025, spec 010 T024)", () => {
  const ctx = {
    unavailableIds: new Set(["one"]),
    uptimeNotAvailable: false,
    setupUnavailableIds: new Set<string>(),
    keepKeys: new Set(["two/renewal-due/domain"]),
  };
  test("repo data rules only the repo problems", () => {
    expect(keepsOpen(ctx, "one/ci-failed")).toBe(true);
    expect(keepsOpen(ctx, "two/ci-failed")).toBe(false);
  });
  test("a certificate or renewal issue depends only on its own read", () => {
    expect(keepsOpen(ctx, "one/cert-expiring")).toBe(false);
    expect(keepsOpen(ctx, "one/renewal-due/hosting")).toBe(false);
    expect(keepsOpen(ctx, "two/renewal-due/domain")).toBe(true);
  });
  test("site and setup checks", () => {
    expect(keepsOpen({ ...ctx, uptimeNotAvailable: true }, "two/site-down")).toBe(true);
    expect(keepsOpen(ctx, "one/site-down")).toBe(false);
    expect(keepsOpen({ ...ctx, setupUnavailableIds: new Set(["two"]) }, "two/not-conformant")).toBe(
      true,
    );
  });
});
