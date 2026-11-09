// Links of the status page cells (spec 007, data-model.md "Links of a row").
// FR-010: links use only the catalog repo and domain, the commit id, the Renovate app login,
// issue numbers and fixed GitHub paths.
import type { ProjectStatus } from "./types";

const GITHUB = "https://github.com";
const ISSUES = `${GITHUB}/ImreBoersma/projects/issues`;

export interface RowLinks {
  project: string | null;
  ci: string | null;
  deploy: string | null;
  renovate: string | null;
  site: string | null;
  // Problem key to the URL of its issue (spec 013: one project can have two problems of a reason).
  problems: Map<string, string>;
}

export function rowLinks(s: ProjectStatus, issues: Map<string, number>): RowLinks {
  const { repo, domain } = s.project;
  const site = domain ? `https://${domain}/` : null;
  const repoUrl = repo ? `${GITHUB}/${repo}` : null;
  // Data cells link only when the repo data is available.
  const data = s.availability === "ok" ? repoUrl : null;
  const problems = new Map<string, string>();
  for (const p of s.problems) {
    const number = issues.get(p.key);
    if (number !== undefined) problems.set(p.key, `${ISSUES}/${number}`);
  }
  return {
    project: repoUrl ?? site,
    ci: data && s.ci !== "unknown" && s.commitOid ? `${data}/commit/${s.commitOid}/checks` : null,
    deploy: data && s.deploy !== "unknown" ? `${data}/deployments` : null,
    renovate:
      data && s.renovatePrCount > 0 && s.renovateApp
        ? `${data}/pulls?q=${encodeURIComponent(`is:pr is:open author:app/${s.renovateApp}`).replace(/%20/g, "+")}`
        : null,
    site,
    problems,
  };
}

// Spec 020 US4, research.md §6: GitHub pages that do the work after GitHub's own login.
export function shortcuts(repo: string | null): { label: string; url: string }[] {
  if (!repo) return [];
  const base = `${GITHUB}/${repo}`;
  return [
    { label: "CI runs", url: `${base}/actions` },
    { label: "Deployments", url: `${base}/deployments` },
    {
      label: "Renovate dashboard",
      url: `${base}/issues?q=is%3Aissue+is%3Aopen+in%3Atitle+%22Dependency+Dashboard%22`,
    },
    { label: "Issues", url: `${base}/issues` },
  ];
}

export const STATUS_WORKFLOW = `${GITHUB}/ImreBoersma/projects/actions/workflows/status-page.yml`;
