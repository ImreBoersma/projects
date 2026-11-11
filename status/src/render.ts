import { THEME_COLOR } from "./app";
import {
  changesText,
  compare,
  compareVisit,
  fixedText,
  matches,
  nameTaken,
  newProjectCommand,
  readView,
  searchCommands,
  start as startClient,
  writeView,
} from "./client";
import { RULES } from "./conformance/rules";
import { deliveryTotal, median, timeText } from "./delivery/stats";
import { rowLinks, STATUS_WORKFLOW, shortcuts } from "./links";
import { HOSTS } from "./new-project/hosts";
import { PROBLEM_TEXT } from "./problems";
import { FAVICON, ICON } from "./style";
import type {
  CampaignSummary,
  DayMark,
  DeliveryRow,
  Problem,
  ProjectStatus,
  SecretStatus,
  StatusPage,
  ToolVersion,
  VersionRow,
} from "./types";
import { markedCount } from "./versions/drift";
import { TOOLS } from "./versions/parse";
import {
  type BadgeKind,
  certificateKind,
  ciKind,
  deployKind,
  relTime,
  renewalKind,
  rowData,
  rowKeys,
  rowKind,
  secretKind,
  summaryFact,
  totalState,
} from "./view";

// Spec 004 board and its public Roadmap view (spec 007, research.md §7).
const BOARD = "https://github.com/users/ImreBoersma/projects/4";
const ROADMAP = `${BOARD}/views/3`;
const DOCS = "https://github.com/ImreBoersma/projects/blob/main/docs/conformance.md";

const DAY = 24 * 60 * 60 * 1000;
// The page updates each hour, so 3 hours without an update means that the schedule stopped.
const STALE_MS = 3 * 60 * 60 * 1000;

// Inline JSON: each "<" as the escape \u003c, so that the text cannot end the script (spec 020 T008).
const json = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");
const html = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
const count = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

// Spec 012 design revision (research.md §9): colour only for a state that is not good.
// `inner` is HTML.
// Spec 019: DaisyUI solid badges (the bumblebee colours are too light as text); the kind class
// stays for the tests and the CSS.
const BADGE_CLASS = { warn: "badge-warning", bad: "badge-error", unknown: "badge-neutral" };
const badge = (kind: BadgeKind, inner: string) =>
  kind === "good"
    ? inner
    : `<span class="badge badge-sm ${BADGE_CLASS[kind]} ${kind}">${inner}</span>`;

// Spec 012 FR-006: the relative time is the visible text; the exact time is in the tooltip and
// for screen readers. The page script keeps the text current (research.md §3).
function timeTag(iso: string, now: Date): string {
  const exact = iso.length === 10 ? iso : `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
  return `<time datetime="${iso}" data-rel title="${exact}">${relTime(iso, now.getTime())}</time><span class="sr"> (${exact})</span>`;
}

// Spec 012 FR-007, FR-008: each link opens a new tab. `inner` is HTML.
const link = (inner: string, url: string | null) =>
  url
    ? `<a class="link" href="${html(url)}" target="_blank" rel="noopener noreferrer" aria-describedby="nt">${inner}</a>`
    : inner;

// Spec 008: the failed rules under the problem text, each a link to its repair steps.
function ruleList(detail: string[]): string {
  return detail
    .map((name) => {
      const rule = RULES.find((r) => name.startsWith(`${r.id} `));
      return link(html(name), rule ? `${DOCS}#${rule.anchor}` : null);
    })
    .join(", ");
}

// Spec 010: since when a problem is open.
function sinceText(s: ProjectStatus, key: string, now: Date): string {
  const time = s.history.since[key];
  if (!time) return "";
  const orBefore = s.history.sinceIsHistoryStart.includes(key) ? " or before" : "";
  return ` <span class="since">Started ${timeTag(time, now)}${orBefore}</span>`;
}

