import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { parseCatalog, visibleProjects } from "./catalog";
import { fetchStatuses } from "./github";
import { closeIssue, ensureLabel, listOpenIssues, openIssue, planIssueActions } from "./issues";
import { evaluateProblems, sortRows } from "./problems";
import { renderPage } from "./render";
import type { Project } from "./types";

const { values: args } = parseArgs({
  options: {
    catalog: { type: "string", default: "../projects.yaml" },
    out: { type: "string", default: "../_site" },
    mode: { type: "string", default: "page" },
    "dry-run": { type: "boolean", default: false },
  },
});

if (args.mode !== "page" && args.mode !== "issues") {
  console.error(`Unknown mode "${args.mode}". Use page or issues.`);
  process.exit(1);
}

let projects: Project[];
try {
  projects = visibleProjects(parseCatalog(await Bun.file(args.catalog).text()));
} catch (error) {
  // FR-015: stop before any output, so that GitHub Pages keeps the last correct page.
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

const now = new Date();
const statuses = await fetchStatuses(projects, process.env);
for (const s of statuses) s.problems = evaluateProblems(s, now);

if (args.mode === "page") {
  await mkdir(args.out, { recursive: true });
  await Bun.write(
    join(args.out, "index.html"),
    renderPage({ generatedAt: now, rows: sortRows(statuses) }),
  );
  console.log(`Wrote ${join(args.out, "index.html")} with ${statuses.length} projects.`);
} else {
  await reconcileIssues();
}

async function reconcileIssues() {
  const repo = process.env.GITHUB_REPOSITORY ?? "ImreBoersma/projects";
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error("GITHUB_TOKEN is not set.");
    process.exit(1);
  }
  const actions = planIssueActions(
    statuses.flatMap((s) => s.problems),
    await listOpenIssues(repo, token),
    new Set(statuses.filter((s) => s.availability === "unavailable").map((s) => s.project.id)),
    new Map(projects.map((p) => [p.id, p])),
    now.toISOString().slice(0, 10),
  );
  if (args["dry-run"]) {
    for (const a of actions.open) console.log(`Open: ${a.title}`);
    for (const a of actions.close) console.log(`Close: #${a.number}`);
    return;
  }
  let failed = false;
  const run = async (what: string, action: () => Promise<void>) => {
    try {
      await action();
      console.log(what);
    } catch (error) {
      failed = true;
      console.error(`${what} failed:`, error instanceof Error ? error.message : error);
    }
  };
  if (actions.open.length) await run("Label ready", () => ensureLabel(repo, token));
  for (const a of actions.open)
    await run(`Open: ${a.title}`, () => openIssue(repo, token, a.title, a.body));
  for (const a of actions.close) {
    await run(`Close: #${a.number}`, () => closeIssue(repo, token, a.number, a.comment));
  }
  if (failed) process.exit(1);
}
