import { describe, expect, test } from "bun:test";
import { issueContent, type OpenIssue, parseMarker, planIssueActions } from "../src/issues";
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
const plan = (problems: Problem[], open: OpenIssue[], unavailable: string[] = []) =>
  planIssueActions(problems, open, new Set(unavailable), projects, today);

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
