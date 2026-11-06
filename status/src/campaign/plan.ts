// Spec 015 FR-005, research.md §5: what the command does in one repo.
import type { ApplyResult } from "../types";

export interface PrInfo {
  number: number;
  state: "open" | "closed" | "merged";
}

export type RepoAction =
  | "open"
  | "update"
  | "reopen"
  | "not-needed"
  | "merged"
  | "closed"
  | "failed";

export function planRepo(apply: ApplyResult, pr: PrInfo | null, reopen: boolean): RepoAction {
  if (apply.kind === "failed") return "failed";
  const needed = apply.kind === "needed";
  if (!pr) return needed ? "open" : "not-needed";
  if (pr.state === "open") return needed ? "update" : "not-needed";
  if (pr.state === "merged") return needed ? "open" : "merged";
  // Closed without a merge: only the reopen option opens it again.
  if (!needed) return "not-needed";
  return reopen ? "reopen" : "closed";
}