// Spec 010: the uptime of 30 days and 30 marks, old to new.
const MARK_TEXT = { up: "up", down: "down", "no-data": "no data" };
function uptime(s: ProjectStatus, withBar = true): string[] {
  const u = s.history.uptime;
  if (!u) return [];
  const first = Date.parse(`${s.history.uptimeEnd ?? ""}T00:00:00Z`);
  // Spec 020 page size: one element for each run of equal days; the stripes of the CSS show the
  // days. Only the runs that need attention have a tooltip (the aria-label has the totals).
  const runs: { d: DayMark; from: string; to: string; n: number }[] = [];
  u.days.forEach((d, i) => {
    const date = Number.isNaN(first)
      ? ""
      : new Date(first - (29 - i) * DAY).toISOString().slice(0, 10);
    const run = runs.at(-1);
    if (run && run.d === d) {
      run.n++;
      run.to = date;
    } else runs.push({ d, from: date, to: date, n: 1 });
  });
  const marks = runs
    .map((r) => {
      const title =
        r.d === "up"
          ? ""
          : ` title="${r.from === r.to ? r.from : `${r.from} – ${r.to}`} ${MARK_TEXT[r.d]}"`;
      return `<i class="mark ${r.d}" style="width:${r.n * 4 - 1}px"${title}></i>`;
    })
    .join("");
  const down = u.days.filter((d) => d === "down").length;
  const none = u.days.filter((d) => d === "no-data").length;
  const percent = u.percent === null ? "No data" : `${u.percent.toFixed(1)}%`;
  if (!withBar) return [`${percent} in 30 days`];
  return [
    `${percent} in 30 days <span class="bar" role="img" aria-label="Uptime of the last 30 days: ${count(down, "day")} down, ${count(none, "day")} without data">${marks}</span>`,
  ];
}

// The facts of a project, in labelled groups (Site, Code, Expiry). Facts with no value are not
// shown; a group without facts is not shown.
function facts(s: ProjectStatus, now: Date, links: ReturnType<typeof rowLinks>) {
  const site: string[] = [];
  const { state, at } = s.uptime;
  if (state === "up" || state === "down") {
    // Spec 005 T029: the time of the site check, visible and relative (spec 012 FR-006).
    const checked = at
      ? ` <span class="text-xs opacity-75">checked ${timeTag(at.toISOString(), now)}</span>`
      : "";
    site.push(
      `${link(badge(state === "up" ? "good" : "bad", state === "up" ? "Up" : "Down"), links.site)}${checked}`,
    );
    // Spec 019: the bar of 30 marks is in the History tab; the modal keeps the percentage.
    site.push(...uptime(s, false));
  } else if (state === "not-available") {
    site.push(link(badge("unknown", "Check not available"), links.site));
  }

  const code: string[] = [];
  if (s.availability === "no-repo") code.push("No repo");
  else if (s.availability === "unavailable") code.push(badge("unknown", "Data not available"));
  else {
    if (s.ci !== "unknown") {
      code.push(link(badge(ciKind(s.ci), s.ci === "passed" ? "CI passed" : "CI failed"), links.ci));
    }
    if (s.deploy !== "unknown") {
      const d = s.deploy;
      const text =
        d.result === "succeeded"
          ? "Deployed"
          : d.result === "failed"
            ? "Deploy failed"
            : "Deploying";
      code.push(
        `${link(badge(deployKind(d), text), links.deploy)} ${timeTag(d.at.toISOString(), now)}`,
      );
    }
    if (s.lastCommitAt) code.push(`Last commit ${timeTag(s.lastCommitAt.toISOString(), now)}`);
    if (s.openPrCount > 0) code.push(count(s.openPrCount, "open PR"));
    if (s.renovatePrCount > 0) {
      const oldest = s.oldestRenovatePrAt
        ? `, oldest ${timeTag(s.oldestRenovatePrAt.toISOString(), now)}`
        : "";
      code.push(`${link(count(s.renovatePrCount, "Renovate PR"), links.renovate)}${oldest}`);
    }
  }
  if (s.conformanceNotAvailable.length) {
    code.push(`Setup check not available: ${html(s.conformanceNotAvailable.join(", "))}`);
  }
  if (s.secretGaps.length) code.push(gapText(s.secretGaps));

  const expiry: string[] = [];
  const { certificate, renewals, registryNotKnown } = s.expiry;
  if (certificate === "not-known") expiry.push("Certificate date not known");
  else if (certificate) {
    const word = certificate.days < 0 ? "Certificate expired" : "Certificate";
    expiry.push(
      badge(certificateKind(certificate.days), `${word} ${timeTag(certificate.date, now)}`),
    );
  }
  const next = [...renewals].sort((a, b) => a.days - b.days)[0];
  if (next) {
    const due = next.days < 0 ? "renewal was due" : "renewal";
    expiry.push(
      badge(renewalKind(next.days), `${html(next.name)} ${due} ${timeTag(next.date, now)}`),
    );
  }
  if (registryNotKnown) expiry.push("Domain date not known");
  const secrets = [...s.secrets].sort((a, b) => (a.days as number) - (b.days as number));
  if (secrets.length) {
    const more = secrets.length > 1 ? ` (+${secrets.length - 1} more)` : "";
    expiry.push(`${secretText(secrets[0], now)}${more}`);
  }
  if (s.secretsNoExpiry.length) expiry.push(noExpiryText(s.secretsNoExpiry));

  return [
    { label: "Site", items: site },
    { label: "Code", items: code },
    { label: "Expiry", items: expiry },
  ].filter((g) => g.items.length > 0);
}

