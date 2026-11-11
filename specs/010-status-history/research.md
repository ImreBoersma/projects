# Research: Status History on a Data Branch

## 1. File format

**Decision**: one file for each day (UTC), `history/YYYY-MM-DD.ndjson` (newline-delimited JSON):
one JSON object on each line, one line for each run (contracts/history-file.md).

**Rationale**: a run only appends one line, so two writes never change the same line, and a line
that cannot be read can be skipped without loss of the other lines (spec edge case). The files
are readable in the GitHub web view and in a diff.

**Alternatives**: one JSON array for each day. Rejected: each run rewrites the full file, and one
bad write makes the full day unreadable. SQLite on the branch. Rejected: binary, no diff.

## 2. Where the history is read and written

**Decision**:

- Job `build` (also for pull requests): `git fetch --depth=1 origin data` and read the day files of
  the last 90 days from that commit with `git show` or a worktree. When the branch does not exist,
  start with no history. Add the result of this run in memory, make the page, and write the result
  line to `_history/line.ndjson` as the artifact `history`.
- Job `history` (new, `needs: build`, not for pull requests): download the artifact to
  `$RUNNER_TEMP/history`, outside the work tree, so that `git rm -rf .` (new branch) and
  `git reset --hard` (retry) cannot remove it; then check out `data` (or make it as an
  orphan branch with a README when it does not exist), append the line to the day file of the time
  of the result, commit as `github-actions[bot]`, and push. When the push fails because `data`
  changed, fetch again, append again, and push one more time.

**Rationale**: the page always uses the result of this run. The write is a separate job, so a
failed push does not stop job `deploy` (FR-009), and the run still fails, so the Maintainer gets a
notification. The workflow concurrency group (`status-page-${{ github.ref }}`, no cancel) runs the
runs of `main` one after the other, so two writers at the same time are not probable; the retry
covers the rest.

**Alternatives**: write in job `build`. Rejected: a push error would stop the page.

## 3. Permissions

**Decision**: job `history` gets `contents: write`; it only pushes to `data`. Job `build` keeps
`contents: read`. No new secret: `GITHUB_TOKEN` can push to a branch of its own repo.

**Note**: a push with `GITHUB_TOKEN` starts no workflow, so a push to `data` cannot start the
status page again. `status-page.yml` has no trigger on `data` anyway.

## 4. Calculations (FR-005 to FR-007)

- **Since** (US2): for a problem key that is open in this run, go back through the results by time.
  A result in which the project is present and the key is missing ends the search. A result
  without the project (no data, or no run) does not end it. "Since" is the time of the oldest
  result in that row. When the row goes back to the first result of the history, show "since
  <date> or before" (contracts/page.md, T011; the first idea "(history from <date>)" was not used).
- **Uptime** (US3): for the last 30 days (today and 29 days before, UTC), count the results with
  site state `up` and `down`. Percentage = up / (up + down), with one decimal. No checks: "No data".
- **Day mark** (US3): `down` when the day has at least 1 `down`, else `up` when it has at least 1
  `up`, else `no-data`.
- **Repair time** (US4): for the fault keys (`site-down`, `ci-failed`, `deploy-failed`,
  `cert-expiring`), make the periods: from the first result with the key to the first later
  result in which the project is present without the key. Count the periods that ended in the
  last 90 days. Average = mean of their durations.

## 5. Page size (SC-005)

**Decision**: the page gets only the calculated values (a percentage, 30 marks, a time) for each
project, not the results. 30 marks × 11 projects stays below 10 KB of HTML.

## 6. Times and the clock

**Decision**: each result has an ISO time in UTC from the runner. Results are sorted by time. A
result more than 10 minutes in the future is ignored with a log line (spec edge case).

## 7. Validation results

| Check | Date | Result |
|---|---|---|
| Write script (T007), local, `bash -e` | 2026-11-05 | Against a temporary bare repo: the first run made `data` with only `README.md` and `history/`; the second run appended a line; `main` did not change. The first version failed on the orphan branch (`git rm` without `-f`) and wrote only the date in the commit message; both fixed before the PR. |
| First runs on `main` (T022) | 2026-11-05 | Run 42056913952 (push of the merge) made `data` with `README.md` and `history/2026-11-05.ndjson`; runs 42057126903 and 42057259056 appended lines 2 and 3. `origin/main` stayed at the merge commit 490b0a5. The live page says "History from 2026-11-05.", 100.0% for the 4 sites, and "No repaired faults in the last 90 days." |
| Local page with a fixture history (T019) | 2026-11-05 | 3 days of fixture results: hob.nl 98.6% with 1 `down` day, the other sites 100%, "History from 2026-11-02", average repair time 1.5 hours (2 faults). Page 16 KB. The new line has only `time`, `projects`, `site` and `problems`. |

