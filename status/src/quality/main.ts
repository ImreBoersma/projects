// Spec 023: the daily quality run (site-quality.yml). It checks each catalog site and writes one
// day file. The log has levels and numbers only, never a text of a site or of an API (FR-014).
import { parseArgs } from "node:util";
import { parseCatalog, visibleProjects } from "../catalog";
import {
  closeIssue,
  ensureLabel,
  listOpenIssues,
  type OpenIssue,
  openIssue,
  updateIssue,
} from "../issues";
import type { QualityCheck, QualityDay } from "../types";
import { checkHeaders, observatoryReport } from "./headers";
import { planQualityIssues } from "./issues";
import { checkLinks } from "./links";
import { checkPsi, psiReport } from "./psi";
import { readDays, writeDay } from "./store";

const { values: args } = parseArgs({
  options: {
    catalog: { type: "string", default: "../projects.yaml" },
    out: { type: "string", default: "../_quality" },
    data: { type: "string" },
    only: { type: "string" },
    "dry-run": { type: "boolean", default: false },
  },
});

const options = { fetch: globalThis.fetch, delay: (ms: number) => Bun.sleep(ms) };
const now = new Date();
const visible = visibleProjects(parseCatalog(await Bun.file(args.catalog).text()));
const projects = visible.filter((p) => p.domain && (!args.only || p.id === args.only));
if (args.only && !projects.length) {
  console.error(`No active project with a domain has the id "${args.only}".`);
  process.exit(1);
}

async function check(projectId: string, domain: string): Promise<QualityCheck> {
  const { links, homeHeaders } = await checkLinks(domain, { ...options, clock: Date.now });
  const checkedAt = new Date().toISOString();
  if (!homeHeaders) {
    // Site down: no PSI call (tasks.md T015).
    const note = "site down" as const;
    const report = psiReport(domain);
    return {
      projectId,
      domain,
      checkedAt,
      speed: { level: "not-checked", score: null, field: null, report, note },
      accessibility: { level: "not-checked", score: null, failed: null, report, note },
      links,
      headers: {
        level: "not-checked",
        present: [],
        missing: [],
        report: observatoryReport(domain),
        note,
      },
    };
  }
  const psi = await checkPsi(domain, process.env.PSI_API_KEY, options);
  return {
    projectId,
    domain,
    checkedAt,
    ...psi,
    links,
    headers: checkHeaders(homeHeaders, domain),
  };
}

const checks: QualityCheck[] = [];
for (const p of projects) {
  const c = await check(p.id, p.domain as string);
  checks.push(c);
  const score = (s: number | null) => (s === null ? "" : ` ${s}`);
  console.log(
    `Quality ${c.domain}: speed ${c.speed.level}${score(c.speed.score)}, accessibility ${c.accessibility.level}${score(c.accessibility.score)}, links ${c.links.level} (${c.links.pages} pages, ${c.links.broken.length} broken), headers ${c.headers.level} (${c.headers.present.length} of 4)`,
  );
}

const day: QualityDay = { version: 1, date: now.toISOString().slice(0, 10), checks };
console.log(`Wrote ${await writeDay(args.out, day)} with ${checks.length} sites.`);

// FR-007: the issues. The previous check is the newest stored day before today (a second run on
// the same day replaces the file of today, so that file is not "previous"). An issue error gives
// exit code 1 after the day file is written; the workflow stores the file in any case.
const previous = args.data
  ? ((await readDays(args.data, now)).days.find((d) => d.date < day.date) ?? null)
  : null;
console.log(previous ? `Previous check: ${previous.date}` : "Previous check: none");
const repo = process.env.GITHUB_REPOSITORY ?? "ImreBoersma/projects";
const token = process.env.GITHUB_TOKEN;
let openIssues: OpenIssue[] = [];
if (token) openIssues = await listOpenIssues(repo, token);
else if (!args["dry-run"]) {
  console.error("GITHUB_TOKEN is not set.");
  process.exit(1);
} else console.log("Dry run without GITHUB_TOKEN: no open issues read.");
const actions = planQualityIssues(
  day,
  previous,
  openIssues,
  new Map(visible.map((p) => [p.id, p])),
);
if (args["dry-run"]) {
  for (const a of actions.open) console.log(`Open: ${a.title}`);
  for (const a of actions.update) console.log(`Update: #${a.number} (${a.projectId})`);
  for (const a of actions.close) console.log(`Close: #${a.number} (${a.projectId})`);
} else {
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
  if (actions.open.length) await run("Label ready", () => ensureLabel(repo, token as string));
  for (const a of actions.open)
    await run(`Open: ${a.title}`, () => openIssue(repo, token as string, a.title, a.body));
  for (const a of actions.update)
    await run(`Update: #${a.number}`, () => updateIssue(repo, token as string, a.number, a.body));
  for (const a of actions.close)
    await run(`Close: #${a.number}`, () => closeIssue(repo, token as string, a.number, a.comment));
  if (failed) process.exit(1);
}
