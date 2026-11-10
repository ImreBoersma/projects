// Spec 016 FR-005, data-model.md "Drift step": mark each version that is one or more major
// versions behind the highest major of its tool. A tool of one repo only makes no mark.
import type { Tool, VersionRow } from "../types";
import { TOOLS } from "./parse";

export function markDrift(rows: VersionRow[]): VersionRow[] {
  const highest = new Map<Tool, number>();
  for (const [tool] of TOOLS) {
    const majors = rows
      .filter((r) => r.state === "ok")
      .map((r) => r.tools[tool]?.major)
      .filter((m): m is number => typeof m === "number");
    if (majors.length >= 2) highest.set(tool, Math.max(...majors));
  }
  return rows.map((r) => ({
    ...r,
    tools: Object.fromEntries(
      Object.entries(r.tools).map(([tool, v]) => {
        const top = highest.get(tool as Tool);
        const plain = { text: v.text, source: v.source, major: v.major };
        return [
          tool,
          r.state === "ok" && top !== undefined && v.major !== null && top - v.major >= 1
            ? { ...plain, behind: top - v.major, highest: top }
            : plain,
        ];
      }),
    ),
  }));
}

export const markedCount = (rows: VersionRow[]) =>
  rows.filter((r) => Object.values(r.tools).some((v) => v?.behind)).length;
