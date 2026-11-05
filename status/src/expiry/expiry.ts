// Pure rules of spec 009 (research.md §4–§6).
import type { Problem, Renewal } from "../types";

const DAY = 24 * 60 * 60 * 1000;

// Whole days from the start of today (UTC) to the date (UTC); negative in the past.
export function daysUntil(date: string, now: Date): number {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.floor((Date.parse(`${date}T00:00:00Z`) - today) / DAY);
}

export const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const dayText = (n: number) => `${Math.abs(n)} ${Math.abs(n) === 1 ? "day" : "days"}`;

export const CERT_LIMIT = 14;
export const RENEWAL_LIMIT = 30;

export function certificateProblem(
  projectId: string,
  certificate: { date: string; days: number } | "not-known" | null,
): Problem | null {
  if (!certificate || certificate === "not-known" || certificate.days > CERT_LIMIT) return null;
  const d = certificate.days;
  return {
    projectId,
    reason: "cert-expiring",
    key: `${projectId}/cert-expiring`,
    text:
      d >= 0
        ? `The TLS certificate expires in ${dayText(d)}.`
        : `The TLS certificate expired ${dayText(d)} ago.`,
  };
}

// One problem for each renewal (spec clarification 2026-11-05).
export function renewalProblems(projectId: string, renewals: Renewal[]): Problem[] {
  return renewals
    .filter((r) => r.days <= RENEWAL_LIMIT)
    .map((r) => ({
      projectId,
      reason: "renewal-due" as const,
      key: `${projectId}/renewal-due/${slug(r.name)}`,
      source: r.source,
      text:
        r.days >= 0
          ? `Renewal of ${r.name} is due in ${dayText(r.days)}.`
          : `Renewal of ${r.name} was due ${dayText(r.days)} ago.`,
    }));
}

// The registry date is the renewal "Domain"; with a catalog "Domain" the earlier date wins.
export function mergeRenewals(catalog: Renewal[], registry: Renewal | null): Renewal[] {
  if (!registry) return catalog;
  const i = catalog.findIndex((r) => r.name.toLowerCase() === "domain");
  if (i < 0) return [...catalog, registry];
  return catalog.map((r, n) => (n === i && registry.date < r.date ? registry : r));
}
