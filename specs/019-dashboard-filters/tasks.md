# Tasks: Status Page Filters, Sorting and Detail Views

**Input**: Design documents from `/specs/019-dashboard-filters/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/page.md,
contracts/address.md, quickstart.md

**Tests**: included (plan.md "Testing", quickstart.md §1).

**Format**: `[ID] [P?] [Story] Description`. All paths are from the repo root.

---

## Phase 1: Setup

- [X] T001 Make the branch `019-dashboard-filters` from `main`. Run `cd status && bun test` and record the baseline. Done: 259. Add the dev dependencies `tailwindcss@4.3.4`, `@tailwindcss/cli@4.3.4` and `daisyui@5.7.50` to `status/package.json` (`bun add -d`), and `status/build/` to `.gitignore`.
- [X] T002 Make `status/scripts/build-css.ts`: write `status/build/page-input.css` from `status/src/page.css` with the two theme blocks filled from `TOKENS` of `status/src/style.ts` (research.md §4, analysis C1: `base-100`=`bg`, `base-200`=`line`, `base-content`=`fg`, `primary`=`link`, `error`=`badFg`, `warning`=`warnFg`, `success`=`goodFg`, `neutral`=`unknownFg`, each `-content`=`bg`; DaisyUI uses the strong colour as the text of a soft badge), then run `bunx @tailwindcss/cli -i build/page-input.css -o build/page.css --minify`. Make `status/src/page.css` with `@import "tailwindcss"; @source "./render.ts"; @source "./client.ts"; @plugin "daisyui" { themes: false; }` and two theme placeholders (`calm` default, `calm-dark` with `prefersdark: true`), plus the small own rules of spec 012 that DaisyUI has no class for (`.sr` visually hidden, the uptime marks, `.nt`). Add the scripts `"css": "bun run scripts/build-css.ts"` and `"start": "bun run css && bun run src/main.ts"` to `status/package.json`.

---

## Phase 2: Foundational

**Purpose**: the CSS in the page, the view model, the browser functions; all stories use them.

- [X] T003 [P] Make `status/tests/css.test.ts`: after `bun run css` (run it in `beforeAll` with `Bun.$`), `status/build/page.css` exists, is less than 80 000 bytes, has no `@import`, and has no `url(http` and no `url(//` (an SVG namespace inside a `data:` URL is allowed); it contains the theme name `calm`, and the token values of `bg` and `badFg` (the strong colour is `--color-error`, analysis C1).
- [X] T004 In `status/src/render.ts`, replace `css()` with the content of `status/build/page.css` (read once with `Bun.file` in `renderPage`'s caller `status/src/main.ts` and passed as `StatusPage.css`, so the tests can pass a small fake CSS). Remove `css()` from `status/src/style.ts`; keep `TOKENS`, `ICON` and `FAVICON`. Update `status/tests/style.test.ts` (the contrast test of `TOKENS` stays; the `css()` test goes).
- [X] T005 [P] In `status/tests/view.test.ts`, add tests for `summaryFact(s)` (research.md §5, in this order: first problem text → kind `bad`; check not available → `unknown`; warning with the fewest days of certificate, renewal or secret → `warn`; "No expiry: <names>" → `warn`; "All correct" → `good`), `nextExpiry(s)` (nearest `YYYY-MM-DD` of certificate, renewals and secrets, or null) and `rowData(s, order)` (the attributes of data-model.md "Row").
- [X] T006 Add `summaryFact`, `nextExpiry` and `rowData` to `status/src/view.ts`.
- [X] T007 [P] Make `status/tests/client.test.ts` for the pure functions of `status/src/client.ts`: `readView(search, hash, known)` with every key of contracts/address.md, defaults, unknown values ignored with `unknown: true`, unknown project id → no open project; `writeView(view)` writes only non-default keys; `matches(row, view)` for `q` (case-insensitive part of `data-name`), `state` (`problems`↔`bad`, `warnings`↔`warn`, `not-available`↔`unknown`, `correct`↔`good`), `stakeholder`, `site`; `compare(a, b, sort)` for `state` (`bad` < `warn` < `unknown` < `good`, then `data-order`), `name`, `commit` (oldest first, empty last), `expiry` (nearest first, empty last).
- [X] T008 Make `status/src/client.ts` with `readView`, `writeView`, `matches`, `compare` (self-contained: no imports and no outside values, because `render.ts` copies them with `toString()`), and `start()` that binds them to the DOM: adds the class `js` to `<html>`, reads the view, sets the controls, filters and sorts the rows, updates the count and the empty message, and writes the address with `history.replaceState` on each change.

**Checkpoint**: the CSS builds; view and client functions tested.

---

## Phase 3: User Story 1 - A short list and pop-ups (Priority: P1) 🎯 MVP

**Goal**: one row per project and a DaisyUI modal per project (contracts/page.md).

**Independent Test**: each project is one row; a click opens its modal; Escape closes it and the focus is on the row; `#p-<id>` opens it; without a script `:target` opens it.

- [X] T009 [US1] In `status/src/render.ts`, replace the project sections with one `<ul class="list">` of rows: `<li><a class="list-row" href="#p-<id>" data-…>` with the dot (with screen-reader text), the name, the summary fact (DaisyUI `badge badge-soft` with `badge-error`/`badge-warning`/`badge-neutral` for bad/warn/unknown; plain text for good) and a "›" mark (`aria-hidden`). Keep the order of `sections()` (spec 012) for the default.
- [X] T010 [US1] In `status/src/render.ts`, add one modal per project after the list: `<div id="p-<id>" class="modal" role="dialog" aria-modal="true" aria-labelledby="t-<id>"><div class="modal-box">` with `<h2 id="t-<id>">` (the project name as a new-tab link), the problems with issue links and "since", and the Site / Code / Expiry groups of `facts()` (spec 012/013), and a close link `<a href="#" class="btn btn-sm btn-ghost" aria-label="Close">✕</a>`; plus `<a href="#" class="modal-backdrop">` for a click outside.
- [X] T011 [US1] In `status/src/client.ts` `start()`: on `hashchange` to `#p-<id>`, move the focus to the modal title; on Escape, set the hash to `""`; when the hash goes away, move the focus back to the row of that project; keep the focus inside the open modal with Tab and Shift+Tab.
- [X] T012 [US1] Update `status/tests/render.test.ts`: one row per project with the right `href`, data attributes and summary fact; one modal per project with the facts, problems and issue links of the earlier tests (move those assertions from the list to the modal); a page without the `.js` class needs no script for `:target` (the modal CSS class is present). Keep the spec 007/012/013/015 content tests passing.

**Checkpoint**: US1 works.

---

## Phase 4: User Story 2 - Filters (Priority: P1)

**Goal**: search and filters with the count, in the address.

**Independent Test**: `?stakeholder=Harmonieorkest+Brummen` shows 3 of 11; clearing shows 11.

- [X] T013 [US2] In `status/src/render.ts`, add the controls above the list (contracts/page.md): `<label>` + `<input class="input input-sm" type="search" name="q">`, `<select class="select select-sm">` for state, stakeholder (values from the catalog, sorted), site; the count `<span data-count>11 of 11</span>`; the controls are in `<div class="controls">`, and `status/src/page.css` hides them without the script (`html:not(.js) .controls { display: none }`, analysis U1); the empty message "No project matches the filter." with a "Clear the filter" button (hidden by default); on screens of 600 px or less the controls are inside `<details><summary>Filters</summary>…</details>`.
- [X] T014 [US2] In `status/src/client.ts` `start()`: on `input`/`change` of a control, update the view, filter the rows, update the count and the empty message, and write the address; the "Clear the filter" button resets all filters. When `readView` gives `unknown: true`, show "Some filters in the link are not known." once (spec edge case). The total state (spec 012) needs no code for FR-007: the generator writes it, and the filters only hide rows in the browser.
- [X] T015 [US2] In `status/tests/render.test.ts`, add tests: the stakeholder `<select>` lists each catalog stakeholder once ("Harmonieorkest Brummen"); each control has a label; the count text is "<n> of <n>"; the empty message exists and is hidden; the controls are inside `.controls` and the CSS has `html:not(.js) .controls` (FR-008).

**Checkpoint**: US1 and US2 work.

---

## Phase 5: User Story 3 - Sort (Priority: P2)

**Goal**: sort by state, name, last commit and next expiry.

**Independent Test**: `?sort=expiry` puts the project with the nearest date first.

- [X] T016 [US3] In `status/src/render.ts`, add `<select class="select select-sm" name="sort">` with "State", "Name", "Last commit", "Next expiry" to the controls; in `status/src/client.ts` `start()`, reorder the `<li>` rows with `compare` on change and on load, and write `sort` to the address.
- [X] T017 [US3] In `status/tests/client.test.ts`, add a test that sorts 5 fixture rows with each sort and gives the expected order (projects without a repo or without dates last).

**Checkpoint**: US1–US3 work.

---

## Phase 6: User Story 4 - Tabs (Priority: P2)

**Goal**: Projects, Campaigns, Shared tokens, History.

**Independent Test**: `?tab=tokens` shows only the shared tokens; the address follows the tab.

- [X] T018 [US4] (The repair time stays also in the summary line at the top, as in spec 010; the History panel is the detail view, analysis D1.) In `status/src/render.ts`, add `<nav class="tabs tabs-border" role="tablist">` with `<a role="tab" href="?tab=projects|campaigns|tokens|history">` and a count badge per data-model.md "Tab counts"; put the project list and modals in `<section id="tab-projects" role="tabpanel">`, the campaign section of spec 015 in `tab-campaigns`, the shared tokens of spec 013 in `tab-tokens`, and a new History panel in `tab-history` (one row per site with its uptime bar of spec 010, and the repair time). Each panel has an `<h2>`.
- [X] T019 [US4] In `status/src/page.css`, hide the panels that are not active only under `html.js` (`html.js [role=tabpanel]:not(.active) { display: none }`); in `status/src/client.ts` `start()`, set `.active` and `aria-selected` from `view.tab`, and on a tab click update the view and the address without a page load.
- [X] T020 [US4] In `status/tests/render.test.ts`, add tests: 4 tabs with the right hrefs; the count on "Campaigns" with failed CI; all 4 panels in the HTML (FR-008); the History panel has the uptime bars.

**Checkpoint**: all stories work.

---

## Phase 7: Polish & Cross-Cutting

- [X] T021 Run `cd status && bun run css && bun test && bun run lint && bunx tsc --noEmit -p .`. All pass; more tests than the baseline of T001.
- [X] T022 In `.github/workflows/status-page.yml`, make sure that `bun install` installs the dev dependencies and that `bun run start` (which runs `css`) is the command of the page build; no other change. Check the PR build log for `Done in` of the CSS build, and for "Wrote the result line to" (the options `--mode`, `--history` and `--history-out` reach `main.ts`, not `css`; analysis U3).
- [X] T023 Run quickstart.md §2 locally in Chrome and record each item as one row of a table "Validation results" at the end of `specs/019-dashboard-filters/research.md`: (1) the list height at 1100 × 800 in pixels (SC-001; when it fails, make the total block smaller); (2) iframe at 360 px: horizontal scroll 0 px, filters folded; (3) light and dark: the computed text and background colour of each badge kind (bad, warn, unknown), the controls and the tabs, with the contrast ratio ≥ 4.5 (analysis C1); (4) keyboard, one row each: Tab reaches search, each filter, sort, each tab and each row; Enter on a row opens its modal and the focus is on its title; Tab stays inside the open modal; Escape closes it and the focus is on the row again; Back closes an open modal (analysis C2); (5) scripts off: no controls, all panels, a row opens its modal by `:target`; (6) `?stakeholder=Harmonieorkest+Brummen` gives "3 of 11"; (7) page size and CSS size.
- [X] T024 Update `specs/012-status-page-polish/contracts/page.md` and `specs/007-status-page-links/contracts/page.md` with a pointer to `specs/019-dashboard-filters/contracts/page.md`.
- [X] T025 Commit (`feat: filters, sorting, tabs and pop-ups on the status page (spec 019)`), push, open a PR to `main`. The PR body ends with the line of the Claude Code attribution.
- [X] T026 Ask the Maintainer to merge the PR.
- [X] T027 After the merge, run quickstart.md §3 on the live page and add the result to the table of T023.
- [X] T028 [P] In `PLAN.md`, mark spec 019 as done in the feature table and the Done list.

---

## Dependencies & Execution Order

- **Setup (T001–T002)** first.
- **Foundational (T003–T008)**: T003 after T002; T004 after T003; T005 and T007 in parallel; T006 after T005; T008 after T007.
- **US1 (T009–T012)**: after Phase 2. T009 → T010 → T011 → T012 (same files).
- **US2 (T013–T015)**, **US3 (T016–T017)**, **US4 (T018–T020)**: after US1 (they change the same `render.ts` and `client.ts`); in this order.
- **Polish (T021–T028)**: after all stories. T027 and T028 need the merge.

## Parallel Example

```text
status/tests/css.test.ts     (T003, after T002)
status/tests/view.test.ts    (T005)
status/tests/client.test.ts  (T007)
```

## Implementation Strategy

1. **MVP (US1)**: the short list and the pop-ups already make the page calm and short.
2. **US2**: filters and stakeholder links.
3. **US3 and US4**: sort and tabs.

All four go in one PR.
