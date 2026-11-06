// Spec 013 FR-009, research.md §4: secret names that workflows use but the catalog does not list.
import { parse } from "yaml";
import type { SecretEntry } from "../types";

// The secret names of one workflow file. A shared workflow (`on: workflow_call`) gets the secrets
// that it declares from the calling repo, so these names are not names of this repo.
export function usedSecrets(text: string): string[] {
  let declared: string[] = [];
  try {
    const on = parse(text)?.on;
    const secrets = on && typeof on === "object" ? on.workflow_call?.secrets : null;
    if (secrets && typeof secrets === "object") declared = Object.keys(secrets);
  } catch {
    // A file that is not valid YAML declares no secrets.
  }
  // Names can contain "-" (for example `secrets.ssh-password` of a shared workflow).
  const names = [...text.matchAll(/\$\{\{\s*secrets\.([A-Za-z0-9_-]+)/g)].map((m) => m[1]);
  return [...new Set(names)].filter((n) => n !== "GITHUB_TOKEN" && !declared.includes(n));
}

export interface Used {
  owner: string;
  repo: string;
  names: string[];
}

export interface Gap {
  owner: string;
  repo: string;
  name: string;
}

const LISTED_KINDS = new Set(["actions-secret", "environment-secret"]);

export function gaps(used: Used[], entries: SecretEntry[]): Gap[] {
  const listed = (repo: string, name: string) =>
    entries.some(
      (e) =>
        LISTED_KINDS.has(e.kind) &&
        e.where.toLowerCase() === repo.toLowerCase() &&
        e.name.toLowerCase() === name.toLowerCase(),
    );
  return used.flatMap(({ owner, repo, names }) =>
    [...new Set(names)]
      .filter((name) => name !== "GITHUB_TOKEN" && !listed(repo, name))
      .map((name) => ({ owner, repo, name })),
  );
}
