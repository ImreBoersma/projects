# Tasks: Status App Basics

**Input**: Design documents from `/specs/020-status-app-basics/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/status-json.md,
contracts/app.md, contracts/page.md, quickstart.md

**Tests**: included (plan.md "Testing", quickstart.md §1).

**Format**: `[ID] [P?] [Story] Description`. All paths are from the repo root.

---

## Phase 1: Setup

- [X] T001 Make the branch `020-status-app-basics` from `main`. Run `cd status && bun run css && bun test` and record the baseline. Done: 268.

---

## Phase 2: Foundational

**Purpose**: the keys and the 24-hour changes; US1 and US2 use them.

- [X] T002 [P] In `status/tests/history-stats.test.ts`, add tests for `recentChanges(results, projects, now)` (research.md §1): a history of 30 hours with a key that started 2 hours ago (started) and one that stopped 3 hours ago (stopped); a history of 5 hours (compare with the first result, `since` = its time); a stopped key of a project that is not in the catalog any more (not in `stopped`); the text of a stopped key is "<project name>: <PROBLEM_TEXT of its reason>" (the reason is the second part of the key).
- [X] T003 Add `recentChanges` to `status/src/history/stats.ts` with the result of data-model.md "Recent changes" (`since`, `started`, `stopped`, each item `{ key, project, text }`). For a started key use the current problem text when it exists.
- [X] T004 In `status/src/view.ts`, add `rowKeys(s)`: the problem keys of the row, plus `<id>/warning` when `rowKind(s) === "warn"` (research.md §2). Add a test in `status/tests/view.test.ts`.
- [X] T005 In `status/src/main.ts`, compute `recentChanges(results, allProjects, now)` in page mode and pass it as `StatusPage.changes` (add the field in `status/src/types.ts`).

**Checkpoint**: the changes and keys exist.

---

## Phase 3: User Story 1 - Since my last visit (Priority: P1) 🎯 MVP

**Goal**: the changes line, New marks and the fixed list (contracts/page.md).

**Independent Test**: a stored visit 1 hour old without one key: that row has "New" and the line says "1 new".

- [X] T006 [P] [US1] In `status/tests/client.test.ts`, add tests for `compareVisit(stored, nowKeys, nowTime, changes, projectIds)` (research.md §3, data-model.md): no stored value → `base: "24h"`, `since` = `changes.since`, new = `changes.started` keys, fixed = `changes.stopped` keys; stored `current` 2 hours old → it becomes `last`, base `visit`, new = now − last, fixed = last − now; stored `current` 5 minutes old → `last` stays (a reload keeps the base); the next stored value has `current = { nowTime, nowKeys }`; fixed keys are limited to 20; a fixed key of a project that is not in `projectIds` is left out (analysis U2); and for `fixedText(key, names, texts)`: "hob.nl: The last CI run failed." from the key `hob-nl/ci-failed`, "hob.nl: A warning." from `hob-nl/warning` (analysis U1).
- [X] T007 [US1] Add `compareVisit` and `fixedText` to `status/src/client.ts` (self-contained, as the other client functions). In `start()`: read and write the local storage key `project-status:visits` inside `try`/`catch` (on an error: 24h base, no write); set the changes line text, the "New" badge on each row whose `data-keys` contain a new key, and the fixed list: for the 24h base the texts of the inline changes; for the visit base `fixedText` with the row names and the inline reason texts.
- [X] T008 [US1] In `status/src/render.ts`: add `data-keys` to each row (`rowKeys`), an empty "New" badge per row (`hidden`, with screen-reader text "New since your last visit"), the changes line `<p data-changes hidden>` and the folded fixed list `<details data-fixed hidden>` above the controls, and `<script type="application/json" id="changes">` with `page.changes`, the reason texts (`PROBLEM_TEXT` plus `warning: "A warning."`) and `total.problems` (write each `<` in the JSON as the escape `\u003c`, so that the text cannot end the script; analysis U1 and I2).
- [X] T009 [US1] In `status/tests/render.test.ts`, add tests: `data-keys` of a row with a problem and of a warn row; the inline changes JSON parses back to `page.changes`; the changes line and the fixed list are in the HTML and hidden without the script.

**Checkpoint**: US1 works.

---

## Phase 4: User Story 2 - The data file (Priority: P1)

**Goal**: `status.json` (contracts/status-json.md).

**Independent Test**: the file has 11 projects with the same state and summary as the page, and no forbidden fixture values.

- [X] T010 [P] [US2] Make `status/tests/data.test.ts` for `statusJson(page)`: `version` 1; `total` from `totalState`; each project with the fields of contracts/status-json.md ("`stakeholder` is an organisation or `null`; `site` is `null` without a domain; `uptime30` is a number with 1 decimal or `null`; `nextExpiry` is `YYYY-MM-DD` or `null`; `issue` and `since` are `null` when not known"); state and summary equal to `rowKind` and `summaryFact`; `link` ends with `#p-<id>`; the privacy fixture of spec 001 (`SECRET-COMMIT-MSG` etc.) does not occur; 20 fixture projects give less than 50 000 bytes.
- [X] T011 [US2] Make `status/src/data.ts` with `statusJson(page: StatusPage): string` (`JSON.stringify` with 0 indent) from the view functions, and write it in `status/src/main.ts` to `<out>/status.json` next to `index.html` in page mode.

