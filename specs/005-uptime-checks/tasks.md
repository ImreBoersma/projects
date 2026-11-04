---

description: "Task list for the uptime checks on the status page"
---

# Tasks: Uptime Checks on the Status Page

**Input**: Design documents from `/specs/005-uptime-checks/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: `bun test` in `status/` for each changed module, because the check is application code
(Principle IX). The check uses an injected fetch function and an injected delay function, so the
tests make no network calls. The steps of quickstart.md validate the real run.

**Organization**: the types and the catalog rule are foundational. US1 adds the check, the
problem and the page column. US2 adds the issue rules and the hourly schedule. US3 adds the second
attempt.

**Paths**: all paths are in this repo (`ImreBoersma/projects`). Make the changes on a branch and
merge them in one PR.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependencies)
- **[Story]**: the user story of the task (US1, US2, US3)

---

## Phase 1: Setup

- [ ] T001 Create the branch `005-uptime-checks` from `main`. All code changes stay on this branch until T021.

---

## Phase 2: Foundational

**Purpose**: the new types and the catalog rule. All stories need them.

- [ ] T002 In `status/src/types.ts`: add `domain?: string | null` to `Project`; add `export type UptimeState = "up" | "down" | "no-domain" | "not-available"` and `export interface Uptime { state: UptimeState; at: Date | null }` (data-model.md: "`at` is the time of the check; it is `null` for `no-domain`"); add `uptime: Uptime` to `ProjectStatus`; add `"site-down"` to `Reason`. In `status/src/github.ts`, `emptyStatus()` and `mapRepo()` set `uptime: { state: "no-domain", at: null }`; `main.ts` replaces it after the check (T011). In `status/src/problems.ts`, add `"site-down": "The site does not respond correctly."` to `PROBLEM_TEXT` (contracts/page.md). In `status/tests/helpers.ts`, set the same default `uptime`. Run `bunx tsc --noEmit -p .` and `bun test` in `status/`.
- [ ] T003 [P] In `status/tests/catalog.test.ts`, add tests for `domain` (contracts/catalog.md): `imreboersma.nl`, `scales-imreboersma.web.app` and `harmonieorkestbrummen.nl` are accepted; an empty `domain:` gives `null`; `https://pretband.nl`, `pretband.nl/`, `pretband.nl:443`, `Pretband.nl` and `localhost` throw `Catalog error in entry 0, field \`domain\`: must be a host name, for example example.org, or empty.` Then in `status/src/catalog.ts`, read `domain` and validate it with the regex `^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$` (research.md §8). Return `domain` (string or `null`). Make the tests pass. Run `bun run start --mode page --out <scratchpad>/site` on the real `projects.yaml` to make sure that the 4 current domains pass.

**Checkpoint**: the types compile, the catalog accepts the real domains and rejects the bad ones.

---

## Phase 3: User Story 1 - See if each site is up (Priority: P1) 🎯 MVP

**Goal**: each row shows Up, Down, No domain or Check not available, with the time. A site that is
down is a problem.

**Independent Test**: quickstart.md §2: a catalog copy with a domain that does not respond shows
"Down HH:MM" and the problem; the real sites show "Up HH:MM".

- [ ] T004 [P] [US1] Create `status/tests/uptime.test.ts` with tests for `checkAll(projects, now, options)` of `status/src/uptime.ts`. `options` has `fetch` (same signature as the global `fetch`), `delay(ms)` and `timeoutMs`. Use a fake `fetch` that gives a result for each URL. Cases: status 200 gives `up`; status 503 gives `down`; a rejected promise (TLS or DNS error) gives `down`; a project without `domain` gives `no-domain` with `at: null`; an archived project is not in the result and is not fetched (FR-002); the URL is `https://<domain>/`, with `redirect: "follow"` and the header `User-Agent: ImreBoersma-projects-status-check`; with 2 or more domains that are all down, each checked project gives `not-available` (FR-008); with 1 domain that is down, the result is `down` (research.md §5); `at` is `now` for each checked domain.
- [ ] T005 [US1] Create `status/src/uptime.ts` with `checkAll()` of T004. One attempt: `fetch(url, { redirect: "follow", headers, signal: AbortSignal.timeout(options.timeoutMs) })`; "up" only when `response.ok`; do not read the body; catch each error as "down" (research.md §3). Check all domains at the same time with `Promise.all`. Defaults for the real run: the global `fetch`, `timeoutMs: 10_000`, and `delay` with `Bun.sleep`. Return a `Map<string, Uptime>` keyed by project id. Make T004 pass.
- [ ] T006 [P] [US1] In `status/tests/problems.test.ts`, add tests: a row with `uptime.state = "down"` gets the problem `{ reason: "site-down", key: "<id>/site-down" }`, also when `availability` is `no-repo` or `unavailable` (research.md §6); `up`, `no-domain` and `not-available` give no `site-down` problem; the other problems of an `ok` row stay as before.
- [ ] T007 [US1] In `status/src/problems.ts`, change `evaluateProblems()`: compute the `site-down` problem from `s.uptime` before the `availability` check, and add the repo problems only when `availability` is `ok`. Make T006 pass.
- [ ] T008 [P] [US1] In `status/tests/render.test.ts`, add tests (contracts/page.md): the header has the column "Site" after "Problems" and before "Last commit"; the cell texts are `Up HH:MM`, `Down HH:MM`, `No domain` and `Check not available`; a `no-repo` row shows its Site value and "No repo" in the other data columns; the text `certificate has expired` does not occur in the output when a fixture has it in a field that is not rendered.
- [ ] T009 [US1] In `status/src/render.ts`, add the column "Site" of contracts/page.md. The time is `HH:MM` of `uptime.at` in UTC. Make T008 pass.
- [ ] T010 [US1] In `specs/001-project-status-page/contracts/page.md` and `specs/001-project-status-page/contracts/catalog.md`, add one line under the title: "Spec 005 changes this contract: see `specs/005-uptime-checks/contracts/page.md`" (or `catalog.md`).
- [ ] T011 [US1] In `status/src/main.ts`, call `checkAll(projects, now)` after `fetchStatuses()` and before `evaluateProblems()`, in both modes. Set `s.uptime` from the map. Log one line for each checked domain: `Site <domain>: Up`, `Down` or `Check not available`, with no error text (research.md §9). Run `bun test`, `bun run lint` and `bunx tsc --noEmit -p .`.
- [ ] T012 [US1] Validate quickstart.md §2 and §4 with a catalog copy in the scratchpad. Do not change `projects.yaml`.

