---

description: "Task list for the project board and public roadmap"
---

# Tasks: Project Board and Public Roadmap

**Input**: Design documents from `/specs/004-project-board/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: `bun test` for the pure functions (catalog lookup, marker parse, sync plan), because
the board code is application code (Principle IX). actionlint for the workflows. One real repo
with a branch reference before the merge (constitution, Development Workflow), and the steps of
quickstart.md.

**Organization**: the board and the shared code are foundational. US1 fills the board with the
sync. US2 adds new issues at once with the shared workflow. US3 makes the roadmap public.

**Repos**: paths without a prefix are in this repo (`ImreBoersma/projects`). Paths with a prefix,
for example `scales-exercises: .github/workflows/board.yml`, are in that repo. Make each repo
change in a PR.

**Constants**: owner `ImreBoersma`. Board URL `https://github.com/users/ImreBoersma/projects/<N>`,
with N from T004. The scripts read the URL from the environment value `BOARD_URL`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files or repos, no dependencies)
- **[Story]**: the user story of the task (US1, US2, US3)

---

## Phase 1: Setup

- [X] T001 Create the branch `004-project-board` in this repo. All changes in this repo stay on this branch until T027.
- [X] T002 [P] Manual (Maintainer): make two classic PATs with expiry 2027-11-03 (research.md §3). Set `BOARD_TOKEN` (scope `project`) in `projects`, Beter-dan-de-MIDI, boek-de-bus, personal-website and scales-exercises. Set `BOARD_SYNC_TOKEN` (scopes `project`, `repo`) in `projects` only. Done 2026-11-03.
- [X] T003 [P] Manual (Maintainer): run `gh auth refresh -s project`, so that the `gh` login on the Maintainer machine can make the board. Done: `gh` has the scope `project`.
- [X] T004 Make the board with `gh` (quickstart.md §1): `gh project create --owner ImreBoersma --title Projects`, then the single-select fields `Priority` (P1, P2, P3), `Roadmap` (Yes, No), `Project` (Placeholder) and `Stakeholder` (Placeholder). Use the built-in field `Status` (Todo, In progress, Done). Record N and the board URL in `specs/004-project-board/contracts/board.md`, section "Links". Done 2026-11-03: board 4. The account also has the old project 2 "Scales exercises"; this feature does not change it.

---

## Phase 2: Foundational

**Purpose**: catalog data and the GraphQL client. All stories need them.

- [X] T005 [P] In `status/src/types.ts`, add `stakeholder: string | null` to `Project`. In `status/src/catalog.ts`, `parseCatalog()` returns `stakeholder` (a non-empty string, else `null`). Add a test case in `status/tests/catalog.test.ts`: `stakeholder: Harmonieorkest Brummen` gives that string, an empty `stakeholder:` gives `null`. Fix other tests and fixtures that build a `Project` (for example `status/tests/github.test.ts`, `status/tests/helpers.ts`). Done: `stakeholder` is optional in the type (`stakeholder?: string | null`), so that the existing test fixtures stay unchanged. `parseCatalog()` always sets it.
- [X] T006 [P] Create `status/src/board/project.ts` with the pure function `findEntry(projects: Project[], repo: string, body: string | null): Project | null` (data-model.md, "Catalog lookup"): compare repo names without case; return `null` for an archived entry or a repo that is not in the catalog; for `ImreBoersma/projects`, read the marker with `parseMarker()` of `status/src/issues.ts`, take the part before `/` as the `id`, and return the entry with that `id` if it is not archived.
- [X] T007 [P] Create `status/tests/board.test.ts` with tests for `findEntry()`: a catalog repo gives its entry; `imreboersma/SCALES-EXERCISES` gives the same entry; an archived entry gives `null`; an unknown repo gives `null`; `ImreBoersma/projects` with body `<!-- status-problem: boek-de-bus/ci-failed -->\n...` gives the entry `boek-de-bus`; `ImreBoersma/projects` without a marker gives `null`. Make the tests pass.
- [X] T008 Create `status/src/board/graphql.ts`: a `graphql(query, variables, token)` function that posts to `https://api.github.com/graphql` and throws an error with the GraphQL error messages. Add these operations, with no title or body fields in the result except where noted: Done: the helpers `required()`, `field()` and `optionId()` are in `status/src/board/env.ts`.
  - `readBoard(url, token)`: project id, and for each single-select field its id, name and options (id, name, color, description). Parse owner and number from the URL.
  - `readItems(projectId, token)`: all items, with pagination (100 for each page). For each item: item id, content type, issue node id, repo `nameWithOwner`, repo `isPrivate`, issue `state`, label names, and the single-select values of Project and Roadmap.
  - `readOpenIssues(repo, token, withBody)`: node id and number of the open issues of one repo, with pagination. Request `body` only when `withBody` is true. The sync sets it only for `ImreBoersma/projects`, to read the marker, so that no text of private repos is read.
  - `addItem(projectId, contentId, token)`: `addProjectV2ItemById`, returns the item id. It returns the existing item when the issue is already on the board.
  - `readItemValues(itemId, token)`: the single-select option ids of Project and Roadmap of one item (for the add job).
  - `setOption(projectId, itemId, fieldId, optionId, token)`: `updateProjectV2ItemFieldValue` with `singleSelectOptionId`.
  - `setOptions(fieldId, options, token)`: `updateProjectV2Field` with `singleSelectOptions`. Each option that exists sends its `id` (research.md §4).
