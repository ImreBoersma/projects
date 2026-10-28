---

description: "Task list for the project status page"
---

# Tasks: Project Status Page

**Input**: Design documents from `/specs/001-project-status-page/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: included. plan.md specifies `bun test` with fixtures, and contracts/page.md requires a
privacy test in `render.test.ts`.

**Organization**: tasks are in groups for each user story. Order of stories: US1 (P1), US2 (P2),
US4 (P2), US3 (P3). Each story can be tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependencies)
- **[Story]**: the user story of the task (US1, US2, US3, US4)
- All paths are relative to the repo root.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: make the `status/` package and the catalog.

- [X] T001 Create `status/package.json`: `"name": "status"`, `"private": true`, `"type": "module"`, scripts `test` = `bun test`, `lint` = `biome check .`, `start` = `bun run src/main.ts`. Dependency `yaml`. Dev dependencies `@biomejs/biome` and `@types/bun`. Run `bun install` in `status/` to make `status/bun.lock`.
- [X] T002 [P] Create `status/tsconfig.json` with `"strict": true`, `"module": "ESNext"`, `"moduleResolution": "bundler"`, `"types": ["bun"]`, `"noEmit": true`.
- [X] T003 [P] Create `status/biome.json` with the recommended rules, formatter on, and `node_modules` and `_site` ignored.
- [X] T004 [P] Add `_site/` to `.gitignore`.
- [X] T005 [P] Create `projects.yaml` at the repo root in the format of `specs/001-project-status-page/contracts/catalog.md`. Add one entry for each personal project, except the forks. Use only the fields `id`, `name`, `repo`, `status`. Set `status: active` for all entries; the Maintainer changes them later. Leave `repo` empty for projects with remote "none". Do not add contact details (Principle III).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: catalog parser, GitHub query, entry point and workflow. All user stories need these.

**⚠️ CRITICAL**: start no user story before this phase is complete.

- [X] T006 Create `status/src/types.ts` with the types `Project`, `ProjectStatus`, `Problem`, `StatusPage` exactly as in `specs/001-project-status-page/data-model.md`. `availability`: `ok` | `no-repo` | `unavailable`. `ci`: `passed` | `failed` | `unknown`. `deploy`: `{ at: Date, result: "succeeded" | "failed" | "in-progress" }` or `"unknown"`. `reason`: `ci-failed` | `deploy-failed` | `renovate-stale` | `inactive`.
- [X] T007 [P] Write `status/tests/catalog.test.ts`. Test cases: valid file; missing `id`; duplicate `id`; `id` not matching `^[a-z0-9-]+$`; `status: paused`; `repo: notvalid`; empty `repo` is accepted; unknown fields are accepted; missing top-level `projects` key; the error message contains the entry index and the field name; `visibleProjects()` drops `archived` entries.
- [X] T008 Implement `status/src/catalog.ts`: `parseCatalog(text: string): Project[]` and `visibleProjects(projects): Project[]`. Rules from data-model.md: "`id` Required. Unique. Lowercase, `a-z0-9-`"; "`name` Required"; "`repo` `owner/name`. Empty when the project has no repo"; "`status` `active` | `maintenance` | `archived` Required". Unknown fields are permitted. Throw an error with the entry index and the field when a rule fails. Make T007 pass.
- [X] T009 [P] Create `status/tests/fixtures/graphql-response.json`: a GraphQL response with these aliases. `r0`: CI `SUCCESS`, production deploy `SUCCESS`. `r1`: CI `FAILURE`, one PR by `renovate` created 20 days before the fixture date. `r2`: no `statusCheckRollup`, production deploy `FAILURE`. `r3`: `null`, with a matching entry in `errors[]`. `r4`: no commits (`defaultBranchRef: null`). Add the strings `SECRET-COMMIT-MSG`, `SECRET-PR-TITLE` and `secret-branch` in fields that a wrong query could return. The privacy test looks for them.
- [X] T010 [P] Write `status/tests/github.test.ts`. Test `mapRepo()` with the fixture:
  - CI: `SUCCESS` → `passed`. `FAILURE` or `ERROR` → `failed`. `PENDING`, `EXPECTED` or no rollup → `unknown`.
  - Deploy: the one production deployment in the response. `SUCCESS` → `succeeded`. `FAILURE` or `ERROR` → `failed`. Other states → `in-progress`. No deployment → `unknown`.
  - Renovate PR: author login `renovate` or `renovate[bot]`.
  - `r3` → `availability: unavailable`. `r4` → `lastCommitAt: null`, `ci: unknown`.
  - Test `tokenFor()`. Owner `ImreBoersma` → `STATUS_READ_TOKEN`. Owner `harmonieorkest-brummen` → `STATUS_READ_TOKEN_HOB`. Other owner, or secret not set → `undefined`.
- [X] T011 Implement `status/src/github.ts`: `tokenFor(owner, env)`, `buildQuery(repos)`, `mapRepo(node, project)` and `fetchStatuses(projects, env): Promise<ProjectStatus[]>`. Make T010 pass.
  - `buildQuery()` gives one alias `r<n>` for each repo.
  - Group the repos by token. Send one POST to `https://api.github.com/graphql` for each token.
  - For each repo, request only these fields:
    - `defaultBranchRef.target.committedDate`
    - `defaultBranchRef.target.statusCheckRollup.state`
    - `pullRequests(states: OPEN, first: 100) { totalCount nodes { createdAt author { login } } }`
    - `deployments(environments: ["production", "Production"], first: 1, orderBy: {field: CREATED_AT, direction: DESC}) { nodes { createdAt latestStatus { state } } }`
  - Do NOT request `message`, `title`, `headRefName` or other text fields (FR-018).
  - A project without `repo` → `no-repo`.
  - These cases give `unavailable`: no token for the repo, a `null` alias, a failed request. The other repos continue (FR-014).
