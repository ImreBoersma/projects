// Spec 022 contracts/stakeholder-page.md: one static Dutch page for each stakeholder, and 404.html.
import { html, STALE_MS } from "../render";
import { datum, percent, renewalName, TEXT, tijd, untilText } from "./text";
import type { ProjectBlock, StakeholderView } from "./view";

export const SITE = "https://imreboersma.github.io/projects/";
// Research.md §6: the 3 hours of STALE_MS (spec 005), one source with the status page.
const STALE_SCRIPT = `(()=>{const m=document.querySelector("main"),s=document.querySelector("[data-stale]");if(m&&s&&Date.now()-Date.parse(m.dataset.time)>${STALE_MS})s.hidden=false})()`;

const p = (text: string) => `<p>${html(text)}</p>`;
const siteLink = (address: string) =>
  `<a class="link" href="https://${html(address)}">${html(address)}</a>`;

function lines(b: ProjectBlock): string[] {
  const out: string[] = [];
  const site = b.site;
  if (site) {
    const at = site.since ? tijd(new Date(site.since)) : "";
    const sentence =
      site.state === "online"
        ? TEXT.online(site.address)
        : site.state === "offline"
          ? TEXT.offline(site.address, at)
          : TEXT.notChecked(site.address, at);
    // The address is a link; the rest of the sentence is text.
    out.push(`<p>${html(sentence).replace(html(site.address), siteLink(site.address))}</p>`);
    if (b.uptime) {
      const value = percent(b.uptime.percent);
      out.push(
        p(b.uptime.since ? TEXT.uptimeSince(datum(b.uptime.since), value) : TEXT.uptime30(value)),
      );
    }
    // Spec 023 FR-010: speed only; no score, rule or header.
    if (b.speed) out.push(p(TEXT[b.speed]));
  } else {
    out.push(
      p(
        b.state === "problem"
          ? TEXT.problem
          : b.state === "not-checked"
            ? TEXT.notCheckedPart
            : TEXT.works,
      ),
    );
  }
  if (b.renewal) {
    out.push(
      p(
        TEXT.renewal(renewalName(b.renewal.name), datum(b.renewal.date), untilText(b.renewal.days)),
      ),
    );
  }
  return out;
}

export function renderStakeholderPage(view: StakeholderView, css: string): string {
  const time = tijd(view.generatedAt);
  const top = view.attention.length
    ? `<section class="alert alert-warning mb-6 flex flex-col items-start gap-1"><p class="font-semibold">${html(TEXT.attention)}</p>${view.attention.map((a) => p(TEXT.offline(a.address, tijd(new Date(a.since))))).join("")}</section>`
    : `<section class="alert alert-success mb-6"><p class="font-semibold">${html(TEXT.nothing)}</p></section>`;
  const blocks = view.projects
    .map(
      (b) =>
        `<article class="project mb-4 rounded-box border border-base-300 p-4"><h2 class="mb-2 text-lg font-semibold">${html(b.name)}</h2>${lines(b).join("")}</article>`,
    )
    .join("\n");
  return `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${html(TEXT.title(view.name))}</title>
<style>
${css}
</style>
</head>
<body class="bg-base-100 text-base-content">
<main class="mx-auto max-w-2xl px-4 py-8" data-time="${view.generatedAt.toISOString()}">
<h1 class="mb-1 text-2xl font-semibold">${html(TEXT.heading(view.name))}</h1>
<p class="mb-1 text-sm opacity-75">${html(TEXT.stand(time))}</p>
<p data-stale hidden class="mb-2 font-semibold text-error">${html(TEXT.stale(time))}</p>
${top}
${blocks}
<p class="mt-6 text-sm">${html(TEXT.more)} <a class="link status-link" href="${SITE}">${html(TEXT.statusPage)}</a>.</p>
<p class="print-only">${html(TEXT.thisPage)} ${SITE}s/${view.slug}.html</p>
</main>
<script>${STALE_SCRIPT}</script>
</body>
</html>
`;
}

// Contracts "Not found": GitHub Pages serves this file for each missing path of the site.
export function notFoundPage(): string {
  return `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Niet gevonden / Not found</title>
<style>body{font-family:system-ui,sans-serif;max-width:40rem;margin:4rem auto;padding:0 1rem;line-height:1.5}</style>
</head>
<body>
<p>Deze pagina bestaat niet. / This page does not exist.</p>
<p><a href="${SITE}">Statuspagina / Status page</a></p>
</body>
</html>
`;
}
