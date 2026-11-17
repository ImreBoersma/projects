# Research: Stakeholder View and Status Badges

Facts from the code of `status/` and the branch `data` on 2026-11-17.

## 1. Where the files go

- **Decision**: the page run writes `s/<slug>.html` (one for each stakeholder) and
  `badge/<project id>.svg` (one for each project that is not archived) into the same output folder
  as `index.html`. The deploy of spec 001 uploads the full folder, so no workflow change is
  necessary. Public addresses: `https://imreboersma.github.io/projects/s/harmonieorkest-brummen.html`
  and `https://imreboersma.github.io/projects/badge/hob-nl.svg`.
- **Rationale**: the files come from the same data in the same run (one state, one time). Static
  files work without scripts and print without the app code (FR-001, FR-007).
- **Alternatives considered**: a mode of `index.html` with `?stakeholder=` (rejected in the spec
  clarification: it changes the filter of spec 019 and needs the script); a separate workflow
  (a second read of GitHub, two states that can differ).

## 2. Slug of a stakeholder name

- **Decision**: lower case, accents removed (Unicode NFD, then the combining marks removed), each
  run of other characters to one `-`, no `-` at the start or end.
  "Harmonieorkest Brummen" → `harmonieorkest-brummen`.
- **Rationale**: a short address that a person can type and that stays the same while the catalog
  name stays the same. Two names with the same slug: the run stops with an error (the catalog is
  wrong), as for other catalog errors.
- **Alternatives considered**: a hash or a number (not readable in an e-mail).

## 3. Language: Dutch at level B1

- **Decision**: fixed Dutch sentences in one module (`status/src/stakeholder/text.ts`), written at
  taalniveau B1: sentences of a maximum of 15 words, common words, active voice, "u" form, no
  technical words (no "CI", "deploy", "DNS", "certificaat"). The exact texts are in
  contracts/stakeholder-page.md. Dates use `Intl.DateTimeFormat("nl-NL", { timeZone:
  "Europe/Amsterdam" })`; Bun has the full ICU data ("1 februari 2027 om 11:00", checked on
  2026-11-17).
- **Rationale**: spec clarification 2026-11-17. ASD-STE100 has no Dutch version; B1 is the level
  that the Dutch government uses for text to the public ("Direct Duidelijk").
- **Alternatives considered**: an i18n library or a translation file (one language, about 20
  sentences: Principle VIII).

## 4. Facts for each project

- **Decision**: from the `ProjectStatus` that the run already makes, nothing new is read:
  - site: `uptime.state` (`up`, `down`, `not-available`, `no-domain`) and `project.domain`;
    "offline since" from `history.since["<id>/site-down"]`, else the check time;
  - uptime: `history.uptime.percent`, with the period "de afgelopen 30 dagen" when the history
    start (`StatusPage.historyStart`) is 30 days or more before the run, else "sinds <date>";
  - renewal: the first item of `expiry.renewals` by date (catalog and registry, spec 009), with
    `days`;
  - no site: "Niet gecontroleerd" when the repo could not be read (`availability` is
    `unavailable`); else "Heeft een probleem. De beheerder weet het." when `problems` has a fault
    (`ci-failed` or `deploy-failed`); else "Werkt". Other reasons (`renovate-stale`, `inactive`,
    `not-conformant`, `secret-expiring`, `cert-expiring`, `renewal-due`) do not count: they are
    work of the Maintainer, and a renewal shows in its own line (spec clarification 2026-11-17).
    The badges use the same rule.
- **Rationale**: one source of truth with the status page (FR-012), no new token (SC-006).

## 5. "Needs attention" (FR-005)

- **Decision**: a project needs attention only when its site state is `down` and the "offline
  since" time (`history.since["<id>/site-down"]`, else `uptime.at`) is 2 hours or more before
  `generatedAt` (`OFFLINE_ATTENTION_MS`). A shorter outage shows only in the project block (spec
  clarification 2026-11-17). Time, not a run count: the page also runs after each push, so two
  runs can be minutes apart. The top line lists each such offline site in one sentence; else "Er is niets waar het bestuur iets mee moet."
