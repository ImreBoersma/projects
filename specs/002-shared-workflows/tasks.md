---

description: "Task list for the shared CI and deploy workflows"
---

# Tasks: Shared CI and Deploy Workflows

**Input**: Design documents from `/specs/002-shared-workflows/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: no new test suite. The spec does not request one. The checks are `actionlint`, one real
repo on a branch ref before each merge (constitution, Development Workflow), and the steps of
quickstart.md. The `status/` change in T005 extends the existing `bun test` suite.

**Organization**: tasks are in groups for each user story. US1 (CI) and US2 (deploy) are both P1;
US1 comes first because each deploy needs the CI artifact. US3 (P2) validates the result.

**Repos**: paths without a prefix are in this repo (`ImreBoersma/projects`). Paths with a prefix,
for example `scales-exercises: .github/workflows/ci.yml`, are in that project repo. Make each
project repo change in a PR.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files or repos, no dependencies)
- **[Story]**: the user story of the task (US1, US2, US3)

---

## Phase 1: Setup

**Purpose**: branch, workflow lint and the catalog fix.

- [X] T001 Create the branch `002-shared-workflows` in this repo. All shared workflow tasks go on this branch until T018. Callers use `@002-shared-workflows` for the tests before the merge.
- [X] T002 [P] Create `.github/workflows/lint-workflows.yml`. Triggers: `push` and `pull_request` with paths `.github/workflows/**`. One job, permissions `contents: read`: checkout with `actions/checkout@v7`, download actionlint with the official script from a release tag, `https://raw.githubusercontent.com/rhysd/actionlint/v<version>/scripts/download-actionlint.bash`, with the same version as argument, run `./actionlint -color`. Step names in ASD-STE100.
- [X] T003 [P] In `projects.yaml`, change `host` of `beter-dan-de-midi` from `Azure Static Web Apps` to `GitHub Pages` (research.md §1).

---

## Phase 2: Foundational

**Purpose**: make the GitHub Pages exception correct before a Pages deploy exists.

- [X] T004 Run `/speckit-constitution` to amend the Development Workflow rule (PATCH): "Each shared deploy workflow MUST set `environment: production` on its deploy job. A GitHub Pages deploy job sets `environment: github-pages`." Reason: plan.md, Complexity Tracking.
- [X] T005 [P] In `status/tests/github.test.ts`, add a test case: `buildQuery(["ImreBoersma/a"])` contains `"github-pages"` in the `environments` list.
- [X] T006 In `status/src/github.ts`, change the `deployments` filter in `FIELDS` to `environments: ["production", "Production", "github-pages"]`. Keep `first: 1` and the order `CREATED_AT DESC`. Make T005 pass. Run `bun test` and `bun run lint` in `status/`.

**Checkpoint**: the status page reads Pages deploys. `bun test` passes.

---

## Phase 3: User Story 1 - CI in each project through one shared workflow (Priority: P1) 🎯 MVP

**Goal**: all 5 Node repos run CI through `ci-node.yml`. The old deploy files stay until US2.

**Independent Test**: quickstart.md §1 steps 1 to 3 in scales-exercises, then a green PR in each other repo.

- [X] T007 [US1] Create `.github/workflows/ci-node.yml` as specified in `specs/002-shared-workflows/contracts/workflows.md`:
  - Trigger `workflow_call`. Input `node-version` (string, default `"24"`), input `artifact` (string, default `""`). Secret `build-env` (`required: false`).
  - One job `ci`, `runs-on: ubuntu-latest`, permissions `contents: read`, job-level concurrency `ci-${{ github.repository }}-${{ github.ref }}` with `cancel-in-progress: true`.
  - Step "Find the package manager": `bun.lock` → `bun`, `yarn.lock` → `yarn`, `package-lock.json` → `npm`. Write it to a step output. If no lock file: `echo "::error::No lock file found. Add bun.lock, yarn.lock or package-lock.json."` and exit 1.
  - For yarn: `corepack enable` before `actions/setup-node@v7`. For npm and yarn: `actions/setup-node@v7` with `node-version` and `cache: <pm>`. For bun: `oven-sh/setup-bun@v2` and `actions/setup-node@v7` without cache.
  - Install: `npm ci`, `yarn install --immutable` or `bun install --frozen-lockfile`.
  - Lint: `npx biome ci .`, `yarn biome ci .` or `bunx biome ci .`.
  - Build-env: map the secret to env `BUILD_ENV`. If it is not empty: `printf '%s\n' "$BUILD_ENV" > .env.local`. Do not print it.
  - Build: only if `package.json` has `scripts.build` (check with `node -e`). Run `npm run build`, `yarn build` or `bun run build`.
  - Test: only if `package.json` has `scripts.test`. Run `npm test`, `yarn test` or `bun run test`.
  - Upload: only if `inputs.artifact` is not empty. `actions/upload-artifact` (newest major) with `name: build`, `path: ${{ inputs.artifact }}`, `if-no-files-found: error`.
- [X] T008 [US1] Run actionlint locally on `.github/workflows/`. Push the branch. Make sure that `lint-workflows.yml` passes.
- [X] T009 [US1] Test in `scales-exercises` on a branch (constitution, Development Workflow):
  - Replace `scales-exercises: .github/workflows/ci.yml` with the CI job of `contracts/caller.md` (`artifact: build`, secret `build-env: "${{ secrets.BUILD_ENV }}"`), with `@002-shared-workflows`. Keep `firebase-hosting-merge.yml` for now.
  - Manual: add the repo secret `BUILD_ENV` with the six `REACT_APP_*` lines (the values of the existing secrets).
  - Do quickstart.md §1 steps 2 and 3: CI passes; a Biome error fails CI at lint.
  - Done 2026-10-30 in ImreBoersma/scales-exercises#373: CI passed; a Biome error failed CI at the lint step; CI passed again after the repair. The secret `BUILD_ENV` is not set yet; it is necessary before T018.
- [X] T010 [US1] Merge branch `002-shared-workflows` of this repo into `main`, so that other repos can use `@main`. At this point the branch contains T002 to T008 only (catalog fix, status change, `ci-node.yml`, `lint-workflows.yml`). Continue on the same branch for the deploy workflows. In scales-exercises, change the ref to `@main` and merge the PR.
  - Done 2026-10-30: ImreBoersma/projects#2 merged. scales-exercises#373 was merged with a Copilot Autofix `permissions: {}` that stopped CI (`startup_failure`); #375 sets `permissions: { contents: read }` and `@main`. CI on `main` passes.
- [ ] T011 [P] [US1] `Beter-dan-de-MIDI`:
  - Manual: rename the default branch `pwa` to `main` (Settings → Branches). In Settings → Environments → `github-pages`, change the deployment branch rule from `pwa` to `main`. In `main.yml`, change `branches: [pwa]` to `branches: [main]`, so that the old deploy continues until T018.
  - Add `.npmrc` with `legacy-peer-deps=true`. Replace `.github/workflows/ci.yml` with the CI-only caller of `contracts/caller.md` with `artifact: dist`. Keep `main.yml` for now.
  - If `biome ci .` fails, repair the errors or change `biome.json`. Open the PR to `main`; CI must pass. Merge. The site must still deploy.
- [ ] T012 [P] [US1] `boek-de-bus`: add `.github/workflows/ci.yml` as the CI-only caller. The repo has no CI now. Repair Biome or test errors until CI passes. Merge.
- [ ] T013 [P] [US1] `personal-website`: replace `.github/workflows/ci.yml` with the CI-only caller. Repair Biome errors until CI passes. Merge.
- [ ] T014 [P] [US1] `Reperatie-Formulier`: remove `.github/workflows/node.js.yml`. Add `.github/workflows/ci.yml` as the CI-only caller (no deploy: no host). CI must pass. Merge.

**Checkpoint**: 5 of 5 repos run the shared CI (SC-001). The old deploys still work.

---

## Phase 4: User Story 2 - Deploy each project through a shared deploy workflow (Priority: P1)

**Goal**: each repo with a host deploys through a shared workflow after CI, with a deployment record.

**Independent Test**: quickstart.md §1 steps 4 and 5, then §3 for each repo, then §6.

- [X] T015 [P] [US2] Create `.github/workflows/deploy-firebase.yml` as in `contracts/workflows.md`:
  - `workflow_call` inputs `project-id` (required), `target` (default `""`). Secret `firebase-service-account` (required).
  - Job `deploy`: `if: github.event_name == 'push' && github.ref == format('refs/heads/{0}', github.event.repository.default_branch)`, `environment: production`, job concurrency `deploy-${{ github.repository }}`, `cancel-in-progress: false`.
  - Steps: check that the secret is set, else `::error::The secret firebase-service-account is not set.`; checkout; read the `public` folder from `firebase.json` with `jq` (the hosting entry with the `target`, or the only entry); download artifact `build` into that folder; `FirebaseExtended/action-hosting-deploy@v0.11.0` with `firebaseServiceAccount`, `projectId`, `target`, `channelId: live`.
- [X] T016 [P] [US2] Create `.github/workflows/deploy-pages.yml` as in `contracts/workflows.md`:
  - `workflow_call`, no inputs. Job `deploy`: the same default-branch `if:` as T015, `environment: { name: github-pages, url: ${{ steps.deployment.outputs.page_url }} }`, permissions `pages: write`, `id-token: write`, job concurrency `deploy-${{ github.repository }}`, no cancel.
  - Steps: `actions/download-artifact` (newest major) `name: build` to `site`; `actions/upload-pages-artifact@v5` with `path: site`; `actions/deploy-pages@v5` with `id: deployment`.
- [X] T017 [P] [US2] Create `.github/workflows/deploy-vercel.yml` as in `contracts/workflows.md`:
  - `workflow_call`, secret `vercel-token` (required). Job `deploy`: the same default-branch `if:`, `environment: production`, job concurrency `deploy-${{ github.repository }}`, no cancel.
  - Env: `VERCEL_TOKEN` from the secret, `VERCEL_ORG_ID: ${{ vars.VERCEL_ORG_ID }}`, `VERCEL_PROJECT_ID: ${{ vars.VERCEL_PROJECT_ID }}`. Check all three; a missing value fails with `::error::` and the name.
  - Steps: checkout; `actions/setup-node@v7`; if `bun.lock` exists, `oven-sh/setup-bun@v2`, because `vercel build` runs the install command of the project; `npx vercel@<exact version> pull --yes --environment=production --token="$VERCEL_TOKEN"`; `npx vercel@<same> build --prod --token=...`; `npx vercel@<same> deploy --prebuilt --prod --token=...`. Use one exact Vercel CLI version in a workflow-level env `VERCEL_CLI`.
- [ ] T018 [US2] Run actionlint. Push branch `002-shared-workflows`. Then test each deploy workflow in one repo with `@002-shared-workflows` (constitution):
  - `scales-exercises`: add the `deploy` job of `contracts/caller.md` (`project-id: imre-boersma`, `target: scales`, secret `FIREBASE_SERVICE_ACCOUNT_IMRE_BOERSMA`). Remove `firebase-hosting-merge.yml`. Merge. The site must change and a `production` deployment must exist.
  - `Beter-dan-de-MIDI`: set `base: "/Beter-dan-de-MIDI/"` in `vite.config.ts`. Change the `build` script to also run `cp dist/index.html dist/404.html`. Add the `deploy` job (`deploy-pages.yml`) as in the Pages example of `contracts/caller.md`, with job `permissions: { pages: write, id-token: write }`. Remove `main.yml`. Merge to `main`. The site must work at `imreboersma.github.io/Beter-dan-de-MIDI/`.
  - `personal-website`: add `vercel.json` with `{ "git": { "deploymentEnabled": { "main": false } } }`. Manual: add secret `VERCEL_TOKEN` and variables `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`. Add the `deploy` job (`deploy-vercel.yml`, secret `vercel-token: "${{ secrets.VERCEL_TOKEN }}"`). Merge. One production deploy from Actions; none from the Git integration.
- [ ] T019 [US2] Merge branch `002-shared-workflows` into `main`. In the three repos of T018, change the refs to `@main`.
- [ ] T020 [US2] `boek-de-bus`: add `vercel.json` as in T018, the Vercel secret and variables, and the `deploy` job with `@main`. Merge. Check as in T018.
- [X] T021 [US2] In `.github/workflows/status-page.yml`: in job `build`, replace `actions/upload-pages-artifact@v3` with `actions/upload-artifact` (newest major) `name: build`, `path: _site`. Replace job `deploy` with `uses: ./.github/workflows/deploy-pages.yml`, `needs: build`, permissions `pages: write`, `id-token: write`. Keep job `issues` as it is. Run the workflow; the page must update (research.md §12).
  - Done 2026-10-30: the status-page run of the merge of #2 deployed through `deploy-pages.yml` (deployment `github-pages`, 16:07 UTC).

**Checkpoint**: each project with a host shows a last deploy on the status page (SC-002).

---

## Phase 5: User Story 3 - Change the behaviour one time (Priority: P2)

**Goal**: show that one change in `projects` reaches all repos.

**Independent Test**: quickstart.md §5.

- [ ] T022 [US3] Do quickstart.md §5: add a step that prints the Node version to `ci-node.yml` on a branch, test it on one repo, merge, push to two repos, make sure that both show the step. Then remove the step the same way.
- [ ] T023 [US3] Count the lines of `.github/workflows/ci.yml` in each of the 5 repos, without blank lines. Each must be 15 or fewer (SC-003) and contain only `uses:` jobs (FR-009).

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T024 [P] Make sure that no old workflow files remain (FR-012): `ci.yml` old content, `main.yml`, `node.js.yml`, `firebase-hosting-merge.yml`. Make sure that no workflow file contains a secret value (FR-010).
- [ ] T025 Do quickstart.md §4 and §6. Record the results in a new section "14. Validation results" in `specs/002-shared-workflows/research.md`: the CI time of each repo (goal: less than 5 minutes), and the last deploy of each project on the status page.
- [ ] T026 [P] In `PLAN.md`, move feature 002 to "Done".

---

## Dependencies & Execution Order

- Setup (T001 to T003): no dependencies. T002 and T003 in parallel.
- Foundational (T004 to T006): before US2. T004 is independent of T005 and T006.
- US1 (T007 to T014): needs T001. T011 to T014 in parallel after T010.
- US2 (T015 to T021): needs US1 (the deploy uses the CI artifact) and T006 (Pages deploys show on the status page). T015, T016, T017 in parallel. T018 before T019. T020 and T021 after T019.
- US3 (T022, T023): needs US1 and US2.
- Polish: T024 and T026 any time after US2. T025 last.

## Parallel Example: US1 roll-out

```text
Task: "T011 [US1] Beter-dan-de-MIDI CI caller"
Task: "T012 [US1] boek-de-bus CI caller"
Task: "T013 [US1] personal-website CI caller"
Task: "T014 [US1] Reperatie-Formulier CI caller"
```

## Parallel Example: US2 shared deploy workflows

```text
Task: "T015 [US2] deploy-firebase.yml"
Task: "T016 [US2] deploy-pages.yml"
Task: "T017 [US2] deploy-vercel.yml"
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Do Phase 1 and Phase 2.
2. Do US1: shared CI in all 5 repos. The old deploys continue, so no site changes.
3. Stop and check: each repo has a green CI from one shared file.

### Incremental Delivery

1. US1: one CI for all repos.
2. US2: deploys through shared workflows, one host at a time, each tested on a branch ref first.
3. US3: proof that one change reaches all repos.

### Manual steps (GitHub and Vercel settings)

- T009: secret `BUILD_ENV` in scales-exercises.
- T018, T020: secret `VERCEL_TOKEN` and variables `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` in the two Vercel repos.
- Find `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` in `.vercel/project.json` after `vercel link`, or in the Vercel project settings.
