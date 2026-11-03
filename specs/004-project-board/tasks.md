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

- [ ] T001 Create the branch `004-project-board` in this repo. All changes in this repo stay on this branch until T027.
- [X] T002 [P] Manual (Maintainer): make two classic PATs with expiry 2027-11-03 (research.md §3). Set `BOARD_TOKEN` (scope `project`) in `projects`, Beter-dan-de-MIDI, boek-de-bus, personal-website and scales-exercises. Set `BOARD_SYNC_TOKEN` (scopes `project`, `repo`) in `projects` only. Done 2026-11-03.
- [ ] T003 [P] Manual (Maintainer): run `gh auth refresh -s project`, so that the `gh` login on the Maintainer machine can make the board.
- [ ] T004 Make the board with `gh` (quickstart.md §1): `gh project create --owner ImreBoersma --title Projects`, then the single-select fields `Priority` (P1, P2, P3), `Roadmap` (Yes, No), `Project` (Placeholder) and `Stakeholder` (Placeholder). Use the built-in field `Status` (Todo, In progress, Done). Record N and the board URL in `specs/004-project-board/contracts/board.md`, section "Links".

---

## Phase 2: Foundational

**Purpose**: catalog data and the GraphQL client. All stories need them.

- [ ] T005 [P] In `status/src/types.ts`, add `stakeholder: string | null` to `Project`. In `status/src/catalog.ts`, `parseCatalog()` returns `stakeholder` (a non-empty string, else `null`). Add a test case in `status/tests/catalog.test.ts`: `stakeholder: Harmonieorkest Brummen` gives that string, an empty `stakeholder:` gives `null`. Fix other tests and fixtures that build a `Project` (for example `status/tests/github.test.ts`, `status/tests/helpers.ts`).
- [ ] T006 [P] Create `status/src/board/project.ts` with the pure function `findEntry(projects: Project[], repo: string, body: string | null): Project | null` (data-model.md, "Catalog lookup"): compare repo names without case; return `null` for an archived entry or a repo that is not in the catalog; for `ImreBoersma/projects`, read the marker with `parseMarker()` of `status/src/issues.ts`, take the part before `/` as the `id`, and return the entry with that `id` if it is not archived.
- [ ] T007 [P] Create `status/tests/board.test.ts` with tests for `findEntry()`: a catalog repo gives its entry; `imreboersma/SCALES-EXERCISES` gives the same entry; an archived entry gives `null`; an unknown repo gives `null`; `ImreBoersma/projects` with body `<!-- status-problem: boek-de-bus/ci-failed -->\n...` gives the entry `boek-de-bus`; `ImreBoersma/projects` without a marker gives `null`. Make the tests pass.
- [ ] T008 Create `status/src/board/graphql.ts`: a `graphql(query, variables, token)` function that posts to `https://api.github.com/graphql` and throws an error with the GraphQL error messages. Add these operations, with no title or body fields in the result except where noted:
  - `readBoard(url, token)`: project id, and for each single-select field its id, name and options (id, name, color, description). Parse owner and number from the URL.
  - `readItems(projectId, token)`: all items, with pagination (100 for each page). For each item: item id, content type, issue node id, repo `nameWithOwner`, repo `isPrivate`, issue `state`, label names, and the single-select values of Project and Roadmap.
  - `readOpenIssues(repo, token, withBody)`: node id and number of the open issues of one repo, with pagination. Request `body` only when `withBody` is true. The sync sets it only for `ImreBoersma/projects`, to read the marker, so that no text of private repos is read.
  - `addItem(projectId, contentId, token)`: `addProjectV2ItemById`, returns the item id. It returns the existing item when the issue is already on the board.
  - `setOption(projectId, itemId, fieldId, optionId, token)`: `updateProjectV2ItemFieldValue` with `singleSelectOptionId`.
  - `setOptions(fieldId, options, token)`: `updateProjectV2Field` with `singleSelectOptions`. Each option that exists sends its `id` (research.md §4).
- [ ] T009 In `status/package.json`, add the scripts `"board:add": "bun run src/board/add.ts"` and `"board:sync": "bun run src/board/sync.ts"`. Run `bun test` and `bun run lint` in `status/`.

