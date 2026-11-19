import { describe, expect, test } from "bun:test";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pageView, readDays, writeDay } from "../src/quality/store";
import type { QualityDay } from "../src/types";
import { notChecked, qualityCheck } from "./helpers";

const now = new Date("2026-11-20T10:00:00Z");
const tmp = () => mkdtemp(join(tmpdir(), "quality-"));
const day = (date: string, checks = [qualityCheck()]): QualityDay => ({ version: 1, date, checks });

describe("writeDay and readDays", () => {
  test("writes pretty JSON with a new line at the end, and reads it back", async () => {
    const dir = await tmp();
    const path = await writeDay(join(dir, "quality"), day("2026-11-19"));
    const text = await Bun.file(path).text();
    expect(path.endsWith("quality/2026-11-19.json")).toBe(true);
    expect(text.endsWith("}\n")).toBe(true);
    expect(text).toContain('\n  "version": 1');
    const r = await readDays(join(dir, "quality"), now);
    expect(r.newest?.date).toBe("2026-11-19");
    expect(r.previous).toBeNull();
  });

  test("newest, previous, and the days of the last 30 days, newest first", async () => {
    const dir = await tmp();
    for (const d of ["2026-10-01", "2026-11-17", "2026-11-18", "2026-11-19"])
      await writeDay(dir, day(d));
    const r = await readDays(dir, now);
    expect(r.newest?.date).toBe("2026-11-19");
    expect(r.previous?.date).toBe("2026-11-18");
    expect(r.days.map((d) => d.date)).toEqual(["2026-11-19", "2026-11-18", "2026-11-17"]);
  });

  test("a file that is not valid is skipped", async () => {
    const dir = await tmp();
    await writeDay(dir, day("2026-11-17"));
    await writeFile(join(dir, "2026-11-18.json"), "{ not json");
    await writeFile(
      join(dir, "2026-11-19.json"),
      JSON.stringify({ ...day("2026-11-19"), version: 2 }),
    );
    const r = await readDays(dir, now);
    expect(r.newest?.date).toBe("2026-11-17");
    expect(r.previous).toBeNull();
  });

  test("an unknown level reads as not checked", async () => {
    const dir = await tmp();
    const d = day("2026-11-19");
    (d.checks[0].links as { level: string }).level = "excellent";
    await writeDay(dir, d);
    expect((await readDays(dir, now)).newest?.checks[0].links.level).toBe("not-checked");
  });

  test("a missing folder", async () => {
    expect(await readDays("/no/such/folder", now)).toEqual({
      newest: null,
      previous: null,
      days: [],
    });
  });
});

describe("pageView (research.md §7)", () => {
  const poorLinks = qualityCheck({
    links: { level: "poor", pages: 3, broken: [{ url: "u", page: "p", status: 404 }], blocked: 0 },
  });

  test("a checked kind of the newest file has no from", () => {
    const v = pageView([day("2026-11-19", [poorLinks]), day("2026-11-18")], "hob-nl");
    expect(v?.links.level).toBe("poor");
    expect(v?.links.from).toBeUndefined();
  });

  test("a kind not checked in the newest file takes the newest earlier checked result", () => {
    const days = [
      day("2026-11-19", [notChecked("site down")]),
      day("2026-11-18", [notChecked("service error")]),
      day("2026-11-17", [poorLinks]),
    ];
    const v = pageView(days, "hob-nl");
    expect(v?.links).toMatchObject({ level: "poor", from: "2026-11-17" });
    expect(v?.speed).toMatchObject({ level: "good", score: 94, from: "2026-11-17" });
    expect(v?.checkedAt).toBe(days[0].checks[0].checkedAt);
  });

  test("no checked result in the days: stays not checked with its note", () => {
    const v = pageView([day("2026-11-19", [notChecked("no key")])], "hob-nl");
    expect(v?.speed).toMatchObject({ level: "not-checked", note: "no key" });
    expect(v?.speed.from).toBeUndefined();
  });

  test("a project that is not in the newest file", () => {
    expect(pageView([day("2026-11-19")], "pretband")).toBeNull();
    expect(pageView([], "hob-nl")).toBeNull();
  });

  test("a file older than 30 days is not used (readDays drops it)", async () => {
    const dir = await tmp();
    await writeDay(dir, day("2026-10-15", [poorLinks]));
    await writeDay(dir, day("2026-11-19", [notChecked("site down")]));
    const { days } = await readDays(dir, now);
    expect(pageView(days, "hob-nl")?.links.level).toBe("not-checked");
  });

  test("from is never written to a day file", async () => {
    const dir = await tmp();
    const { days } = { days: [day("2026-11-19", [notChecked("site down")]), day("2026-11-18")] };
    pageView(days, "hob-nl");
    await writeDay(dir, days[0]);
    expect(await Bun.file(join(dir, "2026-11-19.json")).text()).not.toContain('"from"');
  });
});
