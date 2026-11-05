export type ProjectState = "active" | "maintenance" | "archived";

export interface Project {
  id: string;
  name: string;
  repo: string | null;
  status: ProjectState;
  stakeholder?: string | null;
  domain?: string | null;
}

export type UptimeState = "up" | "down" | "no-domain" | "not-available";

// `at` is the time of the check; it is null for `no-domain` (spec 005).
export interface Uptime {
  state: UptimeState;
  at: Date | null;
}

export type Reason = "ci-failed" | "deploy-failed" | "renovate-stale" | "inactive" | "site-down";

export interface Problem {
  projectId: string;
  reason: Reason;
  key: string;
}

export type Deploy = { at: Date; result: "succeeded" | "failed" | "in-progress" } | "unknown";

export interface ProjectStatus {
  project: Project;
  availability: "ok" | "no-repo" | "unavailable";
  lastCommitAt: Date | null;
  openPrCount: number;
  renovatePrCount: number;
  oldestRenovatePrAt: Date | null;
  ci: "passed" | "failed" | "unknown";
  deploy: Deploy;
  problems: Problem[];
  uptime: Uptime;
  // Spec 007: data for the links. Null when the repo has no commit or no data, or no Renovate PR.
  commitOid: string | null;
  renovateApp: string | null;
}

export interface StatusPage {
  generatedAt: Date;
  rows: ProjectStatus[];
  // Marker key `<project id>/<reason>` to the number of the open status-problem issue.
  issues: Map<string, number>;
}