**Checkpoint**: the catalog has stakeholders, the lookup passes its tests, and the GraphQL client compiles.

---

## Phase 3: User Story 1 - See all work of all projects on one board (Priority: P1) 🎯 MVP

**Goal**: the board contains all open issues of the catalog repos, with Project set, and the
options follow the catalog.

**Independent Test**: run the sync. The board has the open issues of two or more repos. Filter on
one Project. Only the issues of that project show. Close one issue. It shows Done.

- [ ] T010 [P] [US1] In `status/tests/board.test.ts`, add tests for the pure function `planOptions(current, wanted, usedOptionIds)` of `status/src/board/project.ts`: a missing name is added without an `id`; an existing name keeps its `id`, `color` and `description`; an option that is not wanted and not used is removed; an option that is not wanted but used by an open item stays (spec edge case "archived"); the result is `null` when nothing changes.
- [ ] T011 [P] [US1] In `status/tests/board.test.ts`, add tests for the pure function `planItems(projects, items, openIssues)` of `status/src/board/project.ts`. It returns: the issues to add (open issues of catalog repos that are not on the board, with their Project name); the items with no Project value that get one (from `findEntry()`); the items with no Roadmap value that get No (FR-008), also items added by the sync and by the built-in auto-add; no change for items of repos outside the catalog. Include an issue of `harmonieorkest-brummen/pretband-backend` that is on the board without Project: it gets "Pretband backend". Include an open issue of an archived entry: it is not added. Include an open `status-problem` issue of `ImreBoersma/projects` with a marker: it is added with the Project of the marker (FR-006).
- [ ] T012 [US1] Implement `planOptions()` and `planItems()` in `status/src/board/project.ts`. Wanted Project options: the `name` of each entry that is not archived. Wanted Stakeholder options: each distinct non-empty `stakeholder`. Do not change the Priority, Status and Roadmap options. Set Roadmap No on each item without a Roadmap value. Make T010 and T011 pass.
- [ ] T013 [US1] Create `status/src/board/sync.ts`. Arguments: `--catalog` (default `../projects.yaml`) and `--dry-run`. Environment: `BOARD_URL`, `BOARD_SYNC_TOKEN`. Steps: read the full catalog (also archived entries); `readBoard()`; `readItems()`; `readOpenIssues()` for each catalog repo of an entry that is not archived, and for `ImreBoersma/projects` (only issues with the label `status-problem`); `planOptions()` for Project and Stakeholder; `planItems()`. Write each planned change to the log in ASD-STE100, for example `Add option: Project "Boek de bus"` and `Add item: ImreBoersma/boek-de-bus#12, Project "Boek de bus"`. Log the issue number, never the title. With `--dry-run`, stop there. Else apply the option changes first, read the board again for the new option ids, then add items and set values. Exit 1 on an error, after the log.
- [ ] T014 [US1] Create `.github/workflows/board-sync.yml`. Trigger: only `workflow_dispatch` with the boolean input `dry-run` (default `false`). No `push` trigger: `status-page.yml` already runs on each push that changes `projects.yaml`, and its issues job runs the sync (T023). Two triggers on the same push make two syncs at the same time (analysis I1). Concurrency group `board-sync`, no cancel. One job, permissions `contents: read`: checkout, `oven-sh/setup-bun@v2`, `bun install --frozen-lockfile` in `status/`, then `bun run board:sync` with `--dry-run` when the input is true. Environment: `BOARD_URL` (the constant of the header) and `BOARD_SYNC_TOKEN: ${{ secrets.BOARD_SYNC_TOKEN }}`. Step names in ASD-STE100. Run actionlint.
- [ ] T015 [US1] Push the branch. Run `board-sync.yml` on the branch with `dry-run: true` (`gh workflow run board-sync.yml --ref 004-project-board -f dry-run=true`). Make sure that the log lists all catalog names, the stakeholders, the removal of "Placeholder", and the open issues (quickstart.md §4 step 1).
- [ ] T016 [US1] Set Priority P3 on one test item by hand. Run the sync without dry run. Make sure that the options match the catalog, the open issues of the catalog repos are on the board (also HomeLab and Reperatie-Formulier), and the test item keeps its values (quickstart.md §4 steps 2 and 3). Record the result for option ids in `specs/004-project-board/research.md` §4.
- [ ] T017 [US1] Manual (Maintainer), in the web UI of the board: make the views "Board" and "By project" of `specs/004-project-board/contracts/board.md`. Set the built-in workflows "Item closed" and "Pull request merged" to Status Done. Set "Item added to project" to off. Set "Auto-add to project" for `harmonieorkest-brummen/pretband-backend` with filter `is:issue`.
- [ ] T018 [US1] Validate quickstart.md §5: an issue of `harmonieorkest-brummen/pretband-backend` is on the board, and after the next sync it has Project "Pretband backend". If GitHub refuses the item or the org blocks classic PATs, record the error in `specs/004-project-board/research.md` §1 and stop for a decision of the Maintainer (spec edge case: a separate board of the organisation).
- [ ] T019 [US1] Close a test issue that is on the board. Make sure that its Status is Done (US1 AC3). Filter "By project" on one Project. Make sure that only its issues show (US1 independent test).

