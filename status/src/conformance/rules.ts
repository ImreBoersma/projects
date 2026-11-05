// Rules R1 to R9 of spec 008 (contracts/rules.md). Pure functions on RepoFacts.
import type { NA, RepoFacts, RuleResult, RuleState } from "../types";
import { parseCaller } from "./workflows";

const SHARED = "ImreBoersma/projects/.github/workflows/";
const PRESET = "github>ImreBoersma/projects//renovate/default";

export interface Rule {
  id: string;
  name: string;
  anchor: string;
}

export const RULES: Rule[] = [
  ["R1", "CI caller"],
  ["R2", "Board caller"],
  ["R3", "Caller permissions"],
  ["R4", "Renovate preset"],
  ["R5", "No Dependabot updates"],
  ["R6", "Issues on"],
  ["R7", "Security alerts"],
  ["R8", "Default branch"],
  ["R9", "Secrets and variables"],
].map(([id, name]) => ({ id, name, anchor: `${id}-${name}`.toLowerCase().replace(/ /g, "-") }));

const na = (v: unknown): v is NA => v === "not-available";
const state = (failed: boolean): RuleState => (failed ? "fail" : "pass");

export function checkRepo(facts: RepoFacts, exceptions: Record<string, string> = {}): RuleResult[] {
  const callers = na(facts.workflows)
    ? "not-available"
    : facts.workflows
        .map((w) => parseCaller(w.text))
        .filter((c) => c.uses.some((u) => u.startsWith(SHARED)));
  const usesShared = (file: string) =>
    !na(callers) && callers.some((c) => c.uses.includes(`${SHARED}${file}@main`));

  const checks: Record<string, () => RuleState> = {
    R1: () =>
      na(facts.hasPackageJson) || na(callers)
        ? "not-available"
        : facts.hasPackageJson
          ? state(!usesShared("ci-node.yml"))
          : "not-applicable",
    R2: () =>
      facts.private
        ? "not-applicable"
        : na(callers)
          ? "not-available"
          : state(!usesShared("add-to-board.yml")),
    R3: () => {
      if (na(callers)) return "not-available";
      if (callers.length === 0) return "not-applicable";
      return state(
        callers.some((c) => typeof c.permissions !== "object" || c.permissions.contents !== "read"),
      );
    },
    R4: () => {
      if (na(facts.renovate)) return "not-available";
      const ext = facts.renovate?.extends;
      return state(!(Array.isArray(ext) && ext.includes(PRESET)));
    },
    R5: () => (na(facts.dependabot) ? "not-available" : state(facts.dependabot)),
    R6: () => state(!facts.hasIssues),
    R7: () =>
      na(facts.vulnerabilityAlerts) || na(facts.securityFixes)
        ? "not-available"
        : state(!facts.vulnerabilityAlerts || facts.securityFixes),
    R8: () => state(facts.defaultBranch !== "main"),
    R9: () => {
      if (na(callers) || na(facts.secretNames) || na(facts.variableNames)) return "not-available";
      if (callers.length === 0) return "not-applicable";
      const secrets = new Set(facts.secretNames);
      const vars = new Set(facts.variableNames);
      return state(
        callers.some(
          (c) => c.secrets.some((s) => !secrets.has(s)) || c.vars.some((v) => !vars.has(v)),
        ),
      );
    },
  };
  return RULES.map((r) => ({
    rule: r.id,
    state: exceptions[r.id] ? "not-applicable" : checks[r.id](),
  }));
}
