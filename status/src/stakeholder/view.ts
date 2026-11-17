// Spec 022 data-model.md: the view model of a stakeholder page. Pure; reads only the StatusPage.
import { daysUntil } from "../expiry/expiry";
import type { ProjectStatus, Reason, StatusPage } from "../types";

// Spec 022 clarification 2026-11-17: only these problems are a "problem" for the board.
export const FAULT_REASONS: Reason[] = ["ci-failed", "deploy-failed"];
// Spec 022 clarification 2026-11-17: a site goes in the top line after 2 hours offline.
export const OFFLINE_ATTENTION_MS = 2 * 60 * 60 * 1000;

export interface SiteFact {
  address: string;
  state: "online" | "offline" | "not-checked";
  since: string | null;
}
export interface AttentionItem {
  kind: "offline";
  project: string;
  address: string;
  since: string;
}
export interface ProjectBlock {
  name: string;
  site: SiteFact | null;
  uptime: { percent: number; since: string | null } | null;
  renewal: { name: string; date: string; days: number } | null;
  state: "works" | "problem" | "not-checked";
}
export interface StakeholderView {
  name: string;
  slug: string;
  generatedAt: Date;
  attention: AttentionItem[];
  projects: ProjectBlock[];
}

// Research §2: lower case, no accents, other characters to one "-".
export function slug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// The badge (contracts/badge.md) uses the same rule for a project without a site.
export function projectState(s: ProjectStatus): ProjectBlock["state"] {
  if (s.availability === "unavailable") return "not-checked";
  return s.problems.some((p) => FAULT_REASONS.includes(p.reason)) ? "problem" : "works";
}

function site(s: ProjectStatus): SiteFact | null {
  const address = s.project.domain;
  if (!address) return null;
  if (s.uptime.state === "down") {
    const since =
      s.history.since[`${s.project.id}/site-down`] ?? s.uptime.at?.toISOString() ?? null;
    return { address, state: "offline", since };
  }
  if (s.uptime.state === "up") return { address, state: "online", since: null };
  // `since` is the time of the check that did not work.
  return { address, state: "not-checked", since: s.uptime.at?.toISOString() ?? null };
}

function block(s: ProjectStatus, page: StatusPage): ProjectBlock {
  const percent = s.history.uptime?.percent ?? null;
  const start = page.historyStart;
  const long = !start || daysUntil(start, page.generatedAt) <= -30;
  const next = s.expiry.renewals
    .filter((r) => r.days >= 0)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  return {
    name: s.project.name,
    site: site(s),
    uptime: percent === null ? null : { percent, since: long ? null : start },
    renewal: next ? { name: next.name, date: next.date, days: next.days } : null,
    state: projectState(s),
  };
}

export function stakeholderViews(page: StatusPage): StakeholderView[] {
  const groups = new Map<string, ProjectStatus[]>();
  for (const s of page.rows) {
    const name = s.project.stakeholder;
    if (name) groups.set(name, [...(groups.get(name) ?? []), s]);
  }
  const slugs = new Map<string, string>();
  for (const name of groups.keys()) {
    const other = slugs.get(slug(name));
    if (other) throw new Error(`Stakeholders "${other}" and "${name}" have the same address.`);
    slugs.set(slug(name), name);
  }
  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);
  return [...groups.entries()]
    .map(([name, rows]) => {
      const projects = rows.map((s) => ({ s, b: block(s, page) })).sort((x, y) => byName(x.b, y.b));
      const attention = projects.flatMap(({ b }): AttentionItem[] =>
        b.site?.state === "offline" &&
        b.site.since &&
        page.generatedAt.getTime() - Date.parse(b.site.since) >= OFFLINE_ATTENTION_MS
          ? [{ kind: "offline", project: b.name, address: b.site.address, since: b.site.since }]
          : [],
      );
      return {
        name,
        slug: slug(name),
        generatedAt: page.generatedAt,
        attention,
        projects: projects.map(({ b }) => b),
      };
    })
    .sort(byName);
}