**Checkpoint**: one board with all open issues and the correct Project values.

---

## Phase 4: User Story 2 - New issues go to the board automatically (Priority: P1)

**Goal**: a new issue of a public catalog repo is on the board within 5 minutes, and a
`status-problem` issue within the status run that opens it.

**Independent Test**: open an issue in scales-exercises. Within 1 minute it is on the board with
Project "Scales exercises" and Roadmap No.

- [ ] T020 [US2] Create `status/src/board/add.ts`. Environment: `BOARD_URL`, `BOARD_TOKEN`, `GITHUB_REPOSITORY`, `GITHUB_EVENT_PATH`, `--catalog` (default `../projects.yaml`). Read `issue.node_id` and `issue.body` from the event file. Call `findEntry()` on the catalog (all entries). No entry: log `Not in the catalog: <repo>. Not added.` and exit 0. Else `readBoard()`; find the Project option with the entry `name`, and exit 1 with `Run the board sync: no Project option <name>.` if it is missing; `addItem()`; set Project; set Roadmap No. Follow `specs/004-project-board/contracts/add-to-board.md`. Do not use `actions/add-to-project` (research.md §2).
- [ ] T021 [US2] Create `.github/workflows/add-to-board.yml`: `on: workflow_call` with the required secret `board-token`. One job, permissions `contents: read`. Steps: `actions/checkout` of repository `ImreBoersma/projects` at the ref of the called workflow (use `${{ job.workflow_sha }}` if actionlint 1.7.12 accepts it; else add the input `ref` with default `main` and document it in contracts/add-to-board.md), `oven-sh/setup-bun@v2`, `bun install --frozen-lockfile` in `status/`, `bun run board:add` in `status/` with `BOARD_URL` and `BOARD_TOKEN: ${{ secrets.board-token }}`. Step names in ASD-STE100. Run actionlint.
- [ ] T022 [US2] Create `.github/workflows/board.yml`, the caller of `specs/004-project-board/contracts/caller.md`, with `uses: ./.github/workflows/add-to-board.yml`. This covers a `status-problem` issue that a person opens by hand.
- [ ] T023 [US2] In `.github/workflows/status-page.yml`, job `issues`: add the job-level `concurrency: { group: board-sync, cancel-in-progress: false }`, so that it does not run at the same time as `board-sync.yml`. Add a step after `bun run start --mode issues` that runs `bun run board:sync` with `BOARD_URL` and `BOARD_SYNC_TOKEN: ${{ secrets.BOARD_SYNC_TOKEN }}` (research.md §7). Do not give `BOARD_SYNC_TOKEN` to another job. Run actionlint.
- [ ] T024 [US2] Test before the merge (quickstart.md §3, constitution): open a PR in scales-exercises that adds `scales-exercises: .github/workflows/board.yml` with `add-to-board.yml@004-project-board`. Merge it. Open a test issue. Make sure that within 1 minute it is on the board with Project "Scales exercises" and Roadmap No. This also checks that `BOARD_TOKEN` with only `project` is sufficient: if it fails with a permission error, stop and ask the Maintainer about the scope `public_repo` (research.md §3).
- [ ] T025 [US2] Open an issue in `projects` without a marker. Make sure that the add job passes with `Not in the catalog` and the issue is not on the board (quickstart.md §8, US2 AC3). Close the issue.
- [ ] T026 [US2] Run `status-page.yml` on the branch with `workflow_dispatch`, or wait for a real problem. Make sure that each open `status-problem` issue is on the board with the Project of its marker (quickstart.md §7, FR-006). If no problem issue is open, record that the unit test of T011 is the evidence.
- [ ] T027 [US2] Open the PR of `004-project-board` into `main`. CI (`status-page.yml` build, actionlint) must pass. Ask the Maintainer before the merge, because the change goes to `main` of `projects`.
- [ ] T028 [US2] After the merge, open a PR in scales-exercises that changes `@004-project-board` to `@main` in `scales-exercises: .github/workflows/board.yml`.
- [ ] T029 [P] [US2] Open a PR that adds `.github/workflows/board.yml` (contracts/caller.md, `@main`) in each of: Beter-dan-de-MIDI, boek-de-bus, personal-website. Format the file with the Biome of each repo if Biome checks YAML there. CI must pass. Do not add a caller to HomeLab, Reperatie-Formulier or `pretband-backend` (contracts/caller.md).

