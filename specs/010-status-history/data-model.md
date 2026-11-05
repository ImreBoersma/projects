# Data Model: Status History on a Data Branch

## Result (one line of a day file)

| Field | Type | Rule |
|---|---|---|
| `time` | ISO 8601 UTC | time of the run |
| `projects` | map of catalog `id` → project result | only projects that are not archived |

## Project result

| Field | Type | Rule |
|---|---|---|
| `site` | `up` \| `down` \| `no-domain` \| `not-available` | the uptime state of spec 005 |
| `problems` | list of problem keys | for example `boek-de-bus/ci-failed`, `pretband/renewal-due/domain` |

No text, names or repo data (FR-008).

## History values (new, on ProjectStatus)

| Field | Type | Rule |
|---|---|---|
| `since` | map problem key → ISO time | for each open problem (research.md §4) |
| `sinceIsHistoryStart` | set of problem keys | the row goes back to the first result |
| `uptime` | `{ percent: number \| null; days: ("up" \| "down" \| "no-data")[30] }` | `null` without checks; days from old to new |

## History values (new, on StatusPage)

| Field | Type | Rule |
|---|---|---|
| `historyStart` | ISO date or `null` | date of the first stored result |
| `repair` | `{ averageMs: number; count: number } \| null` | faults closed in the last 90 days; `null` when 0 |

## Problem period

| Field | Rule |
|---|---|
| key | a fault key (`site-down`, `ci-failed`, `deploy-failed`, `cert-expiring`) |
| start | time of the first result with the key |
| end | time of the first later result in which the project is present without the key |
