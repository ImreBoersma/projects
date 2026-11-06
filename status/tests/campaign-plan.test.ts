import { describe, expect, test } from "bun:test";
import { planRepo } from "../src/campaign/plan";
import type { ApplyResult } from "../src/types";

const needed: ApplyResult = { kind: "needed", files: new Map([["a", "b"]]) };
const notNeeded: ApplyResult = { kind: "not-needed" };
const pr = (state: "open" | "closed" | "merged") => ({ number: 7, state });

describe("planRepo (FR-005)", () => {
  test("no PR", () => {
    expect(planRepo(needed, null, false)).toBe("open");
    expect(planRepo(notNeeded, null, false)).toBe("not-needed");
  });
  test("open PR", () => {
    expect(planRepo(needed, pr("open"), false)).toBe("update");
    expect(planRepo(notNeeded, pr("open"), false)).toBe("not-needed");
  });
  test("closed PR: nothing, unless reopen", () => {
    expect(planRepo(needed, pr("closed"), false)).toBe("closed");
    expect(planRepo(needed, pr("closed"), true)).toBe("reopen");
  });
  test("merged PR: a new PR only when the change is needed again", () => {
    expect(planRepo(needed, pr("merged"), false)).toBe("open");
    expect(planRepo(notNeeded, pr("merged"), false)).toBe("merged");
  });
  test("failed", () => {
    expect(planRepo({ kind: "failed", reason: "x" }, null, false)).toBe("failed");
  });
});
