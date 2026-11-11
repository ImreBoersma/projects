// Spec 016, research.md §3 to §5: the version texts of a repo. Pure functions.
import { parse } from "yaml";
import type { Tool } from "../types";

export const TOOLS: [Tool, string][] = [
  ["node", "Node"],
  ["bun", "Bun"],
  ["next", "Next.js"],
  ["react", "React"],
  ["typescript", "TypeScript"],
  ["biome", "Biome"],
  ["types-node", "@types/node"],
];

// The major version of the lowest version that a range allows; null when it has none.
export function lowestMajor(range: string): number | null {
  const majors = range.split("||").map((part) => {
    // Spec 016 T020: ">= 18" is ">=18" (a space after the operator).
    const first =
      part
        .trim()
        .replace(/([<>=^~]+)\s+/g, "$1")
        .split(/\s+/)[0] ?? "";
    if (first.startsWith("<")) return null;
    const m = first.replace(/^[\^~>=v]+/, "").match(/^(\d+)(\.|$)/);
    return m ? Number(m[1]) : null;
  });
  const found = majors.filter((m) => m !== null);
  return found.length ? Math.min(...found) : null;
}

// Spec 001 FR-018: only a text without `/ : # @` goes on the public page.
export function safeText(text: string): string {
  return /^[A-Za-z0-9 .^~<>=|*+-]{1,40}$/.test(text) ? text : "Other";
}

type Workflow = { jobs?: Record<string, { uses?: unknown; with?: Record<string, unknown> }> };
const yamlOf = (text: string): Workflow | null => {
  try {
    const doc = parse(text);
    return doc && typeof doc === "object" ? doc : null;
  } catch {
    return null;
  }
};

// The `node-version` that a CI caller gives to the shared `ci-node.yml`.
export function nodeFromCi(text: string): string | null {
  for (const job of Object.values(yamlOf(text)?.jobs ?? {})) {
    if (typeof job?.uses !== "string" || !job.uses.includes("/ci-node.yml")) continue;
    const v = job.with?.["node-version"];
    if (typeof v === "string" || typeof v === "number") return String(v);
  }
  return null;
}

// The default of the input `node-version` of the shared `ci-node.yml` (Principle IV).
export function sharedNodeDefault(text: string): string | null {
  const doc = yamlOf(text) as {
    on?: { workflow_call?: { inputs?: Record<string, { default?: unknown }> } };
  } | null;
  const v = doc?.on?.workflow_call?.inputs?.["node-version"]?.default;
  return typeof v === "string" || typeof v === "number" ? String(v) : null;
}
