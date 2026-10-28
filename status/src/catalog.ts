import { parse } from "yaml";
import type { Project, ProjectState } from "./types";

const STATES: ProjectState[] = ["active", "maintenance", "archived"];
const ID = /^[a-z0-9-]+$/;
const REPO = /^[\w.-]+\/[\w.-]+$/;

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
    const { id, name, repo, status } = raw ?? {};
    if (typeof id !== "string" || !ID.test(id)) fail("id", "required, only a-z, 0-9 and -.");
    if (seen.has(id as string)) fail("id", `"${id}" is not unique.`);
    seen.add(id as string);
    if (typeof name !== "string" || name === "") fail("name", "required.");
    if (!STATES.includes(status as ProjectState)) fail("status", `must be ${STATES.join(", ")}.`);
    if (repo != null && (typeof repo !== "string" || !REPO.test(repo))) {
      fail("repo", "must be owner/name or empty.");
    }
    return {
      id: id as string,
      name: name as string,
      repo: (repo as string) ?? null,
      status: status as ProjectState,
    };
  });
}

export function visibleProjects(projects: Project[]): Project[] {
  return projects.filter((p) => p.status !== "archived");
}
