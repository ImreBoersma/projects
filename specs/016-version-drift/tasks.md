# Tasks: Version Drift Between Projects

**Input**: Design documents from `/specs/016-version-drift/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/page.md, quickstart.md

**Tests**: included (plan.md "Testing", quickstart.md "Tests").

**Format**: `[ID] [P?] [Story] Description`. All paths are from the repo root.

---

## Phase 1: Setup

- [X] T001 On the branch `016-version-drift`, run `cd status && bun run css && bun test` and record the baseline number of tests (364 on 2026-11-10).

---

## Phase 2: Foundational

**Purpose**: the types and the pure parse functions; both stories use them.

- [X] T002 In `status/src/types.ts`, add the types of data-model.md: `Tool` (the 7 keys `node`, `bun`, `next`, `react`, `typescript`, `biome`, `types-node`, in this column order), `ToolVersion` (`text`, `source`, `major: number | null`, `behind?: number`, `highest?: number`), `VersionRow` (`projectId`, `repo`, `state: "ok" | "not-available"`, `tools: Partial<Record<Tool, ToolVersion>>`), and `versions?: VersionRow[]` in `StatusPage`. Export `TOOLS: [Tool, string][]` with the labels (Node, Bun, Next.js, React, TypeScript, Biome, `@types/node`) from `status/src/versions/parse.ts`.
- [X] T003 [P] Make `status/tests/versions-parse.test.ts` with the cases of research §4 and §5: `lowestMajor("^5")` 5, `"^6.0.3"` 6, `"16.4.1"` 16, `">=18 <21"` 18, `"^20 || ^22"` 20, `">18"` 18, `"20.x"` 20, `"v20"` 20, `"~2.2.0"` 2, `"20.1.3-rc.1"` 20, `"<21"` null, `"latest"` null, `"*"` null, `"workspace:*"` null, `"lts/*"` null; `safeText("latest")` "latest", `safeText("^19.3.1")` "^19.3.1", `safeText("github:org/repo#main")` "Other", `safeText("file:../x")` "Other", `safeText("npm:@x/y@1")` "Other", a 41-character text "Other"; `nodeFromCi(text)` returns the `node-version` of the `with:` of the job that `uses` `ci-node.yml` (string or number), and null without it or for invalid YAML; `sharedNodeDefault(text)` returns `"24"` for the current `.github/workflows/ci-node.yml`.
- [X] T004 Make `status/src/versions/parse.ts` with `lowestMajor`, `safeText` (the rule `^[A-Za-z0-9 .^~<>=|*+-]{1,40}$`, else "Other"), `nodeFromCi` and `sharedNodeDefault` (parse with `yaml`; no throw) so that T003 passes.

**Checkpoint**: `bun test tests/versions-parse.test.ts` passes.

---

## Phase 3: User Story 1 - See all versions in one table (Priority: P1) 🎯 MVP

**Goal**: one table in the tab "Versions" with a row for each catalog repo with a `package.json`
and the 7 tools.

**Independent Test**: render the page with three fixture rows; the tab shows one row for each
repo, the versions in the correct columns, "—" for a tool that a repo does not use, and
"24 (default)" for Node without a source.

- [X] T005 [P] [US1] Make `status/tests/versions-read.test.ts` with a fake `fetch` (as `status/tests/conformance-read.test.ts`): `package.json` 404 → `null` (no row); `dependencies` before `devDependencies`; Node order `ci.yml` → `.nvmrc` → `.node-version` → `engines.node` → the shared default with source `default` and text "24 (default)"; Bun from `packageManager` `bun@1.3.0`, else `engines.bun`, else "newest (CI)" with source `bun.lock` when `bun.lock` gives 200 (try `bun.lockb` only when `bun.lock` gives 404), else no Bun; `packageManager` `yarn@4.18.1` gives no Bun; a request that fails (500 or a network error) or a `package.json` that is not valid JSON → `state: "not-available"` with empty `tools`; each cell text passes through `safeText`; the token is only in the `Authorization` header (check the fake's calls).
- [X] T006 [US1] Make `status/src/versions/read.ts` with `readVersions(projectId, repo, token, ciText, nodeDefault, fetch = globalThis.fetch): Promise<VersionRow | null>` (raw contents API, `Accept: application/vnd.github.raw`, 404 = no file, the 4 files in parallel) so that T005 passes.
- [X] T007 [US1] In `status/src/main.ts`, page mode only: after `checkSecrets()`, for each status row with a repo (the projects that are not archived: `statuses`), take the `ci.yml` text from `workflowTexts` (own repos) or from the texts that the secrets compare read (keep them in a map; other repos), take the token (`CONFORMANCE_READ_TOKEN` for `ImreBoersma/…`, else `tokenFor(owner, process.env)`), and call `readVersions` in parallel; read the shared default once with `sharedNodeDefault` from `../.github/workflows/ci-node.yml` (as `sharedWorkflowVars`). Without a token: the row is `not-available`. Log `Versions <repo>: read` / `not available` (no file text), and after the drift step `Versions: <n> repos behind`. Put the rows in catalog order in `page.versions`.
- [X] T008 [P] [US1] In `status/tests/render.test.ts`, add tests for contracts/page.md: the tab "Versions" between "Shared tokens" and "History" with `data-tab="versions"` and `href="?tab=versions"`; the panel `#tab-versions` with the title, the intro line, `<table class="versions">`, the 8 header cells with `scope="col"`, one row for each VersionRow with `<th scope="row">` and the repo link (the name after `/`, the new-tab rules of spec 012); "—" for a missing tool; `title` with the source; "(default)" in `opacity-60`; a `not-available` row with "Not available" and `colspan="7"`; "No version data." without `versions`; the panel is in the HTML without the script.
- [X] T009 [US1] In `status/src/render.ts`, add `["versions", "Versions"]` to `TABS` (between `tokens` and `history`), `versions` to `tabCount` (0 for now), and `versionsSection(rows)`; render it with `panel("versions", "Versions", …)` so that T008 passes. Escape each text with `html()`.
- [X] T010 [P] [US1] In `status/src/page.css`, add the `.versions` table rules: the table in a box `overflow-x-auto` (no page scroll at 375 px), cell padding 4px 8px, left text, `white-space: nowrap`, a 1px line below each row in `var(--color-base-300)`.
- [X] T011 [US1] In `status/src/client.ts`, add `versions` to the tab list of `pick("tab", …)` and to the ⌘K tab items ("Tab: Versions"); in `status/tests/client.test.ts`, test that `?tab=versions` opens the tab and that `searchCommands` finds "Tab: Versions" for "vers".

