import { describe, expect, test } from "bun:test";
import { carryKeys, repairTime, since, uptime } from "../src/history/stats";
import type { HistoryResult, SiteState } from "../src/types";

const now = new Date("2026-11-05T15:30:00Z");
const r = (time: string, projects: Record<string, [SiteState, string[]]>): HistoryResult => ({
  time,
  projects: Object.fromEntries(
    Object.entries(projects).map(([id, [site, problems]]) => [id, { site, problems }]),
  ),
});

describe("since (US2)", () => {
  const key = "a/ci-failed";
  test("gives the time of the first result of the row", () => {
    const results = [
      r("2026-11-05T10:00:00Z", { a: ["up", []] }),
      r("2026-11-05T11:00:00Z", { a: ["up", [key]] }),
      r("2026-11-05T12:00:00Z", { a: ["up", [key]] }),
      r("2026-11-05T13:00:00Z", { a: ["up", [key]] }),
    ];
    expect(since(results, "a", key)).toEqual({
      time: "2026-11-05T11:00:00Z",
      atHistoryStart: false,
    });
  });

  test("a result without the project is a gap and does not end the row", () => {
    const results = [
      r("2026-11-05T10:00:00Z", { a: ["up", []] }),
      r("2026-11-05T11:00:00Z", { a: ["up", [key]] }),
      r("2026-11-05T12:00:00Z", { b: ["up", []] }),
      r("2026-11-05T13:00:00Z", { a: ["up", [key]] }),
    ];
    expect(since(results, "a", key)?.time).toBe("2026-11-05T11:00:00Z");
  });

  test("a key only in the last result gives that time; a row to the start is marked", () => {
    expect(
      since(
        [
          r("2026-11-05T10:00:00Z", { a: ["up", []] }),
          r("2026-11-05T11:00:00Z", { a: ["up", [key]] }),
        ],
        "a",
        key,
      ),
    ).toEqual({
      time: "2026-11-05T11:00:00Z",
      atHistoryStart: false,
    });
    expect(since([r("2026-11-05T11:00:00Z", { a: ["up", [key]] })], "a", key)).toEqual({
      time: "2026-11-05T11:00:00Z",
      atHistoryStart: true,
    });
  });

  test("a new project id does not get the history of the old id", () => {
    const results = [
      r("2026-11-04T10:00:00Z", { a: ["up", ["a/inactive"]] }),
      r("2026-11-05T10:00:00Z", { b: ["up", ["b/inactive"]] }),
    ];
    expect(since(results, "b", "b/inactive")).toEqual({
      time: "2026-11-05T10:00:00Z",
      atHistoryStart: true,
    });
  });
});

describe("uptime (US3)", () => {
  test("counts up and down checks of 30 days, without other states", () => {
    const results = [
      ...Array.from({ length: 23 }, (_, i) =>
        r(`2026-11-04T${String(i).padStart(2, "0")}:00:00Z`, { a: ["up", []] }),
      ),
      r("2026-11-04T23:00:00Z", { a: ["down", []] }),
      r("2026-11-05T01:00:00Z", { a: ["not-available", []] }),
    ];
    const u = uptime(results, "a", now);
    expect(u.percent).toBe(95.8);
    expect(u.days).toHaveLength(30);
    expect(u.days.at(-2)).toBe("down");
    expect(u.days.at(-1)).toBe("no-data");
    expect(u.days.at(0)).toBe("no-data");
  });

  test("a day with only up checks is up; no checks give no percentage; old results do not count", () => {
    const u = uptime(
      [
        r("2026-11-03T10:00:00Z", { a: ["up", []] }),
        r("2026-09-01T10:00:00Z", { a: ["down", []] }),
      ],
      "a",
      now,
    );
    expect(u.days.at(-3)).toBe("up");
    expect(u.percent).toBe(100);
    expect(
      uptime([r("2026-11-05T10:00:00Z", { a: ["no-domain", []] })], "a", now).percent,
    ).toBeNull();
  });
});

