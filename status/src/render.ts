import { RULES } from "./conformance/rules";
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

const link = (text: string, url: string | null) =>
  url ? `<a href="${html(url)}">${html(text)}</a>` : html(text);

function row(s: ProjectStatus, now: Date, issues: Map<string, number>): string {
  const links = rowLinks(s, issues);
  const problemLines = s.problems.map((p) => {
    const text = link(PROBLEM_TEXT[p.reason], links.problems.get(p.reason) ?? null);
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
    link(site(s), links.site),
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
  --link: #0b57d0; }
@media (prefers-color-scheme: dark) {
  :root { --bg: #161616; --fg: #eee; --muted: #999; --line: #333; --problem: #3a1d1b; --warn: #f2b8b5;
    --link: #8ab4f8; }
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
<p class="summary">${html(summary(page.rows))}</p>
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
