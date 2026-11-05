import { RULES } from "./conformance/rules";
import { dayText } from "./expiry/expiry";
import { rowLinks } from "./links";
import { PROBLEM_TEXT } from "./problems";
import type { ProjectStatus, StatusPage } from "./types";

// Spec 004 board and its public Roadmap view (spec 007, research.md §7).
const BOARD = "https://github.com/users/ImreBoersma/projects/4";
const ROADMAP = `${BOARD}/views/3`;
const COLUMNS = [
  "Project",
  "Problems",
  "Site",
  "Expiry",
  "Last commit",
  "Open PRs",
  "Renovate PRs",
  "CI",
  "Last deploy",
];

const DAY = 24 * 60 * 60 * 1000;
// The page updates each hour, so 3 hours without an update means that the schedule stopped.
const STALE_MS = 3 * 60 * 60 * 1000;

const html = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
const day = (date: Date) => date.toISOString().slice(0, 10);
const CI_TEXT = { passed: "Passed", failed: "Failed", unknown: "Unknown" };
const DEPLOY_TEXT = { succeeded: "Succeeded", failed: "Failed", "in-progress": "In progress" };

function cells(s: ProjectStatus, now: Date): string[] {
  if (s.availability === "no-repo") return Array(5).fill("No repo");
  if (s.availability === "unavailable") return Array(5).fill("Data not available");
  const renovate = s.oldestRenovatePrAt
    ? `${s.renovatePrCount} (oldest ${Math.floor((now.getTime() - s.oldestRenovatePrAt.getTime()) / DAY)} days)`
    : String(s.renovatePrCount);
  return [
    s.lastCommitAt ? day(s.lastCommitAt) : "Unknown",
    String(s.openPrCount),
    renovate,
    CI_TEXT[s.ci],
    s.deploy === "unknown" ? "Unknown" : `${day(s.deploy.at)} ${DEPLOY_TEXT[s.deploy.result]}`,
  ];
}

const UPTIME_TEXT = { up: "Up", down: "Down" };

function site(s: ProjectStatus): string {
  const { state, at } = s.uptime;
  if (state === "no-domain") return "No domain";
  if (state === "not-available") return "Check not available";
  return `${UPTIME_TEXT[state]} ${(at as Date).toISOString().slice(11, 16)}`;
}

const DOCS = "https://github.com/ImreBoersma/projects/blob/main/docs/conformance.md";

// Spec 008: the failed rules under the problem text, each a link to its repair steps.
function ruleList(detail: string[]): string {
  return detail
    .map((name) => {
      const rule = RULES.find((r) => name.startsWith(`${r.id} `));
      return rule ? `<a href="${DOCS}#${rule.anchor}">${html(name)}</a>` : html(name);
    })
    .join(", ");
}

// Spec 009, contracts/page.md: the certificate and the renewal with the fewest days.
function expiryCell(s: ProjectStatus): string {
  const { certificate, renewals, registryNotKnown } = s.expiry;
  const lines: string[] = [];
  if (certificate === "not-known") lines.push("Certificate: not known");
  else if (certificate)
    lines.push(`Certificate: ${dayText(certificate.days)}${certificate.days < 0 ? " ago" : ""}`);
  const next = [...renewals].sort((a, b) => a.days - b.days)[0];
  if (next) lines.push(`${next.name}: ${dayText(next.days)}${next.days < 0 ? " ago" : ""}`);
  if (registryNotKnown) lines.push("Domain: not known");
  return lines.map(html).join("<br>");
}

