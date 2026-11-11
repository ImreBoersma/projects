// Spec 017, research.md §3 to §5: the delivery numbers of one project. Pure functions.
import type { DeliveryRow, Project, RawDelivery } from "../types";

const DAY = 86_400_000;
const HOUR = 3_600_000;
export const WINDOW_DAYS = 90;

export const windowStart = (now: Date) => new Date(now.getTime() - WINDOW_DAYS * DAY);

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

// FR-010: "< 1 h", whole hours below 48, whole days from 48 (rounded down).
export function timeText(hours: number | null): string {
  if (hours === null) return "—";
  if (hours < 1) return "< 1 h";
  if (hours < 48) return `${Math.floor(hours)} h`;
  return `${Math.floor(hours / 24)} d`;
}

// The calendar months (UTC, `YYYY-MM`) from the month of the window start to the month of `now`.
export function windowMonths(now: Date): string[] {
  const start = windowStart(now);
  const months: string[] = [];
  const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  while (d <= now) {
    months.push(d.toISOString().slice(0, 7));
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return months;
}

export function deliveryRow(
  raw: RawDelivery | "not-available",
  project: Pick<Project, "id" | "name">,
  now: Date,
): DeliveryRow {
  const months = windowMonths(now);
  const row: DeliveryRow = {
    projectId: project.id,
    name: project.name,
    state: "ok",
    merged: 0,
    updates: 0,
    updateHours: [],
    otherHours: [],
    deploys: 0,
    months: months.map((m) => [m, 0]),
  };
  if (raw === "not-available") return { ...row, state: "not-available" };
  const from = windowStart(now).getTime();
  for (const pr of raw.prs) {
    if (Date.parse(pr.mergedAt) < from) continue;
    const hours = (Date.parse(pr.mergedAt) - Date.parse(pr.createdAt)) / HOUR;
    row.merged++;
    if (pr.bot) {
      row.updates++;
      row.updateHours.push(hours);
    } else row.otherHours.push(hours);
  }
  for (const at of raw.deploys) {
    if (Date.parse(at) < from) continue;
    row.deploys++;
    const month = row.months.find(([m]) => m === at.slice(0, 7));
    if (month) month[1]++;
  }
  return row;
}

// FR-004: sums of the available rows, and all their durations together (for the medians).
export function deliveryTotal(rows: DeliveryRow[], months: string[]): DeliveryRow {
  const ok = rows.filter((r) => r.state === "ok");
  const sum = (f: (r: DeliveryRow) => number) => ok.reduce((n, r) => n + f(r), 0);
  return {
    projectId: "total",
    name: "Total",
    state: "ok",
    merged: sum((r) => r.merged),
    updates: sum((r) => r.updates),
    updateHours: ok.flatMap((r) => r.updateHours),
    otherHours: ok.flatMap((r) => r.otherHours),
    deploys: sum((r) => r.deploys),
    months: months.map((m) => [m, sum((r) => r.months.find(([x]) => x === m)?.[1] ?? 0)]),
  };
}
