import { PROBLEM_TEXT } from "./problems";
import type { ProjectStatus, StatusPage } from "./types";

const DAY = 24 * 60 * 60 * 1000;
const STALE_MS = 48 * 60 * 60 * 1000;

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

function row(s: ProjectStatus, now: Date): string {
  const problems = s.problems.map((p) => html(PROBLEM_TEXT[p.reason])).join("<br>");
  const data = cells(s, now)
    .map((c) => `<td>${html(c)}</td>`)
    .join("");
  return `<tr${s.problems.length ? ' class="problem"' : ""}><td>${html(s.project.name)} <small>${s.project.status}</small></td><td>${problems}</td>${data}</tr>`;
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
:root { --bg: #fff; --fg: #1a1a1a; --muted: #666; --line: #ddd; --problem: #fdecea; --warn: #b3261e; }
@media (prefers-color-scheme: dark) {
  :root { --bg: #161616; --fg: #eee; --muted: #999; --line: #333; --problem: #3a1d1b; --warn: #f2b8b5; }
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
</style>
</head>
<body>
<h1>Project status</h1>
<p class="meta">Last update: <time datetime="${iso}">${shown}</time> UTC</p>
<p id="stale" hidden>Warning: this data is more than 48 hours old.</p>
<div class="wrap">
<table>
<thead><tr><th>Project</th><th>Problems</th><th>Last commit</th><th>Open PRs</th><th>Renovate PRs</th><th>CI</th><th>Last deploy</th></tr></thead>
<tbody>
${page.rows.map((s) => row(s, page.generatedAt)).join("\n")}
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