- [X] T012 Implement the sequence in `status/src/main.ts`. Make T024 able to add the issue part.
  - Arguments: `--catalog <path>` (default `../projects.yaml`), `--out <dir>` (default `../_site`), `--mode page|issues` (default `page`), `--dry-run`.
  - Read and parse the catalog. On a catalog error, print the error. Exit with code 1 before any output (FR-015).
  - Call `visibleProjects()` and `fetchStatuses()`.
  - Mode `page` renders the page (US1). Mode `issues` changes the issues (US4).
- [X] T013 Create `.github/workflows/status-page.yml`.
  - Triggers: `schedule` cron `0 5,17 * * *`, `workflow_dispatch`, `push` to `main` with paths `projects.yaml` and `status/**`.
  - `concurrency: { group: status-page, cancel-in-progress: false }`.
  - Use `working-directory: status` for the bun steps. Use `actions/checkout@v4` and `oven-sh/setup-bun@v2`.
  - Job `build` (permissions `contents: read`): checkout, setup bun, `bun install --frozen-lockfile`, `bun run lint`, `bun test`, `bun run start --mode page` with secret env `STATUS_READ_TOKEN` and `STATUS_READ_TOKEN_HOB`, then `actions/upload-pages-artifact@v3` with path `_site`.
  - Job `deploy` (needs `build`; permissions `pages: write`, `id-token: write`; environment `github-pages`): `actions/deploy-pages@v4`.
  - Job `issues` (needs `build`, not `deploy`; permissions `contents: read`, `issues: write`): checkout, setup bun, `bun install --frozen-lockfile`, `bun run start --mode issues` with the same secrets and `GITHUB_TOKEN`.
  - An error in job `issues` does not stop job `deploy` (research.md §8).

**Checkpoint**: `bun test` passes for catalog and github. The workflow runs but makes no page yet.

---

## Phase 3: User Story 1 - See the status of all projects on one page (Priority: P1) 🎯 MVP

**Goal**: one public page with one row for each non-archived project and the five items.

**Independent Test**: a catalog with one `active` project with a repo, one `archived` project and one without a repo. Run `bun run start --mode page`. `_site/index.html` shows two rows with all columns.

### Tests for User Story 1

- [X] T014 [P] [US1] Write `status/tests/render.test.ts`: the output contains the title "Project status" and the columns of `specs/001-project-status-page/contracts/page.md` (Project, Problems, Last commit, Open PRs, Renovate PRs, CI, Last deploy). A `no-repo` row shows "No repo". An `unavailable` row shows "Data not available". The project name is HTML-escaped. Privacy test: map the T009 fixture with `mapRepo()`, render it, and make sure that `SECRET-COMMIT-MSG`, `SECRET-PR-TITLE`, `secret-branch` and the author logins do not occur in the output.

### Implementation for User Story 1

