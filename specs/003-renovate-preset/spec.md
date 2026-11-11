# Feature Specification: Shared Renovate Preset

**Feature Branch**: `003-renovate-preset` (not created; no git hook is installed)

**Created**: 2026-10-30

**Status**: Draft

**Input**: PLAN.md, feature 003: "Preset `renovate/default.json`: automerge patch updates when CI
passes, one group for minor updates, a weekly schedule. Each project repo gets a `renovate.json`
that extends `github>ImreBoersma/projects//renovate/default`. Remove Dependabot from all repos."

## Clarifications

### Session 2026-11-11 (review)

- Q: Does HomeLab use the window of the preset? → A: No. HomeLab keeps its own window in
  `.github/renovate.json`: Saturday 02:00–06:00 Europe/Amsterdam (Maintainer, 2026-11-11). A merge
  to `main` of HomeLab changes the live environment on the Pi, so its updates stay in the night.
  GitHub starts the scheduled HomeLab run 6 to 7 hours late (runs at 07:18–10:23 UTC), after the
  window, so a cron-job.org job starts the HomeLab Renovate workflow at 02:30 Amsterdam each
  Saturday (tasks.md T025). The GitHub cron stays as a backup.
- Q: Which flags does the validator use? → A: `--strict --no-global`
  (`.github/workflows/lint-renovate.yml`).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Get dependency updates from one shared configuration (Priority: P1)

Each project repo gets dependency update PRs from Renovate. All repos use the same preset in
`projects`. The Maintainer changes the update rules one time, in the preset.

**Why this priority**: Principle IV requires Renovate with the shared preset. Now four repos use
Dependabot, each with its own configuration.

**Independent Test**: add a `renovate.json` that extends the preset to one project repo. Wait for
the first Renovate run. Make sure that the update PRs follow the preset rules.

**Acceptance Scenarios**:

1. **Given** a project repo with a `renovate.json` that extends the preset, **When** Renovate runs,
   **Then** it opens update PRs that follow the preset.
2. **Given** a change to the preset on `main` of `projects`, **When** Renovate runs next, **Then**
   all project repos use the changed rules.
3. **Given** a project repo, **When** the Maintainer reads its `renovate.json`, **Then** it
   contains only the extend of the preset, or the extend and a small number of repo-specific rules.

---

### User Story 2 - Patch updates merge without work (Priority: P2)

Renovate merges patch updates automatically when CI passes. The Maintainer reviews only minor and
major updates.

**Why this priority**: patch updates are most of the PRs. Without automerge, the Maintainer must
merge each one by hand.

**Independent Test**: in a repo with the shared CI (spec 002), wait for a patch update PR. Make sure
that it merges after CI passes. Make a patch update PR fail CI. Make sure that it does not merge.

**Acceptance Scenarios**:

1. **Given** a patch update PR with a CI pass, **When** Renovate runs, **Then** it merges the PR.
2. **Given** a patch update PR with a CI fail, **When** Renovate runs, **Then** it does not merge
   the PR.
3. **Given** a repo without CI, **When** Renovate opens a patch update PR, **Then** it does not
   merge the PR.
4. **Given** a major update, **When** Renovate opens the PR, **Then** it does not merge the PR.

---

### User Story 3 - Fewer PRs at fewer times (Priority: P3)

Renovate puts all minor updates of a repo in one PR. It opens PRs only one time each week.

**Why this priority**: fewer PRs and fewer notifications. The status page counts the open Renovate
PRs, so fewer PRs make the page easier to read.

**Independent Test**: in a repo with three minor updates available, make sure that Renovate opens
one PR for them, in the weekly time window.

**Acceptance Scenarios**:

1. **Given** two or more minor updates in one repo, **When** Renovate runs, **Then** it opens one PR
   for all minor updates.
2. **Given** a time outside the weekly window, **When** Renovate runs, **Then** it does not open new
   update PRs, except security updates.

---

### Edge Cases

- A security update is available. Renovate opens the PR at once, outside the weekly window.
- A new version of a package is a few hours old. Renovate waits a minimum of 3 days before it opens
  the PR, so that a bad or compromised release has time to be found.
