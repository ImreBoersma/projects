// Spec 018 research.md §3 and §4: which work is by a person, and the archive rule.
import type { ArchiveRaw, ArchiveState, Project } from "../types";

type Labels = { nodes: { name: string }[] } | null | undefined;
export type PrRef = { author: { __typename: string } | null; labels?: Labels };
export type CommitNode = {
  committedDate: string;
  author: { user: { login: string } | null } | null;
  associatedPullRequests: { nodes: PrRef[] } | null;
};

// A PR by a person: the author is a user, and it is not a campaign PR of spec 015.
export const isPersonPr = (pr: PrRef) =>
  pr.author?.__typename === "User" && !pr.labels?.nodes.some((l) => l.name === "campaign");

// A commit with a PR follows the PR: the commit author of a squash merge can be a `User` for a
// Dependabot PR (research §3). A direct push counts when its author is a linked user that is not
// a bot. The login is used only for this test; it is not kept, logged or shown.
export function isPersonCommit(node: CommitNode): boolean {
  const pr = node.associatedPullRequests?.nodes[0];
  if (pr) return isPersonPr(pr);
  const login = node.author?.user?.login;
  return !!login && !login.endsWith("[bot]");
}

const LIMIT_MONTHS = 12;

export function archiveState(
  raw: ArchiveRaw | "not-available" | undefined,
  keep: Project["keep"],
  now: Date,
): ArchiveState | undefined {
  if (keep && keep.until >= now.toISOString().slice(0, 10)) {
    return { state: "kept", until: keep.until, reason: keep.reason };
  }
  if (!raw || raw === "not-available" || !raw.listsComplete || raw.openPersonWork) return undefined;
  // Without a person commit, the work is not later than the repo creation (all commits read) or
  // than the oldest commit read ("or earlier").
  const commit =
    raw.lastPersonCommit ?? (raw.historyComplete ? raw.createdAt : raw.oldestCommitRead);
  const dates = [commit, raw.lastPersonPr, raw.lastPersonIssue].filter((d): d is string => !!d);
  if (!dates.length) return undefined;
  const last = dates.reduce((a, b) => (Date.parse(b) > Date.parse(a) ? b : a));
  const limit = new Date(now);
  limit.setUTCMonth(limit.getUTCMonth() - LIMIT_MONTHS);
  if (Date.parse(last) >= limit.getTime()) return undefined;
  const orEarlier = !raw.lastPersonCommit && !raw.historyComplete && last === commit;
  return { state: "suggest", since: last.slice(0, 10), orEarlier };
}
