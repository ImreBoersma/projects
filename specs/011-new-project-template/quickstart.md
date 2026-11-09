# Quickstart: New-Project Template and Onboarding

## 1. Tests

```bash
cd status && bun run css && bun test && bun run lint && bunx tsc --noEmit -p .
```

Expected: all pass, including `template.test.ts` (R1 to R5 for the 5 CI variants) and
`size.test.ts` (the 20-site worst case < 30 KB gzip; record the number).

## 2. Template rule check in CI

In a branch, remove `permissions` from `template/ci/pages.yml`. Push. Expected: the build job of
`status-page.yml` fails with R3 in the test name. Do not merge.

## 3. Dry run

```bash
cd status && bun run new-project --id template-test --name "Template test" \
  --repo template-test --visibility public --stack Vite --host pages --dry-run
```

Expected: 4 steps, the table with `BOARD_TOKEN`, "Dry run: no change."; no repo, no branch.

Repeat with `--id beter-dan-de-midi`: expected "is in the catalog", exit code 1.

## 4. Real run (Maintainer approves; it makes a repo)

Run step 3 without `--dry-run`. Expected:

- `ImreBoersma/template-test` exists with one commit, `bun.lock`, the Pages CI variant and the
  board caller; issues on, vulnerability alerts on, security fixes off.
- Pages is on with the source GitHub Actions; the CI run passes (lint and build) and the deploy
  passes.
- A PR in `projects` adds the project and a `BOARD_TOKEN` entry with the date of the other
  `BOARD_TOKEN` entries.

Run the conformance rules on the test repo (one-off: `readFacts` then `checkRepo` of
`status/src/conformance/`). Expected: R1 to R8 pass; R9 fails only for `BOARD_TOKEN` until it is
set (SC-002). Record the time from the start of the command to the open PR (SC-003: < 5 minutes).

Run the same command again. Expected: `check`, `repo`, `settings` and `catalog` show `[done]`; no
second repo or PR.

Interrupt test: stop the network after `repo` (or kill the command), run again; it continues at
`settings`.

Clean up: close the PR, delete `new-project/template-test`, archive or delete the test repo (the
Maintainer does this).

## 5. Dialog

Open the status page, press ⌘K, type "new", Enter. Fill id `beter-dan-de-midi`: expected "This id
is in the catalog.". Fill valid values and click "Copy command"; paste in a terminal with
`--dry-run`: expected the same values as typed. Record the time from ⌘K to the copied command
(SC-006: < 1 minute).

## 6. Record

Write the results in a table "Validation results" at the end of `research.md`.
