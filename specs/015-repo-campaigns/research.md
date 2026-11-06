# Research: Changes in All Repos at Once (Campaigns)

## 1. How the command changes a repo

**Decision**: GitHub API only, no clone. For each target repo:

1. Read the default branch and its head commit.
2. Read each file that the campaign changes, from that commit (`404` = the file does not exist).
3. Apply the changes in memory (§2). No difference: "not needed".
4. Write the changed files as one commit with the Git Data API (blobs, tree with the head commit as
   base, commit with the head commit as parent).
5. Set the branch `campaign/<id>` to that commit (make it, or force-update it).
6. Open the PR when there is none for that branch, else leave the PR (its content follows the
   branch).

The token is `gh auth token` of the Maintainer (FR-006).

**Rationale**: fixed file changes (clarification 2026-11-06) need no checkout. Each run starts
from the current default branch, so a second run gives the same commit content (SC-003), and a
change of the campaign updates the open PR (US1 scenario 3). One commit for all files keeps the
PR clean.

**Alternatives**: clone each repo and use `git`. Rejected: slower, local state, and not necessary
for fixed changes. The contents API (`PUT /contents`) for each file. Rejected: one commit for each
file.

## 2. The change function

**Decision**: `applyChanges(files, changes)` with `files: Map<path, string | null>`. Change kinds:

- `write`: set the full content of `path` (makes the file when it does not exist).
- `replace`: in `path`, replace each occurrence of `old` with `new`. When `old` is not found and
  `new` is found: no change ("already done"). When neither is found: fail with the path. When the
  file does not exist: fail.

The result: `needed` with the new files, `not-needed`, or `failed` with the reason. Pure, so it
has full unit tests, and the status run uses it read-only (§3).

## 3. "Not needed" without stored results

**Decision**: the status run applies the same function to the files of each target repo that has
no campaign PR. Difference → "to do" (the command did not run or failed for that repo); no
difference → "not needed". The status run reads the files with its read tokens (`Contents:
read`).

**Rationale**: no result file to commit, and the page is correct also after a change to a repo by
hand.

## 4. Labels and repos of other owners

**Decision**: the identity of a campaign PR is its branch `campaign/<id>`. The command adds the
label `campaign` to the PR in the own repos (and makes the label there when missing). In a repo of
another owner it adds the label only when it exists; it never makes a label there (constitution:
no setting changes in repos of another owner). The page links to a GitHub search by branch:
`https://github.com/pulls?q=is:pr+head:campaign/<id>+user:ImreBoersma+user:harmonieorkest-brummen`.

The spec (FR-002, FR-007) uses this since the analysis of 2026-11-06.

## 5. A closed PR, reopen, and a merged PR

**Decision**: when the branch has a closed PR (not merged), the command reports "closed" and does
nothing for that repo, unless the option `--reopen <catalog id>` is given: then it updates the
branch and reopens that PR. When the PR is merged: a needed change (the campaign changed after the
merge) sets the branch to a new commit on the current default branch and opens a new PR; no
needed change gives "merged". `findPr` takes the newest PR of the branch.

## 6. CI result of a PR

**Decision**: the status run reads `statusCheckRollup` of the head commit of each campaign PR (the
same field as spec 001). `FAILURE`/`ERROR` → "failed CI"; no rollup → "no CI" (not failed).

## 7. Renovate and dependencies

**Decision**: no code check. The contract of the campaign file says that dependency versions are
for Renovate (Principle IV). A check would need a parser for each lock file format; the
Maintainer writes each campaign, so the text is enough.

## 8. The secret command

**Decision**: `bun run secret-set <NAME>`: read the catalog list of spec 013, take the entries with
that name and kind `actions-secret`, show the repos, ask "Value (not shown):" with the terminal
echo off (raw mode on stdin), then for each repo run `gh secret set <NAME> -R <repo>` with the
value on stdin. Then list the repos with the result. The value is never in an argument, a file or
a log line. Kind `environment-secret` is not supported (the environment name is not in the
catalog); the command says so.

**Rationale**: `gh secret set` encrypts the value for each repo; no own encryption code.

## 9. Validation results

| Check | Date | Result |
|---|---|---|
| Unit tests, lint, types (T019) | 2026-11-06 | 258 tests pass (baseline 230); Biome and `tsc` clean. |
| Dry run (T020) | 2026-11-06 | `campaigns/test-readme.yaml` (a new file `CAMPAIGN-TEST.md`, so no existing content changes) for scales-exercises and boek-de-bus: 2 lines `would open` with the diff, 3 seconds, no branch in either repo after the run. Local page: section "Campaigns" with "2 to do". |
| Found in the implementation | 2026-11-06 | (1) Side note: a re-run force-updated a campaign branch and so removed hand fixes; now the command updates a branch only when it has exactly its own commit, else `changed by hand` (`--overwrite` to force). (2) `secret-set` needs a terminal: a value from a pipe is refused, so it cannot come from the shell history. (3) T013: a campaign that started more than 180 days ago is not read (simpler than "done and old": proving "done" needs the requests that the rule saves). |

