import { describe, expect, test } from "bun:test";
import type { ProjectStatus } from "../src/types";
import {
  certificateKind,
  ciKind,
  deployKind,
  relTime,
  renewalKind,
  sections,
  siteKind,
  totalState,
} from "../src/view";
import { status } from "./helpers";

const now = Date.parse("2026-11-05T12:00:00Z");
const ago = (ms: number) => new Date(now - ms).toISOString();
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe("relTime (spec 012 research.md §3)", () => {
  const cases: [string, string][] = [
    [ago(0), "now"],
    [ago(59_000), "now"],
    [ago(MIN), "1 minute ago"],
    [ago(25 * MIN), "25 minutes ago"],
    [ago(HOUR), "1 hour ago"],
    [ago(5 * HOUR), "5 hours ago"],
    [ago(47 * HOUR), "47 hours ago"],
    [ago(3 * DAY), "3 days ago"],
    [ago(-2 * HOUR), "in 2 hours"],
    ["2026-11-05", "today"],
    ["2026-11-04", "1 day ago"],
    ["2026-12-15", "in 40 days"],
    ["2026-11-06", "in 1 day"],
  ];

  test("uses minutes, hours, days, and whole days for a date", () => {
    for (const [iso, text] of cases) expect(relTime(iso, now)).toBe(text);
  });

  test("the copy in the page script gives the same results", () => {
    const copy = new Function(`return ${relTime.toString()}`)() as typeof relTime;
    for (const [iso, text] of cases) expect(copy(iso, now)).toBe(text);
  });
});

const problem = { projectId: "one", reason: "ci-failed" as const, key: "one/ci-failed" };
const at = new Date(now);

describe("totalState (US1)", () => {
  test("all correct", () => {
    expect(totalState([status(), status()])).toEqual({
      kind: "correct",
      problems: 0,
      text: "All correct",
      title: "Project status",
    });
  });

  test("counts problems", () => {
    expect(totalState([status({ problems: [problem] }), status()])).toMatchObject({
      kind: "problems",
      text: "1 problem",
      title: "(1) Project status",
    });
    const two = totalState([status({ problems: [problem] }), status({ problems: [problem] })]);
    expect(two).toMatchObject({ text: "2 problems", title: "(2) Project status" });
  });

  test("check not available, only with 0 problems (FR-005)", () => {
    const cases: Partial<ProjectStatus>[] = [
      { availability: "unavailable" },
      { uptime: { state: "not-available", at } },
      { conformanceNotAvailable: ["R7"] },
    ];
    for (const c of cases) {
      expect(totalState([status(c), status()])).toMatchObject({
        kind: "not-available",
        text: "Check not available",
        title: "Project status",
      });
    }
    expect(
      totalState([status({ availability: "unavailable" }), status({ problems: [problem] })]).kind,
    ).toBe("problems");
  });

  test("a certificate that is not known does not count", () => {
    const expiry = { certificate: "not-known" as const, renewals: [], registryNotKnown: true };
    expect(totalState([status({ expiry })]).kind).toBe("correct");
  });
});

describe("sections (US3)", () => {
  const named = (name: string, o: Partial<ProjectStatus> = {}) =>
    status({ ...o, project: { id: name, name, repo: null, status: "active" } });

  test("puts each row in one section, in catalog order", () => {
    const rows = [
      named("a"),
      named("b", { availability: "unavailable" }),
      named("c", { problems: [problem] }),
      named("d"),
      named("e", { problems: [problem] }),
    ];
    const result = sections(rows).map((s) => [s.id, s.rows.map((r) => r.project.id)]);
    expect(result).toEqual([
      ["problems", ["c", "e"]],
      ["not-available", ["b"]],
      ["other", ["a", "d"]],
    ]);
  });

  test("leaves out empty sections", () => {
    expect(sections([named("a")]).map((s) => s.title)).toEqual(["Other projects"]);
  });
});

describe("badge kinds (US2)", () => {
  test("site, CI and deploy", () => {
    expect(["up", "down", "not-available"].map((s) => siteKind(s as never))).toEqual([
      "good",
      "bad",
      "unknown",
    ]);
    expect(["passed", "failed", "unknown"].map((c) => ciKind(c as never))).toEqual([
      "good",
      "bad",
      "unknown",
    ]);
    const deploy = (result: "succeeded" | "failed" | "in-progress") => deployKind({ at, result });
    expect([deploy("succeeded"), deploy("failed"), deploy("in-progress")]).toEqual([
      "good",
      "bad",
      "unknown",
    ]);
    expect(deployKind("unknown")).toBe("unknown");
  });

  test("certificate: bad at 14 days or less, warning to 28 (FR-004)", () => {
    expect([14, 15, 28, 29, -3].map(certificateKind)).toEqual([
      "bad",
      "warn",
      "warn",
      "good",
      "bad",
    ]);
    expect(certificateKind("not-known")).toBe("unknown");
  });

  test("renewal: bad at 30 days or less, warning to 60 (FR-004)", () => {
    expect([30, 31, 60, 61].map(renewalKind)).toEqual(["bad", "warn", "warn", "good"]);
  });
});
