// Calculations on the stored results (spec 010, research.md §4). Pure functions.
import type { DayMark, HistoryResult } from "../types";

const DAY = 24 * 60 * 60 * 1000;
const FAULTS = ["/site-down", "/ci-failed", "/deploy-failed", "/cert-expiring"];

// Go back while the key is open. A result without the project (a gap) does not end the row.
export function since(
  results: HistoryResult[],
  projectId: string,
  key: string,
): { time: string; atHistoryStart: boolean } | null {
  let time: string | null = null;
  for (let i = results.length - 1; i >= 0; i--) {
    const p = results[i].projects[projectId];
    if (!p) continue;
    if (!p.problems.includes(key)) return time ? { time, atHistoryStart: false } : null;
    time = results[i].time;
  }
  return time ? { time, atHistoryStart: true } : null;
}

const dayOf = (t: number) => new Date(t).toISOString().slice(0, 10);

export function uptime(
  results: HistoryResult[],
  projectId: string,
  now: Date,
): { percent: number | null; days: DayMark[] } {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const days = Array.from({ length: 30 }, (_, i) => dayOf(today - (29 - i) * DAY));
  const marks = new Map<string, DayMark>(days.map((d) => [d, "no-data"]));
  let up = 0;
  let down = 0;
  for (const r of results) {
    const site = r.projects[projectId]?.site;
    const day = r.time.slice(0, 10);
    if (!marks.has(day) || (site !== "up" && site !== "down")) continue;
    if (site === "up") up++;
    else down++;
    if (site === "down") marks.set(day, "down");
    else if (marks.get(day) === "no-data") marks.set(day, "up");
  }
  const percent = up + down ? Math.round((up / (up + down)) * 1000) / 10 : null;
  return { percent, days: days.map((d) => marks.get(d) as DayMark) };
}

// Faults only (spec clarification 2026-11-05). A period ends at the first later result in which the
// project is present without the key; only periods that ended in the last 90 days count.
export function repairTime(
  results: HistoryResult[],
  now: Date,
): { averageMs: number; count: number } | null {
  const from = now.getTime() - 90 * DAY;
  const open = new Map<string, number>();
  const durations: number[] = [];
  for (const r of results) {
    const t = Date.parse(r.time);
    for (const [id, p] of Object.entries(r.projects)) {
      for (const key of p.problems) {
        if (FAULTS.some((f) => key.endsWith(f)) && !open.has(key)) open.set(key, t);
      }
      for (const [key, start] of open) {
        if (key.startsWith(`${id}/`) && !p.problems.includes(key)) {
          if (t >= from) durations.push(t - start);
          open.delete(key);
        }
      }
    }
  }
  if (durations.length === 0) return null;
  return {
    averageMs: durations.reduce((a, b) => a + b, 0) / durations.length,
    count: durations.length,
  };
}

// Spec 020 research.md §1: the problems that started and stopped in the last 24 hours. The old
// result is the newest one at or before now − 24 h, else the first one. The history stores keys
// only; a text comes from `texts` (the current problems) or from the reason of the key.
export function recentChanges(
  results: HistoryResult[],
  projects: { id: string; name: string }[],
  now: Date,
  reasonText: Record<string, string>,
  texts: Map<string, string> = new Map(),
): {
  since: string;
  started: { key: string; project: string; text: string }[];
  stopped: { key: string; project: string; text: string }[];
} {
  const current = results.at(-1);
  const limit = now.getTime() - DAY;
  const older = results.filter((r) => Date.parse(r.time) <= limit);
  const old = older.at(-1) ?? results[0];
  const keys = (r: HistoryResult | undefined) =>
    new Set(Object.values(r?.projects ?? {}).flatMap((p) => p.problems));
  const before = keys(old);
  const nowKeys = keys(current);
  const names = new Map(projects.map((p) => [p.id, p.name]));
  const item = (key: string) => {
    const [id, reason] = key.split("/");
    return {
      key,
      project: names.get(id) ?? id,
      text: texts.get(key) ?? reasonText[reason] ?? reason,
    };
  };
  return {
    since: old?.time ?? now.toISOString(),
    started: [...nowKeys].filter((k) => !before.has(k)).map(item),
    stopped: [...before].filter((k) => !nowKeys.has(k) && names.has(k.split("/")[0])).map(item),
  };
}

// Spec 010 T024: the keys of this run, and the keys of the previous result that `keep` keeps open
// (their check had no data in this run), so that "since" and the repair time do not see a stop.
export function carryKeys(
  previous: string[] | undefined,
  current: string[],
  keep: (key: string) => boolean,
): string[] {
  return [...current, ...(previous ?? []).filter((k) => !current.includes(k) && keep(k))];
}