- [X] T009 In `status/package.json`, add the scripts `"board:add": "bun run src/board/add.ts"` and `"board:sync": "bun run src/board/sync.ts"`. Run `bun test` and `bun run lint` in `status/`.

**Checkpoint**: the catalog has stakeholders, the lookup passes its tests, and the GraphQL client compiles.

---

## Phase 3: User Story 1 - See all work of all projects on one board (Priority: P1) 🎯 MVP

**Goal**: the board contains all open issues of the catalog repos, with Project set, and the
options follow the catalog.

**Independent Test**: run the sync. The board has the open issues of two or more repos. Filter on
one Project. Only the issues of that project show. Close one issue. It shows Done.

- [X] T010 [P] [US1] In `status/tests/board.test.ts`, add tests for the pure function `planOptions(current, wanted, usedOptionIds)` of `status/src/board/project.ts`: a missing name is added without an `id`; an existing name keeps its `id`, `color` and `description`; an option that is not wanted and not used is removed; an option that is not wanted but used by an open item stays (spec edge case "archived"); the result is `null` when nothing changes.
- [X] T011 [P] [US1] In `status/tests/board.test.ts`, add tests for the pure function `planItems(projects, items, openIssues)` of `status/src/board/project.ts`. It returns: the issues to add (open issues of catalog repos that are not on the board, with their Project name); the items with no Project value that get one (from `findEntry()`); the items with no Roadmap value that get No (FR-008), also items added by the sync and by the built-in auto-add; no change for items of repos outside the catalog. Include an issue of `harmonieorkest-brummen/pretband-backend` that is on the board without Project: it gets "Pretband backend". Include an open issue of an archived entry: it is not added. Include an open `status-problem` issue of `ImreBoersma/projects` with a marker: it is added with the Project of the marker (FR-006).
- [X] T012 [US1] Implement `planOptions()` and `planItems()` in `status/src/board/project.ts`. Wanted Project options: the `name` of each entry that is not archived. Wanted Stakeholder options: each distinct non-empty `stakeholder`. Do not change the Priority, Status and Roadmap options. Set Roadmap No on each item without a Roadmap value. Make T010 and T011 pass.
- [X] T013 [US1] Create `status/src/board/sync.ts`. Arguments: `--catalog` (default `../projects.yaml`) and `--dry-run`. Environment: `BOARD_URL`, `BOARD_SYNC_TOKEN`. Steps: read the full catalog (also archived entries); `readBoard()`; `readItems()`; `readOpenIssues()` for each catalog repo of an entry that is not archived, and for `ImreBoersma/projects` (only issues with the label `status-problem`); `planOptions()` for Project and Stakeholder; `planItems()`. Write each planned change to the log in ASD-STE100, for example `Add option: Project "Boek de bus"` and `Add item: ImreBoersma/boek-de-bus#12, Project "Boek de bus"`. Log the issue number, never the title. With `--dry-run`, stop there. Else apply the option changes first, read the board again for the new option ids, then add items and set values. Exit 1 on an error, after the log.
- [X] T014 [US1] Create `.github/workflows/board-sync.yml`. Trigger: only `workflow_dispatch` with the boolean input `dry-run` (default `false`). No `push` trigger: `status-page.yml` already runs on each push that changes `projects.yaml`, and its issues job runs the sync (T023). Two triggers on the same push make two syncs at the same time (analysis I1). Concurrency group `board-sync`, no cancel. One job, permissions `contents: read`: checkout, `oven-sh/setup-bun@v2`, `bun install --frozen-lockfile` in `status/`, then `bun run board:sync` with `--dry-run` when the input is true. Environment: `BOARD_URL` (the constant of the header) and `BOARD_SYNC_TOKEN: ${{ secrets.BOARD_SYNC_TOKEN }}`. Step names in ASD-STE100. Run actionlint.
- [X] T015 [US1] Run the sync locally with dry run. GitHub starts a `workflow_dispatch` workflow only when the file is on the default branch, so `board-sync.yml` cannot run before T027 (analysis E1). Needs T003. In `status/`: `BOARD_URL=<board URL> BOARD_SYNC_TOKEN=$(gh auth token) bun run board:sync --dry-run`. The `gh` token has the scopes `repo` and `project`. Make sure that the log lists all catalog names, the stakeholders, the removal of "Placeholder", and the open issues (quickstart.md §4 step 1). Done 2026-11-03: the log listed 12 Project options, 2 Stakeholder options, the removal of both "Placeholder" options, and 8 issues.
- [X] T016 [US1] Run the sync locally without dry run (same command as T015, without `--dry-run`). Make sure that the options match the catalog and the open issues of the catalog repos are on the board with a Project value (also HomeLab and Reperatie-Formulier). Then test that values stay when options change (research.md §4): in the web UI, add the unused option "Test" to the field Project; record the Project values of three items; run the sync again; make sure that "Test" is gone and the three items keep their Project values (quickstart.md §4). Record the result in `specs/004-project-board/research.md` §4. Done 2026-11-03: 8 items added, with Project and Roadmap No; a second run gave "No changes". The option "Test" was removed and the 8 items kept their Project values.
- [X] T017 [US1] Manual (Maintainer), in the web UI of the board: make the views "Board" and "By project" of `specs/004-project-board/contracts/board.md`. Set the built-in workflows "Item closed" and "Pull request merged" to Status Done. Set "Item added to project" to off. Set "Auto-add to project" for `harmonieorkest-brummen/pretband-backend` with filter `is:issue`. Done 2026-11-03 by the Maintainer.
- [X] T018 [US1] Validate quickstart.md §5: an issue of `harmonieorkest-brummen/pretband-backend` is on the board, and after the next sync it has Project "Pretband backend". If GitHub refuses the item or the org blocks classic PATs, record the error in `specs/004-project-board/research.md` §1 and stop for a decision of the Maintainer (spec edge case: a separate board of the organisation). Done 2026-11-03: the built-in auto-add did not add pretband-backend#42 within 3 minutes. `gh project item-add` added it, so a user board accepts issues of the organisation. `board-sync.yml` (run 41668955306) set Project "Pretband backend" and Roadmap No with `BOARD_SYNC_TOKEN`. See research.md §1.
- [X] T019 [US1] Close a test issue that is on the board. Make sure that its Status is Done (US1 AC3). Filter "By project" on one Project. Make sure that only its issues show (US1 independent test). Done 2026-11-04: scales-exercises#382 and pretband-backend#42 got Status Done when they closed. The view "By Project" groups by Project. A filter on a single-select field works: the Roadmap view filters on `roadmap:yes` and showed only scales-exercises#3 (T033). A `project:` filter was not tested separately.