// Spec 013: one secret with its date, and the names that the catalog does not list.
const secretText = (x: SecretStatus, now: Date) =>
  badge(
    secretKind(x.days as number),
    `Secret ${html(x.entry.name)} ${timeTag(x.date as string, now)}`,
  );
// Spec 013 FR-010: a warning, not a problem; the dot and the total state do not change.
const noExpiryText = (names: string[]) =>
  `<span class="badge badge-sm badge-warning warn" title="This secret can expire, but it has no expiry date. Set one at the provider, then in projects.yaml.">No expiry: ${html(names.join(", "))}</span>`;
const gapText = (names: string[]) => `Secret not in the catalog: ${html(names.join(", "))}`;

// The separator is text, so that a copy of the page keeps it.
const SEP = '<span class="sep" aria-hidden="true"> · </span>';

const DOT_TEXT = {
  good: "Correct",
  warn: "Warning",
  bad: "Problem",
  unknown: "Check not available",
};

// Spec 019 contracts/page.md: one short row for each project; its details are in a modal.
function row(s: ProjectStatus, order: number): string {
  const kind = rowKind(s);
  const fact = summaryFact(s);
  const data = Object.entries(rowData(s, order))
    .map(([k, v]) => ` data-${k}="${html(v)}"`)
    .join("");
  return `<li class="project ${kind}"${data} data-keys="${html(rowKeys(s).join(" "))}" data-title="${html(s.project.name)}"><a class="list-row items-center rounded-box py-2 hover:bg-base-200" href="#p-${s.project.id}">
<span class="dot ${kind}" role="img" aria-label="${DOT_TEXT[kind]}"></span>
<span class="font-semibold">${html(s.project.name)} <span data-new hidden class="badge badge-sm badge-info">New<span class="sr"> since your last visit</span></span></span>
<span class="list-col-grow text-sm">${badge(fact.kind, html(fact.text))}</span>
<span aria-hidden="true" class="opacity-50">›</span>
</a></li>`;
}

function modal(s: ProjectStatus, now: Date, issues: Map<string, number>): string {
  const links = rowLinks(s, issues);
  const kind = rowKind(s);
  const problems = s.problems.map((p) => {
    const text = `${link(html(p.text ?? PROBLEM_TEXT[p.reason]), links.problems.get(p.key) ?? null)}${sinceText(s, p.key, now)}`;
    return `<li>${p.detail?.length ? `${text}<br><span class="rules">${ruleList(p.detail)}</span>` : text}</li>`;
  });
  const tag =
    s.project.status === "active"
      ? ""
      : ` <span class="badge badge-ghost badge-sm">${html(s.project.status)}</span>`;
  const list = facts(s, now, links)
    .map((g) => `<div><dt>${g.label}</dt><dd>${g.items.join(SEP)}</dd></div>`)
    .join("");
  const id = s.project.id;
  // Spec 020 US4: the GitHub pages to act on this project.
  const go = shortcuts(s.project.repo);
  const act = go.length
    ? `\n<p class="mt-3 text-sm"><span class="opacity-75">Act on GitHub:</span> ${go.map((g) => link(g.label, g.url)).join(SEP)}</p>`
    : "";
  return `<div id="p-${id}" class="modal" role="dialog" aria-modal="true" aria-labelledby="t-${id}">
<div class="modal-box max-w-2xl">
<a href="#" data-close class="btn btn-sm btn-circle btn-ghost absolute right-3 top-3" aria-label="Close">✕</a>
<h2 id="t-${id}" tabindex="-1" class="mb-3 flex items-center gap-3 pr-10 text-lg font-semibold"><span class="dot ${kind}" role="img" aria-label="${DOT_TEXT[kind]}"></span>${link(html(s.project.name), links.project)}${tag}</h2>
${problems.length ? `<ul class="problems mb-3 space-y-2 text-error">${problems.join("")}</ul>\n` : ""}${list ? `<dl class="facts space-y-1 text-sm">${list}</dl>` : ""}${act}
</div>
<a href="#" data-close class="modal-backdrop">Close</a>
</div>`;
}