- [X] T015 [US1] Implement `renderPage(page: StatusPage): string` in `status/src/render.ts` as specified in contracts/page.md: header "Project status", "Last update: <YYYY-MM-DD HH:MM> UTC", one table, inline CSS with light and dark colours through `prefers-color-scheme`, no external files. Dates as `YYYY-MM-DD`. Renovate column: count and age in days of the oldest PR. CI: Passed / Failed / Unknown. Last deploy: date and Succeeded / Failed / In progress, or Unknown. Text in ASD-STE100. Make T014 pass.
- [X] T016 [US1] In mode `page` of `status/src/main.ts`, sort the rows by `name`, make a `StatusPage` with `generatedAt` = start time of the run, call `renderPage()` and write `<out>/index.html`.

**Checkpoint**: the MVP is complete. Push, run the workflow, open the Pages URL.

---

## Phase 4: User Story 2 - Find problems quickly (Priority: P2)

**Goal**: mark projects with a problem, show the reason, and show them first.

**Independent Test**: make CI fail in one catalog repo. Run the update. The project is at the top with "The last CI run failed.".

### Tests for User Story 2

- [X] T017 [P] [US2] Write `status/tests/problems.test.ts` for `evaluateProblems(status, now)` and `sortRows(rows)`: `ci = failed` → `ci-failed`; `deploy.result = failed` → `deploy-failed`; oldest Renovate PR 14 days + 1 minute old → `renovate-stale`, exactly 14 days → no problem; `active` and last commit 90 days + 1 minute old → `inactive`; `maintenance` with the same date → no `inactive`; `active` with `lastCommitAt: null` → no `inactive`; `no-repo` and `unavailable` → no problems; two conditions → two problems; `key` is `<projectId>/<reason>`; `sortRows` puts rows with problems first, then sorts by `name`.

### Implementation for User Story 2

- [X] T018 [US2] Implement `evaluateProblems()` and `sortRows()` in `status/src/problems.ts` with the rules of data-model.md: "`renovate-stale`: `oldestRenovatePrAt` is more than 14 days before `now`"; "`inactive`: `status = active` and `lastCommitAt` is more than 90 days before `now`. If `lastCommitAt` is null, there is no `inactive` problem"; "A ProjectStatus with `availability` `no-repo` or `unavailable` has no problems". Make T017 pass.
- [X] T019 [US2] In `status/src/render.ts`, fill the Problems column with the problem texts of contracts/page.md (one line for each reason) and give rows with problems a visible mark. Add test cases for this to `status/tests/render.test.ts`.
- [X] T020 [US2] In `status/src/main.ts`, call `evaluateProblems()` for each status and use `sortRows()` in place of the sort by name from T016.

**Checkpoint**: US1 and US2 work. The page shows problems at the top.

---

## Phase 5: User Story 4 - Get an issue for each new problem (Priority: P2)

**Goal**: one issue in `projects` for each problem; close it when the problem stops.

**Independent Test**: quickstart.md step 3 (fail CI → one issue; run again → no second issue; repair → issue closes).

### Tests for User Story 4

- [X] T021 [P] [US4] Write `status/tests/issues.test.ts` for `parseMarker(body)`, `issueContent(problem, project, today)` and `planIssueActions(problems, openIssues, unavailableIds, today)`: new problem → one `open` action; problem with an open issue → no action; open issue without a problem → one `close` action; open issue of an `unavailable` project → no action; two problems of one project → two `open` actions; a body without a marker is ignored. `issueContent()` gives the title `<project name>: <problem text>` and the body of contracts/issue.md with the marker `<!-- status-problem: <key> -->` on line 1.

### Implementation for User Story 4

- [X] T022 [US4] Implement `parseMarker()`, `issueContent()` and `planIssueActions()` in `status/src/issues.ts` as pure functions, as specified in contracts/issue.md and data-model.md ("A problem that comes back gets a new issue"). Make T021 pass.
- [X] T023 [US4] Add the GitHub REST calls to `status/src/issues.ts`, with `GITHUB_TOKEN` and `GITHUB_REPOSITORY`: make the label `status-problem` if it does not exist; list open issues with that label (all pages); create an issue with the label; close an issue with the comment of contracts/issue.md and `state_reason: completed`.
- [X] T024 [US4] In `status/src/main.ts`, implement mode `issues`.
  - Call `evaluateProblems()` and `planIssueActions()`. Do not write the page.
  - With `--dry-run`, print the actions to stdout. Do not call the API.
  - Without `--dry-run`, do all actions. If one action fails, print the error and continue. After all actions, exit with code 1 if an action failed.

