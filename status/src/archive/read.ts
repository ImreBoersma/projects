// Spec 018 research.md §1 and §2: the data for the archive rule. One GraphQL query for each repo,
// in parallel: one query for all repos took 8 s for 8 repos (GitHub stops a query at 10 s).
// The query asks for no title, body or commit message (FR-009).
import { tokenFor } from "../github";
import type { ArchiveRaw, Project } from "../types";
import { type CommitNode, isPersonCommit, isPersonPr, type PrRef } from "./rule";

const MAX_PAGES = 5;
const NEWEST = 20;
const OPEN = 50;
const LABELS = "labels(first: 10) { nodes { name } }";
const HISTORY = (after?: string) =>
  `defaultBranchRef { target { ... on Commit { history(first: 100${after ? `, after: ${JSON.stringify(after)}` : ""}) {
    pageInfo { hasNextPage endCursor }
    nodes { committedDate author { user { login } } associatedPullRequests(first: 1) { nodes { author { __typename } ${LABELS} } } } } } } }`;
const LISTS = `createdAt
  pullRequests(first: ${NEWEST}, orderBy: { field: CREATED_AT, direction: DESC }) { nodes { createdAt author { __typename } ${LABELS} } }
  issues(first: ${NEWEST}, orderBy: { field: CREATED_AT, direction: DESC }) { nodes { createdAt author { __typename } } }
  openPrs: pullRequests(states: OPEN, first: ${OPEN}) { pageInfo { hasNextPage } nodes { author { __typename } ${LABELS} } }
  openIssues: issues(states: OPEN, first: ${OPEN}) { pageInfo { hasNextPage } nodes { author { __typename } } }`;

// An item with `after` asks only for the next page of the commits.
export function buildArchiveQuery(items: { repo: string; after?: string }[]) {
  const aliases = items.map(({ repo, after }, i) => {
    const [owner, name] = repo.split("/");
    return `r${i}: repository(owner: ${JSON.stringify(owner)}, name: ${JSON.stringify(name)}) {
  ${after ? HISTORY(after) : `${LISTS}\n  ${HISTORY()}`}\n}`;
  });
  return `query {\n${aliases.join("\n")}\n}`;
}

type History = {
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
  nodes: CommitNode[];
};
type Dated = PrRef & { createdAt: string };
type RepoData = {
  createdAt?: string;
  defaultBranchRef?: { target: { history?: History } | null } | null;
  pullRequests?: { nodes: Dated[] } | null;
  issues?: { nodes: Dated[] } | null;
  openPrs?: { pageInfo: { hasNextPage: boolean }; nodes: PrRef[] } | null;
  openIssues?: { pageInfo: { hasNextPage: boolean }; nodes: PrRef[] } | null;
} | null;

export async function readArchive(
  projects: Project[],
  env: Record<string, string | undefined>,
  fetch: typeof globalThis.fetch = globalThis.fetch,
): Promise<Map<string, ArchiveRaw | "not-available">> {
  const result = new Map<string, ArchiveRaw | "not-available">();
  // A GraphQL error on one field (for example `issues` without the Issues permission) gives that
  // field null and keeps the other data, so the response is used also when it has `errors`.
  const query = async (token: string, items: Parameters<typeof buildArchiveQuery>[0]) => {
    const res = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: buildArchiveQuery(items) }),
    }).catch(() => null);
    if (!res?.ok) return null;
    const body = (await res.json().catch(() => null)) as { data?: Record<string, RepoData> } | null;
    return body?.data ?? null;
  };

  await Promise.all(
    projects
      .filter((p) => p.repo)
      .map(async (p) => {
        const token = tokenFor((p.repo as string).split("/")[0], env);
        result.set(p.id, token ? await readOne(p.repo as string, token) : "not-available");
      }),
  );
  return result;

  async function readOne(repo: string, token: string): Promise<ArchiveRaw | "not-available"> {
    const data = (await query(token, [{ repo }]))?.r0;
    if (!data?.createdAt || !data.pullRequests || !data.openPrs) return "not-available";
    let history = data.defaultBranchRef?.target?.history;
    const commits = [...(history?.nodes ?? [])];
    let person = commits.find(isPersonCommit);
    for (let page = 1; page < MAX_PAGES && !person && history?.pageInfo.hasNextPage; page++) {
      const next = await query(token, [{ repo, after: history.pageInfo.endCursor ?? undefined }]);
      history = next?.r0?.defaultBranchRef?.target?.history;
      if (!history) return "not-available";
      commits.push(...history.nodes);
      person = history.nodes.find(isPersonCommit);
    }
    const issueData = !!data.issues && !!data.openIssues;
    const newest = (list: Dated[]) => list.find(isPersonPr)?.createdAt ?? null;
    const full = (list: Dated[]) => list.length < NEWEST || list.some(isPersonPr);
    // The newest PR list needs no check: a merged PR by a person is also a person commit, and an
    // open one is in the open list. Only an old closed PR that was not merged can be missed
    // (research §2). Dependabot fills the 20 newest PRs of a repo that nobody works on.
    const lists =
      full(data.issues?.nodes ?? []) &&
      !data.openPrs.pageInfo.hasNextPage &&
      !data.openIssues?.pageInfo.hasNextPage;
    return {
      createdAt: data.createdAt,
      lastPersonCommit: person?.committedDate ?? null,
      oldestCommitRead: commits.at(-1)?.committedDate ?? null,
      historyComplete: !history?.pageInfo.hasNextPage,
      lastPersonPr: newest(data.pullRequests.nodes),
      lastPersonIssue: newest(data.issues?.nodes ?? []),
      openPersonWork: [...data.openPrs.nodes, ...(data.openIssues?.nodes ?? [])].some(isPersonPr),
      listsComplete: issueData && lists,
      notSureReason: !issueData ? "no-issue-data" : lists ? null : "lists",
    };
  }
}
