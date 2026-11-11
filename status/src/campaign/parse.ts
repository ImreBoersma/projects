// Spec 015, data-model.md and contracts/campaign-file.md: parse one campaign file.
import { parse } from "yaml";
import type { Campaign, CampaignChange, Project } from "../types";

const ID = /^[a-z0-9-]{3,40}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const realDate = (d: string) =>
  DATE.test(d) && new Date(`${d}T00:00:00Z`).toISOString().startsWith(d);
const safePath = (p: unknown) =>
  typeof p === "string" && p !== "" && !p.startsWith("/") && !p.split("/").includes("..");

export function parseCampaign(text: string, fileName: string, projects: Project[]): Campaign {
  const fail = (field: string, rule: string): never => {
    throw new Error(`Campaign error in ${fileName}, field \`${field}\`: ${rule}`);
  };
  let doc: Record<string, unknown>;
  try {
    doc = parse(text) ?? {};
  } catch {
    return fail("(file)", "not valid YAML.");
  }
  const { id, title, reason, started, repos, changes } = doc;
  if (typeof id !== "string" || !ID.test(id)) fail("id", "a-z, 0-9 and -; 3 to 40 characters.");
  if (`${id}.yaml` !== fileName.split("/").pop()) fail("id", "must be the same as the file name.");
  if (typeof title !== "string" || title.trim() === "" || title.length > 80) {
    fail("title", "required, 1 to 80 characters.");
  }
  if (typeof reason !== "string" || reason.trim() === "") fail("reason", "required.");
  const start = started instanceof Date ? started.toISOString().slice(0, 10) : started;
  if (typeof start !== "string" || !realDate(start)) fail("started", "a date as YYYY-MM-DD.");
  if (repos !== "all") {
    if (!Array.isArray(repos) || repos.length === 0)
      fail("repos", "all, or a list of catalog ids.");
    for (const r of repos as unknown[]) {
      const p = projects.find((x) => x.id === r);
      // An archived project stays allowed in the list, so that archiving a project does not break
      // a campaign; targetRepos leaves it out (spec 015 T031).
      if (!p?.repo) fail("repos", `${r} is not a catalog project with a repo.`);
    }
  }
  if (!Array.isArray(changes) || changes.length === 0) fail("changes", "at least 1 change.");
  const list = (changes as Record<string, Record<string, unknown>>[]).map(
    (c, n): CampaignChange => {
      if (c?.write) {
        const { path, content } = c.write;
        if (!safePath(path)) fail(`changes ${n}`, "path must be relative, without `..`.");
        if (typeof content !== "string") fail(`changes ${n}`, "content is required.");
        return { kind: "write", path: path as string, content: content as string };
      }
      if (c?.replace) {
        const { path, old, new: next } = c.replace;
        if (!safePath(path)) fail(`changes ${n}`, "path must be relative, without `..`.");
        if (typeof old !== "string" || old === "") fail(`changes ${n}`, "old must not be empty.");
        if (typeof next !== "string" || next === old) {
          fail(`changes ${n}`, "new is required and must differ from old.");
        }
        return { kind: "replace", path: path as string, old: old as string, new: next as string };
      }
      return fail(`changes ${n}`, "use write or replace.");
    },
  );
  return {
    id: id as string,
    title: title as string,
    reason: reason as string,
    started: start as string,
    repos: repos as Campaign["repos"],
    changes: list,
  };
}

// `all`: each catalog project that is not archived and has a repo, in catalog order.
export function targetRepos(campaign: Campaign, projects: Project[]) {
  const ok = projects.filter((p) => p.status !== "archived" && p.repo);
  const chosen =
    campaign.repos === "all" ? ok : ok.filter((p) => (campaign.repos as string[]).includes(p.id));
  return chosen.map((p) => ({ id: p.id, repo: p.repo as string }));
}
