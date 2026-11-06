import { describe, expect, test } from "bun:test";
import { applyChanges } from "../src/campaign/apply";
import type { CampaignChange } from "../src/types";

const files = (o: Record<string, string | null>) => new Map(Object.entries(o));
const write = (path: string, content: string): CampaignChange => ({ kind: "write", path, content });
const replace = (path: string, old: string, next: string): CampaignChange => ({
  kind: "replace",
  path,
  old,
  new: next,
});

describe("applyChanges (research.md §2)", () => {
  test("write: a missing file is needed; the same content is not", () => {
    expect(applyChanges(files({ ".nvmrc": null }), [write(".nvmrc", "24\n")])).toEqual({
      kind: "needed",
      files: new Map([[".nvmrc", "24\n"]]),
    });
    expect(applyChanges(files({ ".nvmrc": "24\n" }), [write(".nvmrc", "24\n")])).toEqual({
      kind: "not-needed",
    });
  });

  test("replace: all occurrences; already done; old text missing; file missing", () => {
    const r = applyChanges(files({ a: "v22 and v22" }), [replace("a", "v22", "v24")]);
    expect(r).toEqual({ kind: "needed", files: new Map([["a", "v24 and v24"]]) });
    expect(applyChanges(files({ a: "v24" }), [replace("a", "v22", "v24")])).toEqual({
      kind: "not-needed",
    });
    expect(applyChanges(files({ a: "v20" }), [replace("a", "v22", "v24")])).toEqual({
      kind: "failed",
      reason: "a: the old text is not in the file",
    });
    expect(applyChanges(files({ a: null }), [replace("a", "v22", "v24")])).toEqual({
      kind: "failed",
      reason: "a: the file does not exist",
    });
  });

  test("only the files that differ, and the input is not changed", () => {
    const input = files({ a: "v22", b: "done" });
    const r = applyChanges(input, [replace("a", "v22", "v24"), write("b", "done")]);
    expect(r).toEqual({ kind: "needed", files: new Map([["a", "v24"]]) });
    expect(input.get("a")).toBe("v22");
  });
});
