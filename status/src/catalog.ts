import { parse } from "yaml";
import type { Project, ProjectState } from "./types";

const STATES: ProjectState[] = ["active", "maintenance", "archived"];
const ID = /^[a-z0-9-]+$/;
const REPO = /^[\w.-]+\/[\w.-]+$/;
// A host name without scheme, path or port (spec 005, research.md §8).
const RULE = /^R[1-9]$/;
const HOST = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

export function parseCatalog(text: string): Project[] {
  const doc = parse(text);
  if (!doc || !Array.isArray(doc.projects)) {
    throw new Error("Catalog error: the top-level key `projects` must be a list.");
  }
  const seen = new Set<string>();
  return doc.projects.map((raw: Record<string, unknown>, i: number): Project => {
    const fail = (field: string, rule: string): never => {
      throw new Error(`Catalog error in entry ${i}, field \`${field}\`: ${rule}`);
    };
    const { id, name, repo, status, stakeholder, domain, exceptions, renewal } = raw ?? {};
    if (typeof id !== "string" || !ID.test(id)) fail("id", "required, only a-z, 0-9 and -.");
    if (seen.has(id as string)) fail("id", `"${id}" is not unique.`);
    seen.add(id as string);
    if (typeof name !== "string" || name === "") fail("name", "required.");
    if (!STATES.includes(status as ProjectState)) fail("status", `must be ${STATES.join(", ")}.`);
    if (repo != null && repo !== "" && (typeof repo !== "string" || !REPO.test(repo))) {
      fail("repo", "must be owner/name or empty.");
    }
    if (domain != null && domain !== "" && (typeof domain !== "string" || !HOST.test(domain))) {
      fail("domain", "must be a host name, for example example.org, or empty.");
    }
    if (exceptions != null) {
      if (typeof exceptions !== "object" || Array.isArray(exceptions)) {
        fail("exceptions", "must be a map from a rule id (R1 to R9) to a reason.");
      }
      for (const [key, reason] of Object.entries(exceptions as Record<string, unknown>)) {
        if (!RULE.test(key)) fail("exceptions", `${key} is not a rule. Use R1 to R9.`);
        if (typeof reason !== "string" || reason.trim() === "") {
          fail("exceptions", `give a reason for ${key}.`);
        }
      }
    }
    const renewals = parseRenewals(renewal, (rule) => fail("renewal", rule));
    return {
      id: id as string,
      name: name as string,
      repo: (repo as string) || null,
      status: status as ProjectState,
      stakeholder: typeof stakeholder === "string" && stakeholder !== "" ? stakeholder : null,
      domain: (domain as string) || null,
      ...(exceptions != null ? { exceptions: exceptions as Record<string, string> } : {}),
      ...(renewals.length ? { renewals } : {}),
    };
  });
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const realDate = (d: string) =>
  DATE.test(d) &&
  !Number.isNaN(Date.parse(`${d}T00:00:00Z`)) &&
  new Date(`${d}T00:00:00Z`).toISOString().startsWith(d);

// Spec 009, contracts/catalog.md: an empty field or a list of { name, date }.
function parseRenewals(value: unknown, fail: (rule: string) => never) {
  if (value == null || value === "") return [];
  if (!Array.isArray(value)) fail("must be a list of items with name and date.");
  const seen = new Set<string>();
  return (value as Record<string, unknown>[]).map((item, n) => {
    const { name, date } = item ?? {};
    if (typeof name !== "string" || name.trim() === "" || name.length > 40) {
      fail(`item ${n} needs a name of at most 40 characters.`);
    }
    if (typeof date !== "string" || !realDate(date)) fail(`item ${n} needs a date as YYYY-MM-DD.`);
    const key = (name as string).toLowerCase();
    if (seen.has(key)) fail(`the name ${name} is used two times.`);
    seen.add(key);
    return { name: name as string, date: date as string };
  });
}

export function visibleProjects(projects: Project[]): Project[] {
  return projects.filter((p) => p.status !== "archived");
}
