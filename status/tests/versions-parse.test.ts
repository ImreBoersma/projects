import { describe, expect, test } from "bun:test";
import { lowestMajor, nodeFromCi, safeText, sharedNodeDefault } from "../src/versions/parse";

// Spec 016, research.md §4 and §5.
describe("lowestMajor", () => {
  test.each([
    ["^5", 5],
    ["^6.0.3", 6],
    ["16.4.1", 16],
    [">=18 <21", 18],
    [">= 18", 18],
    [">= 18 < 21", 18],
    ["< 21", null],
    ["^20 || ^22", 20],
    [">18", 18],
    ["20.x", 20],
    ["v20", 20],
    ["~2.2.0", 2],
    ["20.1.3-rc.1", 20],
    ["<21", null],
    ["latest", null],
    ["*", null],
    ["workspace:*", null],
    ["lts/*", null],
  ])("%s → %p", (range, major) => {
    expect(lowestMajor(range)).toBe(major);
  });
});

describe("safeText (spec 001 FR-018)", () => {
  test.each([
    ["latest", "latest"],
    ["^19.3.1", "^19.3.1"],
    [">=18 <21", ">=18 <21"],
    ["github:org/repo#main", "Other"],
    ["file:../x", "Other"],
    ["npm:@x/y@1", "Other"],
    ["1".repeat(41), "Other"],
    ["", "Other"],
  ])("%s → %s", (text, shown) => {
    expect(safeText(text)).toBe(shown);
  });
});

describe("Node from the CI files", () => {
  const caller = (w: string) => `name: CI
on: { push: { branches: [main] } }
jobs:
  ci:
    uses: ImreBoersma/projects/.github/workflows/ci-node.yml@main
${w}`;

  test("the node-version that the caller gives", () => {
    expect(nodeFromCi(caller('    with: { node-version: "22" }'))).toBe("22");
    expect(nodeFromCi(caller("    with: { node-version: 20 }"))).toBe("20");
  });

  test("null without it, for another workflow, or for invalid YAML", () => {
    expect(nodeFromCi(caller(""))).toBeNull();
    expect(
      nodeFromCi(
        "jobs:\n  x:\n    uses: a/b/.github/workflows/other.yml@main\n    with: { node-version: 9 }",
      ),
    ).toBeNull();
    expect(nodeFromCi("jobs: [")).toBeNull();
  });

  test("the default of the shared ci-node.yml", async () => {
    const text = await Bun.file(
      new URL("../../.github/workflows/ci-node.yml", import.meta.url),
    ).text();
    expect(sharedNodeDefault(text)).toBe("24");
    expect(sharedNodeDefault("on: push")).toBeNull();
  });
});
