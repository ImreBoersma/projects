# Tasks: Stakeholder View and Status Badges

**Input**: Design documents from `/specs/022-stakeholder-view/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/stakeholder-page.md,
contracts/badge.md, quickstart.md

**Tests**: included (plan.md "Testing", quickstart.md §1).

**Format**: `[ID] [P?] [Story] Description`. All paths are from the repo root.

---

## Phase 1: Setup

- [X] T001 On the branch `022-stakeholder-view`, run `cd status && bun run css && bun test` and record the baseline number of tests in this task. Done: 477 tests.
- [X] T002 In `status/tests/helpers.ts`, add `hobRows(): ProjectStatus[]` with the 3 HOB projects of spec.md "Current state", built with the existing `status()` helper: `hob-nl` (name "hob.nl", domain `harmonieorkestbrummen.nl`, `uptime.state: "up"`, `history.uptime.percent: 100`, `expiry.renewals: [{ name: "Domain", date: "2027-05-01", days: <from now>, source: "catalog" }]`), `pretband` (name "Pretband", repo null, domain `pretband.nl`, up, 100 %, renewal `Domain` `2027-02-01`), `pretband-backend` (name "Pretband backend", no domain, no problems, `availability: "ok"`); all with `stakeholder: "Harmonieorkest Brummen"`. Take `now` as a parameter, so that `days` is right for 2026-11-17 (SC-003) and 2027-01-25 (SC-004).

---

## Phase 2: Foundational

**Purpose**: the view model and the Dutch texts; US1, US2 and US3 use them.

- [X] T003 [P] Make `status/tests/stakeholder-view.test.ts` for research.md §2, §4, §5 and data-model.md:
  - `slug("Harmonieorkest Brummen")` → `harmonieorkest-brummen`; `slug("Café  Ünïon!")` → `cafe-union`; no `-` at the start or end.
  - `stakeholderViews(page)` gives one `StakeholderView` for each distinct `stakeholder`; rows without a stakeholder are in no view; projects in name order (A to Z); two names with the same slug throw an error with both names.
  - `ProjectBlock.site`: null without a domain; `up` → `online`, `down` → `offline` with `since` from `history.since["<id>/site-down"]` (else `uptime.at`), `not-available` → `not-checked`.
  - `ProjectBlock.uptime`: `since` is null when `historyStart` is 30 days or more before `generatedAt`, else the `historyStart` date; null when `history.uptime.percent` is null.
  - `ProjectBlock.renewal`: the first of `expiry.renewals` by date; null when there is none.
  - `ProjectBlock.state` (only without a site): `availability: "unavailable"` → `not-checked`; a problem with reason `ci-failed` or `deploy-failed` → `problem`; only `renovate-stale`, `inactive`, `not-conformant`, `secret-expiring`, `cert-expiring` or `renewal-due` → `works`; no problems → `works`.
  - `attention`: an `offline` item for each site that is `down` with `since` 2 hours or more before `generatedAt` (exactly 2 h → item; 1 h 59 min → no item, but `site.state` is `offline`), in name order; a renewal never makes an item. With `hobRows` at 2026-11-17: empty (SC-003). At 2027-01-25 (7 days to the pretband.nl renewal): empty (SC-004).
  - `ProjectBlock.renewal`: a renewal with `days < 0` is not used (the next one with `days >= 0`, else null).
- [X] T004 Make `status/src/stakeholder/view.ts` with `slug(name)`, `stakeholderViews(page: StatusPage): StakeholderView[]` and the types `StakeholderView`, `AttentionItem`, `ProjectBlock`, `SiteFact` of data-model.md, and `FAULT_REASONS = ["ci-failed", "deploy-failed"]`, `OFFLINE_ATTENTION_MS = 2 * 60 * 60 * 1000`, so that T003 passes. Read nothing from GitHub; use only the fields of `StatusPage` and `ProjectStatus`.
- [X] T005 [P] Make tests in `status/tests/stakeholder-view.test.ts` (a second `describe`) for `untilText(days)` and the date functions of research.md §5 and contracts/stakeholder-page.md: 0 → "vandaag", 1 → "over 1 dag", 44 → "over 44 dagen", 45 → "over 1 maand", 59 → "over 1 maand", 60 → "over 2 maanden", 76 → "over 2 maanden", 165 → "over 5 maanden"; `datum("2027-02-01")` → "1 februari 2027"; `tijd(new Date("2026-11-17T11:00:00Z"))` → "17 november 2026 om 12:00" (Europe/Amsterdam); `percent(100)` → "100 %", `percent(99.7)` → "99,7 %"; `renewalName("Domain")` → "de domeinnaam", `renewalName("Hosting")` → "'Hosting'".
- [X] T006 Make `status/src/stakeholder/text.ts` with `untilText`, `datum`, `tijd`, `percent`, `renewalName` and the fixed Dutch B1 sentences of contracts/stakeholder-page.md "Texts" (top line, attention items, project block lines), so that T005 passes. A comment says that this file is Dutch at taalniveau B1 (plan.md Complexity Tracking) and that the sentences must stay short, with common words and the active voice.

**Checkpoint**: `bun test tests/stakeholder-view.test.ts` passes.

---

## Phase 3: User Story 1 - A board member sees in one minute if something needs the board (Priority: P1) 🎯 MVP

**Goal**: `s/<slug>.html` with the top line and one block for each project, in Dutch, without
developer facts; a link from the status page.

**Independent Test**: render the HOB fixture; the page has the sentences of SC-003 and none of
the forbidden words (quickstart.md §1).

- [X] T007 [P] [US1] Make `status/tests/stakeholder-render.test.ts` for contracts/stakeholder-page.md "Structure" and "Texts": `renderStakeholderPage(view, css)` with `hobRows` at 2026-11-17 contains `<html lang="nl">`, `<title>Harmonieorkest Brummen: status van de projecten</title>`, "Projecten van Harmonieorkest Brummen", "Stand van 17 november 2026 om", "Er is niets waar het bestuur iets mee moet.", "De website harmonieorkestbrummen.nl is online.", "De beheerder verlengt de domeinnaam vóór 1 februari 2027 (over 2 maanden).", "Dit onderdeel werkt." and a link to the status page; at 2027-01-25 it still contains "Er is niets waar het bestuur iets mee moet." and "De beheerder verlengt de domeinnaam vóór 1 februari 2027 (over 7 dagen)."; no text contains "betaal", "kosten" or "€" (Principle VII); a site that is down since 3 hours gives "De website pretband.nl is offline sinds ... De beheerder weet het." in the top line and in the block; down since 30 minutes gives the line in the block only and "Er is niets waar het bestuur iets mee moet." on top; a history start of 2026-11-05 gives "Sinds 5 november 2026 was de website 100 % van de tijd online."; `pretband-backend` with a `ci-failed` problem gives "Er is een probleem. De beheerder weet het."; with only `renovate-stale` it gives "Dit onderdeel werkt.". FR-004: for a fixture where every project has CI, deploy, Renovate, commit, conformance and version facts and problems, the HTML (outside the `<style>` element) matches none of `/\bCI\b/`, `Renovate`, `commit`, `\bPR\b`, `deploy`, `conform`, `token`, `github.com`, and has no `<nav>`, `<dialog>` or `data-filter`. Text from the catalog is HTML-escaped (a project name `<b>` shows as `&lt;b&gt;`).
- [X] T008 [US1] Make `status/src/stakeholder/render.ts` with `renderStakeholderPage(view: StakeholderView, css: string): string` for contracts/stakeholder-page.md "Structure" and "Texts", with the texts of `text.ts`, the CSS inline in one `<style>`, DaisyUI classes (`alert alert-success` for "nothing", `alert alert-warning` for attention items, `card` for each block), and the old-data script of research.md §6 (< 400 B: show `[data-stale]` when `Date.now()` minus `main.dataset.time` is more than 3 hours; use the same 3 hours as `STALE_MS` in `status/src/render.ts`), so that T007 passes.
- [X] T009 [US1] In `status/src/page.css`, add `@source "./stakeholder/";` after the other `@source` lines, so that the classes of `status/src/stakeholder/render.ts` are in `build/page.css`; add `card` to the DaisyUI `include` list only if T008 uses it. Run `bun run css` and `bun test tests/css.test.ts tests/size.test.ts`; the status page stays < 30 KB gzip. Done: no `card` (the blocks use `rounded-box border`); status page 22,986 B gzip.
- [X] T010 [P] [US1] In `status/tests/render.test.ts`, add a test for FR-013 and contracts/stakeholder-page.md "Link from the status page": `renderPage` with rows of the stakeholders "Harmonieorkest Brummen" and "A Orkest" has, in the header `<nav>` after "Run the status update now", the links "View for A Orkest" (`href="s/a-orkest.html"`) and "View for Harmonieorkest Brummen" (`href="s/harmonieorkest-brummen.html"`), in that order; without stakeholders, no such link.
- [X] T011 [US1] In `status/src/render.ts`, add the links of T010 to the header `<nav>` (line with "Run the status update now"), with `slug` from `status/src/stakeholder/view.ts`, so that T010 passes.
- [X] T012 [US1] In `status/src/main.ts`, after `status.json` is written: for each view of `stakeholderViews(page)`, write `join(args.out, "s", `${view.slug}.html`)` with `renderStakeholderPage(view, page.css ?? "")` (make the folder `s` first), and log `Wrote s/<slug>.html with <n> projects.`. A write error logs `::error::` and does not stop the page deploy (as `status.json`, spec 020 T030).

**Checkpoint**: `bun test` passes; a local run (quickstart.md §2) writes `s/harmonieorkest-brummen.html`.

---

## Phase 4: User Story 2 - Print one page for the board meeting (Priority: P2)

**Goal**: the print layout of contracts/stakeholder-page.md "Print".

**Independent Test**: print preview of the HOB page on A4 is one page (quickstart.md §3).

- [X] T013 [P] [US2] In `status/tests/stakeholder-render.test.ts`, add tests: the page has `<p class="print-only">Deze pagina: https://imreboersma.github.io/projects/s/harmonieorkest-brummen.html</p>` (the address from a constant `SITE` in `status/src/stakeholder/render.ts`); `status/src/page.css` contains an `@media print` block with `@page`, `size: A4`, `.print-only`, and `break-inside: avoid`.
- [X] T014 [US2] In `status/src/page.css`, add the `@media print` block of research.md §7 and contracts/stakeholder-page.md "Print": `@page { size: A4; margin: 15mm; }`; `.print-only { display: none }` on screen and `display: block` in print; in print: white background and black text for `body`, the alert colours as a 1 px border, `[data-stale]` stays as it is, `.card { break-inside: avoid }`, the status page link shows its address with `a[href^="http"]::after { content: " (" attr(href) ")" }` inside `main` only. In `status/src/stakeholder/render.ts`, add the `print-only` line, so that T013 passes. The print rules must not change the status page on screen (`bun test tests/size.test.ts tests/css.test.ts`).
- [X] T015 [US2] Check quickstart.md §3 by hand: a local build, print preview on A4 in light and dark scheme, 3 projects on one page, "Stand van ...", the address at the bottom, no buttons. Record the result in this task. Done 2026-11-17 with the print rules applied on screen at the A4 text width (180 mm): 146 mm of 267 mm for 3 projects (about 35 mm for each more block), black on white, both addresses shown; dark scheme on screen checked. A real print preview by the Maintainer before the first board meeting is still useful.

