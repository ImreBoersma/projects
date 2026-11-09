// Parse one workflow file for the conformance rules (spec 008, contracts/rules.md R1–R3, R9).
import { readdir } from "node:fs/promises";
import { parse } from "yaml";

export interface Caller {
  uses: string[];
  permissions: "missing" | "empty" | Record<string, string> | string;
  secrets: string[];
  vars: string[];
}

const names = (text: string, kind: "secrets" | "vars") =>
  [
    ...new Set(
      [...text.matchAll(new RegExp(`\\$\\{\\{\\s*${kind}\\.([A-Za-z0-9_]+)`, "g"))].map(
        (m) => m[1],
      ),
    ),
  ].filter((n) => n !== "GITHUB_TOKEN");

export function parseCaller(text: string): Caller {
  let doc: Record<string, unknown> | null;
  try {
    doc = parse(text);
  } catch {
    return { uses: [], permissions: "missing", secrets: [], vars: [] };
  }
  const jobs = (doc?.jobs ?? {}) as Record<string, { uses?: unknown }>;
  const uses = Object.values(jobs).flatMap((j) => (typeof j?.uses === "string" ? [j.uses] : []));
  const p = doc?.permissions;
  const permissions =
    p == null
      ? "missing"
      : typeof p === "object" && Object.keys(p).length === 0
        ? "empty"
        : (p as Record<string, string> | string);
  return { uses, permissions, secrets: names(text, "secrets"), vars: names(text, "vars") };
}

// A shared workflow reads `vars` of the caller repo (deploy-vercel.yml: VERCEL_ORG_ID). R9 adds
// these names to the names of the caller. File name → variable names.
export async function sharedWorkflowVars(dir: string): Promise<Record<string, string[]>> {
  const out: Record<string, string[]> = {};
  for (const file of await readdir(dir)) {
    if (!/\.ya?ml$/.test(file)) continue;
    const found = names(await Bun.file(`${dir}/${file}`).text(), "vars");
    if (found.length) out[file] = found;
  }
  return out;
}
