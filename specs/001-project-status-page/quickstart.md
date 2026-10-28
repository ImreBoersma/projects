# Quickstart: validate the project status page

## Prerequisites

- The `projects` repo is public. Pages source is "GitHub Actions".
- `projects.yaml` exists with a minimum of 3 entries: one `active` with a repo, one `archived`, one
  without a repo.
- Secret `STATUS_READ_TOKEN` is set (permissions in [research.md §5](./research.md)).
- Bun is installed locally.

## 1. Unit tests and lint

```sh
cd status
bun install
bun test
bunx biome check .
```

Expected: all tests pass, no lint errors.

## 2. Local dry run

```sh
cd status
STATUS_READ_TOKEN=<token> bun run src/main.ts --mode page --out ../_site
STATUS_READ_TOKEN=<token> bun run src/main.ts --mode issues --dry-run
```

Expected:

- `_site/index.html` exists. It shows the `active` and the no-repo project. It does not show the
  `archived` project (US1).
- The CI column shows Passed or Failed, not Unknown, for a repo with CI. If all rows show Unknown,
  add "Checks" read access to the token (research.md §5).
- `--mode issues --dry-run` writes the issue actions to stdout and does not change issues.

## 3. Problem and issue cycle (US2, US4)

1. In a test repo of the catalog, push a commit to `main` that makes CI fail.
2. Start the workflow manually (Actions → status-page → Run workflow).
3. Expected: the page shows the project at the top with "The last CI run failed.". One issue with
   the label `status-problem` opens.
4. Start the workflow again. Expected: no second issue.
5. Repair CI. Start the workflow. Expected: the issue closes with a comment.

## 4. Catalog error (FR-015)

1. On a branch, change one `status` to `paused`. Push and start the workflow on that branch.
2. Expected: the run fails with the entry index and the field. The public page does not change.

## 5. Old data (US3)

1. Open the page with the browser time set 3 days later than the update time.
2. Expected: the 48-hour warning shows.

## 6. Privacy (FR-018)

1. Open the page source and the problem issues.
2. Expected: no commit messages, PR titles or branch names of private repos.
