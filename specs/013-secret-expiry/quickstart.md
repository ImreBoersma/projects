# Quickstart: validate the expiry of tokens and secrets

## 1. Unit tests

```sh
cd status && bun test && bun run lint && bunx tsc --noEmit -p .
```

Expected, also: catalog errors of contracts/catalog.md; earlier date wins (catalog vs token);
`never` without a read date shows nothing; problem at 30 days, warning at 31 to 60; issue text
with the steps; a gap for a workflow secret that is not listed and no gap for `GITHUB_TOKEN`;
fixture values never in the page or the issue.

## 2. Local run

Add 3 entries to a copy of the catalog: one shared secret that expires in 20 days, one project
secret in 45 days, one `never`.

```sh
cd status
STATUS_READ_TOKEN=$(gh auth token) bun run start --catalog <copy> --out <scratchpad>/site
STATUS_READ_TOKEN=$(gh auth token) bun run start --catalog <copy> --mode issues --dry-run
```

Expected: the page shows the group "Shared tokens" with a red badge, the project Expiry line with
an amber badge, nothing for `never`. The dry run lists `Open: The secret <name> expires in 20
days.` The log shows no token value.

## 3. First run on `main`

Expected: the log shows `Token STATUS_READ_TOKEN_HOB: expires 2027-11-06` (the date only); the
page shows the shared tokens; the catalog has an entry for each secret in the workflow files, so
there are 0 gaps (SC-006).