**Checkpoint**: one board with all open issues and the correct Project values.

---

## Phase 4: User Story 2 - New issues go to the board automatically (Priority: P1)

**Goal**: a new issue of a public catalog repo is on the board within 5 minutes, and a
`status-problem` issue within the status run that opens it.

**Independent Test**: open an issue in scales-exercises. Within 1 minute it is on the board with
Project "Scales exercises" and Roadmap No.

- [X] T020 [US2] Create `status/src/board/add.ts`. Environment: `BOARD_URL`, `BOARD_TOKEN`, `GITHUB_REPOSITORY`, `GITHUB_EVENT_PATH`, `--catalog` (default `../projects.yaml`). Read `issue.node_id` and `issue.body` from the event file. Call `findEntry()` on the catalog (all entries). No entry: log `Not in the catalog: <repo>. Not added.` and exit 0. Else `readBoard()`; find the Project option with the entry `name`, and exit 1 with `Run the board sync: no Project option <name>.` if it is missing; `addItem()`; `readItemValues()`; set Project only when the item has no Project value, and set Roadmap No only when the item has no Roadmap value (analysis I5: a transferred issue is already on the board and can have Roadmap Yes). Put this rule in the pure function `planAdd(values, projectOptionId, roadmapNoId)` of `status/src/board/project.ts`, with tests in `status/tests/board.test.ts`: a new item gets both values; an item with Roadmap Yes keeps Yes; an item with a Project value keeps it. Follow `specs/004-project-board/contracts/add-to-board.md`. Do not use `actions/add-to-project` (research.md §2). Done: a `transferred` event reads the issue and repo from `changes.new_issue` and `changes.new_repository`. Local test: an issue already on the board kept its values; an issue of `projects` without a marker gave "Not in the catalog".
- [X] T021 [US2] Create `.github/workflows/add-to-board.yml`: `on: workflow_call` with the required secret `board-token`. One job, permissions `contents: read`. Steps: `actions/checkout` of repository `ImreBoersma/projects` at the ref of the called workflow (use `${{ job.workflow_sha }}` if actionlint 1.7.12 accepts it; else add the input `ref` with default `main` and document it in contracts/add-to-board.md), `oven-sh/setup-bun@v2`, `bun install --frozen-lockfile` in `status/`, `bun run board:add` in `status/` with `BOARD_URL` and `BOARD_TOKEN: ${{ secrets.board-token }}`. Step names in ASD-STE100. Run actionlint. Done: actionlint 1.7.12 does not know `job.workflow_sha`, so the workflow has the input `ref` (default `main`). contracts/add-to-board.md is updated.
- [X] T022 [US2] Create `.github/workflows/board.yml`, the caller of `specs/004-project-board/contracts/caller.md`, with `uses: ./.github/workflows/add-to-board.yml`. This covers a `status-problem` issue that a person opens by hand.
- [X] T023 [US2] In `.github/workflows/status-page.yml`, job `issues`: add the job-level `concurrency: { group: board-sync, cancel-in-progress: false }`, so that it does not run at the same time as `board-sync.yml`. Add a step after `bun run start --mode issues` that runs `bun run board:sync` with `BOARD_URL` and `BOARD_SYNC_TOKEN: ${{ secrets.BOARD_SYNC_TOKEN }}` (research.md §7). Do not give `BOARD_SYNC_TOKEN` to another job. Run actionlint.
- [X] T024 [US2] Test before the merge (quickstart.md §3, constitution): open a PR in scales-exercises that adds `scales-exercises: .github/workflows/board.yml` with `add-to-board.yml@004-project-board`. Merge it. Open a test issue. Make sure that within 1 minute it is on the board with Project "Scales exercises" and Roadmap No. This also checks that `BOARD_TOKEN` with only `project` is sufficient: if it fails with a permission error, stop and ask the Maintainer about the scope `public_repo` (research.md §3). Done 2026-11-03: scales-exercises#381 merged; test issue #382 was on the board 18 seconds after it opened, with Project "Scales exercises" and Roadmap No. `BOARD_TOKEN` with only `project` is sufficient.
- [X] T025 [US2] Open an issue in `projects` without a marker. Make sure that the add job passes with `Not in the catalog` and the issue is not on the board (quickstart.md §8, US2 AC3). Close the issue. Done 2026-11-03: projects#8; the add job logged "Not in the catalog: ImreBoersma/projects. Not added." and the board has no item of `projects`.
- [X] T026 [US2] Run `status-page.yml` on the branch with `workflow_dispatch`, or wait for a real problem. Make sure that each open `status-problem` issue is on the board with the Project of its marker (quickstart.md §7, FR-006). If no problem issue is open, record that the unit test of T011 is the evidence. Done 2026-11-03: run 41658734440 on the branch; the step "Sync the board" passed with `BOARD_SYNC_TOKEN` ("No changes"). No `status-problem` issue was open, so the unit test of T011 is the evidence for the marker rule.
- [X] T027 [US2] Open the PR of `004-project-board` into `main`. CI (`status-page.yml` build, actionlint) must pass. Ask the Maintainer before the merge, because the change goes to `main` of `projects`. Done 2026-11-03: #7 merged by the Maintainer.
- [X] T028 [US2] After the merge, open a PR in scales-exercises that changes `@004-project-board` to `@main` in `scales-exercises: .github/workflows/board.yml`. Done 2026-11-03: scales-exercises#383 merged; CI and deploy on `main` passed.
- [X] T029 [P] [US2] Open a PR that adds `.github/workflows/board.yml` (contracts/caller.md, `@main`) in each of: Beter-dan-de-MIDI, boek-de-bus, personal-website. Format the file with the Biome of each repo if Biome checks YAML there. CI must pass. Do not add a caller to HomeLab, Reperatie-Formulier or `pretband-backend` (contracts/caller.md). Done 2026-11-03: Beter-dan-de-MIDI#316, boek-de-bus#7 and personal-website#29 merged; CI and deploy on `main` passed in each repo.

