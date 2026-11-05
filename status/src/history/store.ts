// Read and write the stored results (spec 010, contracts/history-file.md).
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import type { HistoryResult, SiteState } from "../types";

const DAY = 24 * 60 * 60 * 1000;
const FUTURE_MS = 10 * 60 * 1000;
const SITES: SiteState[] = ["up", "down", "no-domain", "not-available"];
const FILE = /^(\d{4}-\d{2}-\d{2})\.ndjson$/;

function valid(value: unknown, now: Date): value is HistoryResult {
  const r = value as HistoryResult;
  const t = Date.parse(r?.time);
  if (typeof r?.time !== "string" || Number.isNaN(t) || t > now.getTime() + FUTURE_MS) return false;
  if (!r.projects || typeof r.projects !== "object") return false;
  return Object.values(r.projects).every(
    (p) =>
      SITES.includes(p?.site) &&
      Array.isArray(p.problems) &&
      p.problems.every((k) => typeof k === "string"),
  );
}

// One JSON object on each line. A line that is not valid is skipped (spec edge cases).
export function parseDay(text: string, now: Date): { results: HistoryResult[]; skipped: number } {
  const results: HistoryResult[] = [];
  let skipped = 0;
  for (const line of text.split("\n")) {
    if (line.trim() === "") continue;
    try {
      const value = JSON.parse(line);
      if (valid(value, now)) results.push(value);
      else skipped++;
    } catch {
      skipped++;
    }
  }
  return { results, skipped };
}

// Only the fields of the data model (FR-008).
export function resultLine(result: HistoryResult): string {
  const projects: HistoryResult["projects"] = {};
  for (const [id, p] of Object.entries(result.projects)) {
    projects[id] = { site: p.site, problems: [...p.problems] };
  }
  return `${JSON.stringify({ time: result.time, projects })}\n`;
}

export async function readHistory(
  dir: string,
  now: Date,
  days = 90,
): Promise<{ results: HistoryResult[]; start: string | null }> {
  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    return { results: [], start: null };
  }
  const dates = names.flatMap((n) => n.match(FILE)?.[1] ?? []).sort();
  const first = new Date(now.getTime() - (days - 1) * DAY).toISOString().slice(0, 10);
  const results: HistoryResult[] = [];
  let skipped = 0;
  for (const date of dates.filter((d) => d >= first)) {
    const day = parseDay(await Bun.file(join(dir, `${date}.ndjson`)).text(), now);
    results.push(...day.results);
    skipped += day.skipped;
  }
  if (skipped) console.log(`History: skipped ${skipped} lines that are not valid.`);
  results.sort((a, b) => Date.parse(a.time) - Date.parse(b.time));
  return { results, start: dates[0] ?? null };
}
