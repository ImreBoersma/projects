---

description: "Task list for the repo conformance check"
---

# Tasks: Repo Conformance Check

**Input**: Design documents from `/specs/008-repo-conformance/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: `bun test` in `status/` for each rule, the workflow parser, the reads and the page and
issue text, because the check is application code (Principle IX). SC-003 asks for one fixture test
for each of the 5 deviations of research.md §8. The steps of quickstart.md validate the real run.

**Organization**: types, catalog field and workflow parser are foundational. US1 adds the rules,
the reads and the page. US2 adds the issue text. US3 adds the repair document.

**Paths**: all paths are in this repo (`ImreBoersma/projects`). Make the changes on a branch and
merge them in one PR.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependencies)
- **[Story]**: the user story of the task (US1, US2, US3)

---

## Phase 1: Setup

- [ ] T001 Create the branch `008-repo-conformance` from `main`. All code changes stay on this branch until T023.
- [ ] T002 [P] Manual (Maintainer), two steps of quickstart.md §1: (1) on GitHub, make a fine-grained PAT (owner `ImreBoersma`, all repositories, read only: Metadata, Contents, Administration, Secrets, Variables; no expiry, or the longest expiry that GitHub offers); (2) store its value as the Actions secret `CONFORMANCE_READ_TOKEN` of `ImreBoersma/projects`. If the token has an expiry date, add the renewal date to `PLAN.md`.

---

## Phase 2: Foundational

**Purpose**: the types, the catalog field and the workflow parser. All stories need them.

- [ ] T003 In `status/src/types.ts`: add `exceptions?: Record<string, string>` to `Project`; add `"not-conformant"` to `Reason`; add `detail?: string[]` to `Problem`; add `RepoFacts` and `RuleResult` of `specs/008-repo-conformance/data-model.md` (a value that could not be read is the string `"not-available"`; `RuleResult.state` is `"pass" | "fail" | "not-applicable" | "not-available"`). In `status/src/problems.ts`, add `"not-conformant": "The repo does not follow the shared setup."` to `PROBLEM_TEXT`. Run `bunx tsc --noEmit -p .` and `bun test`.
- [ ] T004 [P] In `status/tests/catalog.test.ts`, add tests for `exceptions` of `specs/008-repo-conformance/contracts/catalog.md`: a map `{ R2: "reason" }` is accepted and returned; a missing field gives `undefined`; key `R10` or `x` throws `Catalog error in entry 0, field \`exceptions\`: R10 is not a rule. Use R1 to R9.`; an empty reason throws `Catalog error in entry 0, field \`exceptions\`: give a reason for R2.`; a value that is not a map throws. Then implement it in `status/src/catalog.ts` ("keys only `R1` to `R9`; each reason a non-empty string"). Make the tests pass.
- [ ] T005 [P] Create `status/tests/conformance-workflows.test.ts` and `status/src/conformance/workflows.ts` with the pure function `parseCaller(text: string)`: it parses one workflow file with `yaml` and returns `{ uses: string[]; permissions: "missing" | "empty" | Record<string, string> | string; secrets: string[]; vars: string[] }`. `uses` is each job-level `uses:` value. `secrets` and `vars` are the names in `${{ secrets.NAME }}` and `${{ vars.NAME }}` in the full text, without `GITHUB_TOKEN`, without duplicates. Tests: a caller with `permissions: { contents: read }`; `permissions: {}` gives `"empty"`; no `permissions` gives `"missing"`; `permissions: read-all` gives the string; two jobs with `uses:`; `secrets.BUILD_ENV` and `vars.VERCEL_ORG_ID` are found; a file that is not valid YAML gives empty lists and `"missing"`.

**Checkpoint**: types compile, the catalog accepts exceptions, callers can be parsed.

---

## Phase 3: User Story 1 - See which repo does not follow the shared setup (Priority: P1) 🎯 MVP

**Goal**: the page shows `not-conformant` with the failed rule names.

**Independent Test**: quickstart.md §4: issues off in a test repo gives "R6 Issues on" on the page.

