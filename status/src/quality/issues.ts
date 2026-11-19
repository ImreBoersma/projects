// Spec 023 FR-007, contracts/issue.md, data-model.md "QualityIssue state": one issue for each
// site that is poor in 2 daily checks in a row. Same label as the status issues (board sync of
// spec 004), but its own marker, so that the hourly reconcile does not close it.
import type { OpenIssue } from "../issues";
import {
  type Project,
  QUALITY_KINDS,
  type QualityCheck,
  type QualityDay,
  type QualityKind,
} from "../types";

export const QUALITY_MARKER = /^<!-- site-quality: (\S+) -->/;
const MAX_LINKS = 20;
const DATE_LINE = /^The daily quality check found these poor results on .*$/m;

export const parseQualityMarker = (body: string | null) => body?.match(QUALITY_MARKER)?.[1] ?? null;

const poorKinds = (c: QualityCheck | undefined): QualityKind[] =>
  c ? QUALITY_KINDS.filter((k) => c[k].level === "poor") : [];

function line(c: QualityCheck, kind: QualityKind): string {
  if (kind === "speed") {
    const slow = c.speed.field?.slow.length
      ? ` Slow for real users: ${c.speed.field.slow.join(", ")}.`
      : "";
    return `- Speed: ${c.speed.score} on a phone.${slow} Report: ${c.speed.report}`;
  }
  if (kind === "accessibility") {
    const n = c.accessibility.failed ?? 0;
    return `- Accessibility: ${c.accessibility.score}, ${n} ${n === 1 ? "rule fails" : "rules fail"}. Report: ${c.accessibility.report}`;
  }
  if (kind === "links") {
    const { broken } = c.links;
    const list = broken.slice(0, MAX_LINKS).map((b) => `  - ${b.url} on ${b.page} (${b.status})`);
    if (broken.length > MAX_LINKS) list.push(`  - and ${broken.length - MAX_LINKS} more`);
    return [`- Broken links: ${broken.length}.`, ...list].join("\n");
  }
  return `- Security headers: none of the 4 are sent. Report: ${c.headers.report}`;
}

export function qualityIssueBody(c: QualityCheck, kinds: QualityKind[], date: string): string {
  return `<!-- site-quality: ${c.projectId} -->
The daily quality check found these poor results on ${date} for https://${c.domain}/.

${kinds.map((k) => line(c, k)).join("\n")}

Only the poor results are in this list. The status page shows all results.
The daily check closes this issue when no result of the site is poor.
`;
}

// The date line changes each day; an update is only for a change of the list.
const same = (a: string | null, b: string) =>
  (a ?? "").replace(DATE_LINE, "").trim() === b.replace(DATE_LINE, "").trim();

export interface QualityActions {
  open: { projectId: string; title: string; body: string }[];
  update: { number: number; projectId: string; body: string }[];
  close: { number: number; projectId: string; comment: string }[];
}

export function planQualityIssues(
  today: QualityDay,
  previous: QualityDay | null,
  openIssues: OpenIssue[],
  projects: Map<string, Project>,
): QualityActions {
  const open = new Map<string, OpenIssue & { number: number }>();
  for (const issue of openIssues) {
    const id = parseQualityMarker(issue.body);
    if (id) open.set(id, issue);
  }
  const actions: QualityActions = { open: [], update: [], close: [] };
  for (const c of today.checks) {
    const now = poorKinds(c);
    const issue = open.get(c.projectId);
    const body = qualityIssueBody(c, now, today.date);
    if (!issue) {
      const before = poorKinds(previous?.checks.find((p) => p.projectId === c.projectId));
      if (!now.some((k) => before.includes(k))) continue;
      const name = projects.get(c.projectId)?.name ?? c.projectId;
      actions.open.push({ projectId: c.projectId, title: `${name}: Site quality is poor`, body });
    } else if (QUALITY_KINDS.every((k) => c[k].level === "not-checked")) {
      // No data today: the issue stays as it is.
    } else if (!now.length) {
      actions.close.push({
        number: issue.number,
        projectId: c.projectId,
        comment: `The quality check on ${today.date} found no poor result. The check closes this issue.`,
      });
    } else if (!same(issue.body, body)) {
      actions.update.push({ number: issue.number, projectId: c.projectId, body });
    }
  }
  return actions;
}