**Checkpoint**: the HOB page prints on one A4 page.

---

## Phase 5: User Story 3 - A status badge in a README and in a site footer (Priority: P3)

**Goal**: `badge/<id>.svg` for each project (contracts/badge.md).

**Independent Test**: two fixture projects (up and down) give two SVGs with the right text and
colour (quickstart.md §1).

- [X] T016 [P] [US3] Make `status/tests/badge.test.ts` for contracts/badge.md: `badge(status)` returns `{ id, svg }`; each row of the table "States" gives its text and colour (`up` → "online" `#1a7f37`, `down` → "offline" `#cf222e`, `not-available` → "not checked" `#6e7781`; no domain: no fault → "works", `ci-failed` or `deploy-failed` → "problem", only `renovate-stale` → "works", `availability: "unavailable"` → "not checked"); the SVG has `role="img"`, `aria-label` and `<title>` "{name}: {state}", the state text starts with "● ", the name part is `#24292f`, `textLength` is set on both texts, no `<script>`, no `href`, no external address; a name with `&` and `<` is XML-escaped; the size is < 1 KB for a name of 30 characters; the contrast of white (`#ffffff`) on each of the 4 colours is 4.5:1 or more (compute the WCAG relative luminance in the test).
- [X] T017 [US3] Make `status/src/stakeholder/badge.ts` with `badge(status: ProjectStatus): { id: string; svg: string }` for contracts/badge.md (part width = 6.5 px × characters + 10 px, height 20, font `Verdana,DejaVu Sans,sans-serif` 11 px, white text) and the fault rule `FAULT_REASONS` of `view.ts`, so that T016 passes.
- [X] T018 [US3] In `status/src/main.ts`, after the stakeholder pages: write `join(args.out, "badge", `${id}.svg`)` for each row (make the folder `badge` first) and log `Wrote <n> badges.`. A write error logs `::error::` and does not stop the deploy.

