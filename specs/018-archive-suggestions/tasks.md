# Tasks: Archive Suggestions for Old Projects

**Input**: Design documents from `/specs/018-archive-suggestions/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/page.md,
contracts/catalog.md, quickstart.md

**Tests**: included (plan.md "Testing", quickstart.md "Tests").

**Format**: `[ID] [P?] [Story] Description`. All paths are from the repo root.

---

## Phase 1: Setup

- [ ] T001 On the branch `018-archive-suggestions`, run `cd status && bun run css && bun test` and record the baseline number of tests (453 on 2026-11-16).

---

## Phase 2: Foundational

**Purpose**: the types, the catalog field, the rule and the reader; both stories use them.

- [ ] T002 In `status/src/types.ts`, add `keep?: { until: string; reason: string }` to `Project`, the type `ArchiveState` of data-model.md (`{ state: "suggest"; since: string; orEarlier: boolean } | { state: "kept"; until: string; reason: string }`), `archive?: ArchiveState` to `ProjectStatus`, and `ArchiveRaw` of data-model.md (`createdAt`, `lastPersonCommit`, `oldestCommitRead`, `historyComplete`, `lastPersonPr`, `lastPersonIssue`, `openPersonWork`, `listsComplete`).
- [ ] T003 [P] In `status/tests/catalog.test.ts`, add tests for contracts/catalog.md: a valid `keep` gives `{ until, reason }` (reason trimmed); errors `Catalog error in entry <n>, field \`keep\`` for: `keep` not a map, a missing `until` or `reason`, an extra field, `until` not "a real date as YYYY-MM-DD" (`2027-02-30`), `reason` empty or over "1 to 80 characters after trim"; a `keep` date in the past is valid.
- [ ] T004 In `status/src/catalog.ts`, parse `keep` in `parseCatalog` (use the existing `realDate`) so that T003 passes; a project without `keep` has no `keep` key.
- [ ] T005 [P] Make `status/tests/archive-rule.test.ts` for research §3 and §4: `isPersonCommit` — a commit with a PR whose author is `User` and no label `campaign` is a person; a PR author `Bot` is not (also when the commit author `user` is a `User`, the Dependabot squash merge of pretband-backend); a PR with the label `campaign` is not; a commit without a PR is a person when `author.user.login` exists and does not end with `[bot]`; `renovate[bot]` and `author.user: null` are not. `archiveState(raw, keep, now)` with `now = 2026-11-16T12:00:00Z`: last work = the latest of `lastPersonCommit`, `lastPersonPr`, `lastPersonIssue`; none → `createdAt` when `historyComplete`, else `oldestCommitRead` with `orEarlier: true`; 2025-12-01 (11.5 months) → `undefined`; 2025-10-01 (13.5 months) → `{ state: "suggest", since: "2025-10-01", orEarlier: false }`; the limit is 12 calendar months UTC (2025-11-16 gives a suggestion only after the day); `openPersonWork: true` → `undefined`; `listsComplete: false` → `undefined`; `"not-available"` → `undefined`; `keep.until` ≥ today (2026-11-16, also equal) → `{ state: "kept", until, reason }` even when the rule is true; `keep.until` yesterday → the rule applies. `since` is the date part `YYYY-MM-DD`.
- [ ] T006 Make `status/src/archive/rule.ts` with `isPersonCommit(node)` and `archiveState(raw, keep, now)` so that T005 passes. Note in a comment that a login is used only for the bot test and is never kept (research §3).
- [ ] T007 [P] Make `status/tests/archive-read.test.ts` with a fake `fetch` (as `status/tests/delivery-read.test.ts`): `buildArchiveQuery` asks for the fields of research §2 (`createdAt`, `history(first: 100)` with `committedDate`, `author { user { login } }`, `associatedPullRequests(first: 1)` with `author { __typename }` and `labels(first: 10) { nodes { name } }`; `pullRequests(first: 20, orderBy: { field: CREATED_AT, direction: DESC })` and `issues(first: 20, …)` with `createdAt state author { __typename }`) and no `title`, `body`, `message` or `headRefName`; `readArchive` sends one query for each token (`tokenFor(owner)`), and a next commit page (`after:`) only while no person commit is found and `hasNextPage`, at most 5 pages; it fills `ArchiveRaw` (an open `campaign` PR is not `openPersonWork`; a list with 20 nodes and no person node gives `listsComplete: false`); a GraphQL error only on the `issues` field of a repo (no "Issues" permission) gives `lastPersonIssue: null` and `listsComplete: false`, not `"not-available"`; a project without a token, an HTTP error or a `null` repository gives `"not-available"`; the token is only in the `Authorization` header.
- [ ] T008 Make `status/src/archive/read.ts` with `buildArchiveQuery(repos)` and `readArchive(projects, env, fetch = globalThis.fetch): Promise<Map<string, ArchiveRaw | "not-available">>` (research §1, §2), with the person test of `rule.ts`, so that T007 passes.

**Checkpoint**: `bun test tests/archive-*.test.ts tests/catalog.test.ts` passes.

---

## Phase 3: User Story 1 - See which projects can be archived (Priority: P1) 🎯 MVP

**Goal**: the badge "Archive?" in the row and the line in the detail view; `keep` shows its date
and reason.