// Spec 010, contracts/page.md: since when a problem is open.
function sinceText(s: ProjectStatus, key: string, now: Date): string {
  const time = s.history.since[key];
  if (!time) return "";
  const today = now.toISOString().slice(0, 10);
  const orBefore = s.history.sinceIsHistoryStart.includes(key) ? " or before" : "";
  if (time.slice(0, 10) === today && !orBefore)
    return ` <small>(since ${time.slice(11, 16)})</small>`;
  const days = Math.floor(
    (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${time.slice(0, 10)}T00:00:00Z`)) / DAY,
  );
  const age = orBefore ? orBefore : `, ${days} ${days === 1 ? "day" : "days"}`;
  return ` <small>(since ${time.slice(0, 10)}${age})</small>`;
}

// Spec 010: uptime of 30 days and a bar of 30 marks, old to new.
function uptimeCell(s: ProjectStatus): string {
  const u = s.history.uptime;
  if (!u) return "";
  const first = Date.parse(`${s.history.uptimeEnd ?? ""}T00:00:00Z`);
  const marks = u.days
    .map((d, i) => {
      const date = Number.isNaN(first)
        ? ""
        : new Date(first - (29 - i) * DAY).toISOString().slice(0, 10);
      return `<i class="mark ${d}" title="${date} ${MARK_TEXT[d]}"></i>`;
    })
    .join("");
  const down = u.days.filter((d) => d === "down").length;
  const none = u.days.filter((d) => d === "no-data").length;
  const percent = u.percent === null ? "No data" : `${u.percent.toFixed(1)}%`;
  return `<br><small>${percent} (30 days)</small><br><span class="bar" role="img" aria-label="Uptime of the last 30 days: ${count(down, "day")} down, ${count(none, "day")} without data">${marks}</span>`;
}

const MARK_TEXT = { up: "up", down: "down", "no-data": "no data" };

const link = (text: string, url: string | null) =>
  url ? `<a href="${html(url)}">${html(text)}</a>` : html(text);

function row(s: ProjectStatus, now: Date, issues: Map<string, number>): string {
  const links = rowLinks(s, issues);
  const problemLines = s.problems.map((p) => {
    const text = `${link(p.text ?? PROBLEM_TEXT[p.reason], links.problems.get(p.reason) ?? null)}${sinceText(s, p.key, now)}`;
    return p.detail?.length ? `${text}<br><small>${ruleList(p.detail)}</small>` : text;
  });
  if (s.conformanceNotAvailable.length) {
    problemLines.push(
      `<small>Setup check not available: ${html(s.conformanceNotAvailable.join(", "))}</small>`,
    );
  }
  const problems = problemLines.join("<br>");
  const [lastCommit, openPrs, renovate, ci, deploy] = cells(s, now);
  const values = [
    `${link(s.project.name, links.project)} <small>${s.project.status}</small>`,
    problems,
    `${link(site(s), links.site)}${uptimeCell(s)}`,
    expiryCell(s),
    html(lastCommit),
    html(openPrs),
    link(renovate, links.renovate),
    link(ci, links.ci),
    link(deploy, links.deploy),
  ];
  const tds = values.map((v, i) => `<td data-label="${COLUMNS[i]}">${v}</td>`).join("");
  return `<tr${s.problems.length ? ' class="problem"' : ""}>${tds}</tr>`;
}

const count = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

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
export function summary(rows: ProjectStatus[]): string {
  const problems = rows.reduce((n, r) => n + r.problems.length, 0);
  const withProblem = rows.filter((r) => r.problems.length > 0).length;
  const parts =
    problems > 0
      ? [
          `${count(problems, "problem")} in ${count(withProblem, "project")}.`,
          `${count(rows.length - withProblem, "project")} without a problem.`,
        ]
      : ["No problems.", `${count(rows.length, "project")}.`];
  const checked = rows.filter((r) => r.uptime.state === "up" || r.uptime.state === "down");
  const up = checked.filter((r) => r.uptime.state === "up").length;
  if (checked.length > 0) {
    parts.push(`${up} of ${count(checked.length, "site")} ${up === 1 ? "is" : "are"} up.`);
  }
  return parts.join(" ");
}

export function renderPage(page: StatusPage): string {
  const iso = page.generatedAt.toISOString();
  const shown = `${iso.slice(0, 10)} ${iso.slice(11, 16)}`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Project status</title>
<style>
:root { --bg: #fff; --fg: #1a1a1a; --muted: #666; --line: #ddd; --problem: #fdecea; --warn: #b3261e;
  --link: #0b57d0; --mark-up: #1e8e3e; --mark-down: #d93025; --mark-none: #c8c8c8; }
@media (prefers-color-scheme: dark) {
  :root { --bg: #161616; --fg: #eee; --muted: #999; --line: #333; --problem: #3a1d1b; --warn: #f2b8b5;
    --link: #8ab4f8; --mark-up: #81c995; --mark-down: #f28b82; --mark-none: #5f5f5f; }
}
body { margin: 0 auto; padding: 16px; max-width: 1100px; background: var(--bg); color: var(--fg);
  font: 15px/1.4 system-ui, sans-serif; }
.wrap { overflow-x: auto; }
table { border-collapse: collapse; width: 100%; }
th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--line); vertical-align: top; }
small, .meta { color: var(--muted); }
tr.problem { background: var(--problem); }
tr.problem td:first-child { font-weight: 600; }
#stale { color: var(--warn); font-weight: 600; }
a { color: var(--link); text-decoration: underline; }
a:focus-visible { outline: 2px solid var(--link); outline-offset: 2px; }
.summary { font-weight: 600; }
.bar { display: inline-flex; gap: 1px; flex-wrap: wrap; max-width: 100%; }
.mark { display: inline-block; width: 5px; height: 12px; border-radius: 1px; background: var(--mark-none); }
.mark.up { background: var(--mark-up); }
.mark.down { background: var(--mark-down); }
/* Spec 007: cards on a phone, without horizontal scroll. */
@media (max-width: 600px) {
  .wrap { overflow-x: visible; }
  table, tbody, tr, td { display: block; width: 100%; box-sizing: border-box; }
  thead { display: none; }
  tr { border: 1px solid var(--line); border-radius: 6px; margin-bottom: 12px; padding: 4px 0; }
  td { border: 0; padding: 4px 12px; overflow-wrap: anywhere; }
  td:empty { display: none; }
  td::before { content: attr(data-label); display: block; font-size: 12px; color: var(--muted); }
}
</style>
</head>
<body>
<h1>Project status</h1>
<p><a href="${ROADMAP}">Roadmap</a> · <a href="${BOARD}">Project board</a></p>
<p class="meta">Last update: <time datetime="${iso}">${shown}</time> UTC</p>
<p id="stale" hidden>Warning: this data is more than 3 hours old.</p>
<p class="summary">${html(summary(page.rows))} ${html(repairText(page.repair ?? null))}</p>
${page.historyStart ? `<p class="meta"><small>History from ${page.historyStart}.</small></p>` : ""}
<div class="wrap">
<table>
<thead><tr>${COLUMNS.map((c) => `<th>${c}</th>`).join("")}</tr></thead>
<tbody>
${page.rows.map((s) => row(s, page.generatedAt, page.issues)).join("\n")}
</tbody>
</table>
</div>
<script>
if (Date.now() - Date.parse("${iso}") > ${STALE_MS}) document.getElementById("stale").hidden = false;
</script>
</body>
</html>
`;
}
