# Quickstart: validate the uptime checks

## 1. Unit tests

```sh
cd status && bun test && bun run lint
```

Expected: all tests pass, also `uptime.test.ts` (first attempt fails and second passes gives Up;
both fail gives Down; all down gives Check not available).

## 2. Local page with a site that is down (US1)

Make a catalog copy in the scratchpad with one more entry:

```yaml
  - id: test-down
    name: Test down
    repo:
    status: active
    domain: does-not-exist.imreboersma.nl
```

```sh
cd status
STATUS_READ_TOKEN=$(gh auth token) bun run start --catalog <copy> --out <scratchpad>/site
```

Expected: the row "Test down" is first, with "Down HH:MM" and the problem "The site does not respond
correctly." The four real sites show "Up". The row of a project without a domain shows "No
domain".

## 3. Issue rules (US2)

```sh
STATUS_READ_TOKEN=$(gh auth token) GITHUB_TOKEN=$(gh auth token) bun run start --catalog <copy> --mode issues --dry-run
```

Expected: `Open: Test down: The site does not respond correctly.` and no close of a `site-down`
issue. Do not run without `--dry-run` with the test catalog.

## 4. Catalog rule (FR-009)

Set `domain: https://pretband.nl` in the copy. Expected: the run stops with the catalog error of
[contracts/catalog.md](./contracts/catalog.md).

## 5. Schedule

After the merge, make sure that `status-page.yml` runs each hour (`gh run list --workflow
status-page.yml`), and that the page shows "Last update" of less than 2 hours ago.
