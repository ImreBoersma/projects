// Spec 015 US2: the progress of each campaign, for the status run. Read-only (FR-006).
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { tokenFor } from "../github";
import type { ApplyResult, CampaignState, CampaignSummary, Project } from "../types";
import { applyChanges } from "./apply";
import { parseCampaign, targetRepos } from "./parse";
import { searchUrl } from "./run";

const DAY = 24 * 60 * 60 * 1000;
export const STATES: CampaignState[] = [
  "merged",
  "open",
  "failed-ci",
  "closed",
  "to-do",
  "not-needed",
];

export interface CampaignPr {
  state: "OPEN" | "MERGED" | "CLOSED";
  rollup: string | null;
  closedAt: string | null;
}

// Research.md §3 and §6. A merged or closed PR with a needed change again is "to do".
export function classify(pr: CampaignPr | null, apply: ApplyResult | null): CampaignState {
  if (pr?.state === "OPEN")
    return pr.rollup === "FAILURE" || pr.rollup === "ERROR" ? "failed-ci" : "open";
  if (apply?.kind === "needed" || apply?.kind === "failed") return "to-do";
  if (pr?.state === "MERGED") return "merged";
  if (pr?.state === "CLOSED") return "closed";
  return "not-needed";
}

export function summarize(
  c: { id: string; title: string; started: string },
  states: CampaignState[],
  closedTimes: string[],
  now: Date,
): CampaignSummary | null {
  const counts = Object.fromEntries(STATES.map((s) => [s, 0])) as Record<CampaignState, number>;
  for (const s of states) counts[s]++;
  const done = counts.open + counts["failed-ci"] + counts["to-do"] === 0;
  const doneAt = done && closedTimes.length ? ([...closedTimes].sort().at(-1) ?? null) : null;
  if (done && (!doneAt || now.getTime() - Date.parse(doneAt) >= 7 * DAY)) return null;
  return {
    id: c.id,
    title: c.title,
    started: c.started,
    counts,
    done,
    doneAt,
    url: searchUrl(c.id),
  };
}

const QUERY = `query($owner: String!, $name: String!, $branch: String!) {
  repository(owner: $owner, name: $name) {
    pullRequests(headRefName: $branch, states: [OPEN, MERGED, CLOSED], first: 1,
      orderBy: { field: CREATED_AT, direction: DESC }) {
      nodes { state closedAt commits(last: 1) { nodes { commit { statusCheckRollup { state } } } } }
    }
  }
}`;

async function readPr(repo: string, branch: string, token: string): Promise<CampaignPr | null> {
  const [owner, name] = repo.split("/");
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: QUERY, variables: { owner, name, branch } }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const node = (await res.json()).data?.repository?.pullRequests?.nodes?.[0];
  if (!node) return null;
  return {
    state: node.state,
    closedAt: node.closedAt ?? null,
    rollup: node.commits?.nodes?.[0]?.commit?.statusCheckRollup?.state ?? null,
  };
}

async function readFiles(repo: string, paths: string[], token: string) {
  const files = new Map<string, string | null>();
  for (const path of paths) {
    const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.raw" },
    });
    if (res.status === 404) files.set(path, null);
    else if (res.ok) files.set(path, await res.text());
    else throw new Error(`HTTP ${res.status}`);
  }
  return files;
}

export async function readCampaigns(
  dir: string,
  projects: Project[],
  env: Record<string, string | undefined>,
  now: Date,
): Promise<CampaignSummary[]> {
  let names: string[];
  try {
    names = (await readdir(dir)).filter((f) => f.endsWith(".yaml")).sort();
  } catch {
    return [];
  }
  const out: CampaignSummary[] = [];
  for (const name of names) {
    let campaign: ReturnType<typeof parseCampaign>;
    try {
      campaign = parseCampaign(await Bun.file(join(dir, name)).text(), name, projects);
    } catch (error) {
      console.log(error instanceof Error ? error.message : error);
      continue;
    }
    // Old campaigns cost no requests (tasks.md T013).
    if (now.getTime() - Date.parse(`${campaign.started}T00:00:00Z`) > 180 * DAY) continue;
    const states: CampaignState[] = [];
    const closed: string[] = [];
    const paths = [...new Set(campaign.changes.map((c) => c.path))];
    for (const t of targetRepos(campaign, projects)) {
      const token = tokenFor(t.repo.split("/")[0], env);
      if (!token) continue;
      try {
        const pr = await readPr(t.repo, `campaign/${campaign.id}`, token);
        const apply =
          pr?.state === "OPEN"
            ? null
            : applyChanges(await readFiles(t.repo, paths, token), campaign.changes);
        states.push(classify(pr, apply));
        if (pr?.closedAt) closed.push(pr.closedAt);
      } catch {
        console.log(`Campaign ${campaign.id} ${t.repo}: not available`);
      }
    }
    const summary = summarize(campaign, states, closed, now);
    console.log(
      `Campaign ${campaign.id}: ${STATES.map((s) => `${s} ${states.filter((x) => x === s).length}`).join(", ")}`,
    );
    if (summary) out.push(summary);
  }
  return out;
}