// Spec 019 data-model.md "Tab counts" and the History panel (spec 010).
function historyPanel(
  rows: ProjectStatus[],
  repair: string,
  delivery?: StatusPage["delivery"],
): string {
  const sites = rows.filter((s) => s.history.uptime);
  const items = sites
    .map(
      (s) =>
        `<li class="list-row"><span class="font-semibold">${html(s.project.name)}</span><span class="text-sm">${uptime(s)[0] ?? ""}</span></li>`,
    )
    .join("\n");
  return `<p class="mb-3 text-sm">${html(repair)}</p>${items ? `<ul class="list">${items}</ul>` : "<p>No uptime data yet.</p>"}${delivery ? deliverySection(delivery) : ""}`;
}

// Spec 010, contracts/page.md "Summary line": the average time to repair of the faults.
export function repairText(repair: { averageMs: number; count: number } | null): string {
  if (!repair) return "No repaired faults in the last 90 days.";
  const hours = repair.averageMs / 3_600_000;
  const value =
    hours < 1
      ? `${Math.round(hours * 60)} minutes`
      : hours > 48
        ? `${Math.round(hours / 24)} days`
        : hours < 10
          ? `${Number(hours.toFixed(1))} ${hours === 1 ? "hour" : "hours"}`
          : `${Math.round(hours)} hours`;
  return `Average time to repair: ${value} (${count(repair.count, "fault")}, 90 days).`;
}

// FR-007, contracts/page.md "Summary line".
export function summary(rows: ProjectStatus[], sharedProblems = 0): string {
  const problems = rows.reduce((n, r) => n + r.problems.length, 0);
  const withProblem = rows.filter((r) => r.problems.length > 0).length;
  const parts =
    problems > 0
      ? [
          `${count(problems, "problem")} in ${count(withProblem, "project")}.`,
          `${count(rows.length - withProblem, "project")} without a problem.`,
        ]
      : // Spec 007 T025: with shared problems, "No problems." would contradict the state badge.
        [
          sharedProblems > 0 ? "No project problems." : "No problems.",
          `${count(rows.length, "project")}.`,
        ];
  const checked = rows.filter((r) => r.uptime.state === "up" || r.uptime.state === "down");
  const up = checked.filter((r) => r.uptime.state === "up").length;
  if (checked.length > 0) {
    parts.push(`${up} of ${count(checked.length, "site")} ${up === 1 ? "is" : "are"} up.`);
  }
  if (sharedProblems > 0) parts.push(`${count(sharedProblems, "shared problem")}.`);
  return parts.join(" ");
}

const STATE_RANK = { bad: 0, warn: 1, unknown: 2, good: 3 };

