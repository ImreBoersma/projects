// Spec 017, research.md §1 and §2: the merged PRs and the production deploys of the 90-day window.
// One GraphQL query for each read token. The query asks for no text field (spec 001 FR-018).
import { tokenFor } from "../github";
import type { Project, RawDelivery } from "../types";
import { windowStart } from "./stats";

const MAX_PAGES = 5;
type Cursor = string | null | undefined; // undefined: first page; string: next page; null: skip

const after = (c: string | undefined) => (c ? `, after: ${JSON.stringify(c)}` : "");
const PRS = (c?: string) =>
  `pullRequests(states: MERGED, first: 100, orderBy: { field: UPDATED_AT, direction: DESC }${after(c)}) {
    pageInfo { hasNextPage endCursor } nodes { createdAt mergedAt updatedAt author { __typename } } }`;
const DEPLOYS = (c?: string) =>
  `deployments(environments: ["production", "Production", "github-pages"], first: 100,
    orderBy: { field: CREATED_AT, direction: DESC }${after(c)}) {
    pageInfo { hasNextPage endCursor } nodes { createdAt } }`;

export function buildDeliveryQuery(items: { repo: string; prs?: Cursor; deploys?: Cursor }[]) {
  const aliases = items.map(({ repo, prs, deploys }, i) => {
    const [owner, name] = repo.split("/");
    const parts = [
      prs === null ? "" : PRS(prs ?? undefined),
      deploys === null ? "" : DEPLOYS(deploys ?? undefined),
    ];
    return `r${i}: repository(owner: ${JSON.stringify(owner)}, name: ${JSON.stringify(name)}) {${parts.join("\n")}\n}`;
  });
  return `query {\n${aliases.join("\n")}\n}`;
}

type Page<T> = { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: T[] };
type PrNode = {
  createdAt: string;
  mergedAt: string;
  updatedAt: string;
  author: { __typename: string } | null;
};
type RepoData = { pullRequests?: Page<PrNode>; deployments?: Page<{ createdAt: string }> } | null;

export async function readDelivery(
  projects: Project[],
  env: Record<string, string | undefined>,
  now: Date,
  fetch: typeof globalThis.fetch = globalThis.fetch,
): Promise<Map<string, RawDelivery | "not-available">> {
  const result = new Map<string, RawDelivery | "not-available">();
  const from = windowStart(now).toISOString();
  const byToken = new Map<string, Project[]>();
  for (const p of projects) {
    if (!p.repo) continue;
    const token = tokenFor(p.repo.split("/")[0], env);
    if (!token) result.set(p.id, "not-available");
    else byToken.set(token, [...(byToken.get(token) ?? []), p]);
  }

  const query = async (token: string, items: Parameters<typeof buildDeliveryQuery>[0]) => {
    const res = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: buildDeliveryQuery(items) }),
    }).catch(() => null);
    if (!res?.ok) return null;
    const body = (await res.json().catch(() => null)) as { data?: Record<string, RepoData> } | null;
    return body?.data ?? null;
  };
  const more = <T>(page: Page<T> | undefined, last: (n: T) => string) =>
    page?.pageInfo.hasNextPage &&
    page.nodes.length &&
    last(page.nodes[page.nodes.length - 1]) >= from
      ? (page.pageInfo.endCursor ?? null)
      : null;

  for (const [token, group] of byToken) {
    const first = await query(
      token,
      group.map((p) => ({ repo: p.repo as string })),
    );
    for (const [i, p] of group.entries()) {
      const data = first?.[`r${i}`];
      if (!data?.pullRequests || !data.deployments) {
        result.set(p.id, "not-available");
        continue;
      }
      const prs = [...data.pullRequests.nodes];
      const deploys = [...data.deployments.nodes];
      let prCursor = more(data.pullRequests, (n) => n.updatedAt);
      let depCursor = more(data.deployments, (n) => n.createdAt);
      let failed = false;
      for (let page = 1; page < MAX_PAGES && (prCursor || depCursor); page++) {
        const next = (
          await query(token, [{ repo: p.repo as string, prs: prCursor, deploys: depCursor }])
        )?.r0;
        if (!next) {
          failed = true;
          break;
        }
        if (next.pullRequests) prs.push(...next.pullRequests.nodes);
        if (next.deployments) deploys.push(...next.deployments.nodes);
        prCursor = prCursor ? more(next.pullRequests, (n) => n.updatedAt) : null;
        depCursor = depCursor ? more(next.deployments, (n) => n.createdAt) : null;
      }
      if (failed) {
        result.set(p.id, "not-available");
        continue;
      }
      if (prCursor || depCursor)
        console.log(`Delivery ${p.repo}: more than ${MAX_PAGES * 100} PRs or deploys`);
      result.set(p.id, {
        prs: prs
          .filter((n) => n.mergedAt >= from)
          .map((n) => ({
            createdAt: n.createdAt,
            mergedAt: n.mergedAt,
            bot: n.author?.__typename === "Bot",
          })),
        deploys: deploys.map((n) => n.createdAt).filter((t) => t >= from),
      });
    }
  }
  return result;
}
