# Research: Shared Renovate Preset

Facts about the repos are from the GitHub API on 2026-11-02.

## 1. Current state

| Repo | Dependabot | Renovate now | Vulnerability alerts |
|---|---|---|---|
| Beter-dan-de-MIDI | `.github/dependabot.yml` | none | on |
| boek-de-bus | none | none | off |
| personal-website | `.github/dependabot.yml` | none | on |
| Reperatie-Formulier (private) | `.github/dependabot.yml` | none | on |
| scales-exercises | `.github/dependabot.yml` | none | on |
| HomeLab (private) | none | self-hosted, `.github/renovate.json`, own GitHub App | — |
| projects | none | none | off |

- **Finding**: HomeLab runs Renovate in its own workflow with the GitHub App
  `imreboersma-homelab-renovate`, because it needs `postUpgradeTasks` (the hosted app does not run
  commands). Its PRs come from that app, not from `renovate[bot]`. HomeLab automerges nothing: a
  merge deploys to a self-hosted runner on the home network.
- **Finding**: the shared CI of spec 002 exists in all five Node repos. Automerge can use it.

## 2. Which Renovate runs the repos

- **Decision**: the free hosted Mend Renovate GitHub App, installed for selected repos: the five
  Node repos and `projects`. HomeLab keeps its self-hosted Renovate and is not selected.
- **Rationale**: €0, no workflow to keep. If the app also ran on HomeLab, each update would come
  twice (HomeLab workflow comment).
- **Alternatives considered**: one self-hosted Renovate workflow in `projects` for all repos (a
  token for all repos, and one more workflow to maintain).

## 3. Automerge without branch protection

- **Decision**: `automerge: true` for patch updates with `platformAutomerge: false`.
- **Rationale**: no repo has branch protection with required checks. GitHub auto-merge then merges a
  PR at once, before CI completes. With `platformAutomerge: false`, Renovate merges the PR itself,
  and only when all checks pass (FR-004). Renovate does not automerge when a branch has no checks,
  unless `ignoreTests` is set (FR-006). The preset does not set it.
- **Alternatives considered**: branch protection with required check `ci / ci` in each repo (a
  setting in each repo, and a direct push to `main` stops working for the Maintainer).

## 4. Grouping and schedule

- **Decision**: one group "patch updates" (automerge) and one group "minor updates" (no automerge).
  Major updates are separate PRs (`config:recommended` default). Schedule `* 2-5 * * 6` with
  timezone `Europe/Amsterdam`: Saturday 02:00 to 06:00, the same window as HomeLab.
- **Rationale**: SC-004 allows a maximum of 2 non-security PRs each week. A patch group makes one
  CI run, not one for each patch.
- **Risk accepted**: one bad patch stops the automerge of the full patch group. The PR stays open,
  and the status page marks it after 14 days (spec 001).

## 5. Release age

- **Decision**: `minimumReleaseAge: "3 days"` with `internalChecksFilter: "strict"`.
- **Rationale**: FR-007. `strict` stops Renovate from making the branch before the release is 3 days
  old, so no PR waits with a pending check.

## 6. Security updates

- **Decision**: keep the `vulnerabilityAlerts` defaults of Renovate (no schedule, no release age)
  and add the label `security`. Turn on GitHub vulnerability alerts in boek-de-bus and `projects`.
  Turn off "Dependabot security updates" in all repos in scope.
- **Rationale**: Renovate reads the GitHub vulnerability alerts. Without alerts it does not find
  security updates. Dependabot security updates would open a second PR for the same fix.

## 7. Shared workflows and GitHub Actions

- **Decision**: the preset disables updates for `ImreBoersma/projects` (the `@main` calls of spec
  002). The `renovate.json` of `projects` turns off automerge for the `github-actions` manager.
- **Rationale**: a version change of an action in a shared workflow reaches all repos. The
  constitution requires a test on a real repo before such a change goes to `main`.

## 8. Dependency dashboard

- **Decision**: `config:recommended` makes a "Dependency Dashboard" issue in each repo. Keep it.
- **Rationale**: it shows updates that wait for the schedule or the release age, and it can start
  an update at once. It is the only Renovate view without a Renovate account.

## 9. Renovate PRs on the status page (FR-011)

- **Decision**: the status page counts a PR as a Renovate PR when the author login is `renovate`,
  `renovate[bot]`, or ends with `-renovate` or `-renovate[bot]`.
- **Rationale**: HomeLab PRs come from `imreboersma-homelab-renovate`. Without this change, the
  status page counts 0 Renovate PRs for HomeLab and never marks a stale HomeLab update.
- **Alternatives considered**: one fixed list of logins in the code (a code change for each new
  Renovate app).

## 10. Test of the preset before the merge

- **Decision**: one repo extends `github>ImreBoersma/projects//renovate/default#003-renovate-preset`
  for the test. After the merge, it changes to the default branch.
- **Rationale**: constitution, Development Workflow. Renovate supports a branch in a preset
  reference.

## 11. Validation of the configuration

- **Decision**: a workflow in `projects` runs `renovate-config-validator` (fixed version) on
  `renovate/default.json` and `renovate.json` on each push and PR that changes them.
- **Rationale**: an error in the preset stops Renovate in all repos. Renovate reports a config error
  only in an issue in each repo.

## 12. CI on pull requests in `projects`

- **Decision**: `status-page.yml` also runs on `pull_request` for `projects.yaml` and `status/**`.
  On a PR, only job `build` runs: install, lint, test and the page build. Job `deploy` (shared
  workflow, no deploy for a PR) and job `issues` (`if: github.event_name != 'pull_request'`) do
  not change anything.
- **Rationale**: without a check on the PR, Renovate never merges an update of `status/` (FR-006),
  and the update is not tested before it reaches `main` (SC-003, FR-004).
- **Alternatives considered**: `ci-node.yml` of spec 002 for `status/` (it expects the package in the
  repo root).

## 14. The update window was too short (2026-11-09)

**Finding**: on Saturday 2026-11-07 the window `* 2-5 * * 6` (02:00–06:00 Amsterdam) gave one PR
in 5 hosted-app repos (Reperatie-Formulier #118, 04:15 UTC). The other 4 repos still had their
patch and minor groups under "Awaiting Schedule" on 2026-11-09: the hosted app visits a repo
every few hours at no fixed time, so a 4-hour weekly window is often missed. HomeLab never fits:
its self-hosted Renovate runs from a daily GitHub cron at about 07:00–08:00 UTC (08:00–09:00
Amsterdam), after the window.

**Decision** (Maintainer, 2026-11-09): `* * * * 0,6`, Saturday and Sunday all day. The hosted app
visits each repo several times in 48 hours; the HomeLab run lands on both days. Still one batch
of PRs a week, so SC-004 stays. The research decision §2 ("the same window as HomeLab") is
replaced.


**Finding 2** (T019 attempt, 2026-11-09): two ticks on the Dependency Dashboard of
Reperatie-Formulier (08:57 and 09:09 UTC) gave no "patch updates" branch. Cause: `@biomejs/biome`
2.6.6 and `tailwindcss` / `@tailwindcss/vite` 4.3.5 were released on Friday 2026-11-06, so the
group passes `minimumReleaseAge` (3 days) at 15:16 UTC on Monday. With `internalChecksFilter:
strict`, Renovate makes no branch before that, and a dashboard start does not change this. This
is the expected result of the preset. It also shows why a Saturday-only window is weak: a release
from Thursday or Friday is not old enough until Sunday or Monday. With Saturday and Sunday, it is
in the window on Sunday. T019 continues in the next weekend window.
