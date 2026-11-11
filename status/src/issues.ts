import { RULES } from "./conformance/rules";
import { PROBLEM_TEXT } from "./problems";
import { SHARED_PROJECT } from "./secrets/expiry";
import type { Problem, Project } from "./types";

export const LABEL = "status-problem";
const MARKER = /^<!-- status-problem: (\S+) -->/;

export interface OpenIssue {
  number: number;
  body: string | null;
}

export interface IssueActions {
  open: { key: string; title: string; body: string }[];
  close: { number: number; comment: string }[];
}

export function parseMarker(body: string | null): string | null {
  return body?.match(MARKER)?.[1] ?? null;
}

// Text follows contracts/issue.md. It contains no text from the project repo (FR-009e).
const DOCS = "https://github.com/ImreBoersma/projects/blob/main/docs/conformance.md";

// Spec 009, contracts/page.md "Issue": steps for each reason.
function steps(problem: Problem): string[] {
  if (problem.reason === "cert-expiring") {
    return [
      "Open the host of the site.",
      "Find why the automatic renewal of the certificate failed.",
      "Renew the certificate.",
    ];
  }
  if (problem.reason === "renewal-due" && problem.source === "registry") {
    return [
      "Renew the domain at the registrar.",
      "The next update reads the new date from the registry.",
    ];
  }
  if (problem.reason === "renewal-due") {
    const name = problem.text?.match(/^Renewal of (.+?) (is|was) due/)?.[1] ?? "it";
    return [`Renew ${name}.`, "Enter the next date in `projects.yaml`, field `renewal`."];
  }
  if (problem.reason === "secret-expiring" && problem.secret) {
    const { kind, where } = problem.secret;
    return [
      "Make a new secret at the provider.",
      `Set it in ${where} (${kind}).`,
      "Change `expires` of this secret in `projects.yaml`. For a GitHub token that the status run uses, the next run reads the new date without a catalog change.",
    ];
  }
  return ["Open the repo of the project.", "Find the cause.", "Repair the cause."];
}

const SOURCE_TEXT = { catalog: "catalog", token: "token", both: "catalog and token" };

// Spec 013, contracts/page-issue.md: the place and the date before the steps.
const secretLines = (problem: Problem) =>
  problem.secret
    ? `Where: ${problem.secret.kind} in ${problem.secret.where}
Date: ${problem.secret.date} (${SOURCE_TEXT[problem.secret.source]})

`
    : "";

export function issueContent(problem: Problem, project: Project, today: string) {
  if (problem.reason === "not-conformant") {
    const rules = (problem.detail ?? []).map((name) => {
      const rule = RULES.find((r) => name.startsWith(`${r.id} `));
      return `- ${name}: ${DOCS}#${rule?.anchor ?? ""}`;
    });
    return {
      title: `${project.name}: ${PROBLEM_TEXT[problem.reason]}`,
      body: `<!-- status-problem: ${problem.key} -->
The status update found this problem on ${today}.

These rules fail:

${rules.join("\n")}

Do the repair steps of each rule. The status page shows the current list.
The next update closes this issue when all rules pass.
`,
    };
  }
  return {
    title: `${project.name}: ${problem.text ?? PROBLEM_TEXT[problem.reason]}`,
    body: `<!-- status-problem: ${problem.key} -->
The status update found this problem on ${today}.

${secretLines(problem)}Do these steps:

${steps(problem)
  .map((step, i) => `${i + 1}. ${step}`)
  .join("\n")}

The next update closes this issue when the problem stops.
`,
  };
}

// The checks that had no data in this run (spec 001, 005, 008, 009). A problem whose check had
// no data stays open: its issue (planIssueActions) and its stored key (spec 010 T024).
export interface KeepContext {
  unavailableIds: Set<string>;
  uptimeNotAvailable: boolean;
  setupUnavailableIds: Set<string>;
  keepKeys: Set<string>;
}

// A site-down issue depends only on the site check (spec 005, FR-008), a not-conformant issue only
// on the setup check (spec 008), a certificate or renewal issue only on its own read (spec 009,
// keepKeys); other issues on the repo data.
export function keepsOpen(ctx: KeepContext, key: string): boolean {
  const id = key.split("/")[0];
  if (ctx.keepKeys.has(key)) return true;
  if (key.endsWith("/site-down")) return ctx.uptimeNotAvailable;
  if (key.endsWith("/not-conformant")) return ctx.setupUnavailableIds.has(id);
  if (key.endsWith("/cert-expiring") || key.includes("/renewal-due/")) return false;
  return ctx.unavailableIds.has(id);
}

export function planIssueActions(
  problems: Problem[],
  openIssues: OpenIssue[],
  unavailableIds: Set<string>,
  uptimeNotAvailable: boolean,
  setupUnavailableIds: Set<string>,
  keepKeys: Set<string>,
  projects: Map<string, Project>,
  today: string,
): IssueActions {
  const openKeys = new Map<string, number>();
  for (const issue of openIssues) {
    const key = parseMarker(issue.body);
    if (key) openKeys.set(key, issue.number);
  }
  const found = new Set(problems.map((p) => p.key));
  const keep = (key: string) =>
    keepsOpen({ unavailableIds, uptimeNotAvailable, setupUnavailableIds, keepKeys }, key);
  return {
    open: problems
      .filter((p) => !openKeys.has(p.key))
      .map((p) => ({
        key: p.key,
        ...issueContent(p, projects.get(p.projectId) ?? SHARED_PROJECT, today),
      })),
    close: [...openKeys]
      .filter(([key]) => !found.has(key) && !keep(key))
      .map(([, number]) => ({
        number,
        comment: `The status update on ${today} did not find this problem. The update closes this issue.`,
      })),
  };
}

async function api(path: string, token: string, init: RequestInit = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error(`GitHub ${init.method ?? "GET"} ${path}: HTTP ${res.status}`);
  return res.status === 204 ? null : res.json();
}

export async function listOpenIssues(repo: string, token: string): Promise<OpenIssue[]> {
  const issues: OpenIssue[] = [];
  for (let page = 1; ; page++) {
    const batch = (await api(
      `/repos/${repo}/issues?state=open&labels=${LABEL}&per_page=100&page=${page}`,
      token,
    )) as OpenIssue[];
    issues.push(...batch);
    if (batch.length < 100) return issues;
  }
}

export async function ensureLabel(repo: string, token: string) {
  try {
    await api(`/repos/${repo}/labels/${LABEL}`, token);
  } catch {
    await api(`/repos/${repo}/labels`, token, {
      method: "POST",
      body: JSON.stringify({ name: LABEL, color: "d93f0b" }),
    });
  }
}

export async function openIssue(repo: string, token: string, title: string, body: string) {
  await api(`/repos/${repo}/issues`, token, {
    method: "POST",
    body: JSON.stringify({ title, body, labels: [LABEL] }),
  });
}

export async function closeIssue(repo: string, token: string, number: number, comment: string) {
  await api(`/repos/${repo}/issues/${number}/comments`, token, {
    method: "POST",
    body: JSON.stringify({ body: comment }),
  });
  await api(`/repos/${repo}/issues/${number}`, token, {
    method: "PATCH",
    body: JSON.stringify({ state: "closed", state_reason: "completed" }),
  });
}
