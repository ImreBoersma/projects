import type { Problem, ProjectStatus, Reason } from "./types";

const DAY = 24 * 60 * 60 * 1000;

export const PROBLEM_TEXT: Record<Reason, string> = {
  "ci-failed": "The last CI run failed.",
  "deploy-failed": "The last deploy failed.",
  "renovate-stale": "A Renovate PR is open for more than 14 days.",
  inactive: "No commit for more than 90 days.",
  "site-down": "The site does not respond correctly.",
};

export function evaluateProblems(s: ProjectStatus, now: Date): Problem[] {
  const reasons: Reason[] = [];
  // The site check does not use the repo data, so it also applies to rows without it (spec 005).
  if (s.uptime.state === "down") reasons.push("site-down");
  if (s.availability === "ok") reasons.push(...repoReasons(s, now));
  return reasons.map((reason) => ({
    projectId: s.project.id,
    reason,
    key: `${s.project.id}/${reason}`,
  }));
}

function repoReasons(s: ProjectStatus, now: Date): Reason[] {
  const olderThan = (date: Date | null, days: number) =>
    date !== null && now.getTime() - date.getTime() > days * DAY;
  const reasons: Reason[] = [];
  if (s.ci === "failed") reasons.push("ci-failed");
  if (s.deploy !== "unknown" && s.deploy.result === "failed") reasons.push("deploy-failed");
  if (olderThan(s.oldestRenovatePrAt, 14)) reasons.push("renovate-stale");
  if (s.project.status === "active" && olderThan(s.lastCommitAt, 90)) reasons.push("inactive");
  return reasons;
}

export function sortRows(rows: ProjectStatus[]): ProjectStatus[] {
  return [...rows].sort(
    (a, b) =>
      Number(b.problems.length > 0) - Number(a.problems.length > 0) ||
      a.project.name.localeCompare(b.project.name),
  );
}
