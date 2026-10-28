# Data Model: Project Status Page

All data is in memory during one run. Nothing is stored, except the issues (see research.md §6).

## Project (from `projects.yaml`)

| Field | Type | Rule |
|---|---|---|
| `id` | string | Required. Unique. Lowercase, `a-z0-9-`. Used in issue markers. |
| `name` | string | Required. Shown on the page. |
| `repo` | string or empty | `owner/name`. Empty when the project has no repo. |
| `status` | `active` \| `maintenance` \| `archived` | Required. |
| `stack`, `host`, `domain`, `stakeholder`, `renewal` | various | Read by other tools. This feature ignores them. |

Validation (FR-015): the run fails if an `id` is missing or not unique, a `status` is not one of
the three values, or `repo` is not in the `owner/name` format. Full schema:
[contracts/catalog.md](./contracts/catalog.md).

## ProjectStatus (one for each non-archived project)

| Field | Type | Source |
|---|---|---|
| `project` | Project | catalog |
| `availability` | `ok` \| `no-repo` \| `unavailable` | `no-repo` if `repo` is empty; `unavailable` if the query failed for this repo |
| `lastCommitAt` | date or null | head commit of the default branch |
| `openPrCount` | number | open PRs, including Renovate PRs |
| `renovatePrCount` | number | open PRs by `renovate` or `renovate[bot]` |
| `oldestRenovatePrAt` | date or null | oldest `createdAt` of those PRs |
| `ci` | `passed` \| `failed` \| `unknown` | research.md §2 |
| `deploy` | `{ at: date, result: succeeded \| failed \| in-progress }` or `unknown` | research.md §3 |
| `problems` | Problem[] | FR-009 |

## Problem

| Field | Type | Rule |
|---|---|---|
| `projectId` | string | |
| `reason` | `ci-failed` \| `deploy-failed` \| `renovate-stale` \| `inactive` | |
| `key` | string | `<projectId>/<reason>`. Used in the issue marker. |
| `startedAt` | date | Not calculated. It is the `created_at` of the open issue for this `key` (research.md §6). |

Rules (`now` = start time of the run):

- `ci-failed`: `ci = failed`.
- `deploy-failed`: `deploy.result = failed`.
- `renovate-stale`: `oldestRenovatePrAt` is more than 14 days before `now`.
- `inactive`: `status = active` and `lastCommitAt` is more than 90 days before `now`. If
  `lastCommitAt` is null, there is no `inactive` problem.
- A ProjectStatus with `availability` `no-repo` or `unavailable` has no problems.

## StatusPage

| Field | Type |
|---|---|
| `generatedAt` | date and time, UTC |
| `rows` | ProjectStatus[], sorted: projects with problems first, then by `name` |

## State changes of a problem issue

```text
(no issue) --problem found--> open --problem not found--> closed
                                ^                            |
                                +----problem found again-----+  (new issue, not reopen)
open --project "unavailable"--> open (no change)
```

A problem that comes back gets a new issue, so that each issue has one start date.
