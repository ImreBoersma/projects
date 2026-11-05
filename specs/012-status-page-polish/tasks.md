# Tasks: Status Page Visual Polish

**Input**: Design documents from `/specs/012-status-page-polish/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/page.md, quickstart.md

**Tests**: included. The plan asks for `view.test.ts`, `style.test.ts` and changes to
`render.test.ts` (plan.md "Testing", quickstart.md §1).

**Format**: `[ID] [P?] [Story] Description`. All paths are from the repo root.

---

## Phase 1: Setup

- [ ] T001 Make the branch `012-status-page-polish` from `main`. Run `cd status && bun test` and record the number of passing tests (178 expected) as the baseline.

---

## Phase 2: Foundational

**Purpose**: the view and style modules that all stories use.

- [ ] T002 Make `status/src/view.ts` with the type `BadgeKind = "good" | "warn" | "bad" | "unknown"` and the function `relTime(isoTime: string, nowMs: number): string`. Rules (research.md §3): below 1 minute "now"; less than 1 hour "<n> minute(s) ago"; less than 48 hours "<n> hour(s) ago"; else "<n> day(s) ago"; for a time in the future the same units with "in <n> ...". For a date without a time (`YYYY-MM-DD`), use whole UTC days: "today", "1 day ago", "in 40 days". The function MUST be self-contained (no imports, no values outside its body), because T005 copies it into the page with `relTime.toString()`.
- [ ] T003 [P] Make `status/tests/view.test.ts` with tests for `relTime`: 0 s → "now"; 25 min → "25 minutes ago"; 1 min → "1 minute ago"; 5 h → "5 hours ago"; 47 h → "47 hours ago"; 3 days → "3 days ago"; date 40 days in the future → "in 40 days"; date today → "today". Add one test that runs `new Function(\`return ${relTime.toString()}\`)()` and gets the same results (the script copy works).
- [ ] T004 Make `status/src/style.ts`: an object `TOKENS` with a `light` and a `dark` value for `bg`, `fg`, `muted`, `line`, `link`, `problemRow`, `stale`, the uptime marks of spec 010, and for each badge kind a text and a background colour (start values: research.md §5). A function `css(): string` that writes `:root { --… }`, the dark values under `@media (prefers-color-scheme: dark)`, and the rules of the current `<style>` of `status/src/render.ts` (same values, new token names: `--problem` → `problemRow`, `--warn` → `stale`), plus `.badge`, `.badge.good|warn|bad|unknown`, `.total`, `h2`, `.nt`, `.sr` (visually hidden), `.rel`. Spacing only 4/8/12/16 px, one radius (6 px), font weights 400 and 600 (research.md §1).
- [ ] T005 Make `status/tests/style.test.ts` (after T004, it imports `TOKENS`): a WCAG 2.1 contrast function (relative luminance), and for `light` and `dark` a test that each pair has a ratio ≥ 4.5: `fg`/`bg`, `muted`/`bg`, `link`/`bg`, `fg`/`problemRow`, `muted`/`problemRow`, `link`/`problemRow`, `stale`/`bg`, and the text/background of each badge kind (FR-009, SC-004). Change a token in `status/src/style.ts` when a pair fails; record changed values in `specs/012-status-page-polish/research.md` §5.
- [ ] T006 Change `status/src/render.ts` to use `css()` of `status/src/style.ts` in place of the inline CSS. The rendered page MUST look the same as before: run `bun test` (all existing render tests pass).

**Checkpoint**: tokens tested, view module ready, page unchanged.

---

## Phase 3: User Story 1 - Total state in the tab and at the top (Priority: P1) 🎯 MVP

**Goal**: one badge, the title and the favicon show the total state.

**Independent Test**: render with 2 problems: title starts with "(2)", favicon is the problem icon, badge says "2 problems".

- [ ] T007 [P] [US1] In `status/tests/view.test.ts`, add tests for `totalState(rows)`: 0 problems and all checks available → `{kind: "correct", text: "All correct", title: "Project status"}`; 1 problem → "1 problem", title "(1) Project status"; 2 problems in 2 rows → "2 problems", "(2) Project status"; 0 problems and one row with `availability: "unavailable"` → `kind: "not-available"`, text "Check not available"; the same for uptime state `not-available` and for a non-empty `conformanceNotAvailable`; a row with certificate "not-known" only → `correct` (research.md §4); problems and "Data not available" together → `problems`.
- [ ] T008 [US1] In `status/src/view.ts`, add `checkNotAvailable(row): boolean` (true when `availability === "unavailable"`, or `uptime.state === "not-available"`, or `conformanceNotAvailable.length > 0`) and `totalState(rows: ProjectStatus[])` with the fields of data-model.md "TotalState": `problems` is the sum of `problems.length` of all rows.
- [ ] T009 [US1] In `status/src/style.ts`, add `FAVICON: Record<"correct" | "problems" | "not-available", string>`: three small SVGs (16×16 viewBox) as `data:image/svg+xml,` URLs (URL-encoded): green circle with a check, red square with "!", grey triangle with "?" (research.md §7). Each shape is different (FR-003).
- [ ] T010 [US1] In `status/src/render.ts`, use `totalState(page.rows)`: `<title>` is `title`; `<link rel="icon" href="…">` with `FAVICON[kind]`; under `<h1>`, `<p class="total <kind>">` with a small inline copy of the shape (`aria-hidden="true"`) and `text`, above the summary line (contracts/page.md "Header"). The summary line and the history line stay unchanged.
- [ ] T011 [US1] In `status/tests/render.test.ts`, add tests: 2 problems → `<title>(2) Project status</title>`, the problem favicon URL, `class="total problems"` with "2 problems"; 0 problems → `<title>Project status</title>` and "All correct"; the summary line is after the total badge.

**Checkpoint**: US1 works alone.

---

## Phase 4: User Story 2 - State badges in the cells (Priority: P1)

**Goal**: each state value is a badge with text and the colour of its kind.

**Independent Test**: a row with site Down, CI Passed, deploy Failed: three badges, Down and Failed with class `bad`.

- [ ] T012 [P] [US2] In `status/tests/view.test.ts`, add tests for the badge kind functions of data-model.md "BadgeKind": site up/down/not-available → good/bad/unknown; CI passed/failed/unknown → good/bad/unknown; deploy succeeded/failed/in-progress → good/bad/unknown; certificate days 14 → bad, 15 → warn, 28 → warn, 29 → good, "not-known" → unknown, -3 → bad; renewal days 30 → bad, 31 → warn, 60 → warn, 61 → good.
- [ ] T013 [US2] In `status/src/view.ts`, add `siteKind`, `ciKind`, `deployKind`, `certificateKind(days | "not-known")` and `renewalKind(days)`. Use `CERT_LIMIT` and `RENEWAL_LIMIT` of `status/src/expiry/expiry.ts`: bad when `days <= limit`; warn when `days <= 2 * limit`; else good (spec FR-004).
- [ ] T014 [US2] In `status/src/render.ts`, add `badge(kind, text)` → `<span class="badge <kind>">text</span>` (text escaped with `html()`). Use it for: the site state (`Up`, `Down`, `Check not available`), CI (`Passed`, `Failed`, `Unknown`), deploy (`Succeeded`, `Failed`, `In progress`, `Unknown`), `Data not available` and `No repo` (kind `unknown`), and each line of the expiry cell (the certificate and the next renewal, with `certificateKind` and `renewalKind`; "not known" lines are `unknown`). The time next to the site state and the deploy date stay outside the badge. Where the cell is a link (site, CI, deploy), the badge is inside the `<a>`.
- [ ] T015 [US2] In `status/tests/render.test.ts`, add tests: site Down → `class="badge bad">Down<`; CI Passed → `class="badge good">Passed<`; a certificate in 20 days → `class="badge warn"`; `Data not available` → `class="badge unknown"`. Update existing assertions that expect plain text in these cells.

**Checkpoint**: US1 and US2 work.

---

## Phase 5: User Story 3 - Projects with problems first (Priority: P2)

**Goal**: three sections in the order of FR-005.

**Independent Test**: a problem in the last catalog project: that project is the first row, under "Projects with problems".

- [ ] T016 [P] [US3] In `status/tests/view.test.ts`, add tests for `sections(rows)`: rows with problems → section `problems`; 0 problems and `checkNotAvailable` → `not-available`; else `other`; catalog order kept in each section; sections without rows are not in the result; each row in exactly one section.
- [ ] T017 [US3] In `status/src/view.ts`, add `sections(rows)` with the fields of data-model.md "Section" (titles "Projects with problems", "Check not available", "Other projects").
- [ ] T018 [US3] In `status/src/render.ts`, replace the one table with one `<section>` for each item of `sections(page.rows)`: `<h2>title</h2>` and a table with the same `<thead>` and the rows (research.md §4). The `div.wrap` and the card CSS of spec 007 apply to each table.
- [ ] T019 [US3] In `status/tests/render.test.ts`, add tests: the problem row of the last catalog project is in the first section, before rows without problems; 0 problems → no "Projects with problems" heading; a row with "Data not available" and no problem is under "Check not available".

**Checkpoint**: US1–US3 work.

---

## Phase 6: User Story 4 - Relative times (Priority: P2)

**Goal**: each time and date shows a relative time; a script keeps it current.

**Independent Test**: a last commit 3 days before the update shows "(3 days ago)" and the exact UTC time in the tooltip.

- [ ] T020 [US4] In `status/src/render.ts`, add `timeTag(iso, text)` → `<time datetime="<iso>" data-rel title="<YYYY-MM-DD HH:MM> UTC">text</time> <small class="rel">(<relTime(iso, generatedAt)>)</small>`; for a date without a time, `title` has only the date (contracts/page.md "Times"). Use it for: last update, last commit, last deploy, the time of the site check, the oldest Renovate PR (in place of "oldest N days"), the "since" of a problem (in place of the day count of spec 010, keep " or before"), the "History from <date>" line of spec 010 (date only), and the certificate and renewal dates in the expiry cell (show the date; `Certificate: <date> (in 40 days)`). For the expiry dates, the certificate needs its date: use `s.expiry.certificate.date` and the renewal `date`.
- [ ] T021 [US4] In `status/src/render.ts`, replace the inline script with one script (no `src`) that contains: the stale check of spec 001 (unchanged rule, `STALE_MS`); `relTime.toString()`; a function that sets, for each `time[data-rel]`, the text of the next `.rel` element to `(` + `relTime(datetime, Date.now())` + `)`; run at load and with `setInterval` each 60 000 ms (research.md §3).
- [ ] T022 [US4] In `status/tests/render.test.ts`, add tests: a last commit 3 days before `generatedAt` → `(3 days ago)` and `title="… UTC"`; a certificate in 40 days → `(in 40 days)`; the page has exactly one `<script>` and it has no `src`; the script contains `function relTime`. Update existing assertions for the "since" text and the Renovate "oldest" text. Add a test that a page with 20 fixture rows (each with a problem, history and expiry) is less than 100 000 bytes (SC-006).

**Checkpoint**: US1–US4 work.

---

## Phase 7: User Story 5 - Links open in a new tab (Priority: P2)

**Goal**: all links open a new tab, with a visible mark and screen-reader text.

**Independent Test**: each `<a>` in the page has `target="_blank"`, `rel="noopener noreferrer"` and "(opens in a new tab)".

- [ ] T023 [US5] In `status/src/render.ts`, change `link(text, url)` to write `<a href="…" target="_blank" rel="noopener noreferrer">text<span class="nt" aria-hidden="true">↗</span><span class="sr"> (opens in a new tab)</span></a>`. Use `link()` also for the header links to the roadmap and the board, and for the rule links of `ruleList()` (spec 008). No `<a>` in the page is written without `link()` (research.md §6).
- [ ] T024 [US5] In `status/tests/render.test.ts`, add a test that finds each `<a ` in a full fixture page and checks for each: `target="_blank"`, `rel="noopener noreferrer"`, and `(opens in a new tab)` before its `</a>` (SC-003). Update the existing link tests of spec 007 for the new markup.

**Checkpoint**: all stories work.

---

## Phase 8: Polish & Cross-Cutting

- [ ] T025 [P] Add at the end of `specs/001-project-status-page/contracts/page.md` and `specs/010-status-history/contracts/page.md` a pointer to `specs/012-status-page-polish/contracts/page.md`, when it is not there (spec 001: done in a3ab484).
- [ ] T026 Run `cd status && bun test && bun run lint && bunx tsc --noEmit -p .`. All pass; the number of tests is more than the baseline of T001.
- [ ] T027 Run quickstart.md §2 locally and check each item: title and favicon, sections, 360 px with 0 px horizontal scroll, dark scheme, scripts off, relative times after 2 minutes, new tab, page < 100 KB. Record the results in a table "Validation results" at the end of `specs/012-status-page-polish/research.md`.
- [ ] T028 Commit (`feat: polish the status page (spec 012)`), push, and open a PR to `main`. The PR body ends with the line of the Claude Code attribution.
- [ ] T029 Ask the Maintainer to merge the PR.
- [ ] T030 After the merge, validate quickstart.md §3 on https://imreboersma.github.io/projects/ and add the result to the table of T027.
- [ ] T031 [P] In `PLAN.md`, mark spec 012 as done in the feature table and the Done list.

---

## Dependencies & Execution Order

- **Setup (T001)** first.
- **Foundational (T002–T006)**: T002 first; T003 and T004 in parallel after T002; T005 and T006 after T004.
- **US1 (T007–T011)**: after Phase 2. T007 is `[P]` with T009.
- **US2 (T012–T015)**, **US3 (T016–T019)**, **US4 (T020–T022)**, **US5 (T023–T024)**: each needs Phase 2 only, but all change `view.ts`, `render.ts` and `render.test.ts`, so do them one after the other in this order. The test tasks in `view.test.ts` (T007, T012, T016) change the same file: one after the other.
- **Polish (T025–T031)**: after all stories. T030 and T031 need the merge.

## Parallel Example

```text
status/tests/view.test.ts  (T003)
status/src/style.ts        (T004, then T005)
```

## Implementation Strategy

1. **MVP (US1)**: the total state in the tab and at the top; the largest gain for the Maintainer.
2. **US2**: badges in the cells.
3. **US3–US5**: sections, relative times, new-tab links.

All five go in one PR, as for specs 007–010.
