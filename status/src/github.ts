import type { Deploy, Project, ProjectStatus } from "./types";

const TOKEN_BY_OWNER: Record<string, string> = {
  ImreBoersma: "STATUS_READ_TOKEN",
  "harmonieorkest-brummen": "STATUS_READ_TOKEN_HOB",
};
const RENOVATE = new Set(["renovate", "renovate[bot]"]);

interface RepoNode {
  defaultBranchRef: {
    target: { committedDate: string; statusCheckRollup: { state: string } | null };
  } | null;
  pullRequests: {
    totalCount: number;
    nodes: { createdAt: string; author: { login: string } | null }[];
  };
  deployments: { nodes: { createdAt: string; latestStatus: { state: string } | null }[] };
}

export function tokenFor(owner: string, env: Record<string, string | undefined>) {
  const name = TOKEN_BY_OWNER[owner];
  return name ? env[name] || undefined : undefined;
}

// FR-018: request no text fields (commit messages, PR titles, branch names).
const FIELDS = `
  defaultBranchRef { target { ... on Commit { committedDate statusCheckRollup { state } } } }
  pullRequests(states: OPEN, first: 100) { totalCount nodes { createdAt author { login } } }
  deployments(environments: ["production", "Production", "github-pages"], first: 1,
    orderBy: { field: CREATED_AT, direction: DESC }) { nodes { createdAt latestStatus { state } } }`;

export function buildQuery(repos: string[]): string {
  const aliases = repos.map((repo, i) => {
    const [owner, name] = repo.split("/");
    return `r${i}: repository(owner: ${JSON.stringify(owner)}, name: ${JSON.stringify(name)}) {${FIELDS}\n}`;
  });
  return `query {\n${aliases.join("\n")}\n}`;
}

function emptyStatus(project: Project, availability: ProjectStatus["availability"]): ProjectStatus {
  return {
    project,
    availability,
    lastCommitAt: null,
    openPrCount: 0,
    renovatePrCount: 0,
    oldestRenovatePrAt: null,
    ci: "unknown",
    deploy: "unknown",
    problems: [],
  };
}

export function mapRepo(node: RepoNode | null, project: Project): ProjectStatus {
  if (!node) return emptyStatus(project, "unavailable");
  const commit = node.defaultBranchRef?.target;
  const rollup = commit?.statusCheckRollup?.state;
  const renovate = node.pullRequests.nodes
    .filter((pr) => pr.author && RENOVATE.has(pr.author.login))
    .map((pr) => new Date(pr.createdAt))
    .sort((a, b) => a.getTime() - b.getTime());
  const dep = node.deployments.nodes[0];
  const state = dep?.latestStatus?.state;
  const deploy: Deploy = dep
    ? {
        at: new Date(dep.createdAt),
        result:
          state === "SUCCESS"
            ? "succeeded"
            : state === "FAILURE" || state === "ERROR"
              ? "failed"
              : "in-progress",
      }
    : "unknown";
  return {
    ...emptyStatus(project, "ok"),
    lastCommitAt: commit?.committedDate ? new Date(commit.committedDate) : null,
    openPrCount: node.pullRequests.totalCount,
    renovatePrCount: renovate.length,
    oldestRenovatePrAt: renovate[0] ?? null,
    ci:
      rollup === "SUCCESS"
        ? "passed"
        : rollup === "FAILURE" || rollup === "ERROR"
          ? "failed"
          : "unknown",
    deploy,
  };
}

async function query(repos: string[], token: string): Promise<Record<string, RepoNode | null>> {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: buildQuery(repos) }),
  });
  if (!res.ok) throw new Error(`GitHub GraphQL: HTTP ${res.status}`);
  const body = (await res.json()) as { data?: Record<string, RepoNode | null>; errors?: unknown[] };
  if (body.errors?.length) console.error("GitHub GraphQL errors:", JSON.stringify(body.errors));
  return body.data ?? {};
}

export async function fetchStatuses(
  projects: Project[],
  env: Record<string, string | undefined>,
): Promise<ProjectStatus[]> {
  const byToken = new Map<string, Project[]>();
  const result = new Map<string, ProjectStatus>();
  for (const p of projects) {
    if (!p.repo) {
      result.set(p.id, emptyStatus(p, "no-repo"));
      continue;
    }
    const token = tokenFor(p.repo.split("/")[0], env);
    if (!token) {
      result.set(p.id, emptyStatus(p, "unavailable"));
      continue;
    }
    byToken.set(token, [...(byToken.get(token) ?? []), p]);
  }
  for (const [token, group] of byToken) {
    try {
      const data = await query(
        group.map((p) => p.repo as string),
        token,
      );
      group.forEach((p, i) => {
        result.set(p.id, mapRepo(data[`r${i}`] ?? null, p));
      });
    } catch (error) {
      console.error(error);
      for (const p of group) result.set(p.id, emptyStatus(p, "unavailable"));
    }
  }
  return projects.map((p) => result.get(p.id) as ProjectStatus);
}