- [ ] T006 [P] [US1] Create `status/tests/conformance-rules.test.ts` with tests for `checkRepo(facts: RepoFacts, exceptions?: Record<string, string>): RuleResult[]` of `status/src/conformance/rules.ts`, for each row of `specs/008-repo-conformance/contracts/rules.md`: pass and fail for R1 to R9; R1 `not-applicable` without `package.json`; R2 `not-applicable` for a private repo; R3 and R9 only for workflows that use a workflow of `ImreBoersma/projects`; R4 fails for `github>ImreBoersma/projects//renovate/default#004-project-board`; `@004-project-board` fails R1; an exception gives `not-applicable`; a `"not-available"` fact gives `not-available` for its rules only. Add the 5 fixtures of research.md §8 (SC-003): issues off (R6), a Dependabot config (R5), default branch `master` (R8), a caller with `vars.VERCEL_ORG_ID` and the name only in the secret list (R9), a caller with `permissions: {}` (R3). Each fixture fails exactly its rule.
- [ ] T007 [US1] Create `status/src/conformance/rules.ts` with the list `RULES` (`id`, `name`, `anchor` of `docs/conformance.md`) and `checkRepo()` of T006. Use `parseCaller()` of T005. Results in rule order R1 to R9. Make T006 pass.
- [ ] T008 [US1] Create `status/tests/conformance-read.test.ts` and `status/src/conformance/read.ts` with `readFacts(repo: string, token: string, fetch = globalThis.fetch): Promise<RepoFacts | "not-available">`. Use the REST calls of `specs/008-repo-conformance/research.md` §1. Rules of research.md §5: 404 of a file means "no file"; 404 of `vulnerability-alerts` means "off" only when the repo read passed; 403, other 404s, 5xx and network errors give `"not-available"` for that fact; a failed repo read gives `"not-available"` for the full repo. Read each file with the `Accept: application/vnd.github.raw` header. Tests with a fake fetch: a full repo; a repo without `renovate.json` but with `.github/renovate.json`; 404 alerts; 403 on `actions/secrets` gives `secretNames: "not-available"`; a failed repo read.
- [ ] T009 [P] [US1] In `status/tests/problems.test.ts`, add tests for the function `conformanceProblem(projectId, results)` of `status/src/problems.ts`: with 1 or more `fail` it gives `{ reason: "not-conformant", key: "<id>/not-conformant", detail: ["R4 Renovate preset", "R6 Issues on"] }` in rule order; with only `pass`, `not-applicable` or `not-available` it gives `null`. Then implement it. Make the tests pass.
- [ ] T010 [P] [US1] In `status/tests/render.test.ts`, add tests (contracts/page.md): a problem with `detail` shows the problem text and under it the rule list, each rule id a link to `https://github.com/ImreBoersma/projects/blob/main/docs/conformance.md#<anchor>`; a row with `not-available` results shows the grey note `Setup check not available: R7, R9` in the Problems cell, without the `problem` class; no file content or secret name in the output. Then change `status/src/render.ts` and, if needed, `status/src/links.ts`. Make the tests pass.
- [ ] T011 [US1] In `status/src/main.ts`, both modes: for each catalog project with a repo of the owner `ImreBoersma` that is not archived, call `readFacts()` with `CONFORMANCE_READ_TOKEN` and `checkRepo()` with `project.exceptions`, and add the problem of `conformanceProblem()` to `s.problems`. Keep the ids of the `not-available` rules on the status row (new field `conformanceNotAvailable: string[]` on `ProjectStatus`) for the note of T010. Log one line for each repo: `Conformance <repo>: pass`, `Conformance <repo>: <rule ids>` or `Conformance <repo>: check not available: <rule ids>`. When `CONFORMANCE_READ_TOKEN` is not set, log `Conformance check not available: no token.` once and skip the check; the run does not fail. Run `bun test`, `bun run lint` and `bunx tsc --noEmit -p .`.
- [ ] T012 [US1] In `.github/workflows/status-page.yml`, add `CONFORMANCE_READ_TOKEN: ${{ secrets.CONFORMANCE_READ_TOKEN }}` to the `env` of `bun run start --mode page` (job `build`) and of `bun run start --mode issues` (job `issues`). Run actionlint.
- [ ] T013 [US1] Needs T002. Validate quickstart.md §3 and §4 locally. If a repo fails a rule that does not apply to it, add an exception with a reason to `projects.yaml` (contracts/catalog.md) and record it in `specs/008-repo-conformance/research.md` §10 "Exceptions". If a rule gives `not-available` with the new token, record the missing permission in research.md §2 and stop for the Maintainer.

**Checkpoint**: the page shows the deviations.

---

## Phase 4: User Story 2 - Get an issue for a deviation (Priority: P2)

