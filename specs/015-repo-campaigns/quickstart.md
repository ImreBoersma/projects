# Quickstart: validate the campaigns

## 1. Unit tests

```sh
cd status && bun test && bun run lint && bunx tsc --noEmit -p .
```

Expected, also: parser errors of data-model.md; `applyChanges` for write, replace, already done,
old text missing, file missing; the PR plan for no PR / open / closed / closed with reopen; the
classification of contracts/page.md; the repo choice of `secret-set`.

## 2. Dry run against the real repos

Write `campaigns/test-readme.yaml` with `repos: [scales-exercises, boek-de-bus]` and one
`replace` in `README.md` that adds one line.

```sh
cd status && bun run campaign test-readme --dry-run
```

Expected: 2 lines `would open`, each with a diff of `README.md`; no branch in either repo.

## 3. Real run, second run, close

```sh
bun run campaign test-readme
bun run campaign test-readme
```

Expected: first run `opened #n` for both; second run `up to date #n` with 0 new PRs and no new
commit (SC-003). The local status run shows the section "Campaigns" with `2 open`. Close both PRs and
delete the branches; the campaign shows `Done` and then goes away after 7 days.

## 4. Secret command

```sh
bun run secret-set NOT_A_SECRET     # stops: not in the catalog
```

Real use is the next rotation (2027-11); no test value is set in a real repo.
