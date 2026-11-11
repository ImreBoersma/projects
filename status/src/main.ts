import { mkdir, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { parseArgs } from "node:util";
import { icons, manifest, serviceWorker } from "./app";
import { readCampaigns } from "./campaign/status";
import { parseCatalog, parseSecrets, visibleProjects } from "./catalog";
import { readFacts } from "./conformance/read";
import { checkRepo } from "./conformance/rules";
import { sharedWorkflowVars } from "./conformance/workflows";
import { statusJson } from "./data";
import { readDelivery } from "./delivery/read";
import { deliveryRow, windowMonths } from "./delivery/stats";
import {
  certificateProblem,
  daysUntil,
  mergeRenewals,
  renewalProblems,
  slug,
} from "./expiry/expiry";
import { readBootstrap, readCertificate, readRegistryDate } from "./expiry/read";
import { fetchStatuses, tokenFor } from "./github";
import { carryKeys, recentChanges, repairTime, since, uptime as uptimeOf } from "./history/stats";
import { readHistory, resultLine } from "./history/store";
import {
  closeIssue,
  ensureLabel,
  keepsOpen,
  listOpenIssues,
  openIssue,
  parseMarker,
  planIssueActions,
} from "./issues";
import { conformanceProblem, evaluateProblems, PROBLEM_TEXT, sortRows } from "./problems";
import { renderPage } from "./render";
import { gaps, type Used, usedSecrets } from "./secrets/compare";
import { noExpiry, type ReadDates, SHARED, secretProblems, secretStatuses } from "./secrets/expiry";
import { readWorkflowTexts, tokenExpiry } from "./secrets/read";
import type { Problem, Project, SecretEntry, SecretStatus, StatusPage, VersionRow } from "./types";
import { checkAll } from "./uptime";
import { markDrift, markedCount } from "./versions/drift";
import { sharedNodeDefault } from "./versions/parse";
import { readVersions } from "./versions/read";

// Research.md §9: the log shows only the state, never an error text.
const LOG_TEXT = {
  up: "Up",
  down: "Down",
  "no-domain": "No domain",
  "not-available": "Check not available",
};

const { values: args } = parseArgs({
  options: {
    catalog: { type: "string", default: "../projects.yaml" },
    out: { type: "string", default: "../_site" },
    mode: { type: "string", default: "page" },
    "dry-run": { type: "boolean", default: false },
    // Spec 010: folder with the day files of the branch `data`, and the file for the new line.
    history: { type: "string" },
    "history-out": { type: "string" },
  },
});

if (args.mode !== "page" && args.mode !== "issues") {
  console.error(`Unknown mode "${args.mode}". Use page or issues.`);
  process.exit(1);
}

let projects: Project[];
let allProjects: Project[];
let secretEntries: SecretEntry[];
try {
  const catalogText = await Bun.file(args.catalog).text();
  allProjects = parseCatalog(catalogText);
  projects = visibleProjects(allProjects);
  secretEntries = parseSecrets(catalogText, allProjects);
} catch (error) {
  // FR-015: stop before any output, so that GitHub Pages keeps the last correct page.
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

const now = new Date();
const statuses = await fetchStatuses(projects, process.env);
const uptime = await checkAll(projects, now);
for (const p of projects) {
  const u = uptime.get(p.id);
  if (p.domain && u) console.log(`Site ${p.domain}: ${LOG_TEXT[u.state]}`);
}
// Spec 013: workflow texts of the own repos, kept from the conformance check for the compare.
const workflowTexts = new Map<string, string[]>();
const unavailableSetup = await checkConformance();
const keepKeys = await checkExpiry();
for (const s of statuses) {
  s.uptime = uptime.get(s.project.id) ?? s.uptime;
  s.problems = [
    ...evaluateProblems(s, now),
    ...s.problems,
    ...[certificateProblem(s.project.id, s.expiry.certificate)].filter((p) => p !== null),
    ...renewalProblems(s.project.id, s.expiry.renewals),
  ];
}
const shared = await checkSecrets();

// Spec 013: the expiry of the secrets, and the names that the workflows use but the catalog
// does not list. Logs names and dates only, never a value.
async function checkSecrets(): Promise<{
  secrets: SecretStatus[];
  problems: Problem[];
  gaps: string[];
  noExpiry: string[];
}> {
  const read: ReadDates = new Map();
  for (const name of ["STATUS_READ_TOKEN", "STATUS_READ_TOKEN_HOB", "CONFORMANCE_READ_TOKEN"]) {
    const token = process.env[name];
    if (!token) continue;
    const date = await tokenExpiry(token);
    if (date === "not-known") {
      console.log(`Token ${name}: not known`);
      const listed = secretEntries.find(
        (e) =>
          e.name === name &&
          e.where === "ImreBoersma/projects" &&
          e.expires !== "never" &&
          // Spec 013 T026: `none` has no catalog date either.
          e.expires !== "none",
      );
      if (!listed) keepKeys.add(`${SHARED}/secret-expiring/${slug(name)}`);
    } else if (date) {
      console.log(`Token ${name}: expires ${date}`);
      read.set(name, date);
    } else {
      console.log(`Token ${name}: no expiry`);
    }
  }
  const statusesAll = secretStatuses(secretEntries, read, allProjects, now);
  const all = statusesAll.filter((s) => s.date);
  const undated = noExpiry(statusesAll);
  for (const s of undated) console.log(`Secret ${s.entry.name}: no expiry set (${s.entry.where})`);
  for (const s of all) console.log(`Secret ${s.entry.name}: ${s.days} days`);
  const problems = secretProblems(all);
  for (const s of statuses) {
    s.secrets = all.filter((x) => x.owner === s.project.id);
    s.secretsNoExpiry = undated.filter((x) => x.owner === s.project.id).map((x) => x.entry.name);
    s.problems.push(...problems.filter((p) => p.projectId === s.project.id));
  }

  const used: Used[] = [];
  for (const s of statuses) {
    const repo = s.project.repo;
    if (!repo) continue;
    let texts = workflowTexts.get(s.project.id) ?? null;
    if (!texts && !repo.startsWith("ImreBoersma/")) {
      const token = tokenFor(repo.split("/")[0], process.env);
      texts = token ? await readWorkflowTexts(repo, token) : null;
      if (!texts) console.log(`Secrets compare ${repo}: workflows not available`);
      // Spec 016: keep them for the Node version of the CI caller.
      else workflowTexts.set(s.project.id, texts);
    } else if (!texts) {
      // Spec 013 T027: an own repo whose workflows the conformance check could not read.
      console.log(`Secrets compare ${repo}: workflows not available`);
    }
    if (texts) used.push({ owner: s.project.id, repo, names: texts.flatMap(usedSecrets) });
  }
  const dir = join(dirname(args.catalog), ".github", "workflows");
  try {
    const files = (await readdir(dir)).filter((f) => /\.ya?ml$/.test(f));
    const texts = await Promise.all(files.map((f) => Bun.file(join(dir, f)).text()));
    used.push({ owner: SHARED, repo: "ImreBoersma/projects", names: texts.flatMap(usedSecrets) });
  } catch {
    console.log("Secrets compare ImreBoersma/projects: workflows not available");
  }
  const found = gaps(used, secretEntries);
  for (const s of statuses) {
    s.secretGaps = found.filter((g) => g.owner === s.project.id).map((g) => g.name);
  }
  for (const g of found) console.log(`Secret not in the catalog: ${g.name} (${g.repo})`);
  return {
    secrets: all.filter((x) => x.owner === SHARED),
    noExpiry: undated.filter((x) => x.owner === SHARED).map((x) => x.entry.name),
    problems: problems.filter((p) => p.projectId === SHARED),
    gaps: found.filter((g) => g.owner === SHARED).map((g) => g.name),
  };
}

// Spec 009: certificate, registry and catalog dates. Returns the issue keys to keep open,
// because their value is not known in this run (research.md §7).
async function checkExpiry(): Promise<Set<string>> {
  const keep = new Set<string>();
  const bootstrap = await readBootstrap();
  await Promise.all(
    statuses.map(async (s) => {
      const { id, domain } = s.project;
      const catalog = (s.project.renewals ?? []).map((r) => ({
        ...r,
        days: daysUntil(r.date, now),
        source: "catalog" as const,
      }));
      const hasCatalogDomain = catalog.some((r) => r.name.toLowerCase() === "domain");
      let registry = null;
      if (domain) {
        const [cert, reg] = await Promise.all([
          readCertificate(domain, now),
          readRegistryDate(domain, bootstrap),
        ]);
        s.expiry.certificate = cert;
        if (cert === "not-known") keep.add(`${id}/cert-expiring`);
        // Spec 009 T026: an open domain issue stays open while the registry date is not known,
        // also when the catalog has a later Domain date.
        if (reg === "not-known") keep.add(`${id}/renewal-due/domain`);
        if (reg === "not-known" && !hasCatalogDomain) {
          s.expiry.registryNotKnown = true;
        } else if (reg !== "not-known" && reg !== "not-registered") {
          registry = {
            name: "Domain",
            date: reg,
            days: daysUntil(reg, now),
            source: "registry" as const,
          };
        }
        const certText = cert === "not-known" ? "not known" : `${cert.days} days`;
        console.log(`Certificate ${domain}: ${certText}; registry: ${reg}`);
      }
      s.expiry.renewals = mergeRenewals(catalog, registry);
    }),
  );
  return keep;
}

// Spec 008: check each own repo against the shared setup. Returns the ids of the projects whose
// repo could not be read, so that their conformance issues stay open.
async function checkConformance(): Promise<Set<string>> {
  const unavailable = new Set<string>();
  const token = process.env.CONFORMANCE_READ_TOKEN;
  const own = statuses.filter((s) => s.project.repo?.startsWith("ImreBoersma/"));
  if (!token) {
    // Spec 008 FR-007: nothing was checked, so the open not-conformant issues stay open.
    console.log("Conformance check not available: no token.");
    for (const s of own) unavailable.add(s.project.id);
    return unavailable;
  }
  // R9: the vars that each shared workflow of this repo reads from the caller repo.
  const sharedVars = await sharedWorkflowVars(
    new URL("../../.github/workflows", import.meta.url).pathname,
  );
  await Promise.all(
    own.map(async (s) => {
      const repo = s.project.repo as string;
      const facts = await readFacts(repo, token);
      if (facts !== "not-available" && facts.workflows !== "not-available") {
        workflowTexts.set(
          s.project.id,
          facts.workflows.map((w) => w.text),
        );
      }
      const results =
        facts === "not-available" ? null : checkRepo(facts, s.project.exceptions, sharedVars);
      const notAvailable = results
        ? results.filter((r) => r.state === "not-available").map((r) => r.rule)
        : ["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8", "R9"];
      s.conformanceNotAvailable = notAvailable;
      if (notAvailable.length === 9) unavailable.add(s.project.id);
      const problem = results ? conformanceProblem(s.project.id, results) : null;
      if (problem) s.problems = [problem];
      const failed = problem?.detail?.map((d) => d.split(" ")[0]).join(", ");
      const parts = [failed ?? "pass"];
      if (notAvailable.length) parts.push(`check not available: ${notAvailable.join(", ")}`);
      console.log(`Conformance ${repo}: ${parts.join("; ")}`);
    }),
  );
  return unavailable;
}

// Spec 010: the result of this run, added to the stored results.
// The checks without data in this run: the same rule for the issues and the stored results.
const keepCtx = {
  unavailableIds: new Set(
    statuses.filter((s) => s.availability === "unavailable").map((s) => s.project.id),
  ),
  uptimeNotAvailable: [...uptime.values()].some((u) => u.state === "not-available"),
  setupUnavailableIds: unavailableSetup,
  keepKeys,
};
const stored = args.history ? await readHistory(args.history, now) : { results: [], start: null };
// Spec 010 T024: a problem of the last result whose check had no data in this run stays in the
// result, as its issue stays open; so one failed read does not reset "since" or add a repair.
const previous = stored.results.at(-1)?.projects ?? {};
const carried = (id: string, keys: string[]) =>
  carryKeys(previous[id]?.problems, keys, (k) => keepsOpen(keepCtx, k));
const sharedKeys = carried(
  SHARED,
  shared.problems.map((p) => p.key),
);
const current = {
  time: now.toISOString(),
  projects: Object.fromEntries([
    ...statuses.map((s) => [
      s.project.id,
      {
        site: s.uptime.state,
        problems: carried(
          s.project.id,
          s.problems.map((p) => p.key),
        ),
      },
    ]),
    // Spec 013: the shared problems, so that "since" works for them.
    ...(sharedKeys.length ? [[SHARED, { site: "no-domain", problems: sharedKeys }]] : []),
  ]),
};
const results = [...stored.results, current];
for (const s of statuses) {
  for (const p of s.problems) {
    const found = since(results, s.project.id, p.key);
    if (!found) continue;
    s.history.since[p.key] = found.time;
    if (found.atHistoryStart) s.history.sinceIsHistoryStart.push(p.key);
  }
  if (s.project.domain) {
    s.history.uptime = uptimeOf(results, s.project.id, now);
    s.history.uptimeEnd = now.toISOString().slice(0, 10);
  }
}

if (args.mode === "page") {
  if (args["history-out"]) {
    await Bun.write(args["history-out"], resultLine(current));
    console.log(`Wrote the result line to ${args["history-out"]}.`);
  }
  const issues = await issueNumbers();
  const versions = await checkVersions();
  const delivery = await checkDelivery();
  await mkdir(args.out, { recursive: true });
  const page: StatusPage = {
    generatedAt: now,
    rows: sortRows(statuses),
    issues,
    // Spec 010 T025: when the workflow could not read the branch data, no "History from <today>".
    historyStart: process.env.HISTORY_NOT_READ
      ? null
      : (stored.start ?? now.toISOString().slice(0, 10)),
    repair: repairTime(results, now),
    // Spec 020: the changes of the last 24 hours (the base without a stored visit).
    changes: recentChanges(
      results,
      allProjects,
      now,
      PROBLEM_TEXT,
      new Map(
        [...statuses.flatMap((s) => s.problems), ...shared.problems].map((p) => [
          p.key,
          p.text ?? PROBLEM_TEXT[p.reason],
        ]),
      ),
    ),
    // Spec 019: the CSS that `bun run css` built (bun run start runs it first).
    css: await Bun.file(new URL("../build/page.css", import.meta.url)).text(),
    shared,
    versions,
    delivery,
    // Spec 015: the progress of the campaigns.
    campaigns: await readCampaigns(
      join(dirname(args.catalog), "campaigns"),
      allProjects,
      process.env,
      now,
    ),
  };
  await Bun.write(join(args.out, "index.html"), renderPage(page));
  // Spec 020 US2: the data file next to the page.
  // Spec 020 T030: without the data file the page still deploys; the run log shows an error.
  try {
    await Bun.write(join(args.out, "status.json"), statusJson(page));
  } catch (error) {
    console.error(
      `::error::status.json not written: ${error instanceof Error ? error.message : error}`,
    );
  }
  // Spec 020 US3: the files of the installable app.
  await Bun.write(join(args.out, "manifest.webmanifest"), manifest());
  await Bun.write(join(args.out, "sw.js"), serviceWorker());
  for (const [name, svg] of Object.entries(icons())) await Bun.write(join(args.out, name), svg);
  console.log(
    `Wrote ${join(args.out, "index.html")} and status.json with ${statuses.length} projects.`,
  );
} else {
  await reconcileIssues();
}

// Spec 016: the versions of the tools in each repo, in catalog order, after the drift step.
// Page mode only; logs the repo and the result, never a file text.
async function checkVersions(): Promise<VersionRow[]> {
  const shared = await Bun.file(new URL("../../.github/workflows/ci-node.yml", import.meta.url))
    .text()
    .then(sharedNodeDefault)
    .catch(() => null);
  const rows = await Promise.all(
    statuses.map(async (s): Promise<VersionRow | null> => {
      const { id, repo } = s.project;
      if (!repo) return null;
      const owner = repo.split("/")[0];
      const token =
        owner === "ImreBoersma" ? process.env.CONFORMANCE_READ_TOKEN : tokenFor(owner, process.env);
      const row = token
        ? await readVersions(id, repo, token, workflowTexts.get(id) ?? [], shared)
        : { projectId: id, repo, state: "not-available" as const, tools: {} };
      if (row) console.log(`Versions ${repo}: ${row.state === "ok" ? "read" : "not available"}`);
      return row;
    }),
  );
  const marked = markDrift(rows.filter((r) => r !== null));
  console.log(`Versions: ${markedCount(marked)} repos behind`);
  return marked;
}

// Spec 017: the merged PRs and the production deploys of the last 90 days, in catalog order.
// Logs counts only, never a PR text.
async function checkDelivery() {
  const withRepo = statuses.map((s) => s.project).filter((p) => p.repo);
  const raw = await readDelivery(withRepo, process.env, now);
  const rows = withRepo.map((p) => {
    const row = deliveryRow(raw.get(p.id) ?? "not-available", p, now);
    console.log(
      row.state === "ok"
        ? `Delivery ${p.repo}: ${row.merged} PRs, ${row.deploys} deploys`
        : `Delivery ${p.repo}: not available`,
    );
    return row;
  });
  return { rows, months: windowMonths(now) };
}

// Spec 007: issue numbers for the problem links. Without them, the page shows problems without links.
async function issueNumbers(): Promise<Map<string, number>> {
  const repo = process.env.GITHUB_REPOSITORY ?? "ImreBoersma/projects";
  const token = process.env.GITHUB_TOKEN;
  const numbers = new Map<string, number>();
  try {
    if (!token) throw new Error("GITHUB_TOKEN is not set.");
    for (const issue of await listOpenIssues(repo, token)) {
      const key = parseMarker(issue.body);
      if (key) numbers.set(key, issue.number);
    }
  } catch {
    console.log("Issue links not available.");
  }
  return numbers;
}

async function reconcileIssues() {
  const repo = process.env.GITHUB_REPOSITORY ?? "ImreBoersma/projects";
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error("GITHUB_TOKEN is not set.");
    process.exit(1);
  }
  const actions = planIssueActions(
    [...statuses.flatMap((s) => s.problems), ...shared.problems],
    await listOpenIssues(repo, token),
    keepCtx.unavailableIds,
    keepCtx.uptimeNotAvailable,
    keepCtx.setupUnavailableIds,
    keepCtx.keepKeys,
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