- **Rationale**: a site that is down is visible to members, so the board must know. The
  Maintainer renews the domains (spec clarification 2026-11-17), so a renewal is a fact in the
  project block, not an attention item. The view does not mention payment or cost (Principle VII).
- **Renewal line**: only a renewal with `days >= 0` shows; a past date is a catalog that is not
  updated, which is work of the Maintainer (spec 009 opens an issue).
- **Time to a date**: fewer than 45 days → "over N dagen" ("over 1 dag" for 1, "vandaag" for 0);
  else "over N maanden" with N = floor(days / 30), and "over 1 maand" for N = 1 (45 to 59 days).
  76 days → "over 2 maanden"; 165 days → "over 5 maanden".

## 5a. Link from the status page (FR-013)

- **Decision**: the `<nav>` in the header of `index.html` (Roadmap, Project board, Run the status
  update now) gets one link "View for {stakeholder}" to `s/<slug>.html` for each stakeholder, in
  name order. A relative address, so it also works in a local build.
- **Rationale**: the Maintainer finds and copies the address without remembering it. About 80 B
  for each stakeholder; no effect on the 30 KB budget.

## 6. Old data without the app script

- **Decision**: the stakeholder page has one small inline script (< 400 B) that compares the time
  of the data (`data-time` on `<main>`) with the clock and shows the hidden warning after 3 hours
  (`STALE_MS` of `render.ts`). Without scripts, the warning does not show, but the time of the data
  is always in the text.
- **Rationale**: a static page cannot know its age; the full page uses the same rule (spec 005).
- **Alternatives considered**: the full `client.ts` (filters, ⌘K, the app badge; not necessary).

## 7. Style and print

- **Decision**: the page puts the built `build/page.css` inline (the same theme and dark scheme as
  the status page, spec 019) with `@source "./stakeholder/"` added to `src/page.css`, and one
  `@media print` block: white background, black text, no `<nav>` and no links shown as buttons,
  the address of the view as text after the title, `@page { size: A4; margin: 15mm }`.
- **Budget**: the stakeholder page is a separate file, so it does not count in the 30 KB of the
  status page (SC-005). Its own budget: < 15 KB gzip with 20 projects (the CSS is about 10 KB
  gzip on 2026-11-17).
- **Service worker**: `sw.js` (spec 020) has the scope `/projects/`; it also serves
  `/projects/s/*.html` network first and from the cache when there is no network. No change.

## 8. Badges

- **Decision**: one SVG of about 400 B for each project, made in the run without a library: two
  parts (the project name on grey, the state on its colour), `font-family="Verdana,DejaVu
  Sans,sans-serif"` at 11 px, the width from the character count with `textLength`, so the text
  fits on each system. A `<title>` gives the full text ("hob.nl: online") for screen readers.
- **Colours**: fixed hex values with a contrast of 4.5:1 or more for the text: online/works green
  `#1a7f37` with white, offline/problem red `#cf222e` with white, not checked grey `#6e7781` with
  white, name part `#24292f` with white. A test checks the contrast.
- **Cache**: GitHub Pages sends each file with `Cache-Control: max-age=600` and the headers cannot
  change. GitHub shows README images through its image proxy (camo), which follows that header.
  So a new state shows within about 10 minutes after the deploy (FR-009 "where the host permits").
- **Alternatives considered**: shields.io with a JSON endpoint (an external service, spec 022
  input); a PNG (bigger, no text for screen readers).

## 9. Tests

- Pure functions, as in the other specs: `stakeholderViews(page)` (the view model),
  `renderStakeholderPage(view, css)`, `badge(project status)`, `slug(name)`, `untilText(days)`.
  Fixtures: the 3 HOB projects with the dates of SC-003 and SC-004. A forbidden-word test (FR-004):
  the HTML contains none of "CI", "Renovate", "commit", "PR", "deploy", "conform", "token",
  "github.com". A size test for 20 projects.
