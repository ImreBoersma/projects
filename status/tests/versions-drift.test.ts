import { describe, expect, test } from "bun:test";
import type { Tool, VersionRow } from "../src/types";
import { markDrift, markedCount } from "../src/versions/drift";
import { lowestMajor } from "../src/versions/parse";

const row = (repo: string, tools: Partial<Record<Tool, string>>): VersionRow => ({
  projectId: repo.split("/")[1].toLowerCase(),
  repo,
  state: "ok",
  tools: Object.fromEntries(
    Object.entries(tools).map(([t, text]) => [
      t,
      { text, source: "devDependencies", major: lowestMajor(text) },
    ]),
  ),
});

// The table of spec.md "Current state (2026-11-10)" (SC-002).
const today = [
  row("harmonieorkest-brummen/pretband-backend", { typescript: "^6.0.2", "types-node": "^26.6.5" }),
  row("ImreBoersma/Beter-dan-de-MIDI", {
    typescript: "^6.0.3",
    biome: "^2.6.2",
    "types-node": "^26.6.5",
  }),
  row("ImreBoersma/boek-de-bus", {
    next: "16.4.1",
    react: "19.2.4",
    typescript: "^5",
    biome: "2.2.0",
    "types-node": "^20",
  }),
  row("ImreBoersma/personal-website", {
    next: "^16.4.2",
    react: "^19.3.1",
    typescript: "^6.0.3",
    biome: "^2.5.15",
    "types-node": "^26.6.5",
  }),
  row("ImreBoersma/Reperatie-Formulier", { react: "^19.3.1", biome: "^2.6.3" }),
  row("ImreBoersma/scales-exercises", {
    react: "^19.3.1",
    typescript: "^7.0.2",
    biome: "^2.6.3",
    "types-node": "^26.6.5",
  }),
];

describe("markDrift (spec 016 FR-005)", () => {
  test("the data of 2026-11-10 (SC-002)", () => {
    const marked = markDrift(today);
    const marks = marked.flatMap((r) =>
      Object.entries(r.tools)
        .filter(([, v]) => v.behind)
        .map(([t, v]) => `${r.projectId} ${t} ${v.behind} ${v.highest}`),
    );
    expect(marks).toEqual([
      "pretband-backend typescript 1 7",
      "beter-dan-de-midi typescript 1 7",
      "boek-de-bus typescript 2 7",
      "boek-de-bus types-node 6 26",
      "personal-website typescript 1 7",
    ]);
    expect(markedCount(marked)).toBe(4);
  });

  test("a tool of one repo, a null major and a not-available row make no mark", () => {
    const rows = [
      row("a/one", { next: "^14", react: "latest" }),
      row("a/two", { react: "^19" }),
      { projectId: "x", repo: "a/x", state: "not-available" as const, tools: {} },
    ];
    expect(markedCount(markDrift(rows))).toBe(0);
  });

  test("does not change the input", () => {
    const rows = [row("a/one", { typescript: "^5" }), row("a/two", { typescript: "^7" })];
    const copy = structuredClone(rows);
    markDrift(rows);
    expect(rows).toEqual(copy);
  });
});
