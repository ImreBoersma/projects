import { RULES } from "./conformance/rules";
import { rowLinks } from "./links";
import { PROBLEM_TEXT } from "./problems";
import { css, FAVICON, ICON } from "./style";
import type { ProjectStatus, StatusPage } from "./types";
import {
  type BadgeKind,
  certificateKind,
  ciKind,
  deployKind,
  relTime,
  renewalKind,
  sections,
  siteKind,
  totalState,
} from "./view";

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
const UPTIME_TEXT = { up: "Up", down: "Down", "not-available": "Check not available" };

// Spec 012 contracts/page.md "Badges". `inner` is HTML.
const badge = (kind: BadgeKind, inner: string) => `<span class="badge ${kind}">${inner}</span>`;

// Spec 012 contracts/page.md "Times": the exact value, then the relative time of the update.
// The page script keeps the relative time current (research.md §3).
function timeTag(iso: string, shown: string, now: Date): string {
  const title = iso.length === 10 ? iso : `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
  return `<time datetime="${iso}" data-rel title="${title}">${shown}</time> <small class="rel">(${relTime(iso, now.getTime())})</small>`;
}
const dateTag = (date: Date, now: Date) => timeTag(date.toISOString(), day(date), now);

// Spec 012 FR-007, FR-008: each link opens a new tab. `inner` is HTML.
const link = (inner: string, url: string | null) =>
  url
    ? `<a href="${html(url)}" target="_blank" rel="noopener noreferrer">${inner}<span class="nt" aria-hidden="true">↗</span><span class="sr"> (opens in a new tab)</span></a>`
    : inner;

const count = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

// The site state is the link; the time of the check is next to it.
function site(s: ProjectStatus, now: Date, url: string | null): string {
  const { state, at } = s.uptime;
  if (state === "no-domain") return link("No domain", url);
  const text = link(badge(siteKind(state), UPTIME_TEXT[state]), url);
  if (state === "not-available" || !at) return text;
  return `${text} ${timeTag(at.toISOString(), at.toISOString().slice(11, 16), now)}`;
}

const DOCS = "https://github.com/ImreBoersma/projects/blob/main/docs/conformance.md";

// Spec 008: the failed rules under the problem text, each a link to its repair steps.
function ruleList(detail: string[]): string {
  return detail
    .map((name) => {
      const rule = RULES.find((r) => name.startsWith(`${r.id} `));
      return link(html(name), rule ? `${DOCS}#${rule.anchor}` : null);
    })
    .join(", ");
}

// Spec 009, contracts/page.md: the certificate and the renewal with the fewest days, as badges.
function expiryCell(s: ProjectStatus, now: Date): string {
  const { certificate, renewals, registryNotKnown } = s.expiry;
  const notKnown = badge("unknown", "not known");
  const lines: string[] = [];
  if (certificate === "not-known") lines.push(`Certificate: ${notKnown}`);
  else if (certificate)
    lines.push(
      `Certificate: ${badge(certificateKind(certificate.days), timeTag(certificate.date, certificate.date, now))}`,
    );
  const next = [...renewals].sort((a, b) => a.days - b.days)[0];
  if (next)
    lines.push(
      `${html(next.name)}: ${badge(renewalKind(next.days), timeTag(next.date, next.date, now))}`,
    );
  if (registryNotKnown) lines.push(`Domain: ${notKnown}`);
  return lines.join("<br>");
}