export function renderPage(page: StatusPage): string {
  const now = page.generatedAt;
  const iso = now.toISOString();
  const shared = page.shared ?? { secrets: [], problems: [], gaps: [] };
  const campaigns = page.campaigns ?? [];
  const total = totalState(page.rows, shared.problems.length);
  // The default order of the list (without the script): state, then catalog order.
  const ordered = page.rows
    .map((s, i) => ({ s, i }))
    .sort((a, b) => STATE_RANK[rowKind(a.s)] - STATE_RANK[rowKind(b.s)] || a.i - b.i);
  const stakeholders = [
    ...new Set(page.rows.map((s) => s.project.stakeholder).filter(Boolean)),
  ].sort() as string[];
  const known = { stakeholders, projects: page.rows.map((s) => s.project.id) };
  const tabCount = {
    projects: page.rows.filter((s) => s.problems.length > 0).length,
    campaigns: campaigns.filter((c) => c.counts["failed-ci"] > 0).length,
    tokens: shared.problems.length + (shared.noExpiry ?? []).length,
    versions: markedCount(page.versions ?? []),
    history: 0,
  };
  const TABS: [keyof typeof tabCount, string][] = [
    ["projects", "Projects"],
    ["campaigns", "Campaigns"],
    ["tokens", "Shared tokens"],
    ["versions", "Versions"],
    ["history", "History"],
  ];
  const tabs = TABS.map(
    ([id, label]) =>
      `<a role="tab" class="tab${id === "projects" ? " tab-active" : ""}" data-tab="${id}" href="?tab=${id}" aria-controls="tab-${id}" aria-selected="${id === "projects"}">${label}${tabCount[id] ? ` <span class="badge badge-sm ${id === "projects" ? "badge-error" : "badge-warning"} ml-1">${tabCount[id]}</span>` : ""}</a>`,
  ).join("");
  const option = (value: string, text: string) =>
    `<option value="${html(value)}">${html(text)}</option>`;
  const select = (name: string, label: string, options: string) =>
    `<label class="flex flex-col gap-1 text-xs">${label}<select name="${name}" class="select select-sm">${options}</select></label>`;
  const controls = `<details class="filters controls mb-4"><summary class="btn btn-sm mb-2 sm:hidden">Filters</summary>
<div class="flex flex-wrap items-end gap-3">
<label class="flex flex-col gap-1 text-xs"><span class="flex items-center gap-1">Search <kbd class="kbd kbd-xs" title="Open the command box">⌘K</kbd></span><input name="q" type="search" class="input input-sm" placeholder="Project name"></label>
${select("state", "State", option("", "All") + option("problems", "Problems") + option("warnings", "Warnings") + option("not-available", "Check not available") + option("correct", "All correct"))}
${select("stakeholder", "Stakeholder", option("", "All") + stakeholders.map((x) => option(x, x)).join(""))}
${select("site", "Site", option("", "All") + option("yes", "Has a site") + option("no", "No site"))}
${select("sort", "Sort", option("state", "State") + option("name", "Name") + option("commit", "Last commit") + option("expiry", "Next expiry"))}
<span data-count class="pb-1 text-sm opacity-75">${page.rows.length} of ${page.rows.length}</span>
</div></details>`;
  const panel = (id: string, title: string, body: string, active = false) =>
    `<section id="tab-${id}" role="tabpanel" class="mb-8${active ? " active" : ""}">
<h2 class="mb-2 text-sm font-semibold uppercase tracking-wide opacity-70">${title}</h2>
${body}
</section>`;
  // Spec 020 contracts/page.md: the changes line and the fixed list (filled by the script).
  const changesPart = `<p data-changes hidden class="mb-1 text-sm font-semibold"></p>
<details data-fixed hidden class="mb-3 text-sm"><summary></summary><ul class="ml-4 list-disc"></ul></details>`;
  const projectsBody = `${changesPart}
${controls}
<p data-note hidden class="mb-2 text-sm">Some filters in the link are not known.</p>
<ul class="list rounded-box" data-rows>
${ordered.map(({ s, i }) => row(s, i)).join("\n")}
</ul>
<div data-empty hidden class="py-6 text-center"><p class="mb-2">No project matches the filter.</p><button type="button" data-clear class="btn btn-sm">Clear the filter</button></div>
${page.rows.map((s) => modal(s, now, page.issues)).join("\n")}`;
  // Spec 020 US5: the command box; only the script opens it.
  const commandBox = `<div id="command" class="modal" role="dialog" aria-modal="true" aria-label="Command box">
<div class="modal-box max-w-md">
<label class="flex flex-col gap-1 text-sm">Go to<input type="text" class="input w-full" autocomplete="off" role="combobox" aria-expanded="true" aria-controls="command-list" placeholder="Project, tab or filter"></label>
<ul id="command-list" role="listbox" class="mt-2 text-sm"></ul>
</div>
<a href="#" data-close-command class="modal-backdrop">Close</a>
</div>`;
  // Spec 011 US4, contracts/dialog.md: the "New project" dialog; only the script opens it.
  const npField = (name: string, label: string) =>
    `<label class="flex flex-col gap-1 text-sm">${label}<input name="${name}" type="text" class="input input-sm w-full" autocomplete="off"><span data-msg="${name}" aria-live="polite" class="text-xs text-error"></span></label>`;
  const newProject = `<div id="new-project" class="modal" role="dialog" aria-modal="true" aria-labelledby="np-title">
<div class="modal-box flex max-w-md flex-col gap-2">
<h2 id="np-title" class="font-semibold">New project</h2>
${npField("id", "Id")}${npField("name", "Name")}${npField("repo", "Repo")}
<label class="flex flex-col gap-1 text-sm">Visibility<select name="visibility" class="select select-sm w-full"><option value="public">Public</option><option value="private">Private</option></select></label>
<label class="flex flex-col gap-1 text-sm">Stack<input name="stack" type="text" class="input input-sm w-full" autocomplete="off" placeholder="Vite, React"></label>
<label class="flex flex-col gap-1 text-sm">Host<select name="host" class="select select-sm w-full">${HOSTS.map((h) => `<option value="${h.key}">${html(h.label)}</option>`).join("")}</select></label>
<pre class="overflow-x-auto rounded bg-base-200 p-2 text-xs"><code></code></pre>
<button type="button" data-copy class="btn btn-sm">Copy command</button>
<p class="text-xs">Run it in a terminal in the projects repo. Add --dry-run to see the steps first.</p>
</div>
<a href="#" data-close-new-project class="modal-backdrop">Close</a>
</div>`;
  const lower = (v: string) => v.toLowerCase();
  const catalogNames = {
    ids: page.rows.map((s) => s.project.id),
    names: page.rows.map((s) => lower(s.project.name)),
    repos: page.rows.flatMap((s) =>
      s.project.repo?.startsWith("ImreBoersma/") ? [lower(s.project.repo)] : [],
    ),
  };
  const history = page.historyStart ? ` · History from ${timeTag(page.historyStart, now)}` : "";
  const totalClass = { correct: "alert-success", problems: "alert-error", "not-available": "" }[
    total.kind
  ];
  const script = [
    readView,
    writeView,
    matches,
    compare,
    compareVisit,
    changesText,
    fixedText,
    searchCommands,
    newProjectCommand,
    nameTaken,
    startClient,
    relTime,
  ]
    .map((f) => f.toString())
    .join("\n");
  const updates = `if (Date.now() - Date.parse("${iso}") > ${STALE_MS}) document.getElementById("stale").hidden = false;
${script}
function updateTimes() {
  for (const t of document.querySelectorAll("time[data-rel]")) t.textContent = relTime(t.getAttribute("datetime"), Date.now());
}
updateTimes();
setInterval(updateTimes, 60000);
start(${json(known)});`;
  // Spec 020 page size: only whitespace goes; the names stay (the page calls them by name).
  const minified = new Bun.Transpiler({
    loader: "js",
    minifyWhitespace: true,
  }).transformSync(updates);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${total.title}</title>
<link rel="icon" href="${FAVICON[total.kind]}">
<link rel="manifest" href="manifest.webmanifest">
<meta name="theme-color" content="${THEME_COLOR}">
<style>
${page.css ?? ""}
</style>
</head>
<body class="bg-base-100 text-base-content">
<span id="nt" hidden>opens in a new tab</span>
<div class="mx-auto max-w-3xl px-4 py-8 sm:px-6">
<header class="mb-6 flex flex-wrap items-baseline justify-between gap-2">
<h1 class="text-xl font-semibold">Project status</h1>
<nav class="flex flex-wrap gap-4 text-sm">${link("Roadmap", ROADMAP)}${link("Project board", BOARD)}${link("Run the status update now", STATUS_WORKFLOW)}</nav>
</header>
<section class="total ${total.kind} alert ${totalClass} mb-6 flex flex-col items-start gap-1">
<p class="state flex items-center gap-3 text-xl font-semibold"><span aria-hidden="true" class="size-6">${ICON[total.kind]}</span>${total.text}</p>
<p class="summary">${html(summary(page.rows, shared.problems.length))} ${html(repairText(page.repair ?? null))}</p>
<p class="meta text-sm opacity-75">Updated ${timeTag(iso, now)}${history}</p>
<p id="stale" hidden class="font-semibold text-error">Warning: this data is more than 3 hours old.</p>
</section>
<nav role="tablist" class="tabs tabs-border mb-4">${tabs}</nav>
${panel("projects", "Projects", projectsBody, true)}
${panel("campaigns", "Campaigns", campaignSection(campaigns, now) || "<p>No open campaign.</p>")}
${panel("tokens", "Shared tokens", sharedSection(shared, now, page.issues) || "<p>No shared tokens with a date.</p>")}
${panel("versions", "Versions", versionsSection(page.versions))}
${panel("history", "History", historyPanel(page.rows, repairText(page.repair ?? null), page.delivery))}
${commandBox}
${newProject}
</div>
<script type="application/json" id="changes">${json({
    changes: page.changes ?? { since: iso, started: [], stopped: [] },
    texts: { ...PROBLEM_TEXT, warning: "A warning." },
    problems: total.problems,
    catalog: catalogNames,
  })}</script>
<script>
${minified}
</script>
</body>
</html>
`;
}

// Spec 017, contracts/page.md: the merged PRs and production deploys of the last 90 days.
const MONTH = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
function deliverySection({ rows, months }: NonNullable<StatusPage["delivery"]>): string {
  const cells = (r: DeliveryRow) => {
    if (r.state !== "ok") return `<td colspan="5">Not available</td>`;
    const counts = r.months.map(([, n]) => n);
    const names = r.months.map(([m, n]) => `${MONTH[Number(m.slice(5, 7)) - 1]} ${n}`).join(", ");
    const deploys = r.deploys
      ? `${r.deploys} <span class="opacity-60" aria-hidden="true">· ${counts.join("/")}</span><span class="sr"> (${names})</span>`
      : "—";
    return [
      r.merged,
      r.updates,
      html(timeText(median(r.updateHours))),
      html(timeText(median(r.otherHours))),
      deploys,
    ]
      .map((c) => `<td>${c}</td>`)
      .join("");
  };
  const tr = (r: DeliveryRow) => `<tr><th scope="row">${html(r.name)}</th>${cells(r)}</tr>`;
  const head = ["Project", "Merged PRs", "Updates", "Update time", "Other PR time", "Deploys"]
    .map((h) => `<th scope="col">${h}</th>`)
    .join("");
  return `<h3 class="mt-6 mb-2 text-sm font-semibold">Delivery (90 days)</h3>
<p class="mb-2 text-sm">Merged PRs and production deploys of the last 90 days. An update is a PR of a bot (Renovate, Dependabot). Times are medians from open to merge.</p>
<div class="overflow-x-auto">
<table class="data-table text-sm">
<thead><tr>${head}</tr></thead>
<tbody>
${rows.map(tr).join("\n")}
</tbody>
<tfoot>${tr(deliveryTotal(rows, months))}</tfoot>
</table></div>`;
}

// Spec 016, contracts/page.md: one table of the tool versions; a marked cell is behind.
function versionsSection(rows: VersionRow[] | undefined): string {
  if (!rows?.length) return "<p>No version data.</p>";
  const behind = (n: number, top: number) =>
    `${n} major version${n === 1 ? "" : "s"} behind ${top}`;
  const cell = (v: ToolVersion | undefined) => {
    if (!v) return "<td>—</td>";
    const title = html(v.source === "default" ? "default of ci-node.yml" : v.source);
    const text =
      v.source === "default"
        ? `${html(v.text.replace(/ \(default\)$/, ""))} <span class="opacity-60">(default)</span>`
        : html(v.text);
    if (!v.behind || v.highest === undefined) return `<td title="${title}">${text}</td>`;
    const note = behind(v.behind, v.highest);
    return `<td class="drift" title="${title}; ${note}">${text}<span class="sr"> (${note})</span></td>`;
  };
  const head = TOOLS.map(([, label]) => `<th scope="col">${html(label)}</th>`).join("");
  const body = rows
    .map((r) => {
      const name = link(html(r.repo.split("/")[1] ?? r.repo), `https://github.com/${r.repo}`);
      const cells =
        r.state === "ok"
          ? TOOLS.map(([tool]) => cell(r.tools[tool])).join("")
          : `<td colspan="${TOOLS.length}">Not available</td>`;
      return `<tr><th scope="row">${name}</th>${cells}</tr>`;
    })
    .join("\n");
  return `<p class="mb-2 text-sm">The versions that each repo asks for. A marked version is one or more major versions behind the newest repo.</p>
<div class="overflow-x-auto">
<table class="data-table text-sm">
<thead><tr><th scope="col">Repo</th>${head}</tr></thead>
<tbody>
${body}
</tbody></table></div>`;
}