**Goal**: one issue for each repo, with the failed rules and links.

**Independent Test**: quickstart.md §5, dry run of the issues mode.

- [ ] T014 [US2] In `status/tests/issues.test.ts`, add tests for `issueContent()` with a `not-conformant` problem: the title is `<name>: The repo does not follow the shared setup.`; the body has the marker, the list `- R4 Renovate preset: https://github.com/ImreBoersma/projects/blob/main/docs/conformance.md#r4-renovate-preset` for each failed rule, and the sentence "The status page shows the current list." (contracts/page.md "Issue"). Change the keep rule of `planIssueActions()` (as spec 005 did for `site-down`): a `<id>/not-conformant` issue stays open only when the setup check could not read that repo (all its rules `not-available`); it does not use `unavailableIds` of the repo data. Add tests: an open `not-conformant` issue closes when the problem is gone, also when the repo data of the project is unavailable; it stays open when the setup check of that repo is not available. Pass the set of repos with an unavailable setup check from `main.ts`. Then change `issueContent()` and `planIssueActions()` in `status/src/issues.ts`. Make the tests pass.
- [ ] T015 [US2] Validate quickstart.md §5 with `--dry-run` only.

**Checkpoint**: deviations make one issue for each repo.

---

## Phase 5: User Story 3 - Know what each rule means and how to repair it (Priority: P3)

**Goal**: one repair document.

**Independent Test**: each link of a conformance issue opens the correct section.

- [ ] T016 [P] [US3] Create `docs/conformance.md`: a short introduction, then one section for each rule R1 to R9 with the heading `R<n> <name>` (same names as `RULES`), the reason (with the spec that made the rule), and numbered repair steps with `gh` commands where possible, in ASD-STE100. The page and the issue do not name a missing secret, so the R9 section gives the steps to find it: list the `secrets.NAME` and `vars.NAME` of each caller (`grep -ohE '(secrets|vars)\.[A-Z0-9_]+' .github/workflows/*.yml | sort -u`), list the repo secrets and variables (`gh secret list`, `gh variable list`), and compare. Use the table format of the Maintainer for secrets and variables (name, kind, value or source, where).
- [ ] T017 [US3] In `status/tests/conformance-rules.test.ts`, add a test that reads `../docs/conformance.md` and checks that each `RULES` entry has a heading whose GitHub anchor is its `anchor`.

**Checkpoint**: each rule has repair steps that the issue links to.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T018 [P] In `specs/001-project-status-page/contracts/catalog.md`, add a line under the title: "Spec 008 adds the field `exceptions`: see `specs/008-repo-conformance/contracts/catalog.md`".
- [ ] T019 Run `bun test`, `bun run lint`, `bunx tsc --noEmit -p .` and actionlint. Run quickstart.md §3 once more on the real repos. Make sure that the run takes less than 30 seconds more than before.
- [ ] T020 Push the branch and open the PR into `main`. CI must pass.
- [ ] T021 Ask the Maintainer to merge the PR, because a merge to `main` deploys the page.
- [ ] T022 After the merge, open the live page. Make sure that the conformance results are the same as in the local run, and that the log of the status run shows no `not-available`.
- [ ] T023 [P] In `PLAN.md`, mark spec 008 as done in the feature table and the Done list.

---

## Dependencies & Execution Order

- **Setup**: T001 first. T002 is manual and can be done at any time before T013.
- **Foundational (T003–T005)**: T003 first; T004 and T005 in parallel after it.
- **US1 (T006–T013)**: needs Phase 2. T006 then T007. T008 can run in parallel with T006/T007. T009 and T010 in parallel (different files) after T003. T011 needs T007, T008 and T009. T012 at any time. T013 needs T002 and T011.
- **US2 (T014–T015)**: needs T009. T015 needs T011.
- **US3 (T016–T017)**: T016 can start at any time. T017 needs T007 and T016.
- **Polish (T018–T023)**: after all stories. T022 needs the merge (T021).

## Parallel Example: Foundational and US1

```text
status/src/catalog.ts + catalog.test.ts            (T004)
status/src/conformance/workflows.ts + test         (T005)
status/src/conformance/read.ts + test              (T008)
docs/conformance.md                                (T016)
```

## Implementation Strategy

1. **MVP (US1)**: the page shows which repo does not follow the setup.
2. **US2**: one issue for each repo.
3. **US3**: the repair document and its links.

All three go in one PR, because the page and the issue link to the repair document.
