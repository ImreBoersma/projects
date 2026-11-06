import { describe, expect, test } from "bun:test";
import { classify, summarize } from "../src/campaign/status";
import type { ApplyResult } from "../src/types";

const needed: ApplyResult = { kind: "needed", files: new Map([["a", "b"]]) };
const notNeeded: ApplyResult = { kind: "not-needed" };
const pr = (state: "OPEN" | "MERGED" | "CLOSED", rollup: string | null = null) => ({
  state,
  rollup,
  closedAt: state === "OPEN" ? null : "2026-11-10T10:00:00Z",
});

describe("classify (research.md §3, §6)", () => {
  test("PR states and CI", () => {
    expect(classify(pr("OPEN", "SUCCESS"), null)).toBe("open");
    expect(classify(pr("OPEN"), null)).toBe("open");
    expect(classify(pr("OPEN", "FAILURE"), null)).toBe("failed-ci");
    expect(classify(pr("OPEN", "ERROR"), null)).toBe("failed-ci");
    expect(classify(pr("MERGED"), notNeeded)).toBe("merged");
    expect(classify(pr("CLOSED"), notNeeded)).toBe("closed");
  });
  test("no PR, or a needed change again", () => {
    expect(classify(null, needed)).toBe("to-do");
    expect(classify(null, notNeeded)).toBe("not-needed");
    expect(classify(null, { kind: "failed", reason: "x" })).toBe("to-do");
    expect(classify(pr("MERGED"), needed)).toBe("to-do");
  });
});

describe("summarize", () => {
  const c = { id: "node-24", title: "Use Node 24", started: "2026-11-10" };
  const now = new Date("2026-11-12T12:00:00Z");

  test("counts, not done", () => {
    const s = summarize(c, ["merged", "merged", "open", "open", "failed-ci"], [], now);
    expect(s?.counts).toMatchObject({ merged: 2, open: 2, "failed-ci": 1, "to-do": 0 });
    expect(s?.done).toBe(false);
    expect(s?.url).toContain("campaign%2Fnode-24");
  });

  test("done: shown for 7 days after the last close, then hidden", () => {
    const states = ["merged", "not-needed", "closed"] as const;
    const times = ["2026-11-10T10:00:00Z", "2026-11-11T10:00:00Z"];
    expect(summarize(c, [...states], times, now)).toMatchObject({ done: true, doneAt: times[1] });
    expect(summarize(c, [...states], times, new Date("2026-11-18T11:00:00Z"))).toBeNull();
  });
});
