import { describe, expect, test } from "bun:test";
import type { OpenIssue } from "../src/issues";
import { parseQualityMarker, planQualityIssues, qualityIssueBody } from "../src/quality/issues";
import type { Project, QualityCheck, QualityDay } from "../src/types";
import { notChecked, qualityCheck } from "./helpers";

const projects = new Map<string, Project>([
  ["hob-nl", { id: "hob-nl", name: "hob.nl", repo: null, status: "active" }],
]);
const day = (date: string, checks: QualityCheck[]): QualityDay => ({ version: 1, date, checks });
const broken = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    url: `https://harmonieorkestbrummen.nl/gone${i}`,
    page: "https://harmonieorkestbrummen.nl/",
    status: 404 as const,
  }));
const base = qualityCheck();
const poorLinks = (n = 1) =>
  qualityCheck({ links: { level: "poor", pages: 5, broken: broken(n), blocked: 0 } });
const poorSpeed = (c = qualityCheck()) => ({
  ...c,
  speed: { ...base.speed, level: "poor" as const, score: 31 },
});
const issue = (body: string, number = 9): OpenIssue => ({ number, body });

describe("planQualityIssues (FR-007)", () => {
  test("poor in 2 checks in a row: one issue with only the poor kind", () => {
    const a = planQualityIssues(
      day("2026-11-20", [poorLinks()]),
      day("2026-11-19", [poorLinks()]),
      [],
      projects,
    );
    expect(a.open).toHaveLength(1);
    expect(a.open[0].title).toBe("hob.nl: Site quality is poor");
    expect(a.open[0].body.startsWith("<!-- site-quality: hob-nl -->\n")).toBe(true);
    expect(a.open[0].body).toContain("- Broken links: 1.");
    expect(a.open[0].body).toContain(
      "  - https://harmonieorkestbrummen.nl/gone0 on https://harmonieorkestbrummen.nl/ (404)",
    );
    expect(a.open[0].body).not.toContain("Speed:");
    expect(parseQualityMarker(a.open[0].body)).toBe("hob-nl");
  });

  test("poor today only, or no previous file: no issue", () => {
    expect(
      planQualityIssues(day("2026-11-20", [poorLinks()]), day("2026-11-19", [base]), [], projects)
        .open,
    ).toEqual([]);
    expect(planQualityIssues(day("2026-11-20", [poorLinks()]), null, [], projects).open).toEqual(
      [],
    );
  });

  test("a different kind poor on each day: no issue", () => {
    const a = planQualityIssues(
      day("2026-11-20", [poorSpeed()]),
      day("2026-11-19", [poorLinks()]),
      [],
      projects,
    );
    expect(a.open).toEqual([]);
  });

  test("poor and a warning: no issue", () => {
    const warn = qualityCheck({ links: { level: "warn", pages: 5, broken: [], blocked: 1 } });
    expect(
      planQualityIssues(day("2026-11-20", [warn]), day("2026-11-19", [poorLinks()]), [], projects)
        .open,
    ).toEqual([]);
  });

  test("an open issue: update when the list changes, not for the date only", () => {
    const yesterday = qualityIssueBody(poorLinks(), ["links"], "2026-11-19");
    const both = planQualityIssues(
      day("2026-11-20", [poorSpeed(poorLinks())]),
      null,
      [issue(yesterday)],
      projects,
    );
    expect(both.update).toHaveLength(1);
    expect(both.update[0].number).toBe(9);
    expect(both.update[0].body).toContain("- Speed: 31 on a phone.");
    expect(both.update[0].body).toContain("- Broken links: 1.");
    const sameList = planQualityIssues(
      day("2026-11-20", [poorLinks()]),
      null,
      [issue(yesterday)],
      projects,
    );
    expect(sameList).toEqual({ open: [], update: [], close: [] });
    const moreLinks = planQualityIssues(
      day("2026-11-20", [poorLinks(2)]),
      null,
      [issue(yesterday)],
      projects,
    );
    expect(moreLinks.update).toHaveLength(1);
  });

  test("an open issue, nothing poor today: close with a comment", () => {
    const a = planQualityIssues(
      day("2026-11-21", [base]),
      null,
      [issue("<!-- site-quality: hob-nl -->\nx")],
      projects,
    );
    expect(a.close).toEqual([
      {
        number: 9,
        projectId: "hob-nl",
        comment:
          "The quality check on 2026-11-21 found no poor result. The check closes this issue.",
      },
    ]);
  });

  test("an open issue, all 4 not checked today: no change", () => {
    const a = planQualityIssues(
      day("2026-11-21", [notChecked("site down")]),
      null,
      [issue("<!-- site-quality: hob-nl -->\nx")],
      projects,
    );
    expect(a).toEqual({ open: [], update: [], close: [] });
  });

  test("25 broken links: 20 lines and 'and 5 more'", () => {
    const a = planQualityIssues(
      day("2026-11-20", [poorLinks(25)]),
      day("2026-11-19", [poorLinks(25)]),
      [],
      projects,
    );
    expect(a.open[0].body.match(/^ {2}- https/gm)).toHaveLength(20);
    expect(a.open[0].body).toContain("  - and 5 more");
  });

  test("a project not in today's file keeps its issue; status-problem issues are not touched", () => {
    const a = planQualityIssues(
      day("2026-11-20", []),
      null,
      [
        issue("<!-- site-quality: gone -->\nx"),
        issue("<!-- status-problem: hob-nl/site-down -->\nx", 3),
      ],
      projects,
    );
    expect(a).toEqual({ open: [], update: [], close: [] });
  });

  test("the headers line and the accessibility line", () => {
    const c = qualityCheck({
      accessibility: { ...base.accessibility, level: "poor", score: 40, failed: 1 },
      headers: { ...base.headers, level: "poor", present: [], missing: [] },
    });
    const body = qualityIssueBody(c, ["accessibility", "headers"], "2026-11-20");
    expect(body).toContain("- Accessibility: 40, 1 rule fails. Report: https://pagespeed.web.dev/");
    expect(body).toContain(
      "- Security headers: none of the 4 are sent. Report: https://developer.mozilla.org/",
    );
    expect(body).toContain("Only the poor results are in this list.");
  });
});
