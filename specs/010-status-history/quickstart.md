# Quickstart: validate the status history

## 1. Unit tests

```sh
cd status && bun test && bun run lint && bunx tsc --noEmit -p .
```

Expected: all tests pass, also the fixtures for "since" with a gap, uptime with "no data" days, the
day marks, the repair time with an `inactive` problem that does not count, a bad line and a
result in the future.

## 2. Local page with a fixture history

Make a folder `<scratchpad>/history` with 3 day files of [contracts/history-file.md](./contracts/history-file.md):
a `ci-failed` problem of 2 hours that closed, a `down` check on one day, and an open problem since
yesterday.

```sh
cd status
STATUS_READ_TOKEN=$(gh auth token) bun run start --history <scratchpad>/history --out <scratchpad>/site
```

Expected: the open problem shows `(since <yesterday>, 1 day)`; the site with the `down` check has
one `down` mark and a percentage below 100; the summary says `Average time to repair: 2 hours (1
faults, 90 days).`; the page is less than 100 KB.

## 3. First run on `main`

After the merge, the first status run makes the branch `data` with `README.md` and the first day
file. Expected: `git ls-remote --heads origin data` shows the branch; the file has 1 line; the page
says `History from <today>.`

## 4. Next runs

After 2 more runs: the day file has 3 lines; the history of `main` did not change.

## 5. A failed write (FR-009)

Not tested on purpose on `main`. The job `history` is separate from `deploy`, so the page still
deploys; the log of a failed push shows the error, and the run is marked as failed.
