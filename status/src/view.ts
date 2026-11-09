// Spec 012: the view model of the page. Pure functions, no HTML (research.md §2).
import { CERT_LIMIT, RENEWAL_LIMIT } from "./expiry/expiry";
import { PROBLEM_TEXT } from "./problems";
import { SECRET_LIMIT } from "./secrets/expiry";
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

// Spec 013: the shared problems (this repo) count with the problems of the projects.
export function totalState(rows: ProjectStatus[], sharedProblems = 0) {
  const problems = rows.reduce((n, r) => n + r.problems.length, 0) + sharedProblems;
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

export const secretKind = (days: number): BadgeKind => dateKind(days, SECRET_LIMIT);

// Spec 012 design revision: the dot in front of a project name.
export function rowKind(s: ProjectStatus): BadgeKind {
  if (s.problems.length > 0) return "bad";
  if (checkNotAvailable(s)) return "unknown";
  const { certificate, renewals } = s.expiry;
  const dates = [
    ...(certificate && certificate !== "not-known" ? [certificateKind(certificate.days)] : []),
    ...renewals.map((r) => renewalKind(r.days)),
    ...s.secrets.map((x) => secretKind(x.days as number)),
  ];
  return dates.includes("bad") || dates.includes("warn") ? "warn" : "good";
}

// Spec 019, research.md §5: the most important fact of a project, for its row.
export function summaryFact(s: ProjectStatus): { text: string; kind: BadgeKind } {
  const p = s.problems[0];
  if (p) return { text: p.text ?? PROBLEM_TEXT[p.reason], kind: "bad" };
  if (checkNotAvailable(s)) return { text: "Check not available", kind: "unknown" };
  const dated: { text: string; days: number; kind: BadgeKind }[] = [];
  const { certificate, renewals } = s.expiry;
  if (certificate && certificate !== "not-known") {
    dated.push({
      text: "Certificate",
      days: certificate.days,
      kind: certificateKind(certificate.days),
    });
  }
  for (const r of renewals)
    dated.push({ text: `${r.name} renewal`, days: r.days, kind: renewalKind(r.days) });
  for (const x of s.secrets) {
    dated.push({
      text: `Secret ${x.entry.name}`,
      days: x.days as number,
      kind: secretKind(x.days as number),
    });
  }
  const warn = dated.filter((d) => d.kind !== "good").sort((a, b) => a.days - b.days)[0];
  if (warn)
    return {
      text: `${warn.text} in ${warn.days} ${warn.days === 1 ? "day" : "days"}`,
      kind: "warn",
    };
  if (s.secretsNoExpiry.length) {
    return { text: `No expiry: ${s.secretsNoExpiry.join(", ")}`, kind: "warn" };
  }
  return { text: "All correct", kind: "good" };
}

// Spec 019 data-model.md: the nearest date of a certificate, renewal or secret.
export function nextExpiry(s: ProjectStatus): string | null {
  const { certificate, renewals } = s.expiry;
  const dates = [
    ...(certificate && certificate !== "not-known" ? [certificate.date] : []),
    ...renewals.map((r) => r.date),
    ...s.secrets.map((x) => x.date as string),
  ].filter(Boolean);
  return dates.length ? [...dates].sort()[0] : null;
}

// Spec 019 data-model.md "Row": the data attributes of a row.
export function rowData(s: ProjectStatus, order: number): Record<string, string> {
  return {
    name: s.project.name.toLowerCase(),
    state: rowKind(s),
    stakeholder: s.project.stakeholder ?? "",
    site: s.project.domain ? "yes" : "no",
    commit: s.lastCommitAt ? s.lastCommitAt.toISOString() : "",
    expiry: nextExpiry(s) ?? "",
    order: String(order),
  };
}

// Spec 020 research.md §2: the keys of a row for "new" and "fixed".
export function rowKeys(s: ProjectStatus): string[] {
  return [
    ...s.problems.map((p) => p.key),
    ...(rowKind(s) === "warn" ? [`${s.project.id}/warning`] : []),
  ];
}
