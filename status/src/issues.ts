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
export function issueContent(problem: Problem, project: Project, today: string) {
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
  projects: Map<string, Project>,
  today: string,
): IssueActions {
  const openKeys = new Map<string, number>();
  for (const issue of openIssues) {
    const key = parseMarker(issue.body);
    if (key) openKeys.set(key, issue.number);
  }
  const found = new Set(problems.map((p) => p.key));
  return {
    open: problems
      .filter((p) => !openKeys.has(p.key))
      .map((p) => ({
        key: p.key,
        ...issueContent(p, projects.get(p.projectId) as Project, today),
      })),
    close: [...openKeys]
      .filter(([key]) => !found.has(key) && !unavailableIds.has(key.split("/")[0]))
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