**Checkpoint**: the table shows all versions; no mark yet.

---

## Phase 4: User Story 2 - See which repo is behind (Priority: P1)

**Goal**: mark each version that is one or more major versions behind the highest major of that
tool, and show the number of marked repos on the tab.

**Independent Test**: render the page with rows on TypeScript 5, 6 and 7; the cells 5 and 6 are
marked, 7 is not, and the tab label shows 2.

- [X] T012 [P] [US2] Make `status/tests/versions-drift.test.ts`: `markDrift` sets `behind` and `highest` only when `highest − major ≥ 1`; a tool with a non-null `major` in only one row gives no mark; `null` majors and `not-available` rows are not compared; `markedCount` counts rows with one or more marks; the fixture of the 2026-11-10 table of spec.md (6 repos) gives marks for boek-de-bus TypeScript `^5` (behind 2, highest 7) and `@types/node` `^20` (behind 6, highest 26), for pretband-backend, Beter-dan-de-MIDI and personal-website TypeScript `^6.x` (behind 1), no other mark, and `markedCount` 4 (SC-002).
- [X] T013 [US2] Make `status/src/versions/drift.ts` with `markDrift(rows: VersionRow[]): VersionRow[]` (no change to the input) and `markedCount(rows)` so that T012 passes; call `markDrift` in `status/src/main.ts` before `page.versions` is set.
- [X] T014 [P] [US2] In `status/tests/render.test.ts`, add tests: a marked cell has `class="drift"`, a `title` with the source and "2 major versions behind 7", and `<span class="sr"> (2 major versions behind 7)</span>`; 1 gives "1 major version behind"; the tab label has `<span class="badge badge-sm badge-warning ml-1">n</span>` with `markedCount`, and no badge for 0; a marked cell does not change the row dot, the modal, the total state or the problems (compare the HTML outside `#tab-versions` with and without marks).
- [X] T015 [US2] In `status/src/render.ts`, render the mark and the tab count of T014 (`tabCount.versions = markedCount(page.versions ?? [])`).
- [X] T016 [US2] In `status/src/page.css`, add `.drift` (background `color-mix(in oklab, var(--color-warning) 35%, var(--color-base-100))`, the text in the base text colour, `::before { content: "▼ "; }`). In `status/tests/style.test.ts`, add a test that the base text colour on this mix has a contrast of 4.5 or more in `THEME` and `THEME_DARK` (compute the mix in oklab, as the CSS).

**Checkpoint**: SC-002 is true with the fixture.

---

## Phase 5: Polish

- [X] T017 In `status/tests/helpers.ts`, add versions to the 20-site worst case (a `versionsWorstCase()` with 20 rows, all 7 tools, a mix of marks) and pass them in `status/tests/size.test.ts`; the page stays below 30 KB gzip.
- [X] T018 [P] In `PLAN.md`, mark 016 as done in the features table and add a Done entry (no file in `docs/` lists the tabs, so no docs change).
- [X] T019 Run `cd status && bun test && bun run typecheck && bun run lint` (all pass), then the local run and the browser checks of quickstart.md (light and dark, 375 px, without the script, ⌘K). Record the result and the real tab count in `specs/016-version-drift/research.md` §9.

---

## Dependencies

- Phase 2 (T002–T004) blocks both stories.
- US1 (T005–T011) before US2: US2 adds the mark to the table of US1.
- In US1: T005 → T006 → T007; T008 → T009; T010 and T011 are free.
- In US2: T012 → T013; T014 → T015; T016 is free.
- Polish after US2.

## Parallel examples

- Phase 2: T003 (test) while T002 (types).
- US1: T005, T008, T010 together (different files); then T006, T009, T011.
- US2: T012, T014, T016 together; then T013, T015.

## Implementation strategy

MVP = Phase 1 to 3: the table alone already answers "which versions do the repos use". US2 adds
the marks and the tab count in a small second step. One PR for the full feature (the feature is
small), with the checks of all runs on the merge commit.