**Checkpoint**: new issues of the public repos and problem issues go to the board without work.

---

## Phase 5: User Story 3 - Stakeholders see the roadmap without a login (Priority: P2)

**Goal**: a public Roadmap view with only selected issues of public repos.

**Independent Test**: open the Roadmap view in a private browser window. It shows the selected
public items and no private or `status-problem` items.

- [X] T030 [P] [US3] In `status/tests/board.test.ts`, add tests for the pure function `planRoadmap(items)` of `status/src/board/project.ts`: an item with Roadmap Yes from a private repo gets No; an item with Roadmap Yes and the label `status-problem` gets No; an item with Roadmap Yes from a public repo without that label does not change; an item without a Roadmap value does not change.
- [X] T031 [US3] Implement `planRoadmap()` and call it in `status/src/board/sync.ts` after `planItems()`. Log `Remove from the roadmap: <repo>#<number>` (no title). Make T030 pass. Run `bun test` and `bun run lint` in `status/`. Make this change in a PR to `main`. Done in the same PR as US1 and US2 (#7), not in a separate PR: `sync.ts` was new, so there was no conflict.
- [X] T032 [US3] Manual (Maintainer), in the web UI: make the view "Roadmap" of `specs/004-project-board/contracts/board.md` with the filter `roadmap:Yes -label:status-problem is:issue`, grouped by Project, with only the fields Title, Project and Status. Set the visibility of the board to Public (Settings, Danger zone). Record M and the roadmap link in `specs/004-project-board/contracts/board.md`, section "Links". Done 2026-11-04 by the Maintainer: view 3, public board. The first save had no filters; the API check found it and the Maintainer saved the views again.
- [X] T033 [US3] Validate quickstart.md §6: set Roadmap Yes on one item of a public repo and on one item of a private repo; run `board-sync.yml`; make sure that the private item has Roadmap No; open the roadmap link in a private browser window without a login; make sure that the view shows only the public item, with Title, Project and Status (SC-003, SC-004). If the view asks for a login, record it in `specs/004-project-board/research.md` §5 and stop for a decision of the Maintainer. Done 2026-11-04: see research.md §10. The test values were removed: #117 closed, scales-exercises#3 back to Roadmap No.

**Checkpoint**: stakeholders open the roadmap without a GitHub account.

---

## Change during implementation (2026-11-03)

- [X] T037 [US1] [US2] Skip issues that Renovate opens (the Dependency Dashboard), in the sync and in the add job. Rule: the author login matches `RENOVATE` of `status/src/github.ts` (now exported). `isRenovate()` in `status/src/board/project.ts`, tests in `status/tests/board.test.ts`. FR-005 and data-model.md updated. The 5 dashboard items that T016 added were removed from the board; a dry run then gave "No changes".

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T034 [P] Add the validation results to `specs/004-project-board/research.md` as §10: board number, the result of T016 (option ids), T018 (other owner), T024 (token scope) and T033 (roadmap without login), with dates. Done.
- [X] T035 [P] In `PLAN.md`, mark feature 004 as done, add the roadmap link for stakeholders, and add the token renewal date 2027-11-03 for `BOARD_TOKEN` and `BOARD_SYNC_TOKEN`. Done.
- [X] T036 Final check: run `bun test` and `bun run lint` in `status/`, and actionlint on `.github/workflows/`. Make sure that the board has the open issues of all 6 own catalog repos and `pretband-backend`, and that each item has a Project value. Done 2026-11-04: 64 tests pass, Biome and actionlint pass. All 6 items on the board have a Project value. Beter-dan-de-MIDI, boek-de-bus, personal-website and HomeLab have no open issues except the Renovate dashboards, so they have no items yet.

---

## Dependencies & Execution Order

- **Setup (T001–T004)**: T004 needs T003. T002 is done.
- **Foundational (T005–T009)**: needs T001. T005, T006 and T007 can run in parallel. T008 is independent of T005–T007. T009 last.
- **US1 (T010–T019)**: needs Phase 2 and T004. T010 and T011 in parallel, then T012, T013, T014, T015, T016. T017 can start after T004. T018 needs T016 and T017. T019 needs T016 and T017.
- **US2 (T020–T029)**: needs Phase 2 and T016, because the add job needs the Project options. T020 → T021 → T022, T023 → T024 → T025, T026 → T027 → T028, T029.
- **US3 (T030–T033)**: needs US1. Independent of US2, but T031 changes `sync.ts`, so do it after T027 to avoid a conflict on the branch.
- **Polish (T034–T036)**: after all stories.

## Parallel Example: callers in the public repos (T029)

```text
Beter-dan-de-MIDI: .github/workflows/board.yml
boek-de-bus: .github/workflows/board.yml
personal-website: .github/workflows/board.yml
```

Three PRs in three repos, no shared files.

## Implementation Strategy

1. **MVP (US1)**: Setup, Foundational, then the sync. The Maintainer has one board with all open
   issues. New issues come with the next manual or catalog-triggered sync.
2. **US2**: the shared workflow makes new issues show within 1 minute and adds problem issues in
   each status run.
3. **US3**: the public roadmap. It comes last, because the board must be correct before it is
   public.

Stop at each checkpoint and validate before the next phase.

## Phase 7: Convergence

- [X] T038 Update the documents that still say the built-in auto-add brings `pretband-backend` issues: `specs/004-project-board/plan.md` (Summary and the Constitution Check row "Repos of other owners"), `specs/004-project-board/contracts/board.md` (row "Auto-add to project": state off), `specs/004-project-board/contracts/caller.md` and `specs/004-project-board/quickstart.md` §5. The sync adds these issues in each status run (research.md §1, T018) per plan: other-owner decision (contradicts) Done 2026-11-04.
- [X] T039 Move the event read of `status/src/board/add.ts` into a pure function `readEvent(event, repo)` in `status/src/board/project.ts` that returns the issue node id, body, repo and author. Add tests in `status/tests/board.test.ts` for `opened`, for `transferred` (issue and repo from `changes.new_issue` and `changes.new_repository`), and for an issue opened by `renovate[bot]` per Edge case "an issue moves to a different repo" (partial) Done 2026-11-04: 67 tests pass; a local run of `board:add` on scales-exercises#3 kept its values.
