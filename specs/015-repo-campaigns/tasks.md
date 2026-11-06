# Tasks: Changes in All Repos at Once (Campaigns)

**Input**: Design documents from `/specs/015-repo-campaigns/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/campaign-file.md,
contracts/commands.md, contracts/page.md, quickstart.md

**Tests**: included (plan.md "Testing", quickstart.md §1).

**Format**: `[ID] [P?] [Story] Description`. All paths are from the repo root.

---

## Phase 1: Setup

- [X] T001 Make the branch `015-repo-campaigns` from `main`. Run `cd status && bun test` and record the number of passing tests as the baseline. Done: 230. Make the folder `campaigns/` with a `README.md` that points to `specs/015-repo-campaigns/contracts/campaign-file.md` and says: "Do not use a campaign for dependency versions (Renovate does them) or for secret values."

---

## Phase 2: Foundational

**Purpose**: the parser and the pure change function; the command and the page both use them.

- [X] T002 In `status/src/types.ts`, add `CampaignChange = { kind: "write"; path: string; content: string } | { kind: "replace"; path: string; old: string; new: string }`, `Campaign { id; title; reason; started; repos: "all" | string[]; changes: CampaignChange[] }`, `ApplyResult = { kind: "needed"; files: Map<string, string> } | { kind: "not-needed" } | { kind: "failed"; reason: string }`, `RepoResult` (`opened` | `updated` | `not-needed` | `merged` | `closed` | `failed` | `no-access`, with PR number or reason) and `CampaignState` (`merged` | `open` | `failed-ci` | `closed` | `not-needed` | `to-do`).
- [X] T003 [P] Make `status/tests/campaign-parse.test.ts`: a valid file (contracts/campaign-file.md example); each error of data-model.md: `id` not the file name or not "`a-z`, `0-9`, `-`; 3 to 40 characters"; `title` empty or more than 80 characters; `reason` empty; `started` not a real `YYYY-MM-DD`; `repos` not `all` and not a list of catalog ids with a repo (an archived id or an id without a repo is an error); `changes` empty; a `write` or `replace` with a `path` that is absolute or contains `..`; a `replace` with an empty `old` or with `old` equal to `new`; an unknown change kind. Error text `Campaign error in <file>, field <field>: <rule>`.
- [X] T004 Make `status/src/campaign/parse.ts` with `parseCampaign(text, fileName, projects): Campaign` and `targetRepos(campaign, projects): { id: string; repo: string }[]` (`all` = each project that is not archived and has a repo, in catalog order).
- [X] T005 [P] Make `status/tests/campaign-apply.test.ts` for `applyChanges(files: Map<string, string | null>, changes)` (research.md §2): `write` to a missing file → needed; `write` with the same content → not-needed; `replace` with `old` found → needed, all occurrences replaced; `old` not found and `new` found → not-needed; neither found → failed with the path; file missing for `replace` → failed; two changes, one needed and one already done → needed with only the changed file; the input map is not changed.
- [X] T006 Make `status/src/campaign/apply.ts` with `applyChanges` (pure; returns only the files that differ).

**Checkpoint**: parser and change function tested.

---

## Phase 3: User Story 1 - Open one change in all repos (Priority: P1) 🎯 MVP

**Goal**: `bun run campaign <id> [--dry-run] [--reopen <id>]` (contracts/commands.md).

**Independent Test**: quickstart.md §2 and §3 (2 test repos, second run 0 new PRs).

- [X] T007 [P] [US1] Make `status/tests/campaign-plan.test.ts` for `planRepo(apply, pr, reopen)`: needed + no PR → `open`; needed + open PR → `update`; not-needed + open PR → `not-needed` (leave the PR and its branch as they are); needed + merged PR → `open` (a new PR, FR-005); not-needed + merged PR → `merged`; needed + closed PR → `closed` (nothing); needed + closed PR + reopen → `reopen`; failed → `failed`.
- [X] T008 [US1] Make `status/src/campaign/plan.ts` with `planRepo` (T007).
- [X] T009 [US1] Make `status/src/campaign/github.ts` with the GitHub calls of research.md §1, with a `fetch` argument for tests and the token from `gh auth token`: `defaultHead(repo)` (branch and commit sha), `readFiles(repo, sha, paths)` (raw content, `null` on 404), `findPr(repo, branch)` (the newest PR of the branch: state `open`/`closed`/`merged` and number, from `GET /repos/{repo}/pulls?head=<owner>:<branch>&state=all&sort=created&direction=desc`), `writeCommit(repo, baseSha, files, message)` (blobs, tree with `base_tree`, commit) returning the commit sha, `setBranch(repo, branch, sha)` (create the ref, or force-update it), `openPr(repo, branch, base, title, body)`, `reopenPr(repo, number)`, `addLabel(repo, number, ownRepo)` (research.md §4: make the label `campaign` only in a repo of `ImreBoersma`; in another repo add it only when it exists). HTTP 403/404 on the repo → `no-access`.
- [X] T010 [US1] Make `status/src/campaign/run.ts`: parse args (`<id>`, `--dry-run`, `--reopen <catalog id>`), read `../projects.yaml` and `../campaigns/<id>.yaml`, and for each target repo: read files, `applyChanges`, `planRepo`, then (not in a dry run) write the commit, set the branch, open/reopen the PR with the title and the body of contracts/campaign-file.md "PR", and add the label. Print one line for each repo (contracts/commands.md §2); in a dry run print `would open`/`would update` and a unified diff of each changed file (a small line diff; no new dependency). Continue after a failed repo; exit code 1 when one repo failed. Add the script `"campaign": "bun run src/campaign/run.ts"` to `status/package.json`.
- [X] T011 [US1] Make `status/tests/campaign-run.test.ts` with a fake `fetch` for 3 repos (one needs the change and has no PR, one has an open PR, one already has the change): the run calls create-commit, set-branch and open-PR for the first, set-branch only for the second, nothing for the third; a dry run calls no write endpoint; a repo that answers 404 gives `no access` and the others continue.

**Checkpoint**: US1 works (quickstart.md §2–§3 after the merge, or with the branch).

---

## Phase 4: User Story 2 - Campaign progress on the status page (Priority: P1)

**Goal**: the section "Campaigns" (contracts/page.md).

**Independent Test**: a page with a campaign of 5 repos (2 merged, 2 open, 1 failed CI) shows the counts and the search link.

- [X] T012 [P] [US2] Make `status/tests/campaign-status.test.ts` for `classify(prs, applyResults)` and `summary(states, now)`: merged/open/closed PR; open PR with CI `FAILURE` or `ERROR` → `failed-ci`; open PR without a CI rollup → `open` ("no CI" is not failed); no PR + needed → `to-do`; no PR + not-needed → `not-needed`; summary counts; `done` when no `open`, `failed-ci` or `to-do`; shown while not done, or done less than 7 days ago; hidden after 7 days.
- [X] T013 [US2] Make `status/src/campaign/status.ts` with `classify`, `summary`, and `readCampaigns(dir, projects, env, now)`: read `campaigns/*.yaml` (skip `README.md`; a parse error is a log line and that campaign is skipped, not a run failure; skip a campaign that started more than 180 days ago when all its target repos are merged, closed or not needed, so that old campaigns cost no requests), and for each target repo read the campaign PR by branch with GraphQL `pullRequests(headRefName: "campaign/<id>", states: [OPEN, MERGED, CLOSED], first: 1)` with `mergedAt`, `closedAt` and the head commit `statusCheckRollup { state }`, using the read token of the owner (`tokenFor` of `status/src/github.ts`); for a repo without a PR read the files and use `applyChanges`.
- [X] T014 [US2] In `status/src/types.ts` add `StatusPage.campaigns?: CampaignSummary[]`; in `status/src/main.ts` call `readCampaigns(join(dirname(args.catalog), "campaigns"), ...)` in page mode and pass the result to `renderPage`.
- [X] T015 [US2] In `status/src/render.ts`, add the section "Campaigns" after the project sections and before "Shared tokens" (contracts/page.md): one item per campaign with a dot (amber with failed CI, grey while open/to do, green when done), the title, `started <relative time>`, the counts > 0 separated by ` · ` with `failed CI` as an amber badge, and a link `PRs` to the search URL; `Done <relative time>` in place of the counts when done. No problem, no issue, no change to the total state.
- [X] T016 [US2] Add render tests in `status/tests/render.test.ts`: the counts and the search link; the amber badge and dot with failed CI; `Done` within 7 days; no section without campaigns; the total state and title do not change.

**Checkpoint**: US1 and US2 work.

---

## Phase 5: User Story 3 - Set one secret in many repos (Priority: P3)

**Goal**: `bun run secret-set <NAME>` (contracts/commands.md).

**Independent Test**: `bun run secret-set NOT_A_SECRET` stops; the repo choice is tested with fixtures.

- [X] T017 [P] [US3] Make `status/tests/secret-set.test.ts` for `reposFor(name, entries)`: the `where` of each entry with that name and kind `actions-secret`; none → an error with the text of contracts/commands.md; an `environment-secret` with the name → the error "environment secrets are not supported"; and for `setAll(name, repos, value, run)` with a fake `run`: it calls `gh secret set <name> -R <repo>` for each repo with the value on stdin only (not in the arguments), returns `set`/`failed` for each repo, and never puts the value in its result.
- [X] T018 [US3] Make `status/src/secret-set.ts` with `reposFor`, `setAll` (uses `Bun.spawn` with `stdin` from the value), and a main part: read the catalog with `parseCatalog` and `parseSecrets`, show the repos, read the value with echo off (`process.stdin.setRawMode(true)`, stop on Enter, Ctrl+C stops with no change), then `setAll` and one line for each repo. Add the script `"secret-set": "bun run src/secret-set.ts"` to `status/package.json`.

**Checkpoint**: all stories work.

---

## Phase 6: Polish & Cross-Cutting

- [X] T019 Run `cd status && bun test && bun run lint && bunx tsc --noEmit -p .`. All pass; more tests than the baseline of T001.
- [X] T020 Run quickstart.md §2 (dry run) against scales-exercises and boek-de-bus with `campaigns/test-readme.yaml` from the branch. Record the result in a table "Validation results" at the end of `specs/015-repo-campaigns/research.md`.
- [ ] T021 Ask the Maintainer before the real run of quickstart.md §3 (it opens 2 PRs in public repos). After a yes: run it and record how long it takes (SC-001: < 1 minute for 2 repos), run it a second time (0 new PRs), render the page locally (section "Campaigns" with `2 open`), close both PRs, delete both branches, delete `campaigns/test-readme.yaml`. Add the result to the table of T020.
- [ ] T022 Commit (`feat: campaigns for all repos and a command for shared secrets (spec 015)`), push, and open a PR to `main`. The PR body ends with the line of the Claude Code attribution.
- [ ] T023 Ask the Maintainer to merge the PR.
- [ ] T024 After the merge, check that the status run passes and that the page has no section "Campaigns" (no open campaign). Add the result to the table of T020.
- [ ] T025 [P] In `PLAN.md`, mark spec 015 as done in the feature table and the Done list.

---

## Dependencies & Execution Order

- **Setup (T001)** first. **Foundational (T002–T006)**: T002 first; T003 and T005 in parallel; T004 after T003; T006 after T005.
- **US1 (T007–T011)**: after Phase 2. T007 is `[P]`; T008 after T007; T009 can start with T007; T010 after T008 and T009; T011 after T010.
- **US2 (T012–T016)**: after Phase 2 (uses `applyChanges`, not the US1 code). T012 is `[P]` with US1 tasks; T013 after T012; T014 and T015 after T013; T016 after T015.
- **US3 (T017–T018)**: independent of US1 and US2 (uses the spec 013 catalog list). T017 is `[P]`.
- **Polish (T019–T025)**: after all stories. T021 needs a yes from the Maintainer; T024 and T025 need the merge.

## Parallel Example

```text
status/tests/campaign-parse.test.ts   (T003)
status/tests/campaign-apply.test.ts   (T005)
status/tests/campaign-status.test.ts  (T012, after Phase 2)
status/tests/secret-set.test.ts       (T017)
```

## Implementation Strategy

1. **MVP (US1)**: the command; it already saves the afternoon of repo-hopping.
2. **US2**: the page shows what still waits.
3. **US3**: the secret command, small and last; it can be dropped (clarification 2026-11-06).

All three go in one PR.