- A repo has `dependabot.yml`. This feature removes it. Dependabot security alerts can stay on.
- HomeLab already has a `renovate.json` and its own Renovate workflow. Its `renovate.json` extends
  the preset and keeps only the rules that are specific to HomeLab, and its own window (FR-002).
- A PR that Renovate opened is open for more than 14 days. The status page marks the project
  (spec 001). The preset does not change this.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The `projects` repo MUST contain the preset `renovate/default.json`.
- **FR-002**: The preset MUST open update PRs only in one weekly time window, except security
  updates. Window since 2026-11-09: Saturday and Sunday, all day, Amsterdam time (the Saturday
  02:00–06:00 window was too short; research.md §14). Exception: HomeLab keeps its own window,
  Saturday 02:00–06:00 Amsterdam, and an external trigger starts its run in that window
  (Clarifications 2026-11-11).
- **FR-003**: The preset MUST put all minor updates of a repo in one PR.
- **FR-004**: The preset MUST merge patch updates automatically only when CI passes.
- **FR-005**: The preset MUST NOT merge minor or major updates automatically.
- **FR-006**: The preset MUST NOT merge an update when the repo has no CI checks.
- **FR-007**: The preset MUST wait a minimum of 3 days after a release before it opens a PR for it,
  except for security updates.
- **FR-008**: Each own project repo in the catalog with a repo and status `active` or `maintenance`
  MUST have a Renovate config file (`renovate.json`, or `.github/renovate.json` in HomeLab) that
  extends `github>ImreBoersma/projects//renovate/default`.
- **FR-009**: The `projects` repo MUST also have a `renovate.json` that extends the preset. This
  removes the Principle IV exception of spec 001.
- **FR-010**: No repo in the scope of FR-008 MUST contain `dependabot.yml` for version updates.
- **FR-011**: The update PRs MUST be from Renovate: the hosted app (`renovate[bot]`) or the
  HomeLab Renovate app (`imreboersma-homelab-renovate[bot]`). The status page (spec 001) MUST count
  the PRs of both as Renovate PRs.

### Key Entities

- **Preset**: `renovate/default.json` in `projects`. It contains the shared update rules.
- **Repo configuration**: `renovate.json` in each repo. It extends the preset.
- **Update PR**: a PR that Renovate opens. Types: patch, minor (grouped), major, security.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 0 repos in the scope of FR-008 use Dependabot for version updates.
- **SC-002**: 100% of the repos in the scope of FR-008 extend the preset.
- **SC-003**: The Maintainer merges 0 patch updates by hand when CI passes.
- **SC-004**: Each repo that uses the hosted Renovate app gets a maximum of 2 non-security update
  PRs each week (one minor group and one patch group that merges automatically), plus major
  updates. HomeLab keeps its own groups and is not in the scope of this criterion.
- **SC-005**: The feature costs €0 each month to operate.

## Assumptions

- Renovate runs as the free hosted Renovate GitHub App on the account `ImreBoersma`. HomeLab keeps
  its own Renovate workflow, because it needs `postUpgradeTasks`, and the hosted app does not run
  commands.
- CI comes from spec 002. Before spec 002 is complete, a repo without CI gets update PRs but no
  automerge (FR-006).
- The 3-day wait (FR-007) is not in PLAN.md. It is added because automerge without a wait can merge
  a compromised release.
- The weekly window is Saturday and Sunday, all day, time zone Europe/Amsterdam (HomeLab: Saturday
  02:00–06:00).
- `harmonieorkest-brummen/pretband-backend` is a repo of a different owner. This feature does not
  change it.
- Dependabot alerts (GitHub vulnerability alerts) stay on. They open no PRs, and Renovate reads
  them to find security updates. Dependabot security updates (automatic PRs) are off, so that each
  fix gets one PR, from Renovate.

## Principles Affected

| Principle | How this feature affects it |
|---|---|
| IV. Shared configuration | Adds the shared preset. Removes Dependabot. Removes the spec 001 exception. |
| VIII. Keep the work small | Automerge and grouping decrease the PRs that the Maintainer reviews. |
| X. ASD-STE100 | PR texts that the preset sets use STE. |