**Checkpoint**: the page shows the site state of each project, and a site that is down is a problem.

---

## Phase 4: User Story 2 - Get an issue when a site is down (Priority: P1)

**Goal**: one issue for each site that is down, closed when the site is up, and no change when the
check is not available.

**Independent Test**: quickstart.md §3: the dry run of the issues mode plans one open for the test
domain and no close of a `site-down` issue.

- [ ] T013 [P] [US2] In `status/tests/issues.test.ts`, add tests for `planIssueActions()`: a `site-down` problem without an open issue gives one open with the title `<name>: The site does not respond correctly.`; an open `site-down` issue and the same problem give no open; an open `site-down` issue and no problem give a close; an open `site-down` issue of a project with `availability: "unavailable"` and uptime `up` gives a close (the repo data rule must not keep it); with the check not available, an open `site-down` issue stays open; with the check not available, a `ci-failed` issue without the problem still closes.
- [ ] T014 [US2] In `status/src/issues.ts`, change `planIssueActions()`: add the parameter `uptimeNotAvailable: boolean`. Keep an open issue when its key ends with `/site-down` and `uptimeNotAvailable` is true. For other keys, keep the rule of `unavailableIds`. Do not use `unavailableIds` for `site-down` keys. Make T013 pass.
- [ ] T015 [US2] In `status/src/main.ts`, `reconcileIssues()` passes `uptimeNotAvailable` (true when a result of `checkAll()` is `not-available`). Run quickstart.md §3 with `--dry-run` only.
- [ ] T016 [US2] In `.github/workflows/status-page.yml`, change the cron from `0 5,17 * * *` to `17 * * * *` (research.md §2). Run actionlint.

**Checkpoint**: issues follow the site state, and a runner network problem changes no issues.

---

## Phase 5: User Story 3 - Do not get issues for short errors (Priority: P2)

**Goal**: one failed request that the second attempt repairs gives "Up".

**Independent Test**: the unit tests of T017 with a fake fetch that fails one time.

- [ ] T017 [P] [US3] In `status/tests/uptime.test.ts`, add tests: a fake fetch that fails the first request and gives 200 on the second gives `up`, and `delay` was called one time with `5000`; a fetch that fails both times gives `down` after two requests; a site that is up at the first attempt makes one request and no delay.
- [ ] T018 [US3] In `status/src/uptime.ts`, after a failed attempt, call `options.delay(5000)` and try one more time (FR-004, research.md §4). Make T017 pass. Run `bun test`, `bun run lint` and `bunx tsc --noEmit -p .`.

**Checkpoint**: short errors give no issue.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T019 Run the full local page once more on the real catalog (quickstart.md §2 without the test entry). Make sure that the 4 real sites show "Up" and that the run takes less than 1 minute more than before.
- [ ] T020 Push the branch and open the PR into `main`. CI (`status-page.yml` build, actionlint) must pass.
- [ ] T021 Ask the Maintainer to merge the PR, because a merge to `main` deploys the page.
- [ ] T022 After the merge, validate quickstart.md §5: `status-page.yml` runs each hour, and the live page shows the column "Site" with "Up" for the 4 sites.
- [ ] T023 [P] Add §10 "Validation results" to `specs/005-uptime-checks/research.md`: the local run of T012 and T019, the dry run of T015, and the first scheduled runs of T022, with dates.
- [ ] T024 [P] In `PLAN.md`, mark feature 005 as done in the Done list and in the feature table. Note that the status page now runs each hour.

---

## Dependencies & Execution Order

- **Setup (T001)** first.
- **Foundational (T002–T003)**: T002 first, because T003 and all stories use the new types. T003 after T002.
- **US1 (T004–T012)**: needs Phase 2. T004, T006 and T008 can run in parallel (different test files). T005 after T004, T007 after T006, T009 after T008. T011 needs T005 and T007. T010 can run at any time.
- **US2 (T013–T016)**: needs T011. T013 and T016 can run in parallel. T014 after T013, T015 after T014.
- **US3 (T017–T018)**: needs T005. Independent of US2. T018 changes `uptime.ts`, so it comes after T005.
- **Polish (T019–T024)**: after all stories. T022 needs the merge (T021).

## Parallel Example: US1 tests

```text
status/tests/uptime.test.ts     (T004)
status/tests/problems.test.ts   (T006)
status/tests/render.test.ts     (T008)
```

## Implementation Strategy

1. **MVP (US1)**: the page shows if each site is up. The Maintainer sees a site that is down at
   the next look at the page.
2. **US2**: issues and the hourly schedule. The Maintainer gets a notification within 2 hours.
3. **US3**: the second attempt removes issues for short errors.

All three go in one PR, because the hourly schedule without the second attempt can open issues for
short errors.
