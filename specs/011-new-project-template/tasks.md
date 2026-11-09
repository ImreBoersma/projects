# Tasks: New-Project Template and Onboarding

**Input**: Design documents from `/specs/011-new-project-template/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/template.md,
contracts/command.md, contracts/dialog.md, quickstart.md

**Tests**: included (plan.md "Testing", quickstart.md §1).

**Format**: `[ID] [P?] [Story] Description`. All paths are from the repo root.

---

## Phase 1: Setup

- [ ] T001 On the branch `011-new-project-template`, run `cd status && bun run css && bun test` and record the baseline number of tests.

---

## Phase 2: Foundational

**Purpose**: the template files, the host map and the new size budget; all stories use them.

- [ ] T002 [P] Make the template files of contracts/template.md in `template/`: `ci/pages.yml`, `ci/vercel.yml`, `ci/firebase.yml`, `ci/ssh.yml`, `ci/none.yml` (research §1: each with `push` to `main`, `pull_request`, `workflow_dispatch`, `permissions: { contents: read }`, the job `ci` that calls `ci-node.yml@main`; Pages and Firebase with `with: { artifact: dist }`; the deploy job as Beter-dan-de-MIDI (Pages, `permissions: { pages: write, id-token: write }`) and boek-de-bus (Vercel); Firebase `project-id: ${{ vars.FIREBASE_PROJECT_ID }}` and secret `firebase-service-account: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}`; SSH `known-hosts`, `target`, `pattern` from `vars.SSH_KNOWN_HOSTS`, `vars.SSH_TARGET`, `vars.SSH_PATTERN` and the secrets `SSH_HOST`, `SSH_USER`, `SSH_PASSWORD`), `.github/workflows/board.yml` (as Beter-dan-de-MIDI), `renovate.json` (extends the preset only), `biome.json` (the settings of Beter-dan-de-MIDI with `files.includes` for `**/*.{js,ts,jsx,tsx,json}`), `package.json` (`"name": "{{id}}"`, `"private": true`, script `build` that copies `index.html` to `dist/`, dev dependency `@biomejs/biome` with the range of `status/package.json`), `index.html` ("{{name}}: work in progress"), `.gitignore` (`node_modules/`, `dist/`, `.env*`, `.vercel`), `README.md` (`{{name}}`, the status page link, "Made from the template of spec 011"). Each workflow at most 15 lines.
- [ ] T003 [P] In `status/tests/hosts.test.ts`, add tests for the host map: the 5 keys of data-model.md "Host map" with their catalog host, CI variant, secrets and variables; for each key, the secret and variable names equal the names that `template/ci/<key>.yml` uses (parse with `parseCaller` of `status/src/conformance/workflows.ts` or the same reference search as R9).
- [ ] T004 Make `status/src/new-project/hosts.ts` with `HOSTS` (the table of data-model.md) and `secretsFor(host, visibility)` (adds `BOARD_TOKEN` for `public`).
- [ ] T005 [P] Make `status/tests/size.test.ts` (research §8): build the CSS (`bun run css`, as `css.test.ts`), render the 20-site worst case of `status/tests/render.test.ts` with `renderPage({ …, css })`, and check `Bun.gzipSync(html).length < 30_000`; print the raw and gzip sizes. Move the 20-site fixture to `status/tests/helpers.ts` (`worstCaseRows()`), so both tests use it.
- [ ] T006 Remove the raw budgets: the `60_000` check in `status/tests/css.test.ts` and the `90_000` test in `status/tests/render.test.ts` (keep the other checks of both tests). In `specs/019-dashboard-filters/spec.md` SC-005, add: "Since spec 011: HTML with CSS of the 20-site worst case < 30 KB gzip (research §8 of spec 011)." Record the measured gzip size (18.7 KB on 2026-11-09) in a comment in `size.test.ts`.

**Checkpoint**: template, host map and gzip budget exist.

---

## Phase 3: User Story 1 - Start a new project in one command (Priority: P1) 🎯 MVP

**Goal**: one command makes the repo, sets the settings, opens the catalog PR and prints the table (contracts/command.md).

**Independent Test**: a real run on a test repo (quickstart.md §4) gives a repo that passes R1 to R8 and an open catalog PR.

- [ ] T007 [P] [US1] In `status/tests/new-project.test.ts`, add tests for `templateFiles(host, visibility, input)`: the file list of contracts/template.md; `ci/<host>.yml` becomes `.github/workflows/ci.yml`; no `board.yml` for `private`; `{{id}}` and `{{name}}` filled; no `{{` remains; no `ci/` folder in the output.
- [ ] T008 [P] [US1] In `status/tests/catalog-edit.test.ts`, add tests for `addToCatalog(text, input, entries)` (research §5): the project block of data-model.md after the last item of `projects:`; the secret entries at the end of the project-repo part of `secrets:`; all other lines unchanged (compare line by line); `parseCatalog` and `parseSecrets` accept the result and find the new id; `expires` copies the date of an entry with the same name, else `never`; a name with a `:` or `#` is quoted.
- [ ] T009 [P] [US1] In `status/tests/new-project.test.ts`, add tests for `secretsTable(input)` (research §6, contracts/command.md): one row for each secret and variable of `secretsFor`, the commands `gh secret set <NAME> -R ImreBoersma/<repo>` and `gh variable set …`, the line `gh workflow run ci.yml -R ImreBoersma/<repo>`, the note on shared names (`bun run secret-set <NAME>`) only for names that the catalog has in other repos, and the host-side line for `vercel`, `firebase`, `ssh`.
- [ ] T010 [US1] Make `status/src/new-project/template.ts` (`templateFiles`) and `status/src/new-project/catalog-edit.ts` (`addToCatalog`).
- [ ] T011 [US1] Make `status/src/new-project/steps.ts` with `secretsTable(input)` and the steps `repo`, `settings`, `catalog-pr` (data-model.md "Setup step") on an injected runner (`git`/`gh` calls) and the GitHub client of `status/src/campaign/github.ts`: `repo` = copy to a temp folder, `bun install`, `git init -b main`, commit "chore: start from the project template (spec 011)", `gh repo create ImreBoersma/<repo> --<visibility> --description <name> --source <dir> --push` (research §3); `settings` = `PATCH /repos/{repo}` `has_issues: true`, `PUT …/vulnerability-alerts`, `DELETE …/automated-security-fixes`, and for host `pages`: `GET …/pages`, on 404 `POST …/pages` with `build_type: workflow` (research §3); `catalog-pr` = `addToCatalog` on the `projects.yaml` of `main`, `writeCommit`, `setBranch` `new-project/<id>`, `openPr` "feat: add <name> to the catalog (spec 011)" with a body that lists the secrets to set (no attribution line: the Maintainer's command opens this PR).
- [ ] T012 [US1] Make `status/src/new-project/run.ts` (options of contracts/command.md, required, with the rules of data-model.md "New project input": `id` `^[a-z0-9-]+$`, `repo` `^[A-Za-z0-9._-]+$`, `name` 1 to 60 characters, `visibility` `public` or `private`, `host` a key of `HOSTS`) and the output of contracts/command.md; add `"new-project": "bun run src/new-project/run.ts"` to `status/package.json`. The command never reads stdin.
- [ ] T013 [US1] In `status/tests/new-project.test.ts`, add a test with a fake runner and a fake client: a full run calls the steps in order with the arguments of T011, and no argument, file or output line contains a value from stdin (FR-006: stdin is not read; check that `run.ts` has no `process.stdin`).

**Checkpoint**: US1 works with a real run.

---

## Phase 4: User Story 2 - Try the command without changes (Priority: P1)

**Goal**: dry run, refusals and resume (research §4).

**Independent Test**: a dry run makes no call that writes; a second real run makes no second repo or PR.

- [ ] T014 [P] [US2] In `status/tests/new-project.test.ts`, add tests for `checkState(input, catalog, client, runner)` with fakes, one for each row of research §4 (the catalog text comes from `projects.yaml` on `main` through the client, not from the local file): id, name or `ImreBoersma/<repo>` in the catalog → stop with the message of contracts/command.md; repo exists without the template commit → stop with the message that points to specs 008 and 015; repo with the template commit → `repo` done; settings as spec 008 (and Pages on for `pages`) → `settings` done; `private` with `pages` → the warning "Pages for a private repo needs a paid GitHub plan." and no stop; open PR from `new-project/<id>` → `catalog-pr` done; owner check: the command makes repos only in `ImreBoersma`; no `gh` login or no admin right on `projects` → stop before any change.
- [ ] T015 [P] [US2] In `status/tests/new-project.test.ts`, add tests: `--dry-run` prints "Dry run: no change." at the start and the end, the same steps, file list (contracts/command.md "Files:") and table rows as a real run (SC-004, FR-007), and the fakes record no write call (`gh repo create`, `PATCH`, `PUT`, `DELETE`, `writeCommit`, `setBranch`, `openPr`); a failed step prints `[failed]` with the message, "Run the same command again to continue.", and exit code 1.
- [ ] T016 [US2] Add `checkState` and the dry run to `status/src/new-project/steps.ts` and `status/src/new-project/run.ts`; a real run starts at the first step that is not done.

**Checkpoint**: US1 and US2 work.

---

## Phase 5: User Story 3 - Keep the template in line with the rules (Priority: P2)

**Goal**: CI of `projects` checks the template (FR-011).

**Independent Test**: a PR that removes `permissions` from a template CI variant fails (quickstart.md §2).

- [ ] T017 [P] [US3] Make `status/tests/template.test.ts`: for each host key, build the `RepoFacts` of a public repo from `templateFiles` (`hasPackageJson: true`, the workflows, the parsed `renovate.json`, `dependabot: false`; the settings fields as spec 008 wants them) and check that `checkRepo` gives `pass` for R1 to R5 (one test name for each host and rule, for example "pages: R3 Caller permissions"); a private repo gives `not-applicable` for R2; each workflow file has at most 15 lines.
- [ ] T018 [US3] In `.github/workflows/status-page.yml`, add `template/**` to the `paths` of `push` and `pull_request`.
- [ ] T019 [US3] Make sure that Renovate finds `template/package.json`: no `ignorePaths` in `renovate/default.json` or `renovate.json` covers `template/` (the Renovate default list does not). After the merge, the Dependency Dashboard of `projects` lists `template/package.json` under "Detected Dependencies"; record it in research.md "Validation results" (T030). Do not change the preset for this.

**Checkpoint**: US1–US3 work.

---

## Phase 6: User Story 4 - Get the command from the status app (Priority: P3)

**Goal**: the "New project" dialog in the ⌘K box (contracts/dialog.md).

**Independent Test**: ⌘K, "new", Enter, fill the fields, copy; the pasted command with `--dry-run` shows the same values.

- [ ] T020 [P] [US4] In `status/tests/client.test.ts`, add tests for `newProjectCommand(fields)`: the command text of contracts/dialog.md (`cd status && bun run new-project --id … --name '…' --repo … --visibility … --stack '…' --host …`); a `'` in the name becomes `'\''`; `null` when the id, name or repo is empty or does not match the rules of data-model.md; and for `nameTaken(fields, names)`: the messages of contracts/dialog.md for an id, a name (case-insensitive) and an `ImreBoersma/<repo>` in the catalog. Add a test for `searchCommands`: "new" gives the item "New project" after the projects, tabs and filters.
- [ ] T021 [US4] Add `newProjectCommand`, `nameTaken` and the "New project" item to `status/src/client.ts`; in `start()`: Enter on the item opens `#new-project` with the focus in the Id field; input updates the messages and the command; "Copy command" uses `navigator.clipboard.writeText` (else select the text) and shows "Copied" for 2 s; Escape closes and gives the focus back.
- [ ] T022 [US4] In `status/src/render.ts`, add the modal `#new-project` of contracts/dialog.md (labelled fields; the host options from `HOSTS` of `status/src/new-project/hosts.ts`, with the label of the catalog host and "Other (no deploy)" for `none`; `aria-live="polite"` messages; `<pre><code>`; the copy button; the note), hidden without the script, and `<script type="application/json" id="catalog-names">` with `{ ids, names, repos }` in lower case (only `ImreBoersma/…` repos), with the `<` escape of spec 020.
- [ ] T023 [US4] In `status/tests/render.test.ts`, add tests: the modal and its 6 labelled fields exist and are hidden without the script; the host options equal the `HOSTS` keys; the inline names JSON parses back; `client.ts` contains no `fetch(` and no `XMLHttpRequest` (FR-013). The gzip test of T005 still passes.

**Checkpoint**: all stories work.

---

## Phase 7: Polish & Cross-Cutting

- [ ] T024 [P] In `docs/conformance.md`, add at the top: new projects start with `bun run new-project` (spec 011), which makes a repo that passes R1 to R8; R9 passes after the secrets of its table are set (FR-012).
- [ ] T025 [P] In `PLAN.md` section 011, change "A template repo" to "A template folder in `projects`", and add the ⌘K dialog and the gzip page budget.
- [ ] T026 Run `cd status && bun run css && bun test && bun run lint && bunx tsc --noEmit -p .`. All pass; more tests than the baseline; record the gzip size of the worst case.
- [ ] T027 Run quickstart.md §2 (CI fails on a template deviation; do not merge that branch), §3 (dry run and refusal) and §5 (dialog in Chrome, from a local page build, with the time to the copied command for SC-006), and record each result in a table "Validation results" at the end of `specs/011-new-project-template/research.md`.
- [ ] T028 Commit (`feat: new-project template and command (spec 011)`), push, open a PR to `main`. The PR body ends with the line of the Claude Code attribution.
- [ ] T029 Ask the Maintainer to merge the PR.
- [ ] T030 After the merge and with the Maintainer's approval (it makes a repo), run quickstart.md §4 (real run, conformance rules R1 to R8 on the test repo with `readFacts` and `checkRepo` (SC-002), the time to the open PR (SC-003), second run, interrupt) with `template-test`, and add the results to the table of T027. The Maintainer removes the test repo and closes the test PR.
- [ ] T031 [P] In `PLAN.md`, mark spec 011 as done in the feature table and the Done list.

---

## Dependencies & Execution Order

- **Setup (T001)** first. **Foundational**: T002, T003 and T005 in parallel; T004 after T002 and T003; T006 after T005.
- **US1 (T007–T013)**: after Phase 2. T007, T008, T009 in parallel (different test files or describe blocks written one after the other in `new-project.test.ts`); T010 after T007 and T008; T011 after T009 and T010; T012 after T011; T013 after T012.
- **US2 (T014–T016)**: after US1 (it changes `steps.ts` and `run.ts`).
- **US3 (T017–T019)**: after T002 and T010 (it uses `templateFiles`); can run in parallel with US2.
- **US4 (T020–T023)**: after T004 (host map); independent of US1–US3; T020 first, then T021, T022, T023.
- **Polish**: T024 and T025 any time; T026–T029 after all stories; T030 and T031 after the merge.

## Parallel Example

```text
template/                          (T002)
status/tests/hosts.test.ts         (T003)
status/tests/size.test.ts          (T005)
status/tests/catalog-edit.test.ts  (T008, after Phase 2)
status/tests/template.test.ts      (T017, after T010)
status/tests/client.test.ts        (T020, after T004)
```

## Implementation Strategy

1. **MVP (US1)**: the command makes a correct repo and catalog PR; this is the full gain.
2. **US2**: the dry run and the resume make the real run safe; do it before the first real run.
3. **US3**: CI keeps the template correct.
4. **US4**: the dialog, last; the command works without it.

All four go in one PR. The real run (T030) is after the merge, with the Maintainer's approval.
