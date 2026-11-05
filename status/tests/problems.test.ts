import { describe, expect, test } from "bun:test";
import { conformanceProblem, evaluateProblems, sortRows } from "../src/problems";
import { status } from "./helpers";

const now = new Date("2026-10-28T00:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const MINUTE = 60 * 1000;
const ago = (ms: number) => new Date(now.getTime() - ms);
const reasons = (s: ReturnType<typeof status>) => evaluateProblems(s, now).map((p) => p.reason);

describe("evaluateProblems", () => {
  test("a site that is down is a problem, also without repo data (spec 005)", () => {
    const down = { state: "down" as const, at: now };
    for (const availability of ["ok", "no-repo", "unavailable"] as const) {
      expect(evaluateProblems(status({ availability, uptime: down }), now)).toEqual([
        { projectId: "one", reason: "site-down", key: "one/site-down" },
      ]);
    }
  });

  test("up, no-domain and not-available give no site-down problem", () => {
    for (const state of ["up", "no-domain", "not-available"] as const) {
      expect(reasons(status({ uptime: { state, at: now } }))).toEqual([]);
    }
  });

  test("site-down comes with the repo problems of an ok row", () => {
    expect(reasons(status({ ci: "failed", uptime: { state: "down", at: now } }))).toEqual([
      "site-down",
      "ci-failed",
    ]);
  });

  test("no problems for a healthy project", () => {
    expect(reasons(status())).toEqual([]);
  });

  test("failed CI", () => {
    expect(reasons(status({ ci: "failed" }))).toEqual(["ci-failed"]);
  });

  test("failed deploy", () => {
    expect(reasons(status({ deploy: { at: now, result: "failed" } }))).toEqual(["deploy-failed"]);
  });

  test("Renovate PR older than 14 days, not at exactly 14 days", () => {
    expect(reasons(status({ oldestRenovatePrAt: ago(14 * DAY + MINUTE) }))).toEqual([
      "renovate-stale",
    ]);
    expect(reasons(status({ oldestRenovatePrAt: ago(14 * DAY) }))).toEqual([]);
  });

  test("active project without a commit for more than 90 days", () => {
    expect(reasons(status({ lastCommitAt: ago(90 * DAY + MINUTE) }))).toEqual(["inactive"]);
  });

  test("maintenance project is not inactive", () => {
    const s = status({ lastCommitAt: ago(200 * DAY) });
    s.project = { ...s.project, status: "maintenance" };
    expect(reasons(s)).toEqual([]);
  });

  test("no commits is not inactive", () => {
    expect(reasons(status({ lastCommitAt: null }))).toEqual([]);
  });

  test("no-repo and unavailable have no problems", () => {
    expect(reasons(status({ availability: "no-repo", ci: "failed" }))).toEqual([]);
    expect(reasons(status({ availability: "unavailable", ci: "failed" }))).toEqual([]);
  });

  test("two conditions give two problems with keys", () => {
    const problems = evaluateProblems(
      status({ ci: "failed", deploy: { at: now, result: "failed" } }),
      now,
    );
    expect(problems.map((p) => p.key)).toEqual(["one/ci-failed", "one/deploy-failed"]);
  });
});

describe("sortRows", () => {
  test("rows with problems first, then by name", () => {
    const row = (name: string, problem: boolean) => {
      const s = status();
      s.project = { ...s.project, id: name.toLowerCase(), name };
      if (problem) s.problems = [{ projectId: s.project.id, reason: "ci-failed", key: "x" }];
      return s;
    };
    const sorted = sortRows([
      row("Bravo", false),
      row("Delta", true),
      row("Alpha", false),
      row("Charlie", true),
    ]);
    expect(sorted.map((s) => s.project.name)).toEqual(["Charlie", "Delta", "Alpha", "Bravo"]);
  });
});

describe("conformanceProblem (spec 008)", () => {
  const r = (rule: string, state: "pass" | "fail" | "not-applicable" | "not-available") => ({
    rule,
    state,
  });
  test("gives one problem with the failed rules in rule order", () => {
    expect(conformanceProblem("one", [r("R6", "fail"), r("R4", "fail"), r("R1", "pass")])).toEqual({
      projectId: "one",
      reason: "not-conformant",
      key: "one/not-conformant",
      detail: ["R4 Renovate preset", "R6 Issues on"],
    });
  });
  test("gives no problem without a failed rule", () => {
    expect(
      conformanceProblem("one", [
        r("R1", "pass"),
        r("R2", "not-applicable"),
        r("R7", "not-available"),
      ]),
    ).toBeNull();
  });
});