**Checkpoint**: US1 and US2 work.

---

## Phase 5: User Story 3 - Installable app (Priority: P2)

**Goal**: manifest, icons, service worker, badge (contracts/app.md).

**Independent Test**: Chrome offers "Install"; offline, the installed app shows the last state.

- [X] T012 [P] [US3] Make `status/tests/app.test.ts` for `manifest()` (the fields of contracts/app.md; valid JSON), `icons()` (2 SVG texts; the maskable one has a white square and the shape at 80%) and `serviceWorker()` (contains a `fetch` handler; network first for navigation and `status.json`; `caches.match` only in the error path; no other URLs cached).
- [X] T013 [US3] Make `status/src/app.ts` with `manifest()`, `icons()` and `serviceWorker()`; write `manifest.webmanifest`, `icon.svg`, `icon-maskable.svg` and `sw.js` in `status/src/main.ts` next to `index.html`. In `status/src/render.ts` add `<link rel="manifest" href="manifest.webmanifest">` and `<meta name="theme-color" content="#fdc700">` (the bumblebee primary, research.md §5) to the head.
- [X] T014 [US3] In `status/src/client.ts` `start()`: register `sw.js` when `navigator.serviceWorker` exists (ignore errors); set the app badge to `total.problems` from the inline data, the same number as the page title (analysis I2) (`navigator.setAppBadge(n)` when `n > 0`, `clearAppBadge()` when 0), only when the functions exist.

**Checkpoint**: US1–US3 work.

---

## Phase 6: User Story 4 - Shortcuts (Priority: P2)

**Goal**: the 4 shortcuts in each pop-up and the header link (research.md §6).

**Independent Test**: each shortcut opens the right GitHub page in a new tab.

- [X] T015 [P] [US4] In `status/tests/links.test.ts`, add tests for `shortcuts(repo)`: the 4 URLs of research.md §6 for `ImreBoersma/one`; `null` repo → empty list.
- [X] T016 [US4] Add `shortcuts(repo)` to `status/src/links.ts`. In `status/src/render.ts` `modal()`: after the facts, a line "Act on GitHub:" with the 4 links (`link()` of spec 012, separated by `SEP`) for a project with a repo; in the header, the link "Run the status update now" to `https://github.com/ImreBoersma/projects/actions/workflows/status-page.yml`.
- [X] T017 [US4] In `status/tests/render.test.ts`, add tests: the modal of a project with a repo has the 4 shortcut links; a project without a repo has none; the header link exists; all of them have `target="_blank"` (the US5 link test of spec 012 covers it).

**Checkpoint**: US1–US4 work.

---

## Phase 7: User Story 5 - Command box (Priority: P3)

**Goal**: ⌘K / Ctrl+K (research.md §7).

**Independent Test**: ⌘K, "hob", Enter opens the hob.nl pop-up.

