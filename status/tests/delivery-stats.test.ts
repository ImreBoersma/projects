import { describe, expect, test } from "bun:test";
import { deliveryRow, deliveryTotal, median, timeText, windowMonths } from "../src/delivery/stats";
import type { RawDelivery } from "../src/types";

const now = new Date("2026-11-10T12:00:00Z");
const H = 3_600_000;
// A PR merged `ago` hours before now, open for `open` hours.
const pr = (ago: number, open: number, bot = true) => {
  const merged = now.getTime() - ago * H;
  return {
    createdAt: new Date(merged - open * H).toISOString(),
    mergedAt: new Date(merged).toISOString(),
    bot,
  };
};

describe("median and time text (spec 017 research §3, §5)", () => {
  test("median", () => {
    expect(median([])).toBeNull();
    expect(median([5])).toBe(5);
    expect(median([50, 2, 10])).toBe(10);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    const input = [3, 1, 2];
    median(input);
    expect(input).toEqual([3, 1, 2]);
  });

  test.each([
    [null, "—"],
    [0.5, "< 1 h"],
    [1, "1 h"],
    [33.9, "33 h"],
    [47.9, "47 h"],
    [48, "2 d"],
    [270, "11 d"],
  ])("%p → %s", (hours, text) => {
    expect(timeText(hours)).toBe(text);
  });
});

describe("windowMonths (research §4)", () => {
  test("4 months, and 5 when the window starts on the last day of January", () => {
    expect(windowMonths(now)).toEqual(["2026-08", "2026-09", "2026-10", "2026-11"]);
    expect(windowMonths(new Date("2027-05-01T12:00:00Z"))).toEqual([
      "2027-01",
      "2027-02",
      "2027-03",
      "2027-04",
      "2027-05",
    ]);
  });
});

describe("deliveryRow and deliveryTotal", () => {
  const project = { id: "one", name: "One" };

  test("counts in the window only; bot and other PRs; deploys by month", () => {
    const raw: RawDelivery = {
      prs: [pr(10, 2), pr(20, 10), pr(30, 50), pr(5, 0.5, false), pr(24 * 91, 1)],
      deploys: [
        "2026-08-20T10:00:00Z",
        "2026-11-01T10:00:00Z",
        "2026-11-02T10:00:00Z",
        "2026-08-01T10:00:00Z",
      ],
    };
    const row = deliveryRow(raw, project, now);
    expect(row.merged).toBe(4);
    expect(row.updates).toBe(3);
    expect(median(row.updateHours)).toBe(10);
    expect(row.otherHours).toEqual([0.5]);
    expect(row.deploys).toBe(3);
    expect(row.months).toEqual([
      ["2026-08", 1],
      ["2026-09", 0],
      ["2026-10", 0],
      ["2026-11", 2],
    ]);
  });

  test("not available: no numbers, not in the total", () => {
    const na = deliveryRow("not-available", project, now);
    expect(na.state).toBe("not-available");
    const ok = deliveryRow({ prs: [pr(1, 2)], deploys: [] }, { id: "two", name: "Two" }, now);
    const total = deliveryTotal([na, ok], windowMonths(now));
    expect(total.merged).toBe(1);
  });

  test("the total takes the median of all durations, not of the medians (FR-004)", () => {
    const a = deliveryRow({ prs: [pr(1, 2)], deploys: [] }, project, now);
    const b = deliveryRow({ prs: [pr(1, 10), pr(2, 50)], deploys: [] }, project, now);
    expect(median(deliveryTotal([a, b], windowMonths(now)).updateHours)).toBe(10);
  });

  test("SC-002: rows like the table of 2026-11-10", () => {
    const many = (n: number, open: number, bot: boolean) =>
      Array.from({ length: n }, (_, i) => pr(i + 1, open, bot));
    const scales = deliveryRow(
      { prs: [...many(47, 33, true), ...many(11, 0.1, false)], deploys: [] },
      { id: "scales-exercises", name: "scales-exercises" },
      now,
    );
    const pretband = deliveryRow(
      { prs: many(14, 270, true), deploys: [] },
      { id: "pretband-backend", name: "pretband-backend" },
      now,
    );
    expect([scales.merged, scales.updates]).toEqual([58, 47]);
    const rows = [scales, pretband];
    const top = rows.reduce((a, b) =>
      (median(a.updateHours) ?? 0) >= (median(b.updateHours) ?? 0) ? a : b,
    );
    expect(top.projectId).toBe("pretband-backend");
    const total = deliveryTotal(rows, windowMonths(now));
    expect([total.merged, total.updates]).toEqual([72, 61]);
  });
});
