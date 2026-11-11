# Quickstart: validate the Renovate preset

## Prerequisites

- The Mend Renovate GitHub App is installed on the account `ImreBoersma` for selected repos: the
  five Node repos and `projects`. HomeLab is not selected.
- The preset is on branch `003-renovate-preset` of `projects`. The validator workflow passes.

## 1. Validate the configuration

```sh
npx --yes --package renovate@<version> -- renovate-config-validator --strict --no-global renovate/default.json renovate.json
```

Expected: "Config validated successfully" for both files.

## 2. Test on one repo before the merge (constitution, Development Workflow)

1. In scales-exercises, add `renovate.json` that extends
   `github>ImreBoersma/projects//renovate/default#003-renovate-preset`. Remove
   `.github/dependabot.yml`. Merge.
2. Open the "Dependency Dashboard" issue. Expected: it lists the updates, with "Awaiting Schedule"
   or "Pending Status Checks" for updates that are less than 3 days old (FR-007).
3. On the dashboard, select the "patch updates" group to start it now. Expected: one PR with all
   patch updates. CI runs. When CI passes, Renovate merges the PR (FR-004). The author is
   `renovate[bot]`.
4. If a "minor updates" PR exists, expected: one PR for all minor updates, not merged (FR-003, FR-005).

## 3. Merge the preset

1. Merge `003-renovate-preset` into `main`.
2. In scales-exercises, remove `#003-renovate-preset` from the reference.

## 4. Each other repo

Add the `renovate.json` of [contracts/preset.md](./contracts/preset.md), remove
`.github/dependabot.yml`, change the settings of the table. Expected: CI passes on the PR, and a
Dependency Dashboard issue appears after the merge.

## 5. HomeLab

Add the preset to `.github/renovate.json`. HomeLab keeps its own window (Saturday 02:00–06:00
Amsterdam); a cron-job.org job starts its run in that window (research §14). Run the Renovate
workflow manually. Expected: the run
passes, and no PR has automerge.

## 6. Status page

Run the status page. Expected: the Renovate PR counts include the HomeLab PRs of
`imreboersma-homelab-renovate`.

## 7. Security update

Not testable on request. When GitHub reports a vulnerability in a repo, expected: a PR with the
label `security` on the same day, also outside the weekend window.
