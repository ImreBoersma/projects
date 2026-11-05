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
  rowKind,
  sections,
  totalState,
} from "./view";

// Spec 004 board and its public Roadmap view (spec 007, research.md §7).
const BOARD = "https://github.com/users/ImreBoersma/projects/4";
const ROADMAP = `${BOARD}/views/3`;
const DOCS = "https://github.com/ImreBoersma/projects/blob/main/docs/conformance.md";

const DAY = 24 * 60 * 60 * 1000;
// The page updates each hour, so 3 hours without an update means that the schedule stopped.
const STALE_MS = 3 * 60 * 60 * 1000;

const html = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
const count = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

// Spec 012 design revision (research.md §9): colour only for a state that is not good.
// `inner` is HTML.
const badge = (kind: BadgeKind, inner: string) =>
  kind === "good" ? inner : `<span class="badge ${kind}">${inner}</span>`;

// Spec 012 FR-006: the relative time is the visible text; the exact time is in the tooltip and
// for screen readers. The page script keeps the text current (research.md §3).
function timeTag(iso: string, now: Date): string {
  const exact = iso.length === 10 ? iso : `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
  return `<time datetime="${iso}" data-rel title="${exact}">${relTime(iso, now.getTime())}</time><span class="sr"> (${exact})</span>`;
}

// Spec 012 FR-007, FR-008: each link opens a new tab. `inner` is HTML.
const link = (inner: string, url: string | null) =>
  url
    ? `<a href="${html(url)}" target="_blank" rel="noopener noreferrer">${inner}<span class="nt" aria-hidden="true">↗</span><span class="sr"> (opens in a new tab)</span></a>`
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

// Spec 010: 30 marks, old to new.
const MARK_TEXT = { up: "up", down: "down", "no-data": "no data" };
function uptimeBar(s: ProjectStatus): string {
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
  const percent = u.percent === null ? "no data" : `${u.percent.toFixed(1)}%`;
  return ` · ${percent} in 30 days <span class="bar" role="img" aria-label="Uptime of the last 30 days: ${count(down, "day")} down, ${count(none, "day")} without data">${marks}</span>`;
}

// The facts of a project, in one wrapping line. Facts with no value are not shown.
function facts(s: ProjectStatus, now: Date, links: ReturnType<typeof rowLinks>): string[] {
  const out: string[] = [];
  const { state, at } = s.uptime;
  if (state === "up" || state === "down") {
    const text = state === "up" ? "Site up" : "Site down";
    const checked = at
      ? ` <span class="sr">(checked ${at.toISOString().slice(11, 16)} UTC)</span>`
      : "";
    out.push(
      `${link(badge(state === "up" ? "good" : "bad", text), links.site)}${checked}${uptimeBar(s)}`,
    );
  } else if (state === "not-available") {
    out.push(link(badge("unknown", "Site check not available"), links.site));
  }

  if (s.availability === "no-repo") out.push("No repo");
  else if (s.availability === "unavailable") out.push(badge("unknown", "Repo data not available"));
  else {
    if (s.ci !== "unknown") {
      out.push(link(badge(ciKind(s.ci), s.ci === "passed" ? "CI passed" : "CI failed"), links.ci));
    }
    if (s.deploy !== "unknown") {
      const d = s.deploy;
      const text =
        d.result === "succeeded"
          ? "Deployed"
          : d.result === "failed"
            ? "Deploy failed"
            : "Deploying";
      out.push(
        `${link(badge(deployKind(d), text), links.deploy)} ${timeTag(d.at.toISOString(), now)}`,
      );
    }
    if (s.lastCommitAt) out.push(`Last commit ${timeTag(s.lastCommitAt.toISOString(), now)}`);
    if (s.openPrCount > 0) out.push(count(s.openPrCount, "open PR"));
    if (s.renovatePrCount > 0) {
      const oldest = s.oldestRenovatePrAt
        ? `, oldest ${timeTag(s.oldestRenovatePrAt.toISOString(), now)}`
        : "";
      out.push(`${link(count(s.renovatePrCount, "Renovate PR"), links.renovate)}${oldest}`);
    }
  }

  const { certificate, renewals, registryNotKnown } = s.expiry;
  if (certificate === "not-known") out.push("Certificate date not known");
  else if (certificate) {
    const word = certificate.days < 0 ? "expired" : "expires";
    out.push(
      badge(
        certificateKind(certificate.days),
        `Certificate ${word} ${timeTag(certificate.date, now)}`,
      ),
    );
  }
  const next = [...renewals].sort((a, b) => a.days - b.days)[0];
  if (next) {
    const due = next.days < 0 ? "renewal was due" : "renewal";
    out.push(badge(renewalKind(next.days), `${html(next.name)} ${due} ${timeTag(next.date, now)}`));
  }
  if (registryNotKnown) out.push("Domain date not known");
  if (s.conformanceNotAvailable.length) {
    out.push(`Setup check not available: ${html(s.conformanceNotAvailable.join(", "))}`);
  }
  return out;
}

const DOT_TEXT = {
  good: "Correct",
  warn: "Warning",
  bad: "Problem",
  unknown: "Check not available",
};

function project(s: ProjectStatus, now: Date, issues: Map<string, number>): string {
  const links = rowLinks(s, issues);
  const kind = rowKind(s);
  const problems = s.problems.map((p) => {
    const text = `${link(html(p.text ?? PROBLEM_TEXT[p.reason]), links.problems.get(p.reason) ?? null)}${sinceText(s, p.key, now)}`;
    return `<li>${p.detail?.length ? `${text}<br><span class="rules">${ruleList(p.detail)}</span>` : text}</li>`;
  });
  const tag =
    s.project.status === "active" ? "" : ` <span class="tag">${html(s.project.status)}</span>`;
  const list = facts(s, now, links)
    .map((f) => `<li>${f}</li>`)
    .join("");
  return `<li class="project ${kind}">
<p class="name"><span class="dot ${kind}" role="img" aria-label="${DOT_TEXT[kind]}"></span>${link(html(s.project.name), links.project)}${tag}</p>
${problems.length ? `<ul class="problems">${problems.join("")}</ul>\n` : ""}${list ? `<ul class="facts">${list}</ul>` : ""}
</li>`;
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
  const groups = sections(page.rows)
    .map(
      (section) => `<section>
<h2>${section.title} <span class="count">${section.rows.length}</span></h2>
<ul class="projects">
${section.rows.map((s) => project(s, now, page.issues)).join("\n")}
</ul>
</section>`,
    )
    .join("\n");
  const history = page.historyStart ? ` · History from ${timeTag(page.historyStart, now)}` : "";
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
<header class="top">
<h1>Project status</h1>
<nav>${link("Roadmap", ROADMAP)}${link("Project board", BOARD)}</nav>
</header>
<section class="total ${total.kind}">
<p class="state"><span aria-hidden="true">${ICON[total.kind]}</span>${total.text}</p>
<p class="summary">${html(summary(page.rows))} ${html(repairText(page.repair ?? null))}</p>
<p class="meta">Updated ${timeTag(iso, now)}${history}</p>
<p id="stale" hidden>Warning: this data is more than 3 hours old.</p>
</section>
${groups}
<script>
if (Date.now() - Date.parse("${iso}") > ${STALE_MS}) document.getElementById("stale").hidden = false;
${relTime.toString()}
function updateTimes() {
  for (const t of document.querySelectorAll("time[data-rel]")) t.textContent = relTime(t.getAttribute("datetime"), Date.now());
}
updateTimes();
setInterval(updateTimes, 60000);
</script>
</body>
</html>
`;
}
