// Spec 013: pure rules for the expiry of secrets (data-model.md).
import { daysUntil, slug } from "../expiry/expiry";
import type { Problem, Project, SecretEntry, SecretStatus } from "../types";

export const SECRET_LIMIT = 30;
export const SHARED = "shared";
// Research.md §3 and §5: the owner of the secrets of this repo.
export const SHARED_PROJECT: Project = {
  id: SHARED,
  name: "Shared setup",
  repo: "ImreBoersma/projects",
  status: "active",
};
const THIS_REPO = "ImreBoersma/projects";

// Research.md §3: a read date for a status token, by the name of its environment variable.
export type ReadDates = Map<string, string>;

export function secretStatuses(
  entries: SecretEntry[],
  readDates: ReadDates,
  projects: Project[],
  now: Date,
): SecretStatus[] {
  const archived = new Set(projects.filter((p) => p.status === "archived").map((p) => p.id));
  const all = [...entries];
  for (const name of readDates.keys()) {
    const listed = entries.some((e) => e.name === name && e.where === THIS_REPO);
    if (!listed) {
      all.push({ name, kind: "actions-secret", where: THIS_REPO, expires: "never", project: null });
    }
  }
  return all
    .filter((e) => !(e.project && archived.has(e.project)))
    .map((entry) => {
      const catalog = entry.expires === "never" ? null : entry.expires;
      const read = entry.where === THIS_REPO ? (readDates.get(entry.name) ?? null) : null;
      // Dates as YYYY-MM-DD sort as text; the earlier date wins (FR-003).
      const date = catalog && read ? [catalog, read].sort()[0] : (catalog ?? read);
      const source = catalog && read ? "both" : read ? "token" : "catalog";
      return {
        entry,
        owner: entry.project ?? SHARED,
        date,
        days: date ? daysUntil(date, now) : null,
        source,
      };
    });
}

export function secretProblems(statuses: SecretStatus[]): Problem[] {
  return statuses
    .filter((s) => s.date !== null && (s.days as number) <= SECRET_LIMIT)
    .map((s) => {
      const days = s.days as number;
      const n = Math.abs(days);
      const unit = `${n} ${n === 1 ? "day" : "days"}`;
      return {
        projectId: s.owner,
        reason: "secret-expiring" as const,
        key: `${s.owner}/secret-expiring/${slug(s.entry.name)}`,
        text:
          days >= 0
            ? `The secret ${s.entry.name} expires in ${unit}.`
            : `The secret ${s.entry.name} expired ${unit} ago.`,
        secret: {
          kind: s.entry.kind,
          where: s.entry.where,
          date: s.date as string,
          source: s.source,
        },
      };
    });
}
