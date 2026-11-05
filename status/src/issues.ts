import { RULES } from "./conformance/rules";
import { PROBLEM_TEXT } from "./problems";
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
    title: `${project.name}: ${PROBLEM_TEXT[problem.reason]}`,
    body: `<!-- status-problem: ${problem.key} -->
The status update found this problem on ${today}.

Do these steps:

1. Open the repo of the project.
2. Find the cause.
3. Repair the cause.

The next update closes this issue when the problem stops.
`,
  };
}

export function planIssueActions(
  problems: Problem[],
  openIssues: OpenIssue[],
  unavailableIds: Set<string>,
  uptimeNotAvailable: boolean,
  setupUnavailableIds: Set<string>,
  projects: Map<string, Project>,
  today: string,
): IssueActions {
  const openKeys = new Map<string, number>();
  for (const issue of openIssues) {
    const key = parseMarker(issue.body);
    if (key) openKeys.set(key, issue.number);
  }
  const found = new Set(problems.map((p) => p.key));
  // A site-down issue depends only on the site check (spec 005, FR-008), a not-conformant issue only
  // on the setup check (spec 008); other issues on the repo data.
  const keep = (key: string) => {
    const id = key.split("/")[0];
    if (key.endsWith("/site-down")) return uptimeNotAvailable;
    if (key.endsWith("/not-conformant")) return setupUnavailableIds.has(id);
    return unavailableIds.has(id);
  };
  return {
    open: problems
      .filter((p) => !openKeys.has(p.key))
      .map((p) => ({
        key: p.key,
        ...issueContent(p, projects.get(p.projectId) as Project, today),
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
