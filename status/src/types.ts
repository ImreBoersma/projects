export type ProjectState = "active" | "maintenance" | "archived";

export interface Project {
  id: string;
  name: string;
  repo: string | null;
  status: ProjectState;
}

export type Reason = "ci-failed" | "deploy-failed" | "renovate-stale" | "inactive";

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
}

export interface StatusPage {
  generatedAt: Date;
  rows: ProjectStatus[];
}
