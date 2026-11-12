import { parse } from "yaml";
import { slug } from "./expiry/expiry";
import type { Project, ProjectState, SecretEntry, SecretKind } from "./types";

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
    // Spec 009 T024: the issue key uses the slug, so two names may not give the same slug.
    const key = slug(name as string);
    if (seen.has(key))
      fail(`the name ${name} is used two times, or gives the same key as another name.`);
    seen.add(key);
    return { name: name as string, date: date as string };
  });
}

export function visibleProjects(projects: Project[]): Project[] {
  return projects.filter((p) => p.status !== "archived");
}

// Spec 013, contracts/catalog.md: the top-level list `secrets`. Names, places and dates only.
const KINDS: SecretKind[] = [
  "actions-secret",
  "environment-secret",
  "actions-variable",
  "external",
];
const SECRET_NAME = /^[A-Za-z0-9_ -]{1,60}$/;
const FIELDS = new Set(["name", "kind", "where", "expires", "project"]);
const VALUE_FIELDS = new Set(["value", "secret", "password", "token"]);

export function parseSecrets(text: string, projects: Project[]): SecretEntry[] {
  const list = parse(text)?.secrets;
  if (list == null || list === "") return [];
  if (!Array.isArray(list))
    throw new Error("Catalog error: the top-level key `secrets` must be a list.");
  const ids = new Set(projects.map((p) => p.id));
  const seen = new Set<string>();
  const issueKeys = new Set<string>();
  return list.map((raw: Record<string, unknown>, n: number): SecretEntry => {
    const fail = (field: string, rule: string): never => {
      throw new Error(`Catalog error in secrets item ${n}, field \`${field}\`: ${rule}`);
    };
    for (const key of Object.keys(raw ?? {})) {
      if (VALUE_FIELDS.has(key.toLowerCase()))
        fail(key, "Do not put secret values in the catalog.");
      if (!FIELDS.has(key)) fail(key, "is not a field of a secret.");
    }
    const { name, kind, where, expires, project } = raw ?? {};
    if (typeof name !== "string" || !SECRET_NAME.test(name)) {
      fail("name", "required, 1 to 60 characters of A-Z, a-z, 0-9, _, - and space.");
    }
    if (kind === "account") {
      fail(
        "kind",
        "do not list host accounts in this public file. Keep them in the password manager.",
      );
    }
    if (!KINDS.includes(kind as SecretKind)) fail("kind", `must be ${KINDS.join(", ")}.`);
    if (kind === "external") {
      if (typeof where !== "string" || !HOST.test(where)) {
        fail("where", "must be a host name, for example cron-job.org, for the kind external.");
      }
    } else if (typeof where !== "string" || !REPO.test(where)) {
      fail("where", "must be owner/repo.");
    }
    const exp = expires instanceof Date ? expires.toISOString().slice(0, 10) : expires;
    // `never`: an expiry is possible but not set (a warning); `none`: the value cannot expire.
    if (exp !== "never" && exp !== "none" && (typeof exp !== "string" || !realDate(exp))) {
      fail("expires", "must be a date as YYYY-MM-DD, never or none.");
    }
    if (project != null && project !== "" && !ids.has(project as string)) {
      fail("project", `"${project}" is not a catalog id.`);
    }
    const key = `${(name as string).toLowerCase()} ${(where as string).toLowerCase()}`;
    if (seen.has(key)) fail("name", `${name} in ${where} is used two times.`);
    seen.add(key);
    // Spec 013 T028: the issue key is `<owner>/secret-expiring/<slug>`; one owner (a project, or
    // the shared setup) may not have two entries with the same slug.
    const owner = project ? String(project) : "shared";
    const issueKey = `${owner}/${slug(name as string)}`;
    if (issueKeys.has(issueKey)) {
      fail("name", `${name} gives the same issue key as another secret of ${owner}.`);
    }
    issueKeys.add(issueKey);
    return {
      name: name as string,
      kind: kind as SecretKind,
      where: where as string,
      expires: exp as string,
      project: project ? (project as string) : null,
    };
  });
}
