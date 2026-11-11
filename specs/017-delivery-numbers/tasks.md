# Tasks: Delivery Numbers for Each Project

**Input**: Design documents from `/specs/017-delivery-numbers/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/page.md, quickstart.md

**Tests**: included (plan.md "Testing", quickstart.md "Tests").

**Format**: `[ID] [P?] [Story] Description`. All paths are from the repo root.

---

## Phase 1: Setup

- [ ] T001 On the branch `017-delivery-numbers`, run `cd status && bun run css && bun test` and record the baseline number of tests (408 on 2026-11-10).

---

## Phase 2: Foundational

**Purpose**: the types, the pure functions and the reader; both stories use them.

- [ ] T002 In `status/src/types.ts`, add `DeliveryRow` of data-model.md (`projectId`, `name`, `state: "ok" | "not-available"`, `merged`, `updates`, `updateHours: number[]`, `otherHours: number[]`, `deploys`, `months: [string, number][]` — "4 or 5 entries (research §4), oldest first: `YYYY-MM` and the count") and `delivery?: { rows: DeliveryRow[]; months: string[] }` in `StatusPage`.
- [ ] T003 [P] Make `status/tests/delivery-stats.test.ts`: `median([])` null, `[5]` 5, `[2, 10, 50]` 10, `[1, 2, 3, 4]` 2.5 (input not changed); `timeText(null)` "—", `0.5` "< 1 h", `1` "1 h", `33.9` "33 h", `47.9` "47 h", `48` "2 d", `270` "11 d"; `windowMonths(new Date("2026-11-10T12:00:00Z"))` `["2026-08", "2026-09", "2026-10", "2026-11"]` and `windowMonths(new Date("2027-05-01T12:00:00Z"))` `["2027-01", …, "2027-05"]` (5); `deliveryRow(raw, project, now)` counts only PRs with `mergedAt ≥ now − 90 d` and deploys with `createdAt ≥ now − 90 d`, splits bot and other PRs, gives the hours and the month counts (a month without deploys is 0); `deliveryTotal(rows)` sums the `ok` rows only and joins all durations (the total median of `[2]` and `[10, 50]` is 10, not the median of 2 and 30).
- [ ] T004 Make `status/src/delivery/stats.ts` with `median`, `timeText`, `windowMonths`, `deliveryRow`, `deliveryTotal` so that T003 passes.
- [ ] T005 [P] Make `status/tests/delivery-read.test.ts` with a fake `fetch` (as `status/tests/github.test.ts`): `buildDeliveryQuery` asks for `createdAt mergedAt updatedAt author { __typename }` and `deployments(environments: ["production", "Production", "github-pages"]` and no `title`, `headRefName`, `body` or `login`; `readDelivery` groups the projects by `tokenFor(owner)`, sends one query for each token, maps `__typename: "Bot"` to `bot: true` and `author: null` to `bot: false`; reads a next page (query with `after:`) only while `hasNextPage` and the last PR `updatedAt` (or deploy `createdAt`) is in the window, at most 5 pages for each repo; a project without a token, an HTTP error, a GraphQL error or a `null` repository gives `state: "not-available"`; the token is only in the `Authorization` header.
- [ ] T006 Make `status/src/delivery/read.ts` with `buildDeliveryQuery(repos)` and `readDelivery(projects, env, now, fetch = globalThis.fetch): Promise<Map<string, RawDelivery | "not-available">>` (research §1, §2) so that T005 passes.

**Checkpoint**: `bun test tests/delivery-*.test.ts` passes.

---

## Phase 3: User Story 1 - See where the maintenance work goes (Priority: P1) 🎯 MVP

**Goal**: the table "Delivery (90 days)" in the tab "History" with the PR numbers and a total row.

**Independent Test**: render the page with fixture rows for three projects; the table shows one
row for each project, the total row, and "—" where a number has no data.

- [ ] T007 [US1] In `status/src/main.ts`, page mode only: after `checkVersions()`, call `readDelivery` for `statuses` (the projects that are not archived) with a repo, make the rows with `deliveryRow` in catalog order (`not-available` rows keep their name), log `Delivery <repo>: <n> PRs, <m> deploys` or `Delivery <repo>: not available` (no PR text), and set `page.delivery = { rows, months: windowMonths(now) }`.
- [ ] T008 [P] [US1] Rename the CSS class `versions` to `data-table` in `status/src/page.css`, `status/src/render.ts` (`versionsSection`) and `status/tests/render.test.ts` (research §6); the Versions tab looks the same.
- [ ] T009 [P] [US1] In `status/tests/render.test.ts`, add tests for contracts/page.md: the heading "Delivery (90 days)" and the explanation line in `#tab-history` after the uptime list; `<table class="data-table text-sm">` with the 6 header cells (`scope="col"`); one row for each project with `<th scope="row">` and the catalog name (no link); "Merged PRs" and "Updates" counts (0 when none); the times with `timeText` ("—" without PRs); a `not-available` row with `<td colspan="5">Not available</td>`; the `<tfoot>` total row with the sums and `deliveryTotal` medians; no table without `page.delivery`; no PR text, login or `[bot]` in the panel.
- [ ] T010 [US1] In `status/src/render.ts`, add `deliverySection(delivery)` and call it at the end of `historyPanel` so that T009 passes. Escape each name with `html()`.

**Checkpoint**: the table shows the PR numbers and the total.

---

## Phase 4: User Story 2 - See the deploys each month (Priority: P2)

**Goal**: the Deploys cell: the 90-day total and the counts of the months of the window.

**Independent Test**: render the page with fixture deploys in three months; the cell shows
"13 · 2/5/3/3" and the month names for screen readers; a repo without deploys shows "—".

- [ ] T011 [P] [US2] In `status/tests/render.test.ts`, add tests: a row with months `[["2026-08", 2], ["2026-09", 5], ["2026-10", 3], ["2026-11", 3]]` shows `13 <span class="opacity-60" aria-hidden="true">· 2/5/3/3</span><span class="sr"> (August 2, September 5, October 3, November 3)</span>`; a total of 0 shows "—"; the total row sums each month; 5 months show 5 counts.
- [ ] T012 [US2] In `status/src/render.ts`, render the Deploys cell of T011 (English month names from `YYYY-MM`, UTC) so that T011 passes.
- [ ] T013 [P] [US2] In `status/tests/delivery-read.test.ts`, add a test that a deploy to `Preview` is not asked for (the environment list of the query) and that deploys before the window are not counted by `deliveryRow`.

**Checkpoint**: SC-002 with the fixture of the 2026-11-10 table of spec.md.

---

## Phase 5: Polish

- [ ] T014 In `status/tests/helpers.ts`, add `deliveryWorstCase()` (20 rows, 4 months, a mix of counts and durations) and pass it in `status/tests/size.test.ts`; the page stays below 30 KB gzip.
- [ ] T015 [P] In `PLAN.md`, mark 017 as done in the features table and add a Done entry; in `README.md` (the `start` command), no change is necessary (no new option).
- [ ] T016 Run `cd status && bun test && bun run typecheck && bun run lint` (all pass), then the local run and the browser checks of quickstart.md (light and dark, 375 px in a frame). Record the result and the real numbers in `specs/017-delivery-numbers/research.md` §7.

---

## Dependencies

- Phase 2 (T002–T006) blocks both stories.
- US1 (T007–T010) before US2: US2 fills the Deploys cell of the US1 table.
- In Phase 2: T003 → T004; T005 → T006; T003 and T005 are free.
- In US1: T009 → T010; T007 and T008 are free.
- In US2: T011 → T012; T013 is free.
- Polish after US2.

## Parallel examples

- Phase 2: T003 and T005 together; then T004 and T006.
- US1: T007, T008, T009 together; then T010.
- US2: T011 and T013 together; then T012.

## Implementation strategy

MVP = Phase 1 to 3: the PR numbers alone show where the update work goes. US2 adds the deploy
months. One PR for the feature, with `bun run lint` after each change under `status/` and the
checks of each push and of all runs on the merge commit.
