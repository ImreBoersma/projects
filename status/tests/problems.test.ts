import { describe, expect, test } from "bun:test";
import { evaluateProblems, sortRows } from "../src/problems";
import { status } from "./helpers";

const now = new Date("2026-10-28T00:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const MINUTE = 60 * 1000;
const ago = (ms: number) => new Date(now.getTime() - ms);
const reasons = (s: ReturnType<typeof status>) => evaluateProblems(s, now).map((p) => p.reason);

describe("evaluateProblems", () => {
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
