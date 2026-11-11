---

description: "Task list for the status history on a data branch"
---

# Tasks: Status History on a Data Branch

**Input**: Design documents from `/specs/010-status-history/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: `bun test` in `status/` with fixtures of results, for each calculation of research.md §4
and for the parse of a day file, because this is application code (Principle IX). The steps of
quickstart.md validate the real runs.

**Organization**: the result format and the store are foundational. US1 writes the history (new
job), US2 adds "since", US3 the uptime and the bar, US4 the repair time.

**Paths**: all paths are in this repo (`ImreBoersma/projects`). Make the changes on a branch and
merge them in one PR. The branch `data` is made by the first run after the merge.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependencies)
- **[Story]**: the user story of the task (US1, US2, US3, US4)

---

## Phase 1: Setup

- [X] T001 Create the branch `010-status-history` from `main`. All code changes stay on this branch until T022.

---

## Phase 2: Foundational

**Purpose**: the result format, its parse, and the read of the history.

- [X] T002 In `status/src/types.ts`, add `HistoryResult` of `specs/010-status-history/data-model.md` (`time: string`; `projects: Record<string, { site: "up" | "down" | "no-domain" | "not-available"; problems: string[] }>`), and the history values: on `ProjectStatus` `history: { since: Record<string, string>; sinceIsHistoryStart: string[]; uptime: { percent: number | null; days: ("up" | "down" | "no-data")[] } | null }`; on `StatusPage` `historyStart: string | null` and `repair: { averageMs: number; count: number } | null`. Set empty defaults in `status/src/github.ts` `emptyStatus()`, `status/tests/helpers.ts`, `status/src/main.ts` and `status/tests/render.test.ts`. Run `bunx tsc --noEmit -p .` and `bun test`. Done: the `StatusPage` fields are optional, and `ProjectHistory` has `uptimeEnd` (the last day of the bar) for the dates in the mark titles.
- [X] T003 [P] Create `status/tests/history-store.test.ts` and `status/src/history/store.ts` with the pure functions `parseDay(text: string, now: Date): { results: HistoryResult[]; skipped: number }` (one JSON object for each line, contracts/history-file.md; skip an empty line, a line that is not valid JSON, a line without a valid ISO `time`, and a result more than 10 minutes after `now`; research.md §6) and `resultLine(result: HistoryResult): string` (one line of JSON with `\n`, only the fields of the data model). Tests: 3 valid lines; a broken line between 2 valid lines gives 2 results and `skipped: 1`; a result in the future is skipped; `resultLine()` of a result with an extra field does not write that field.
- [X] T004 In `status/src/history/store.ts`, add `readHistory(dir: string, now: Date, days = 90): Promise<{ results: HistoryResult[]; start: string | null }>`: read the files `YYYY-MM-DD.ndjson` of the last `days` days (UTC) that exist in `dir`, parse them with `parseDay()`, sort the results by time, and log the number of skipped lines. `start` is the date of the oldest file in `dir` (also older than 90 days), or `null`. A missing `dir` gives no results. Add a test with a temporary folder.
- [X] T005 In `status/src/main.ts`: add the argument `--history <dir>` (default: no history). Make the result of this run (`HistoryResult` from the statuses: `site` from `s.uptime.state`, `problems` from the keys of `s.problems`, only projects that are not archived), read the history, and append the result in memory. In page mode, write `resultLine()` of this run to `--history-out <file>` when that argument is set. Run `bun test`, `bun run lint` and `bunx tsc --noEmit -p .`.

**Checkpoint**: a run can read a history folder and write its result line.

---

## Phase 3: User Story 1 - Each update is kept (Priority: P1) 🎯 MVP

**Goal**: each run appends its result to the day file on `data`; `main` does not change.

**Independent Test**: quickstart.md §3 and §4: after 3 runs, the day file has 3 lines and `main` has no new commits.

- [X] T006 [US1] In `.github/workflows/status-page.yml`, job `build`: before `bun run start --mode page`, fetch the history with `git fetch --depth=1 origin data:refs/remotes/origin/data` and check it out to `../_data` with `git worktree add --detach ../_data origin/data`; both steps may fail (no branch yet) without failing the job (use `|| true` and a log line). Run the page with `--history ../_data/history --history-out ../_history/line.ndjson`. Upload `_history` as the artifact `history` (`if-no-files-found: error`, only when not a pull request).
- [X] T007 [US1] In `.github/workflows/status-page.yml`, add job `history`: `needs: build`, `if: github.event_name != 'pull_request'`, `permissions: contents: write`, no `working-directory` default for its steps. Steps: checkout with `fetch-depth: 0`; download the artifact `history` to `${{ runner.temp }}/history` (outside the work tree, because `git rm -rf .` and `git reset --hard` would remove a file in it); fail the job when `$RUNNER_TEMP/history/line.ndjson` is missing or empty; a step that checks out `data` (`git checkout data`) or, when it does not exist, makes it (`git checkout --orphan data`, `git rm -rf .`, a `README.md` with the text of contracts/history-file.md "README" rule in ASD-STE100); append the line from `$RUNNER_TEMP/history/line.ndjson` to `history/<date of the result>.ndjson` (date from the `time` field); commit as `github-actions[bot]` with the message `chore: add the status result of <time>`; push; when the push fails, `git fetch origin data`, `git reset --hard origin/data`, append again, commit and push one more time (research.md §2). A second failure fails the job. Job `deploy` does not need `history` (FR-009). Run actionlint. Done: tested locally with `bash -e` (research.md §7).
- [X] T008 [US1] In `.github/workflows/status-page.yml`, make sure that no trigger reacts to the branch `data` (the `push` trigger has `branches: [main]`), and add a comment that a push with `GITHUB_TOKEN` starts no workflow (research.md §3).

**Checkpoint**: each run of `main` stores its result.

---

## Phase 4: User Story 2 - See how long a problem is open (Priority: P1)

**Goal**: each problem shows since when it is open.

**Independent Test**: a fixture with a problem in 3 runs in a row shows the time of the first.

- [X] T009 [P] [US2] Create `status/tests/history-stats.test.ts` with tests for `since(results, projectId, key)` of `status/src/history/stats.ts` (research.md §4): a key in 3 results in a row gives the time of the first; a result where the project is present without the key ends the row; a result without the project (gap) does not end it; a key only in the last result gives that time; a row back to the first result gives `atHistoryStart: true`; a project id that changes ("a" in earlier results, "b" in later results) gives "b" no "since" from the results of "a" (spec edge case).
- [X] T010 [US2] Create `status/src/history/stats.ts` with `since()` of T009. In `status/src/main.ts`, set `s.history.since` and `s.history.sinceIsHistoryStart` for each open problem. Make T009 pass.
- [X] T011 [US2] In `status/tests/render.test.ts`, add tests of contracts/page.md "Problems cell": `(since 14:00)` for today; `(since 2026-11-03, 2 days)`; `(since 2026-11-05 or before)` at the history start; no text without history. Then change `status/src/render.ts`. Make the tests pass.

**Checkpoint**: the Maintainer sees how old each problem is.

---

## Phase 5: User Story 3 - See the uptime of each site (Priority: P2)

**Goal**: percentage and bar of 30 days for each site.

**Independent Test**: a fixture with 1 `down` check on one day gives one `down` mark and a percentage below 100.

- [X] T012 [P] [US3] In `status/tests/history-stats.test.ts`, add tests for `uptime(results, projectId, now)`: 23 `up` and 1 `down` give 95.8; only `no-domain` or `not-available` gives `percent: null`; `days` has 30 entries old to new; a day with 1 `down` and 23 `up` is `down`; a day with only `up` is `up`; a day without results is `no-data`; results older than 30 days do not count.
- [X] T013 [US3] Implement `uptime()` in `status/src/history/stats.ts`, and set `s.history.uptime` in `status/src/main.ts` for each project with a domain. Make T012 pass.
- [X] T014 [US3] In `status/tests/render.test.ts`, add tests of contracts/page.md "Site cell": `95.8% (30 days)`; `No data (30 days)`; 30 marks with the classes `up`, `down`, `no-data` and a `title` with the date; the `aria-label` with the numbers of down days and days without data; mark colour tokens in `:root` and in the dark scheme; nothing for a project without a domain. Then change `status/src/render.ts`. Make the tests pass. Make sure that the card layout of spec 007 still has no horizontal scroll at 360 pixels (the bar wraps or shrinks). Done: the bar is 180 pixels wide and wraps, so it fits at 360 pixels.

**Checkpoint**: stakeholders see the uptime of each site.

---

## Phase 6: User Story 4 - See the average time to repair (Priority: P3)

**Goal**: the average time to repair of the faults of 90 days.

**Independent Test**: fixtures with closed faults of 2 and 6 hours give 4 hours.

- [X] T015 [P] [US4] In `status/tests/history-stats.test.ts`, add tests for `repairTime(results, now)`: periods of `ci-failed` of 2 hours and `site-down` of 6 hours give `averageMs` of 4 hours and `count: 2`; a closed `inactive` problem of 20 days does not count (spec clarification); an open fault does not count; a fault that closed more than 90 days ago does not count; no closed faults give `null`.
- [X] T016 [US4] Implement `repairTime()` in `status/src/history/stats.ts` (fault keys end with `/site-down`, `/ci-failed`, `/deploy-failed` or `/cert-expiring`), set `page.repair` and `page.historyStart` in `status/src/main.ts`. Make T015 pass.
- [X] T017 [US4] In `status/tests/render.test.ts`, add tests of contracts/page.md "Summary line": `Average time to repair: 4 hours (2 faults, 90 days).`; minutes under 1 hour; days over 48 hours; `No repaired faults in the last 90 days.`; `History from <date>.` Then change `status/src/render.ts`. Make the tests pass. Done: under 10 hours the time has one decimal ("1.5 hours").

**Checkpoint**: the page shows the repair time.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T018 [P] In `specs/005-uptime-checks/spec.md` Assumptions, change "This feature does not measure response time or calculate an uptime percentage." to say that spec 010 adds the percentage. In `specs/001-project-status-page/contracts/page.md`, add a pointer line to `specs/010-status-history/contracts/page.md`.
- [X] T019 Validate quickstart.md §1 and §2 with a fixture history folder in the scratchpad. Make sure that the page is less than 100 KB (SC-005) and that the stored line contains only the fields of the data model (FR-008). Done 2026-11-05: research.md §7.
- [X] T020 Push the branch and open the PR into `main`. CI must pass. The PR run does not store a result (job `history` does not run for a pull request). Done 2026-11-05: #17.
- [X] T021 Ask the Maintainer to merge the PR. Done 2026-11-05: the Maintainer merged #17.
- [X] T022 After the merge, validate quickstart.md §3 and §4: the branch `data` exists with `README.md`; after 3 runs the day file has 3 lines; `git log origin/main` has no commits from the history; the page says `History from <today>.` Record the results in `specs/010-status-history/research.md` §7. Done 2026-11-05: research.md §7.
- [X] T023 [P] In `PLAN.md`, mark spec 010 as done in the feature table and the Done list. Done.

---

## Dependencies & Execution Order

- **Setup (T001)** first.
- **Foundational (T002–T005)**: T002 first; T003 after T002; T004 after T003; T005 after T004.
- **US1 (T006–T008)**: needs T005. One file (`status-page.yml`), so one after the other.
- **US2 (T009–T011)**, **US3 (T012–T014)**, **US4 (T015–T017)**: each needs Phase 2. The test tasks T009, T012 and T015 change the same file (`history-stats.test.ts`): T009 is `[P]` with the US1 tasks; do T012 and T015 one after the other. The implementation tasks share `stats.ts`, `main.ts` and `render.ts`: one after the other.
- **Polish (T018–T023)**: after all stories. T022 needs the merge.

## Parallel Example

```text
status/src/history/store.ts + test     (T003)
.github/workflows/status-page.yml      (T006–T008, after T005)
status/tests/history-stats.test.ts     (T009)
```

## Implementation Strategy

1. **MVP (US1)**: store each result. The data starts to grow from the day of the merge; each later
   story uses it.
2. **US2**: "since", the most used value for the Maintainer.
3. **US3 and US4**: uptime and repair time; they become useful after some days of history.

All four go in one PR.

---

## Phase 8: Convergence

From the review of 2026-11-11 (code checked against spec, plan and tasks).

- [ ] T024 Store the keys of the checks without data in the result line (repo data unavailable, site check not-available, `keepKeys`), or mark them as unknown, and make `since()` and `repairTime()` (`status/src/history/stats.ts`) skip them, so that one failed read does not reset "Started" or add a short repair per FR-005, FR-007 (contradicts)
- [ ] T025 In `.github/workflows/status-page.yml` "Get the stored results", tell a missing branch `data` apart from a failed fetch (`git ls-remote`); on a failed fetch, warn and do not write "History from <today>" per Edge Cases (partial)