- [X] T018 [P] [US5] In `status/tests/client.test.ts`, add tests for `searchCommands(items, text)`: "hob" → hob.nl first; "camp" → the tab Campaigns; "prob" → the filter Problems; projects before tabs and filters; at most 8 results; empty text → the projects in list order (at most 8).
- [X] T019 [US5] Add `searchCommands` to `status/src/client.ts`; in `start()`: ⌘K / Ctrl+K (`preventDefault`) opens the modal `#command`, the input gets the focus, the list updates on input, arrow keys move `aria-activedescendant`, Enter runs the item (open the project pop-up, set the tab, or set the state filter), Escape closes and gives the focus back.
- [X] T020 [US5] In `status/src/render.ts`, add the modal `#command` (contracts/page.md: labelled input "Go to", `role="listbox"` list, hidden without the script) and a hint "⌘K" next to the search field; add a render test for both.

**Checkpoint**: all stories work.

---

## Phase 8: Polish & Cross-Cutting

- [X] T021 Run `cd status && bun run css && bun test && bun run lint && bunx tsc --noEmit -p .`. All pass; more tests than the baseline; the page size test of spec 019 still passes (HTML < 90 KB for 20 sites); its 20-project fixture has repos, so the 4 shortcuts of each modal, the keys and the New badges count (analysis C2).
- [X] T022 Run quickstart.md §2 in Chrome and record each item in a table "Validation results" at the end of `specs/020-status-app-basics/research.md`: the changes line is visible without scrolling, above the controls (SC-001, analysis C1); changes line on a first visit and after a changed stored visit; New mark; `status.json`; install; offline with DevTools; app badge with a fixture problem; shortcuts; ⌘K; page size.
- [X] T023 Commit (`feat: status app basics (spec 020)`), push, open a PR to `main`. The PR body ends with the line of the Claude Code attribution.
- [X] T024 Ask the Maintainer to merge the PR.
- [X] T025 After the merge, run quickstart.md §3 (the live `status.json`, install from the live page) and add the result to the table of T022.
- [X] T026 [P] In `PLAN.md`, mark spec 020 as done in the feature table and the Done list.

---

## Dependencies & Execution Order

- **Setup (T001)** first. **Foundational (T002–T005)**: T002 and T004 in parallel; T003 after T002; T005 after T003 and T004.
- **US1 (T006–T009)** and **US2 (T010–T011)**: after Phase 2; T006 and T010 in parallel (different test files); US1 and US2 change `render.ts` and `main.ts` in different places, but do them one after the other.
- **US3 (T012–T014)**, **US4 (T015–T017)**, **US5 (T018–T020)**: after US1; T012, T015 and T018 are `[P]` (test files); the implementation tasks share `render.ts` and `client.ts`, so one after the other in this order.
- **Polish (T021–T026)**: after all stories. T025 and T026 need the merge.

## Parallel Example

```text
status/tests/history-stats.test.ts  (T002)
status/tests/view.test.ts           (T004)
status/tests/data.test.ts           (T010, after Phase 2)
status/tests/app.test.ts            (T012)
status/tests/links.test.ts          (T015)
```

## Implementation Strategy

1. **MVP (US1)**: "since your last visit" is the daily gain.
2. **US2**: the data file, the base for specs 021 and 022.
3. **US3–US5**: install, shortcuts, command box.

All five go in one PR.

---

## Phase 9: Convergence

From the review of 2026-11-11 (code checked against spec, plan and tasks).

- [X] T027 Make the "New" badge 4.5:1 or more (darker `--color-info-content` in `status/src/style.ts`, both themes) and add the info pair to PAIRS in `status/tests/style.test.ts` per FR-012, spec 019 FR-010 (contradicts)
- [X] T028 Show the full fixed count in the changes line and limit only the list to 20 (`status/src/client.ts` `compareVisit`) per SC-002, FR-003 (partial)
- [X] T029 Show "Since <date>" for a last visit more than 30 days ago (`status/src/client.ts`) per Edge Cases (partial)
- [X] T030 When `status.json` cannot be written, still write and deploy the page, then exit non-zero (`status/src/main.ts`) per Edge Cases (partial)
