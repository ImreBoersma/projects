# Contract: status page content

One public page at the GitHub Pages URL of `projects`. Text uses ASD-STE100.

## Header

- Title: "Project status".
- "Last update: <YYYY-MM-DD HH:MM> UTC" (FR-013).
- Warning, shown by an inline script when the update is more than 48 hours old:
  "Warning: this data is more than 48 hours old."

## Table: one row for each non-archived project

| Column | Value |
|---|---|
| Project | `name`, with the `status` (`active` or `maintenance`) |
| Problems | the reasons as short text, or empty |
| Last commit | date `YYYY-MM-DD` |
| Open PRs | number |
| Renovate PRs | number, and the age of the oldest in days |
| CI | Passed / Failed / Unknown |
| Last deploy | date and Succeeded / Failed / In progress, or Unknown |

- `no-repo` row: "No repo" in all data columns, no problems.
- `unavailable` row: "Data not available" in all data columns, no problems.
- Rows with problems first, then by name (FR-010).

## Problem text

| reason | Text |
|---|---|
| `ci-failed` | The last CI run failed. |
| `deploy-failed` | The last deploy failed. |
| `renovate-stale` | A Renovate PR is open for more than 14 days. |
| `inactive` | No commit for more than 90 days. |

## Forbidden content (FR-016, FR-018)

Commit messages, PR titles, branch names, user names, tokens, cost, stakeholder names. A test in
`render.test.ts` MUST make sure that fixture values for these fields do not occur in the output.