// Spec 010, contracts/page.md: since when a problem is open (spec 012: with a relative time).
function sinceText(s: ProjectStatus, key: string, now: Date): string {
  const time = s.history.since[key];
  if (!time) return "";
  const shown = time.slice(0, 10) === day(now) ? time.slice(11, 16) : time.slice(0, 10);
  const orBefore = s.history.sinceIsHistoryStart.includes(key) ? " or before" : "";
  return ` <small>since ${timeTag(time, shown, now)}${orBefore}</small>`;
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

// The five repo cells: Last commit, Open PRs, Renovate PRs, CI, Last deploy (HTML).
function repoCells(s: ProjectStatus, now: Date, links: ReturnType<typeof rowLinks>): string[] {
  if (s.availability !== "ok") {
    const text = s.availability === "no-repo" ? "No repo" : "Data not available";
    return Array(5).fill(badge("unknown", text));
  }
  const deploy =
    s.deploy === "unknown"
      ? badge("unknown", "Unknown")
      : `${link(badge(deployKind(s.deploy), DEPLOY_TEXT[s.deploy.result]), links.deploy)} ${dateTag(s.deploy.at, now)}`;
  return [
    s.lastCommitAt ? dateTag(s.lastCommitAt, now) : badge("unknown", "Unknown"),
    String(s.openPrCount),
    s.oldestRenovatePrAt
      ? `${link(String(s.renovatePrCount), links.renovate)}, oldest ${dateTag(s.oldestRenovatePrAt, now)}`
      : link(String(s.renovatePrCount), links.renovate),
    link(badge(ciKind(s.ci), CI_TEXT[s.ci]), links.ci),
    deploy,
  ];
}

function row(s: ProjectStatus, now: Date, issues: Map<string, number>): string {
  const links = rowLinks(s, issues);
  const problemLines = s.problems.map((p) => {
    const text = `${link(html(p.text ?? PROBLEM_TEXT[p.reason]), links.problems.get(p.reason) ?? null)}${sinceText(s, p.key, now)}`;
    return p.detail?.length ? `${text}<br><small>${ruleList(p.detail)}</small>` : text;
  });
  if (s.conformanceNotAvailable.length) {
    problemLines.push(
      `<small>Setup check not available: ${html(s.conformanceNotAvailable.join(", "))}</small>`,
    );
  }
  const values = [
    `${link(html(s.project.name), links.project)} <small>${s.project.status}</small>`,
    problemLines.join("<br>"),
    `${site(s, now, links.site)}${uptimeCell(s)}`,
    expiryCell(s, now),
    ...repoCells(s, now, links),
  ];
  const tds = values.map((v, i) => `<td data-label="${COLUMNS[i]}">${v}</td>`).join("");
  return `<tr${s.problems.length ? ' class="problem"' : ""}>${tds}</tr>`;
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
  const now = page.generatedAt;
  const iso = now.toISOString();
  const total = totalState(page.rows);
  const tables = sections(page.rows)
    .map(
      (section) => `<section>
<h2>${section.title}</h2>
<div class="wrap">
<table>
<thead><tr>${COLUMNS.map((c) => `<th>${c}</th>`).join("")}</tr></thead>
<tbody>
${section.rows.map((s) => row(s, now, page.issues)).join("\n")}
</tbody>
</table>
</div>
</section>`,
    )
    .join("\n");
  const history = page.historyStart
    ? `<p class="meta"><small>History from ${timeTag(page.historyStart, page.historyStart, now)}.</small></p>`
    : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${total.title}</title>
<link rel="icon" href="${FAVICON[total.kind]}">
<style>
${css()}
</style>
</head>
<body>
<h1>Project status</h1>
<p class="total ${total.kind}"><span aria-hidden="true">${ICON[total.kind]}</span>${total.text}</p>
<p class="summary">${html(summary(page.rows))} ${html(repairText(page.repair ?? null))}</p>
<p class="meta">Last update: ${timeTag(iso, `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`, now)}</p>
<p id="stale" hidden>Warning: this data is more than 3 hours old.</p>
${history}
<p>${link("Roadmap", ROADMAP)} · ${link("Project board", BOARD)}</p>
${tables}
<script>
if (Date.now() - Date.parse("${iso}") > ${STALE_MS}) document.getElementById("stale").hidden = false;
${relTime.toString()}
function updateTimes() {
  for (const t of document.querySelectorAll("time[data-rel]")) {
    const r = t.nextElementSibling;
    if (r && r.classList.contains("rel")) r.textContent = "(" + relTime(t.getAttribute("datetime"), Date.now()) + ")";
  }
}
updateTimes();
setInterval(updateTimes, 60000);
</script>
</body>
</html>
`;
}
