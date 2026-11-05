export type ProjectState = "active" | "maintenance" | "archived";

export interface Project {
  id: string;
  name: string;
  repo: string | null;
  status: ProjectState;
  stakeholder?: string | null;
  domain?: string | null;
  // Spec 008: rule id (R1 to R9) to the reason why the rule does not apply.
  exceptions?: Record<string, string>;
}

export type UptimeState = "up" | "down" | "no-domain" | "not-available";

// `at` is the time of the check; it is null for `no-domain` (spec 005).
export interface Uptime {
  state: UptimeState;
  at: Date | null;
}

export type Reason =
  | "ci-failed"
  | "deploy-failed"
  | "renovate-stale"
  | "inactive"
  | "site-down"
  | "not-conformant";

export interface Problem {
  projectId: string;
  reason: Reason;
  key: string;
  // Spec 008: names of the failed rules.
  detail?: string[];
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
  // Spec 008: ids of the conformance rules that could not be read.
  conformanceNotAvailable: string[];
}

export interface StatusPage {
  generatedAt: Date;
  rows: ProjectStatus[];
  // Marker key `<project id>/<reason>` to the number of the open status-problem issue.
  issues: Map<string, number>;
}

// Spec 008, data-model.md. A value that could not be read is "not-available".
export type NA = "not-available";
export interface RepoFacts {
  private: boolean;
  hasIssues: boolean;
  defaultBranch: string;
  hasPackageJson: boolean | NA;
  workflows: { path: string; text: string }[] | NA;
  renovate: { extends?: unknown } | null | NA;
  dependabot: boolean | NA;
  vulnerabilityAlerts: boolean | NA;
  securityFixes: boolean | NA;
  secretNames: string[] | NA;
  variableNames: string[] | NA;
}

export type RuleState = "pass" | "fail" | "not-applicable" | "not-available";
export interface RuleResult {
  rule: string;
  state: RuleState;
}