**Checkpoint**: new issues of the public repos and problem issues go to the board without work.

---

## Phase 5: User Story 3 - Stakeholders see the roadmap without a login (Priority: P2)

**Goal**: a public Roadmap view with only selected issues of public repos.

**Independent Test**: open the Roadmap view in a private browser window. It shows the selected
public items and no private or `status-problem` items.

- [ ] T030 [P] [US3] In `status/tests/board.test.ts`, add tests for the pure function `planRoadmap(items)` of `status/src/board/project.ts`: an item with Roadmap Yes from a private repo gets No; an item with Roadmap Yes and the label `status-problem` gets No; an item with Roadmap Yes from a public repo without that label does not change; an item without a Roadmap value does not change.
- [ ] T031 [US3] Implement `planRoadmap()` and call it in `status/src/board/sync.ts` after `planItems()`. Log `Remove from the roadmap: <repo>#<number>` (no title). Make T030 pass. Run `bun test` and `bun run lint` in `status/`. Make this change in a PR to `main`.
- [ ] T032 [US3] Manual (Maintainer), in the web UI: make the view "Roadmap" of `specs/004-project-board/contracts/board.md` with the filter `roadmap:Yes -label:status-problem is:issue`, grouped by Project, with only the fields Title, Project and Status. Set the visibility of the board to Public (Settings, Danger zone). Record M and the roadmap link in `specs/004-project-board/contracts/board.md`, section "Links".
- [ ] T033 [US3] Validate quickstart.md §6: set Roadmap Yes on one item of a public repo and on one item of a private repo; run `board-sync.yml`; make sure that the private item has Roadmap No; open the roadmap link in a private browser window without a login; make sure that the view shows only the public item, with Title, Project and Status (SC-003, SC-004). If the view asks for a login, record it in `specs/004-project-board/research.md` §5 and stop for a decision of the Maintainer.

**Checkpoint**: stakeholders open the roadmap without a GitHub account.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T034 [P] Add the validation results to `specs/004-project-board/research.md` as §10: board number, the result of T016 (option ids), T018 (other owner), T024 (token scope) and T033 (roadmap without login), with dates.
- [ ] T035 [P] In `PLAN.md`, mark feature 004 as done, add the roadmap link for stakeholders, and add the token renewal date 2027-11-03 for `BOARD_TOKEN` and `BOARD_SYNC_TOKEN`.
- [ ] T036 Final check: run `bun test` and `bun run lint` in `status/`, and actionlint on `.github/workflows/`. Make sure that the board has the open issues of all 6 own catalog repos and `pretband-backend`, and that each item has a Project value.

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