**Independent Test**: render the page with a fixture project whose `archive` is `suggest` 13
months ago; the row shows "Archive?" and the detail view the date and the checklist link. A project
with work 11 months ago shows neither.

- [ ] T009 [US1] In `status/src/main.ts`, page mode only: after `checkDelivery()`, call `readArchive` for the `statuses` with a repo and status `active` or `maintenance`, set `s.archive = archiveState(raw, s.project.keep, now)`, and log `Archive <repo>: last work <date>`, `Archive <repo>: kept until <date>`, `Archive <repo>: not sure (no issue data)` or `Archive <repo>: not available` (no text, no login).
- [ ] T010 [P] [US1] In `status/tests/render.test.ts`, add tests for contracts/page.md: `suggest` → the row has `<span class="badge badge-sm badge-ghost">Archive?</span>` after the name, inside the one row link, and the row dot, summary fact and `data-keys` are the same as without `archive` (FR-005); the detail view has a last fact group "Archive" with `No commit, PR or issue by a person since <time datetime="2025-10-01">2025-10-01</time>.` and the link "Archive checklist" to `https://github.com/ImreBoersma/projects/blob/main/docs/archive.md` (new tab, as the other links); `orEarlier` adds " or earlier"; `kept` → no badge and `Kept until <time datetime="2027-06-01">2027-06-01</time>: <reason>.` with the reason escaped (`<b>` stays text); no `archive` → no badge and no group; `summary()` and the problem counts do not change.
- [ ] T011 [US1] In `status/src/render.ts`, add the badge in `row()` and the "Archive" group in the facts of `modal()` so that T010 passes. Add `ARCHIVE_DOC` next to `DOCS`.
- [ ] T012 [P] [US1] In `status/tests/app.test.ts` (the test of `status.json`), add a check that `archive` is in the view model of a project with a suggestion and is absent without one (contracts/page.md "status.json").

**Checkpoint**: the badge and the detail line show for a fixture project; SC-002 and SC-004 hold
in the tests.

---

## Phase 4: User Story 2 - Archive a project with a checklist (Priority: P2)

**Goal**: one checklist with the steps of FR-007.

**Independent Test**: open `docs/archive.md`; each step of FR-007 is there in order; a project with
`status: archived` is not on the page.

- [ ] T013 [P] [US2] Make `docs/archive.md` (ASD-STE100, as `docs/conformance.md`): a short intro (when the page shows "Archive?", the `keep` field to stop it until a date) and a checklist in this order: 1. archive the repo on GitHub (Settings → Archive this repository, or `gh repo archive <owner>/<repo>`); 2. the domain and the hosting: keep or stop each, and write the choice in the PR of step 3; 3. set `status: archived` in `projects.yaml`; 4. remove the project from the board (spec 004); 5. remove the entries of the project from the `secrets` list in `projects.yaml`; 6. revoke the tokens that only this project uses (the `expires` entries of step 5 name them). Each step says what to check after it.
- [ ] T014 [P] [US2] In `status/tests/catalog.test.ts`, add a test that `visibleProjects` drops a project with `status: archived` and a `keep` field (`main.ts` reads the archive data only for visible projects), so the suggestion leaves with the project.

**Checkpoint**: the checklist is complete; an archived project leaves the page.

---

## Phase 5: Polish

- [ ] T015 [P] In `status/README.md`, add "Issues" to the read permissions of `STATUS_READ_TOKEN` and `STATUS_READ_TOKEN_HOB` (research §1) and one line on the archive suggestion; in the root `README.md`, no change (no new command).
- [ ] T016 [P] In `PLAN.md`, mark 018 as done in the features table and add a Done entry with the token permission step.
- [ ] T017 In `status/tests/size.test.ts`, give the worst case of `status/tests/helpers.ts` a `suggest` state on each project and a `kept` state with an 80-character reason on one; the page stays below 30 KB gzip.
- [ ] T018 Run `cd status && bun test && bun run typecheck && bun run lint` (all pass), then the local run of quickstart.md: each repo logs one `Archive` line and no project gets a suggestion (the oldest work by a person is 2026-07-29). Record the result in `specs/018-archive-suggestions/research.md` §8.

---

## Dependencies

- Phase 2 (T002–T008) blocks both stories; T002 first.
- In Phase 2: T003 → T004; T005 → T006; T007 → T008; T006 before T008 (the reader uses the person test). T003, T005 and T007 are free after T002.
- In US1: T010 → T011; T009 and T012 are free after Phase 2.
- US2 does not need US1 (T013 is a document; T014 uses the existing archived filter), but the link of T011 points to the file of T013, so merge both in the same PR.
- Polish after US1 and US2.

## Parallel examples

- Phase 2: T003, T005 and T007 together; then T004, T006; then T008.
- US1: T009, T010 and T012 together; then T011.
- US2: T013 and T014 together.

## Implementation strategy

MVP = Phase 1 to 3: the suggestion and the `keep` field. US2 adds the checklist that the link
needs, so both go in one PR. Run `bun run lint` after each change under `status/`, and check each
push and all runs on the merge commit. After the merge, the Maintainer adds "Issues: Read-only"
to both status tokens (quickstart.md); until then the page shows no suggestion.
