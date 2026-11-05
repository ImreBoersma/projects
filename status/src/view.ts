// Spec 012: the view model of the page. Pure functions, no HTML (research.md §2).
import { CERT_LIMIT, RENEWAL_LIMIT } from "./expiry/expiry";
import type { ProjectStatus } from "./types";

export type BadgeKind = "good" | "warn" | "bad" | "unknown";

// Research.md §3. Self-contained: the page script contains a copy, made with toString().
export function relTime(iso: string, nowMs: number): string {
  const unit = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
  if (iso.length === 10) {
    const now = new Date(nowMs);
    const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const days = Math.round((Date.parse(`${iso}T00:00:00Z`) - today) / 86400000);
    if (days === 0) return "today";
    return days > 0 ? `in ${unit(days, "day")}` : `${unit(-days, "day")} ago`;
  }
  const diff = nowMs - Date.parse(iso);
  const abs = Math.abs(diff);
  if (abs < 60000) return "now";
  const text =
    abs < 3600000
      ? unit(Math.floor(abs / 60000), "minute")
      : abs < 172800000
        ? unit(Math.floor(abs / 3600000), "hour")
        : unit(Math.floor(abs / 86400000), "day");
  return diff >= 0 ? `${text} ago` : `in ${text}`;
}

// Spec FR-005: the only definition of "check not available".
export const checkNotAvailable = (s: ProjectStatus) =>
  s.problems.length === 0 &&
  (s.availability === "unavailable" ||
    s.uptime.state === "not-available" ||
    s.conformanceNotAvailable.length > 0);

export type TotalKind = "correct" | "problems" | "not-available";

export function totalState(rows: ProjectStatus[]) {
  const problems = rows.reduce((n, r) => n + r.problems.length, 0);
  const kind: TotalKind =
    problems > 0 ? "problems" : rows.some(checkNotAvailable) ? "not-available" : "correct";
  const text =
    kind === "problems"
      ? `${problems} ${problems === 1 ? "problem" : "problems"}`
      : kind === "not-available"
        ? "Check not available"
        : "All correct";
  const title = problems > 0 ? `(${problems}) Project status` : "Project status";
  return { kind, problems, text, title };
}

const SECTIONS = [
  { id: "problems", title: "Projects with problems" },
  { id: "not-available", title: "Check not available" },
  { id: "other", title: "Other projects" },
] as const;

export function sections(rows: ProjectStatus[]) {
  const sectionOf = (s: ProjectStatus) =>
    s.problems.length > 0 ? "problems" : checkNotAvailable(s) ? "not-available" : "other";
  return SECTIONS.map((section) => ({
    ...section,
    rows: rows.filter((s) => sectionOf(s) === section.id),
  })).filter((section) => section.rows.length > 0);
}

// Data-model.md "BadgeKind".
export const siteKind = (state: ProjectStatus["uptime"]["state"]): BadgeKind =>
  state === "up" ? "good" : state === "down" ? "bad" : "unknown";

export const ciKind = (ci: ProjectStatus["ci"]): BadgeKind =>
  ci === "passed" ? "good" : ci === "failed" ? "bad" : "unknown";

export const deployKind = (deploy: ProjectStatus["deploy"]): BadgeKind =>
  deploy === "unknown" || deploy.result === "in-progress"
    ? "unknown"
    : deploy.result === "succeeded"
      ? "good"
      : "bad";

const dateKind = (days: number, limit: number): BadgeKind =>
  days <= limit ? "bad" : days <= 2 * limit ? "warn" : "good";

export const certificateKind = (days: number | "not-known"): BadgeKind =>
  days === "not-known" ? "unknown" : dateKind(days, CERT_LIMIT);

export const renewalKind = (days: number): BadgeKind => dateKind(days, RENEWAL_LIMIT);