// Spec 013, contracts/page-issue.md: the group "Shared tokens" for the secrets of this repo.
function sharedSection(
  shared: { secrets: SecretStatus[]; problems: Problem[]; gaps: string[]; noExpiry?: string[] },
  now: Date,
  issues: Map<string, number>,
): string {
  const undated = shared.noExpiry ?? [];
  if (!shared.secrets.length && !shared.problems.length && !shared.gaps.length && !undated.length) {
    return "";
  }
  const kind = shared.problems.length
    ? "bad"
    : shared.secrets.some((x) => secretKind(x.days as number) !== "good")
      ? "warn"
      : "good";
  const problems = shared.problems.map((p) => {
    const number = issues.get(p.key);
    const url = number ? `https://github.com/ImreBoersma/projects/issues/${number}` : null;
    return `<li>${link(html(p.text ?? PROBLEM_TEXT[p.reason]), url)}</li>`;
  });
  const secrets = [...shared.secrets]
    .sort((a, b) => (a.days as number) - (b.days as number))
    .map((x) => secretText(x, now));
  const groups = [
    { label: "Expiry", items: undated.length ? [...secrets, noExpiryText(undated)] : secrets },
    { label: "Code", items: shared.gaps.length ? [gapText(shared.gaps)] : [] },
  ]
    .filter((g) => g.items.length)
    .map((g) => `<div><dt>${g.label}</dt><dd>${g.items.join(SEP)}</dd></div>`)
    .join("");
  // Spec 019 T029: the panel has the title; the item uses the list classes of the Projects panel.
  return `<ul class="list rounded-box">
<li class="project ${kind} list-row items-start">
<span class="dot ${kind} mt-2" role="img" aria-label="${DOT_TEXT[kind]}"></span>
<div class="list-col-grow">
<p class="font-semibold">Shared setup</p>
${problems.length ? `<ul class="problems my-2 space-y-1 text-sm text-error">${problems.join("")}</ul>\n` : ""}${groups ? `<dl class="facts space-y-1 text-sm">${groups}</dl>` : ""}
</div>
</li>
</ul>`;
}

