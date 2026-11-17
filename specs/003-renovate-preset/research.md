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
  timezone `Europe/Amsterdam`: Saturday 02:00 to 06:00, the same window as HomeLab. (Replaced on
  2026-11-09 by `* * * * 0,6`, §14.)
- **Rationale**: SC-004 allows a maximum of 2 non-security PRs each week. A patch group makes one
  CI run, not one for each patch. (SC-004 reworded on 2026-11-17, §13.)
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

## 13. Validation results

Facts from the GitHub API on 2026-11-17. Times in Amsterdam time (UTC+1).

**App installation**: the hosted Mend Renovate app runs in the five Node repos and `projects`
(T010); each opened PRs as `renovate[bot]` or keeps a Dependency Dashboard. HomeLab runs its own
Renovate with the app `imreboersma-homelab-renovate`. All 7 repos extend the preset and none has
`.github/dependabot.yml` (T022).

**Patch automerge (US2/AC1, FR-004)**: Renovate merged 4 patch PRs itself, each with all checks
green: Beter-dan-de-MIDI #318 (Sat 14 Nov 01:06, merged 03:53), #321 (Sat 08:16, merged 09:52),
#322 (Sun 15 Nov 03:20, merged 05:24), and boek-de-bus #9 (Sat 01:46, merged 09:21). All 4 are the
branch `renovate/patch-updates`; a group with one package gets the title of that package
("update dependency vite to v8.3.8"). The Maintainer merged no patch PR by hand (SC-003).
scales-exercises #386 (Sun 16:41) has all checks green and `renovate/stability-days` passed, but is
not merged on 2026-11-17: the app did not visit the repo after Sunday 16:42. It is expected to
merge at the next visit; not a hand merge either way.

**CI fail (US2/AC2)**: not tested with a commit (spec Clarifications 2026-11-17). Evidence:
`platformAutomerge: false` (Renovate merges, not GitHub auto-merge) and `internalChecksFilter:
strict`; Renovate merges only when all status checks of the branch pass, and each merged PR above
had all checks green. No minor, major or security PR was merged by Renovate (T020).

**PR count of the first full week, 14–15 Nov (SC-004 as reworded on 2026-11-17)**: PRs for the
Maintainer, besides majors:

| Repo | Minor group | Patch group (merges itself) | Majors |
|---|---|---|---|
| Beter-dan-de-MIDI | 0 | 3 (#318, #321, #322, merged) | 2 (#319, #320) |
| boek-de-bus | 1 (#10) | 1 (#9, merged) | 2 (#11, #12) |
| personal-website | 1 (#31) | 0 | 1 (#32) |
| Reperatie-Formulier | 0 (#118 of 7 Nov still open) | 0 | 0 |
| scales-exercises | 1 (#387) | 1 (#386, open) | 0 |
| projects | 0 | 0 | 0 |

Each repo is at 1 or 0. Beter-dan-de-MIDI shows that the patch group comes again after each merge
when more patches reach the release age of 3 days; this is why SC-004 now counts only the PRs the
Maintainer handles. All PRs were created on Saturday or Sunday (FR-002); the earliest is Sat 01:06,
the latest Sun 16:42.

**HomeLab**: the cron-job.org start (T025) works: on Sat 14 Nov the HomeLab app opened #34 (02:31),
#35 (02:32) and #36 (03:32), inside the window 02:00–06:00. None is merged automatically.

**US1/AC2 (a preset change reaches all repos)**: each repo extends
`github>ImreBoersma/projects//renovate/default`, which Renovate reads from the default branch of
`projects`. The window change on `main` (commit 569d9aa, 2026-11-09) reached the repos without a
change in the repos: the PRs of 15 Nov were opened on Sunday, which the old window (Saturday
02:00–06:00) never allowed.

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

**Correction** (review, 2026-11-11): the HomeLab run does not land in the new window either.
`.github/renovate.json` of HomeLab sets its own `"schedule": ["after 2am and before 6am on
saturday"]`, which replaces the window of the preset. Its workflow cron (`17 1 * * *` and
`17 3 * * 6`, inside that window on paper) starts 6 to 7 hours late (runs at 07:18–10:23 UTC,
2026-11-07 to 2026-11-11), so each run is after 06:00 and the Dependency Dashboard (HomeLab#15)
stays in "Awaiting Schedule". **Decision** (Maintainer, 2026-11-11): HomeLab keeps its own window,
because a merge to `main` changes the live environment. A cron-job.org job starts the HomeLab
Renovate workflow (`workflow_dispatch`) at 02:30 Amsterdam each Saturday (tasks.md T025).


**Finding 2** (T019 attempt, 2026-11-09): two ticks on the Dependency Dashboard of
Reperatie-Formulier (08:57 and 09:09 UTC) gave no "patch updates" branch. Cause: `@biomejs/biome`
2.6.6 and `tailwindcss` / `@tailwindcss/vite` 4.3.5 were released on Friday 2026-11-06, so the
group passes `minimumReleaseAge` (3 days) at 15:16 UTC on Monday. With `internalChecksFilter:
strict`, Renovate makes no branch before that, and a dashboard start does not change this. This
is the expected result of the preset. It also shows why a Saturday-only window is weak: a release
from Thursday or Friday is not old enough until Sunday or Monday. With Saturday and Sunday, it is
in the window on Sunday. T019 continues in the next weekend window.
