// Spec 023 contracts/quality-file.md: the day files `quality/YYYY-MM-DD.json` on the branch data.
import { mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import { QUALITY_KINDS, type QualityCheck, type QualityDay, type QualityLevel } from "../types";

const FILE = /^(\d{4}-\d{2}-\d{2})\.json$/;
const LEVELS: QualityLevel[] = ["good", "warn", "poor", "not-checked"];
const FALLBACK_DAYS = 30;
const DAY = 24 * 60 * 60 * 1000;

export async function writeDay(dir: string, day: QualityDay): Promise<string> {
  await mkdir(dir, { recursive: true });
  const path = join(dir, `${day.date}.json`);
  await Bun.write(path, `${JSON.stringify(day, null, 2)}\n`);
  return path;
}

// A file that is not valid is skipped; a result with an unknown level reads as not checked.
function valid(value: unknown): QualityDay | null {
  const d = value as QualityDay;
  if (d?.version !== 1 || typeof d.date !== "string" || !Array.isArray(d.checks)) return null;
  const checks = d.checks.filter((c) => typeof c?.projectId === "string" && c.speed && c.links);
  for (const c of checks) {
    for (const kind of QUALITY_KINDS) {
      if (c[kind] && !LEVELS.includes(c[kind].level)) c[kind].level = "not-checked";
    }
  }
  return { ...d, checks };
}

export async function readDays(
  dir: string,
  now: Date,
): Promise<{ newest: QualityDay | null; previous: QualityDay | null; days: QualityDay[] }> {
  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    return { newest: null, previous: null, days: [] };
  }
  const first = new Date(now.getTime() - FALLBACK_DAYS * DAY).toISOString().slice(0, 10);
  const dates = names
    .flatMap((n) => n.match(FILE)?.[1] ?? [])
    .filter((d) => d >= first)
    .sort()
    .reverse();
  const days: QualityDay[] = [];
  for (const date of dates) {
    try {
      const day = valid(JSON.parse(await Bun.file(join(dir, `${date}.json`)).text()));
      if (day) days.push(day);
    } catch {
      // Not valid JSON: use the file before it.
    }
  }
  return { newest: days[0] ?? null, previous: days[1] ?? null, days };
}

// Research.md §7: a kind that is not checked in the newest file takes the newest earlier result
// of that kind, with the date of its file in `from`. Only for the page, never for the issue rule.
export function pageView(days: QualityDay[], projectId: string): QualityCheck | null {
  const newest = days[0]?.checks.find((c) => c.projectId === projectId);
  if (!newest) return null;
  const view: QualityCheck = { ...newest };
  for (const kind of QUALITY_KINDS) {
    if (newest[kind].level !== "not-checked") continue;
    for (const day of days.slice(1)) {
      const earlier = day.checks.find((c) => c.projectId === projectId)?.[kind];
      if (earlier && earlier.level !== "not-checked") {
        // biome-ignore lint/suspicious/noExplicitAny: the 4 kinds have different result types.
        (view as any)[kind] = { ...earlier, from: day.date };
        break;
      }
    }
  }
  return view;
}
