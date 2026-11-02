---

description: "Task list for the shared Renovate preset"
---

# Tasks: Shared Renovate Preset

**Input**: Design documents from `/specs/003-renovate-preset/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: `renovate-config-validator` on each change of the preset, one real repo with a branch
reference before the merge (constitution, Development Workflow), and the steps of quickstart.md.
The status page change in T007 and T008 extends the existing `bun test` suite.

**Organization**: the full preset is foundational, because all stories read the same file. US1
rolls it out. US2 and US3 check the automerge, grouping and schedule on real Renovate runs. These
checks can complete only after the first Saturday window (2026-11-07, 02:00–06:00 Amsterdam), or
earlier with a start from the Dependency Dashboard.

**Repos**: paths without a prefix are in this repo (`ImreBoersma/projects`). Paths with a prefix,
for example `scales-exercises: renovate.json`, are in that repo. Make each repo change in a PR.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files or repos, no dependencies)
- **[Story]**: the user story of the task (US1, US2, US3)

---

## Phase 1: Setup

- [X] T001 Create the branch `003-renovate-preset` in this repo. The preset stays on this branch until T011.
- [X] T002 [P] Manual (Maintainer): install the Mend Renovate GitHub App on the account `ImreBoersma` with "Only select repositories": Beter-dan-de-MIDI, boek-de-bus, personal-website, Reperatie-Formulier, scales-exercises, projects. Do NOT select HomeLab: it has its own Renovate, and the app would make each update two times (research.md §2). If the app is already installed for all repositories, change it to these six.
- [X] T003 [P] Create `.github/workflows/lint-renovate.yml`. Triggers: `push` and `pull_request` with paths `renovate/**` and `renovate.json`. One job, permissions `contents: read`: checkout with `actions/checkout@v7`, `actions/setup-node@v7` with Node 24, then `npx --yes --package renovate@<exact version> -- renovate-config-validator renovate/default.json renovate.json`. Use the newest `renovate` version from npm. Step names in ASD-STE100.

---

## Phase 2: Foundational

**Purpose**: the preset and the status page change. All stories need them.

- [X] T004 Create `renovate/default.json` with exactly the settings of `specs/003-renovate-preset/contracts/preset.md`:
  - `"$schema": "https://docs.renovatebot.com/renovate-schema.json"`, a `description` in ASD-STE100.
  - `"extends": ["config:recommended"]`, `"timezone": "Europe/Amsterdam"`, `"schedule": ["* 2-5 * * 6"]`.
  - `"minimumReleaseAge": "3 days"`, `"internalChecksFilter": "strict"`, `"platformAutomerge": false`.
  - `packageRules`, in this order: `{ "matchUpdateTypes": ["patch"], "groupName": "patch updates", "automerge": true }`; `{ "matchUpdateTypes": ["minor"], "groupName": "minor updates", "automerge": false }`; `{ "matchPackageNames": ["ImreBoersma/projects"], "enabled": false }`. Give each rule a `description` in ASD-STE100.
  - `"vulnerabilityAlerts": { "labels": ["security"] }`. Do not set `schedule` or `minimumReleaseAge` in it; the Renovate defaults (none) apply.
  - Do NOT set `ignoreTests` (FR-006).
- [X] T005 Create `renovate.json` in the repo root: `$schema`, `"extends": ["github>ImreBoersma/projects//renovate/default"]`, and one rule `{ "matchManagers": ["github-actions"], "automerge": false }` with a `description` (research.md §7). No Biome check applies to the root `renovate.json`.
- [X] T006 Run the validator of T003 locally on both files. Push the branch. Make sure that `lint-renovate.yml` passes.
- [X] T007 [P] In `status/tests/github.test.ts`, add test cases for `mapRepo()`: a PR with author login `imreboersma-homelab-renovate` counts as a Renovate PR; `imreboersma-homelab-renovate[bot]` counts; `renovate` and `renovate[bot]` still count; `renovatefan` and `some-person` do not count.
- [X] T008 In `status/src/github.ts`, replace the `RENOVATE` set with a rule: the author login is `renovate` or `renovate[bot]`, or ends with `-renovate` or `-renovate[bot]` (research.md §9). Make T007 pass. Run `bun test` and `bun run lint` in `status/`.
- [X] T009 In `.github/workflows/status-page.yml`, add the trigger `pull_request` with paths `projects.yaml` and `status/**` (research.md §12). Change the workflow concurrency group to `status-page-${{ github.ref }}`, so that a PR run does not wait for a `main` run. Add `if: github.event_name != 'pull_request'` to job `issues`. Job `deploy` does not deploy for a PR (spec 002). Do not change job `build`. Run actionlint. Open the PR on the branch; job `build` must run and pass on the PR.

**Checkpoint**: the preset validates. The status page counts both Renovate apps. `projects` has CI on PRs.

---

## Phase 3: User Story 1 - Get dependency updates from one shared configuration (Priority: P1) 🎯 MVP

**Goal**: all 7 repos use the preset. No Dependabot version updates.

**Independent Test**: quickstart.md §2 steps 1 and 2, then §4 for each repo.

- [ ] T010 [US1] Test in `scales-exercises` before the merge (constitution, Development Workflow):
  - Add `scales-exercises: renovate.json` with `"extends": ["github>ImreBoersma/projects//renovate/default#003-renovate-preset"]`. Format it with the Biome settings of the repo, so that `biome ci` passes.
  - Remove `scales-exercises: .github/dependabot.yml`.
  - Turn off Dependabot security updates: `gh api -X DELETE repos/ImreBoersma/scales-exercises/automated-security-fixes`.
  - Open the PR. CI must pass. Merge.
  - Make sure that a "Dependency Dashboard" issue appears from `renovate[bot]` and that it shows no config error.
- [ ] T011 [US1] Merge branch `003-renovate-preset` of this repo into `main` through a PR. In scales-exercises, remove `#003-renovate-preset` from the reference. Merge.
- [ ] T012 [P] [US1] `Beter-dan-de-MIDI`: add `renovate.json` (`"extends": ["github>ImreBoersma/projects//renovate/default"]`), remove `.github/dependabot.yml`, turn off Dependabot security updates as in T010. CI must pass. Merge.
- [ ] T013 [P] [US1] `personal-website`: the same as T012. Biome in this repo uses tabs.
- [ ] T014 [P] [US1] `Reperatie-Formulier`: the same as T012.
- [ ] T015 [P] [US1] `boek-de-bus`: add `renovate.json` as in T012. Turn on vulnerability alerts: `gh api -X PUT repos/ImreBoersma/boek-de-bus/vulnerability-alerts`. The repo has no `dependabot.yml`. CI must pass. Merge.
- [ ] T016 [US1] This repo: turn on vulnerability alerts with `gh api -X PUT repos/ImreBoersma/projects/vulnerability-alerts`. After T011, make sure that a Dependency Dashboard issue appears in `projects`.
- [ ] T017 [US1] `HomeLab: .github/renovate.json`: add `"github>ImreBoersma/projects//renovate/default"` as the first entry of `extends`. Keep all HomeLab rules. Add one last rule `{ "matchUpdateTypes": ["patch", "minor"], "automerge": false }` with a `description`, so that nothing automerges. Open the PR; `validate` must pass. CAUTION: a merge to `main` of HomeLab starts `deploy` on the Pi. The Maintainer merges this PR. After the merge, run the `renovate` workflow manually; it must pass.
- [ ] T018 [US1] Run the status page workflow. Make sure that the Renovate PR count of HomeLab includes the open PRs of `imreboersma-homelab-renovate`.

**Checkpoint**: SC-001 and SC-002: 7 of 7 repos extend the preset, 0 use Dependabot version updates.

---

## Phase 4: User Story 2 - Patch updates merge without work (Priority: P2)

**Goal**: patch updates merge after CI passes, without the Maintainer.

**Independent Test**: quickstart.md §2 step 3.

- [ ] T019 [US2] In one repo with a pending patch update, start the "patch updates" group from the Dependency Dashboard, or wait for the Saturday window. Make sure that Renovate opens one PR "Update patch updates" from `renovate[bot]`, CI runs, and Renovate merges it after CI passes (FR-004). Record the repo and the PR. Before CI passes on that PR, or on the next patch PR: push one commit with a Biome error to the Renovate branch, make sure that CI fails and that Renovate does not merge (US2/AC2), then remove the commit.
- [ ] T020 [US2] Make sure that no minor, major or security PR was merged by Renovate in any repo (FR-005): `gh search prs --author app/renovate --owner ImreBoersma --merged` shows only "patch updates" PRs. Make sure that no HomeLab PR was merged automatically.

**Checkpoint**: SC-003: 0 patch updates merged by hand.

---

## Phase 5: User Story 3 - Fewer PRs at fewer times (Priority: P3)

**Goal**: one minor group for each repo, and PRs only in the weekly window.

**Independent Test**: quickstart.md §2 step 4, after the first Saturday window.

- [ ] T021 [US3] After the Saturday window, for each repo with the hosted app (not HomeLab): count the non-security Renovate PRs opened in that week (`gh pr list --author app/renovate --state all --search "created:>=<date>"`). Each repo must have a maximum of 2, plus majors (SC-004). Make sure that each non-security PR was created on Saturday between 02:00 and 06:00 Amsterdam time, or from a start on the Dependency Dashboard (FR-002).

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T022 [P] For each of the 7 repos, make sure that the Renovate config (`renovate.json`, or `.github/renovate.json` in HomeLab) extends the preset and that `.github/dependabot.yml` does not exist (SC-001, SC-002). Use `gh api repos/ImreBoersma/<repo>/contents/<path>`.
- [ ] T023 Record the results in a new section "13. Validation results" in `specs/003-renovate-preset/research.md`: the app installation, the first patch automerge and the failed-CI check, the PR count of the first week, the HomeLab result, and the evidence for US1/AC2: each repo extends the preset from the default branch of `projects`, so a change on `main` reaches all repos at their next run.
- [ ] T024 [P] In `PLAN.md`, move feature 003 to "Done". In `specs/001-project-status-page/plan.md` the Principle IV exception ends; do not change that file, but write in `PLAN.md` that the exception ended with spec 003.

---

## Dependencies & Execution Order

- Setup: T002 (Maintainer) before T010. T003 before T006.
- Foundational: T004 and T005 before T006. T007 before T008. T009 after T001. All before US1.
- US1: T010 before T011. T012 to T016 after T011, in parallel. T017 after T011 (HomeLab reads the preset from `main`). T018 after T008 and T017.
- US2 and US3: after US1 and after the first Saturday window, or a start from the Dependency Dashboard.
- Polish: T022 after US1. T023 after US2 and US3. T024 last.

## Parallel Example: US1 roll-out

```text
Task: "T012 [US1] Beter-dan-de-MIDI renovate.json"
Task: "T013 [US1] personal-website renovate.json"
Task: "T014 [US1] Reperatie-Formulier renovate.json"
Task: "T015 [US1] boek-de-bus renovate.json"
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 and Phase 2: preset, validator, status page change.
2. US1: test on scales-exercises, merge, roll out to the other repos.
3. Stop: each repo has a Dependency Dashboard without errors, and Dependabot is gone.

### Incremental Delivery

1. US1: Renovate in place of Dependabot.
2. US2: the first patch automerge proves FR-004.
3. US3: the first week proves the grouping and the window.

### Manual steps

- T002: install or change the Mend Renovate app (GitHub settings of the account).
- T017: merge the HomeLab PR (deploy on the Pi).
