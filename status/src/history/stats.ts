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
