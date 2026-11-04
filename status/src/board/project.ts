// Pure rules of the project board (spec 004). The GraphQL calls are in graphql.ts.
import { RENOVATE } from "../github";
import { LABEL, parseMarker } from "../issues";
import type { Project } from "../types";

// The repo of the catalog. Its `status-problem` issues get the Project of the marker (FR-006).
export const PROJECTS_REPO = "ImreBoersma/projects";

export interface Option {
  id?: string;
  name: string;
  color: string;
  description: string;
}

export interface BoardItem {
  id: string;
  contentId: string;
  repo: string;
  number: number;
  isPrivate: boolean;
  open: boolean;
  labels: string[];
  project: string | null;
  stakeholder: string | null;
  roadmap: string | null;
}

export interface OpenIssue {
  id: string;
  repo: string;
  number: number;
  body: string | null;
  author: string | null;
}

// Renovate opens a Dependency Dashboard issue in each repo. It is not a task, so it stays off the
// board (FR-005).
export const isRenovate = (login: string | null) => login !== null && RENOVATE.test(login);

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

// data-model.md, "Catalog lookup".
export function findEntry(projects: Project[], repo: string, body: string | null): Project | null {
  let entry: Project | undefined;
  if (same(repo, PROJECTS_REPO)) {
    const id = parseMarker(body)?.split("/")[0];
    entry = projects.find((p) => p.id === id);
  } else {
    entry = projects.find((p) => p.repo !== null && same(p.repo, repo));
  }
  return entry && entry.status !== "archived" ? entry : null;
}

// Keeps the id of each option that stays, so that items keep their values (research.md §4).
// An option that is not wanted stays while an open item uses it (FR-004).
export function planOptions(
  current: Option[],
  wanted: string[],
  used: Set<string>,
): Option[] | null {
  const keep = current.filter((o) => wanted.includes(o.name) || used.has(o.name));
  const add = wanted
    .filter((name) => !current.some((o) => o.name === name))
    .map((name) => ({ name, color: "GRAY", description: "" }));
  return keep.length === current.length && add.length === 0 ? null : [...keep, ...add];
}

export interface ItemPlan {
  add: { issue: OpenIssue; project: string }[];
  setProject: { item: BoardItem; project: string }[];
  setRoadmapNo: BoardItem[];
}

export function planItems(projects: Project[], items: BoardItem[], issues: OpenIssue[]): ItemPlan {
  const onBoard = new Set(items.map((i) => i.contentId));
  const add = issues.flatMap((issue) => {
    const skip = onBoard.has(issue.id) || isRenovate(issue.author);
    const entry = skip ? null : findEntry(projects, issue.repo, issue.body);
    return entry ? [{ issue, project: entry.name }] : [];
  });
  const setProject = items.flatMap((item) => {
    const entry = item.project === null ? findEntry(projects, item.repo, null) : null;
    return entry ? [{ item, project: entry.name }] : [];
  });
  // FR-008: Roadmap is No when nobody set it.
  const setRoadmapNo = items.filter((i) => i.roadmap === null);
  return { add, setProject, setRoadmapNo };
}

// FR-009: items of private repos and problem items never stay on the roadmap.
export function planRoadmap(items: BoardItem[]): BoardItem[] {
  return items.filter((i) => i.roadmap === "Yes" && (i.isPrivate || i.labels.includes(LABEL)));
}

// The add job changes only empty values. A transferred issue keeps its values.
export function planAdd(values: { project: string | null; roadmap: string | null }) {
  return { setProject: values.project === null, setRoadmap: values.roadmap === null };
}

export interface IssueEvent {
  action: string;
  issue: { node_id: string; body: string | null; user: { login: string } | null };
  changes?: {
    new_issue: { node_id: string; body: string | null };
    new_repository: { full_name: string };
  };
}

// The issue of an `issues` event. A transfer runs in the old repo, so the issue and the repo
// come from `changes` (research.md §8).
export function readEvent(event: IssueEvent, repo: string) {
  const moved = event.action === "transferred" ? event.changes : undefined;
  const issue = moved?.new_issue ?? event.issue;
  return {
    nodeId: issue.node_id,
    body: issue.body,
    repo: moved?.new_repository.full_name ?? repo,
    author: event.issue.user?.login ?? null,
  };
}
