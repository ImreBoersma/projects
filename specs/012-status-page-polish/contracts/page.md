# Contract: page look of spec 012

Changes the look and the order of the page contracts of specs 001, 007, 009 and 010. The values,
the links and the forbidden content of those contracts stay.

## Head

- `<title>`: `TotalState.title` (data-model.md).
- `<link rel="icon" href="data:image/svg+xml,...">`: the favicon of `TotalState.kind`
  (research.md §7).

## Header, in this order

1. `<h1>Project status</h1>`
2. The total-state badge: `<p class="total <kind>">` with `TotalState.text`. Large text, colour of
   the kind, and the favicon shape in front of the text (`aria-hidden`).
3. The summary line of spec 007 and spec 010 (unchanged text).
4. `Last update: <time datetime data-rel>…</time> UTC (<relative>)`, the stale warning of spec
   001, the history line of spec 010.
5. Links to the roadmap and the board (new tab, see "Links").

## Sections

Design revision 2026-11-05: each section is an `<h2>` with the number of projects and a list
`<ul class="projects">`; each project is `<li class="project <kind>">` with a dot, the name (link),
the problems (`<ul class="problems">`) and the facts (`<dl class="facts">`), in labelled groups,
each group one line: **Site** (state, uptime and bar), **Code** (CI, deploy, last commit, open
PRs, Renovate PRs, setup check not available; or "No repo" / "Data not available"), **Expiry**
(certificate, next renewal, "not known" dates). A fact or a group with no value does not show.
Items in a group have a text separator ` · ` (`aria-hidden`), so that a copy of the page keeps
it. Screen-reader text and new-tab marks cannot be selected, so a copy does not contain them. Good states
are plain text; other states are badges.

Up to three sections, in this order:
`Projects with problems`, `Check not available`, `Other projects`. A section without rows does not
show. On a screen of 600 px or less, each table uses the card layout of spec 007.

## Badges

`<span class="badge good|warn|bad|unknown">Text</span>`, for the values of data-model.md
"BadgeKind". The text is the text of the earlier contracts (`Up`, `Down`, `Passed`, `Failed`,
`Succeeded`, `In progress`, `Unknown`, `Data not available`, `No repo`, `Check not available`).
Next to a badge, the time stays (for example `Up 15:00`, deploy date).

## Times

Each time or date: `<time datetime="<ISO>" data-rel title="<YYYY-MM-DD HH:MM> UTC">` with the
relative time as text, and after it `<span class="sr"> (<exact>)</span>` for screen readers
(design revision 2026-11-05; was the exact value with the relative time in brackets). For dates without a time
(expiry, renewal, history start), `title` has only the date. Covered: last update, last commit,
last deploy, site check, oldest Renovate PR, "since" of a problem, certificate and renewal dates,
"History from <date>". Not covered: the date in the tooltip of each uptime mark (spec FR-006).

## Links

Each `<a>`: `target="_blank" rel="noopener noreferrer"`, then the link text,
`<span class="nt" aria-hidden="true">↗</span><span class="sr">(opens in a new tab)</span>`.

## Script

One inline `<script>` at the end of `<body>`, no `src`:

- the stale check of spec 001 (unchanged rule: more than 3 hours);
- `relTime` (from `view.ts`, put in with `toString()`), run at load and each 60 seconds on each
  `time[data-rel]`, to set the text of the next `.rel` element.

Without the script, the page shows the relative times of the update.

## Colours

Tokens on `:root`, with dark values under `@media (prefers-color-scheme: dark)`. Each text and
badge pair has a contrast ratio of 4.5 or more (test `style.test.ts`). Colour is never the only
signal: each badge has its text, each favicon its shape.

## Pointer (spec 019)

Spec 019 replaces the layout of this page with DaisyUI rows, pop-ups, filters and tabs; the content rules stay. See
[specs/019-dashboard-filters/contracts/page.md](../../019-dashboard-filters/contracts/page.md).