**Checkpoint**: a local run writes 11 badges.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T019 [P] In `status/src/stakeholder/render.ts`, add `notFoundPage(): string` for contracts/stakeholder-page.md "Not found" (`lang="nl"`, "Deze pagina bestaat niet. / This page does not exist.", a link to `https://imreboersma.github.io/projects/`, no CSS file, a few inline style rules only), with a test in `status/tests/stakeholder-render.test.ts`; in `status/src/main.ts`, write it as `join(args.out, "404.html")`.
- [X] T020 [P] In `status/tests/size.test.ts`, add: the stakeholder page with 20 projects (built from `worstCaseRows()` with one stakeholder for all) and the real CSS is < 15 KB gzip (SC-005); log the size as the other size tests do.
- [X] T021 Run `cd status && bun run css && bun run lint && bun run typecheck && bun test`. All pass; record the number of tests (baseline of T001 plus the new tests). Done: lint, typecheck and 502 tests pass (477 + 25). Stakeholder page 11,178 B gzip with 20 projects.
- [X] T022 Check quickstart.md §2 with a local run, and open the page with scripts off: all facts show. Record the result in this task. Done 2026-11-17 with the live data and the 13 history files: `s/harmonieorkest-brummen.html` (3 projects, "Er is niets waar het bestuur iets mee moet."), 11 badges, `404.html`. All facts are in the HTML; the only script shows the old-data warning.
- [X] T023 [P] In `README.md` of `projects`, add one short paragraph: the address of the stakeholder views (`s/<slug>.html`) and the badge address and Markdown of contracts/badge.md.
- [X] T024 [P] In `PLAN.md`, move feature 022 to "Done" with one entry in the list "Done" (separate Dutch B1 page for each stakeholder with a print layout; a link in the status page header; one SVG badge for each project; only CI and deploy faults count as a problem; the Principle X deviation for the Dutch text), and mark 022 "(done)" in the table.
- [X] T025 After the deploy, check quickstart.md §4: the HOB page in a private window, the 404 page, and the badge in the README of `harmonieorkest-brummen/hob-nl` (a PR in that repo, made by the Maintainer). Record the result in this task. Done 2026-11-17 without a GitHub login: the HOB page, `badge/hob-nl.svg` (`image/svg+xml`, `max-age=600`) and `404.html` give HTTP 200; a wrong address gives HTTP 404 with "Deze pagina bestaat niet. / This page does not exist."; the status page header has "View for Harmonieorkest Brummen". The badge is in the README of `harmonieorkest-brummen/hob-nl` (PR #1, merged); GitHub shows it through its image proxy with the text "hob.nl: online". The hob-nl deploy after that merge failed on the SSH login ("Permission denied") in the dry run, before a file was copied; this is not caused by spec 022.

---

## Dependencies & Execution Order

- Setup: T001, then T002.
- Foundational: T003 and T005 (tests) can run in parallel; T004 after T003; T006 after T005. All before US1, US2 and US3.
- US1: T007 before T008; T009 after T008; T010 before T011; T012 after T008. T010/T011 can run in parallel with T007/T008.
- US2: after T008 and T009. T013 before T014; T015 last.
- US3: needs only Phase 2 (`FAULT_REASONS`); T016 before T017; T018 after T017 and T012 (the same place in `main.ts`).
- Polish: T019 and T020 after US1; T021 after all code tasks; T022 after T021; T023 and T024 after T021; T025 after the merge and the deploy.

## Parallel Example: after Phase 2

```text
Task: "T007 [US1] stakeholder-render.test.ts"
Task: "T010 [US1] render.test.ts header link"
Task: "T016 [US3] badge.test.ts"
```

## Implementation Strategy

1. MVP: Phase 1, Phase 2 and US1 (T001 to T012). The board can open the page; send the link only
   after T022.
2. US2 (print) before the next board meeting.
3. US3 (badges) and the polish tasks; T025 after the deploy.

---

## Phase 7: Convergence

- [X] T026 In `status/src/main.ts`, separate the spec 022 writes so that a stakeholder slug collision behaves as research.md §2 and data-model.md say ("the run stops with an error"): call `stakeholderViews(page)` outside the `try` that catches write errors, and write the badges and `404.html` in their own `try`, so that a stakeholder error never stops the badges. Add a test that two stakeholders with the same slug throw from `stakeholderViews` (exists) and that `badge()` output does not depend on stakeholders per research.md §2, data-model.md `slug` (contradicts) Done: `stakeholderViews` runs before `index.html` is written (a collision stops the run); stakeholder pages, badges and `404.html` each have their own `try`. Local build with live data: 1 page, 11 badges, 404.html.
- [X] T027 Check SC-002 with a real print preview (A4, Chrome and Safari, light and dark scheme) of the deployed HOB page, including the browser margins and print header; record the page count and the result in this task per SC-002, FR-007 (partial) Done 2026-11-17 in Chrome (headless print to PDF, A4, the deployed page): 1 page, about half of the page used, black on white, both addresses shown. Safari has no headless print, so the Maintainer checks it by hand before the first board meeting.
- [X] T028 In `specs/022-stakeholder-view/spec.md` US1 acceptance scenario 1, use the exact text of contracts/stakeholder-page.md that the code renders ("De website harmonieorkestbrummen.nl is online." and "De afgelopen 30 dagen was de website 100 % van de tijd online.") per US1/AC1 (contradicts) Done.
- [X] T029 In `status/src/stakeholder/render.ts`, use the exported `STALE_MS` of `status/src/render.ts` for the old-data script instead of the literal `108e5`, so the 3 hours have one source per research.md §6, plan: old-data warning (partial) Done: `STALE_MS` is exported from `status/src/render.ts`; test in `status/tests/stakeholder-render.test.ts`; 503 tests pass.
