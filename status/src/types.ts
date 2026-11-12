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
  // Spec 009: renewal dates from the catalog field `renewal`.
  renewals?: { name: string; date: string }[];
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
  | "not-conformant"
  | "cert-expiring"
  | "renewal-due"
  | "secret-expiring";

export interface Problem {
  projectId: string;
  reason: Reason;
  key: string;
  // Spec 008: names of the failed rules.
  detail?: string[];
  // Spec 009: a text with numbers, for the page and the issue title, in place of the fixed text.
  text?: string;
  // Spec 009: where a renewal date comes from; the issue steps differ.
  source?: "catalog" | "registry";
  // Spec 013: the place and the date of an expiring secret, for the issue text.
  secret?: { kind: SecretKind; where: string; date: string; source: SecretStatus["source"] };
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
  // Spec 007 T024: each Renovate app with an open PR (hosted and self-hosted).
  renovateApps: string[];
  // Spec 008: ids of the conformance rules that could not be read.
  conformanceNotAvailable: string[];
  expiry: Expiry;
  // Spec 010: values from the stored results.
  history: ProjectHistory;
  // Spec 013: the secrets of this project with a date, and the names that are not in the catalog.
  secrets: SecretStatus[];
  secretGaps: string[];
  // Spec 013 FR-010: names of secrets that can expire but have no date.
  secretsNoExpiry: string[];
}

export interface StatusPage {
  // Spec 010: date of the first stored result, and the repair time of 90 days.
  historyStart?: string | null;
  repair?: { averageMs: number; count: number } | null;
  generatedAt: Date;
  rows: ProjectStatus[];
  // Spec 020: the problems that started and stopped in the last 24 hours.
  changes?: RecentChanges;
  // Spec 019: the built DaisyUI CSS (build/page.css); tests pass a small fake.
  css?: string;
  // Spec 015: the campaigns to show.
  campaigns?: CampaignSummary[];
  // Spec 013: the secrets of the shared setup (this repo).
  shared?: { secrets: SecretStatus[]; problems: Problem[]; gaps: string[]; noExpiry?: string[] };
  // Marker key `<project id>/<reason>` to the number of the open status-problem issue.
  issues: Map<string, number>;
  // Spec 016: the versions of the tools in each repo, after the drift step.
  versions?: VersionRow[];
  // Spec 017: the delivery numbers of the last 90 days.
  delivery?: { rows: DeliveryRow[]; months: string[] };
}

// Spec 017, data-model.md.
export interface RawDelivery {
  prs: { createdAt: string; mergedAt: string; bot: boolean }[];
  deploys: string[];
}
export interface DeliveryRow {
  projectId: string;
  name: string;
  state: "ok" | "not-available";
  merged: number;
  updates: number;
  updateHours: number[];
  otherHours: number[];
  deploys: number;
  months: [string, number][];
}

// Spec 016, data-model.md: the tools of the table, in column order.
export type Tool = "node" | "bun" | "next" | "react" | "typescript" | "biome" | "types-node";
export interface ToolVersion {
  text: string;
  source: string;
  major: number | null;
  behind?: number;
  highest?: number;
}
export interface VersionRow {
  projectId: string;
  repo: string;
  state: "ok" | "not-available";
  tools: Partial<Record<Tool, ToolVersion>>;
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

// Spec 009, data-model.md.
export interface Renewal {
  name: string;
  date: string;
  days: number;
  source: "catalog" | "registry";
}
export interface Expiry {
  certificate: { date: string; days: number } | "not-known" | null;
  renewals: Renewal[];
  registryNotKnown: boolean;
}

// Spec 010, data-model.md.
export type SiteState = "up" | "down" | "no-domain" | "not-available";
export interface HistoryResult {
  time: string;
  projects: Record<string, { site: SiteState; problems: string[] }>;
}
export type DayMark = "up" | "down" | "no-data";
export interface ProjectHistory {
  since: Record<string, string>;
  sinceIsHistoryStart: string[];
  uptime: { percent: number | null; days: DayMark[] } | null;
  // Date (UTC) of the last day of the bar.
  uptimeEnd?: string;
}

// Spec 013: the catalog list `secrets` (contracts/catalog.md).
// No `account`: host logins are not listed in the public catalog (spec 013 clarification).
// `external`: a token kept in an outside service (for example cron-job.org); `where` is its host.
export type SecretKind = "actions-secret" | "environment-secret" | "actions-variable" | "external";

export interface SecretEntry {
  name: string;
  kind: SecretKind;
  where: string;
  expires: string;
  project: string | null;
}

export interface SecretStatus {
  entry: SecretEntry;
  owner: string;
  date: string | null;
  days: number | null;
  source: "catalog" | "token" | "both";
}

// Spec 015: campaigns (data-model.md).
export type CampaignChange =
  | { kind: "write"; path: string; content: string }
  | { kind: "replace"; path: string; old: string; new: string };

export interface Campaign {
  id: string;
  title: string;
  reason: string;
  started: string;
  repos: "all" | string[];
  changes: CampaignChange[];
}

export type ApplyResult =
  | { kind: "needed"; files: Map<string, string> }
  | { kind: "not-needed" }
  | { kind: "failed"; reason: string };

export type RepoResult =
  | { kind: "opened" | "updated" | "up-to-date" | "merged" | "closed"; pr: number }
  | { kind: "not-needed" | "no-access" }
  | { kind: "changed-by-hand"; pr: number }
  | { kind: "failed"; reason: string };

export type CampaignState =
  | "merged"
  | "open"
  | "failed-ci"
  | "closed"
  | "not-needed"
  | "to-do"
  | "not-available";

export interface CampaignSummary {
  id: string;
  title: string;
  started: string;
  counts: Record<CampaignState, number>;
  done: boolean;
  doneAt: string | null;
  url: string;
}

// Spec 020 data-model.md "Recent changes".
export interface RecentChanges {
  since: string;
  started: { key: string; project: string; text: string }[];
  stopped: { key: string; project: string; text: string }[];
}