**Checkpoint**: US1, US2 and US4 work.

---

## Phase 6: User Story 3 - Know if the data is current (Priority: P3)

**Goal**: show the update time and a warning when the data is more than 48 hours old.

**Independent Test**: quickstart.md step 5.

- [X] T025 [P] [US3] Add test cases to `status/tests/render.test.ts`: the output contains `<time datetime="<ISO generatedAt>">`, and a hidden element with the text "Warning: this data is more than 48 hours old.".
- [X] T026 [US3] In `status/src/render.ts`, put `generatedAt` in a `<time datetime>` element and add the hidden warning element. Add a small inline script that shows the warning when `Date.now()` minus `generatedAt` is more than 48 hours. Without JavaScript, the page still shows the update time. Make T025 pass.

**Checkpoint**: all user stories work.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T027 [P] Write `status/README.md` in ASD-STE100: local run (`bun run start --mode page` and `bun run start --mode issues --dry-run`), the secrets and their permissions from research.md §5, and the note about the 60-day schedule limit.
- [X] T028 [P] Record the decisions of this feature outside the feature. Repo visibility (public) is in spec.md FR-017. The rule that each shared deploy workflow sets `environment: production` is in the constitution, Development Workflow (v2.1.0).
- [X] T029 Manual, in the GitHub settings of `ImreBoersma/projects`:
  - Look at the git history and `projects.yaml` for data that Principle III forbids.
  - Make the repo public. Set the Pages source to "GitHub Actions".
  - Create the fine-grained PAT of research.md §5. Save it as secret `STATUS_READ_TOKEN`.
  - Optional: ask `harmonieorkest-brummen` to approve a second PAT. Save it as `STATUS_READ_TOKEN_HOB`.
- [X] T030 Do all steps of `specs/001-project-status-page/quickstart.md` and record the results.
  - If all CI cells show Unknown, add "Checks" read access to the token.
  - Record the run time of job `build`. It must be less than 2 minutes (plan.md).
  - Find out if GitHub sends an email before it disables a scheduled workflow. Record the result in research.md §8.

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1): no dependencies.
- Foundational (Phase 2): needs Setup. Blocks all user stories.
- US1 (Phase 3): needs Foundational.
- US2 (Phase 4): needs US1 (it adds a column and the sort to `render.ts` and `main.ts`).
- US4 (Phase 5): needs Foundational and `evaluateProblems()` from T018. It does not need the US2 render changes. Mode `issues` runs in its own job (T013).
- US3 (Phase 6): needs US1 (`render.ts`).
- Polish: T027 and T028 any time. T029 before the first deploy. T030 last.

### Within Each User Story

- Write the tests first and make sure that they fail. Then implement.
- Pure functions before `main.ts` changes.

### Parallel Opportunities

- Setup: T002, T003, T004, T005 together after T001.
- Foundational: T007, T009, T010 together after T006.
- After US1: US3 (T025, T026) and US2 (T017 to T020) can run in parallel. They change different parts of `render.ts`, so merge with care.
- After T018: US4 (T021 to T024) can run in parallel with T019 and T020.

---

## Parallel Example: Foundational

```text
Task: "T007 Write status/tests/catalog.test.ts"
Task: "T009 Create status/tests/fixtures/graphql-response.json"
Task: "T010 Write status/tests/github.test.ts"
```

## Parallel Example: after US1

```text
Task: "T017 [US2] Write status/tests/problems.test.ts"
Task: "T025 [US3] Add old-data test cases to status/tests/render.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Do Phase 1 and Phase 2.
2. Do Phase 3 (US1).
3. Do T029, then run the workflow. Make sure that the public page shows the projects. Job `issues`
   does nothing until US4 is complete.
4. Stop and check the privacy test and the page source before you continue.

### Incremental Delivery

1. MVP (US1): the page shows the status.
2. US2: problems at the top. The page gets useful for quick checks.
3. US4: issues. The Maintainer gets notifications.
4. US3: old-data warning.

Each step is a separate commit or PR that you can deploy.

### Outside this feature

- `renovate.json` for this repo (Principle IV) needs the shared Renovate preset.
  Add it when that preset exists.
