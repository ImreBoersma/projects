# Tasks: Expiry of Tokens and Secrets

**Input**: Design documents from `/specs/013-secret-expiry/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/catalog.md,
contracts/page-issue.md, quickstart.md

**Tests**: included (plan.md "Testing", quickstart.md §1, spec SC-003).

**Format**: `[ID] [P?] [Story] Description`. All paths are from the repo root.

---

## Phase 1: Setup

- [X] T001 Make the branch `013-secret-expiry` from `main`. Run `cd status && bun test` and record the number of passing tests as the baseline. Done: 194.

---

## Phase 2: Foundational

**Purpose**: the catalog list and the types; all stories need them.

- [X] T002 In `status/src/types.ts`, add `SecretKind = "actions-secret" | "environment-secret" | "actions-variable" | "account"`, `SecretEntry { name: string; kind: SecretKind; where: string; expires: string | "never"; project: string | null }`, `SecretStatus { entry: SecretEntry; owner: string; date: string | null; days: number | null; source: "catalog" | "token" | "both" }`, and add `"secret-expiring"` to `Reason`. Add the text `"secret-expiring": "A secret expires soon."` to `PROBLEM_TEXT` in `status/src/problems.ts`.
- [X] T003 [P] In `status/tests/catalog.test.ts`, add tests for `parseCatalog` with a `secrets` list (contracts/catalog.md): a valid list; missing list → `[]`; each error: `name` not "1 to 60 characters of `A-Z a-z 0-9 _ -` and space"; `kind` not one of the 4 kinds; `where` not `owner/repo` for the first three kinds, or not "text of 1 to 40 characters" for `account`; `expires` not a real `YYYY-MM-DD` and not `never`; `project` not a catalog id (an archived project id is valid); `name` + `where` used two times (case-insensitive); an extra field; a field `value`, `secret`, `password` or `token` → "Do not put secret values in the catalog."
- [X] T004 Change `parseCatalog` in `status/src/catalog.ts` to return `{ projects, secrets }` (or add `parseSecrets(doc, projectIds)` and a function `parseCatalogFile` that returns both), with the rules of T003 and the error text `Catalog error in secrets item <n>, field <field>: <rule>`. Check `project` against all catalog ids, also archived ones. Update the callers in `status/src/main.ts`, `status/src/board/*` and the tests, so that all existing tests pass.
- [X] T005 Change the header of `projects.yaml` to: `# Do not put contact details or secret values in this file. Secret names, places and dates are allowed (spec 013).` (research.md §6).

**Checkpoint**: the catalog accepts the list; all old tests pass.

---

## Phase 3: User Story 1 - An issue before a secret expires (Priority: P1) 🎯 MVP

**Goal**: catalog dates make `secret-expiring` problems and issues.

**Independent Test**: a catalog entry 20 days in the future gives one issue with the name and the place; 200 days gives none.

- [X] T006 [P] [US1] Make `status/tests/secrets-expiry.test.ts` with tests for `secretStatuses(entries, readDates, now)` and `secretProblems(statuses)`: `never` without a read date → `date: null`, no problem; 30 days → problem; 31 days → no problem; -2 days → problem with text "The secret <name> expired 2 days ago."; 20 days → "The secret <name> expires in 20 days."; key `<owner>/secret-expiring/<slug(name)>` with `slug` of `status/src/expiry/expiry.ts`; owner is `project` or `shared`; two secrets → two problems; a secret of an archived project → no status and no problem.
- [X] T007 [US1] Make `status/src/secrets/expiry.ts` with `secretStatuses` and `secretProblems` (data-model.md "SecretStatus" and "Problem `secret-expiring`"); leave out the entries of archived projects (spec edge case); use `daysUntil` and `slug` of `status/src/expiry/expiry.ts`; limit 30 days.
- [X] T008 [US1] In `status/src/issues.ts`, add the steps for `secret-expiring` (contracts/page-issue.md "Issue body": `Where: <kind> in <where>`, `Date: <date> (<source>)`, the 3 steps). Make `planIssueActions` accept the owner `shared` with the pseudo project `{ id: "shared", name: "Shared setup", repo: "ImreBoersma/projects", status: "active" }` in place of `projects.get(...)`. Add tests in `status/tests/issues.test.ts`: the body of a shared and of a project secret; a shared problem opens one issue; it closes when the problem stops.
- [X] T009 [US1] In `status/src/main.ts`, add `checkSecrets()`: make the statuses from the catalog list (read dates come in US2), add the project problems to `s.problems` of the project, keep the shared problems in a list `shared`, give them to `reconcileIssues` with the project problems, and add them to the history line of spec 010 under the id `shared`. Log one line for each secret with a date: `Secret <name>: <days> days` (never a value).

**Checkpoint**: catalog dates make issues (dry run of quickstart.md §2).

---

## Phase 4: User Story 2 - Read the expiry of the status tokens (Priority: P1)

**Goal**: the status tokens give their own date.

**Independent Test**: a token with an expiry header and no catalog entry shows with its date.

- [X] T010 [P] [US2] Make `status/tests/secrets-read.test.ts` with tests for `tokenExpiry(token, fetch)` with a fake `fetch`: header `GitHub-Authentication-Token-Expiration: 2027-11-06 12:00:00 UTC` → `"2027-11-06"`; no header → `null`; HTTP error or network error → `"not-known"`. And for `secretStatuses` with read dates: a read date without a catalog entry → a shared entry `kind: actions-secret`, `where: ImreBoersma/projects`, `source: "token"`; a catalog date and an earlier read date → the read date, `source: "both"`; a later read date → the catalog date, `source: "both"`.
- [X] T011 [US2] Make `status/src/secrets/read.ts` with `tokenExpiry(token, fetch = globalThis.fetch)`: one `GET https://api.github.com/rate_limit` with `Authorization: Bearer <token>`; return the date part of the header, `null`, or `"not-known"` (research.md §1). Extend `secretStatuses` in `status/src/secrets/expiry.ts` with the read dates (research.md §3).
- [X] T012 [US2] In `checkSecrets()` of `status/src/main.ts`, read the dates of `STATUS_READ_TOKEN`, `STATUS_READ_TOKEN_HOB` and `CONFORMANCE_READ_TOKEN` when they are set; log `Token <NAME>: expires <date>` or `Token <NAME>: no expiry` or `Token <NAME>: not known`. For `"not-known"` without a catalog date, add the issue key to `keepKeys` (research.md §5).

**Checkpoint**: US1 and US2 work.

---

## Phase 5: User Story 3 - All expiry dates on one page, and the gaps (Priority: P2)

**Goal**: the page shows the secrets (project Expiry line and "Shared tokens"), and the gaps of FR-009.

**Independent Test**: a page with one project secret, one shared secret and one gap shows each in its place.

- [X] T013 [P] [US3] Make `status/tests/secrets-compare.test.ts` with tests for `gaps(used, entries)`: `used` is a list of `{ owner, repo, names }`; a name with an entry of the same `name` and `where === repo` and kind `actions-secret` or `environment-secret` → no gap; a name without → gap; `GITHUB_TOKEN` → never a gap; an entry that no workflow uses → no gap. And for `usedSecrets(text)`: a shared workflow with `on: workflow_call: secrets: { SSH_PASSWORD: ... }` and a use `${{ secrets.SSH_PASSWORD }}` → `SSH_PASSWORD` is not in the result; another `secrets.X` in the same file → in the result.
- [X] T014 [US3] Make `status/src/secrets/compare.ts` with `gaps()` and `usedSecrets(text)` (`parseCaller(text).secrets` without the names under `on.workflow_call.secrets`; research.md §4). In `status/src/main.ts`: for the own repos, use the workflow texts of the conformance facts (`facts.workflows`) and `parseCaller(text).secrets` of `status/src/conformance/workflows.ts` (keep the facts from `checkConformance()`); for repos of other owners, read `.github/workflows/*.yml` with the status token of that owner and the same file read as `status/src/conformance/read.ts` (on a failure, log and show no note); for this repo, read `../.github/workflows/*.yml` from disk; use `usedSecrets` for all three (research.md §4).
- [X] T015 [US3] In `status/src/types.ts` and `status/src/main.ts`, add to `ProjectStatus` the fields `secrets: SecretStatus[]` and `secretGaps: string[]`, and to `StatusPage` the field `shared: { secrets: SecretStatus[]; problems: Problem[]; gaps: string[] }`.
- [X] T016 [US3] In `status/src/view.ts`, add `secretKind(days)` with the limit 30 (bad ≤ 30, warn ≤ 60, else good) and use it in `rowKind`. Make `totalState` count `shared.problems` (title and text). In `status/src/render.ts` (contracts/page-issue.md "Page"): the Expiry line of a project gets `Secret <name> <relative time>` for the secret with the fewest days, with `(+<n> more)`; the Code line gets `Secret not in the catalog: <names>`; a group `Shared tokens` after the project sections, with one item "Shared setup" (dot of its kind, Expiry line of all shared secrets with a date sorted by days, the shared problems with their issue links, and the gaps of this repo). Change `summary(rows, sharedProblems = 0)` in `status/src/render.ts` to add `<n> shared problem(s).` when `sharedProblems > 0`, and pass `page.shared.problems.length`.
- [X] T017 [US3] In `status/tests/render.test.ts` and `status/tests/view.test.ts`, add tests: a project secret in 45 days → amber badge in the Expiry line and a `warn` dot; 2 project secrets → `(+1 more)`; a shared secret in 20 days → the group "Shared tokens" with a red badge, the title counts it; a gap → `Secret not in the catalog: X` in the Code line; no secrets and no gaps → no group "Shared tokens".

**Checkpoint**: all stories work.

---

## Phase 6: Polish & Cross-Cutting

- [X] T018 [P] Privacy test (SC-003, contracts/page-issue.md "Forbidden") in `status/tests/secrets-expiry.test.ts`: set fixture values for the 3 token variables, render a page, an issue body and the history line of spec 010 (`resultLine`) with secrets, and make sure that no fixture value occurs in them (FR-002).
- [X] T019 Draft the `secrets` list in `projects.yaml`: one entry for each secret name in the workflow files of this repo and of the catalog repos (use `gh api` to read them), and the accounts of `contracts/catalog.md` that the Maintainer confirms. Known date: `STATUS_READ_TOKEN_HOB` 2027-11-06; the board tokens `never`. Ask the Maintainer for the other dates, with a table (name, kind, where, date to fill in). No values.
- [X] T020 Run `cd status && bun test && bun run lint && bunx tsc --noEmit -p .`. All pass; the number of tests is more than the baseline of T001.
- [X] T021 Run quickstart.md §2 and record the results in a table "Validation results" at the end of `specs/013-secret-expiry/research.md`.
- [X] T022 Commit (`feat: track the expiry of tokens and secrets (spec 013)`), push, and open a PR to `main`. The PR body ends with the line of the Claude Code attribution.
- [X] T023 Ask the Maintainer to merge the PR.
- [X] T024 After the merge, validate quickstart.md §3 (the log shows the token dates; the page shows "Shared tokens"; 0 gaps) and add the result to the table of T021.
- [X] T025 [P] In `PLAN.md`, mark spec 013 as done in the feature table and the Done list.

---

## Dependencies & Execution Order

- **Setup (T001)** first. **Foundational (T002–T005)**: T002 first; T003 and T005 in parallel; T004 after T002 and T003.
- **US1 (T006–T009)**: after Phase 2. T006 is `[P]`; T007 after T006; T008 and T009 after T007.
- **US2 (T010–T012)**: after T007 (it extends `secretStatuses`). T010 is `[P]` with T008.
- **US3 (T013–T017)**: after T009. T013 is `[P]`; T014 after T013; T015 before T016; T017 after T016.
- **Polish (T018–T025)**: after all stories. T019 needs the dates from the Maintainer. T024 and T025 need the merge.

## Parallel Example

```text
status/tests/catalog.test.ts         (T003)
projects.yaml header                 (T005)
status/tests/secrets-expiry.test.ts  (T006, after Phase 2)
status/tests/secrets-read.test.ts    (T010, with T008)
```

## Implementation Strategy

1. **MVP (US1)**: catalog dates make issues. Already useful for the Vercel, Firebase and GoDaddy
   secrets.
2. **US2**: no manual dates for the status tokens.
3. **US3**: the page and the gaps keep the list complete.

All three go in one PR, as for specs 007 to 012. The catalog list (T019) goes in the same PR.
