// Spec 015, research.md §2: apply fixed file changes in memory. Pure.
import type { ApplyResult, CampaignChange } from "../types";

export function applyChanges(
  files: Map<string, string | null>,
  changes: CampaignChange[],
): ApplyResult {
  const next = new Map(files);
  for (const c of changes) {
    const text = next.get(c.path) ?? null;
    if (c.kind === "write") {
      next.set(c.path, c.content);
      continue;
    }
    if (text === null) return { kind: "failed", reason: `${c.path}: the file does not exist` };
    if (text.includes(c.old)) next.set(c.path, text.split(c.old).join(c.new));
    else if (!text.includes(c.new)) {
      return { kind: "failed", reason: `${c.path}: the old text is not in the file` };
    }
  }
  const changed = new Map(
    [...next].filter(([path, text]) => text !== null && text !== (files.get(path) ?? null)),
  ) as Map<string, string>;
  return changed.size ? { kind: "needed", files: changed } : { kind: "not-needed" };
}