// Spec 015, contracts/page.md: the progress of the campaigns. A warning only; no problem, no issue.
const CAMPAIGN_TEXT: [keyof CampaignSummary["counts"], string][] = [
  ["merged", "merged"],
  ["open", "open"],
  ["failed-ci", "failed CI"],
  ["closed", "closed"],
  ["to-do", "to do"],
  ["not-needed", "not needed"],
  // Spec 015 T027: a target repo that the run could not read.
  ["not-available", "not available"],
];

function campaignSection(campaigns: CampaignSummary[], now: Date): string {
  if (!campaigns.length) return "";
  const items = campaigns.map((c) => {
    const kind = c.counts["failed-ci"] ? "warn" : c.done ? "good" : "unknown";
    const counts = c.done
      ? `Done ${timeTag(c.doneAt as string, now)}`
      : CAMPAIGN_TEXT.filter(([k]) => c.counts[k] > 0)
          .map(([k, text]) =>
            k === "failed-ci" ? badge("warn", `${c.counts[k]} ${text}`) : `${c.counts[k]} ${text}`,
          )
          .join(SEP);
    return `<li class="project ${kind} list-row items-start">
<span class="dot ${kind} mt-2" role="img" aria-label="${DOT_TEXT[kind]}"></span>
<div class="list-col-grow">
<p class="font-semibold">${html(c.title)} <span class="text-xs font-normal opacity-75">started ${timeTag(c.started, now)}</span></p>
<dl class="facts mt-1 text-sm"><div><dt>PRs</dt><dd>${counts}${SEP}${link("PRs", c.url)}</dd></div></dl>
</div>
</li>`;
  });
  // Spec 019 T029: the panel has the title; the items use the list classes of the Projects panel.
  return `<ul class="list rounded-box">
${items.join("\n")}
</ul>`;
}