describe("repairTime (US4)", () => {
  test("averages the closed faults and does not count other problems", () => {
    const results = [
      r("2026-10-01T00:00:00Z", { a: ["up", ["a/inactive"]], b: ["up", []] }),
      r("2026-11-01T10:00:00Z", {
        a: ["up", ["a/inactive", "a/ci-failed"]],
        b: ["down", ["b/site-down"]],
      }),
      r("2026-11-01T12:00:00Z", { a: ["up", ["a/inactive"]], b: ["down", ["b/site-down"]] }),
      r("2026-11-01T16:00:00Z", { a: ["up", []], b: ["up", []] }),
      r("2026-11-02T10:00:00Z", { a: ["up", ["a/deploy-failed"]], b: ["up", []] }),
    ];
    expect(repairTime(results, now)).toEqual({ averageMs: 4 * 3600_000, count: 2 });
  });

  test("an open fault or a fault that closed more than 90 days ago does not count", () => {
    const results = [
      r("2026-01-01T10:00:00Z", { a: ["up", ["a/ci-failed"]] }),
      r("2026-01-01T12:00:00Z", { a: ["up", []] }),
      r("2026-11-05T10:00:00Z", { a: ["up", ["a/ci-failed"]] }),
    ];
    expect(repairTime(results, now)).toBeNull();
  });
});

describe("recentChanges (spec 020 research.md §1)", () => {
  const { recentChanges } =
    require("../src/history/stats") as typeof import("../src/history/stats");
  const now = new Date("2026-11-07T12:00:00Z");
  const line = (time: string, projects: Record<string, string[]>): HistoryResult => ({
    time,
    projects: Object.fromEntries(
      Object.entries(projects).map(([id, problems]) => [id, { site: "up" as SiteState, problems }]),
    ),
  });
  const projects = [
    { id: "one", name: "One" },
    { id: "two", name: "Two" },
  ];
  const texts = {
    "ci-failed": "The last CI run failed.",
    "site-down": "The site does not respond correctly.",
  };

  test("started and stopped against the result of 24 hours ago", () => {
    const results = [
      line("2026-11-06T06:00:00Z", { one: ["one/ci-failed"], two: [] }),
      line("2026-11-06T11:00:00Z", { one: ["one/ci-failed"], two: [] }),
      line("2026-11-07T09:00:00Z", { one: [], two: ["two/site-down"] }),
      line("2026-11-07T12:00:00Z", { one: [], two: ["two/site-down"] }),
    ];
    const r = recentChanges(results, projects, now, texts);
    expect(r.since).toBe("2026-11-06T11:00:00Z");
    expect(r.started).toEqual([
      { key: "two/site-down", project: "Two", text: "The site does not respond correctly." },
    ]);
    expect(r.stopped).toEqual([
      { key: "one/ci-failed", project: "One", text: "The last CI run failed." },
    ]);
  });

  test("a short history compares with the first result", () => {
    const results = [
      line("2026-11-07T08:00:00Z", { one: [] }),
      line("2026-11-07T12:00:00Z", { one: ["one/ci-failed"] }),
    ];
    const r = recentChanges(results, projects, now, texts);
    expect(r.since).toBe("2026-11-07T08:00:00Z");
    expect(r.started.map((x) => x.key)).toEqual(["one/ci-failed"]);
  });

  test("a project that left the catalog is not fixed; a current text wins", () => {
    const results = [
      line("2026-11-06T10:00:00Z", { gone: ["gone/ci-failed"], one: [] }),
      line("2026-11-07T12:00:00Z", { one: ["one/renewal-due/domain"] }),
    ];
    const r = recentChanges(
      results,
      projects,
      now,
      texts,
      new Map([["one/renewal-due/domain", "Renewal of Domain is due in 20 days."]]),
    );
    expect(r.stopped).toEqual([]);
    expect(r.started[0].text).toBe("Renewal of Domain is due in 20 days.");
  });
});

describe("carryKeys (spec 010 T024)", () => {
  test("keeps a previous key whose check had no data; drops a key that stopped", () => {
    const keep = (k: string) => k === "one/ci-failed";
    expect(carryKeys(["one/ci-failed", "one/deploy-failed"], ["one/inactive"], keep)).toEqual([
      "one/inactive",
      "one/ci-failed",
    ]);
    expect(carryKeys(undefined, ["x"], keep)).toEqual(["x"]);
  });
  test("so since() does not restart after a run without data", () => {
    const line = (time: string, problems: string[]) => ({
      time,
      projects: { one: { site: "up" as const, problems } },
    });
    const keep = () => true;
    const results = [
      line("2026-11-10T10:00:00Z", ["one/ci-failed"]),
      line("2026-11-10T11:00:00Z", carryKeys(["one/ci-failed"], [], keep)),
      line("2026-11-10T12:00:00Z", ["one/ci-failed"]),
    ];
    expect(since(results, "one", "one/ci-failed")?.time).toBe("2026-11-10T10:00:00Z");
  });
});
