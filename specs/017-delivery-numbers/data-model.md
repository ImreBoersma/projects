# Data Model: Delivery Numbers for Each Project

## RawDelivery (read, not stored)

| Field | Type | Rule |
|---|---|---|
| `prs` | `{ createdAt, mergedAt, bot: boolean }[]` | merged PRs with `mergedAt ≥` window start |
| `deploys` | `string[]` | `createdAt` of production deploys with `createdAt ≥` window start |

## DeliveryRow

| Field | Type | Rule |
|---|---|---|
| `projectId` | string | catalog id; project not archived, with a repo |
| `name` | string | catalog name |
| `state` | `"ok"` or `"not-available"` | `not-available`: no token, HTTP or GraphQL error, or `null` repository |
| `merged` | number | count of `prs` |
| `updates` | number | count of `prs` with `bot` |
| `updateHours` | number[] | `(mergedAt − createdAt)` in hours, of the updates |
| `otherHours` | number[] | the same, of the other PRs |
| `deploys` | number | count of `deploys` |
| `months` | `[string, number][]` | 4 or 5 entries (research §4), oldest first: `YYYY-MM` and the count |

The durations stay in the row so that the total row can take the median of all of them (FR-004).

## DeliveryTotal (computed from the `ok` rows)

`merged`, `updates`, `deploys`: sums; `months`: sums for each month; `updateHours`,
`otherHours`: all durations of the rows together.

## StatusPage

New optional field `delivery?: { rows: DeliveryRow[]; months: string[] }`. Without it (tests,
issues mode), the History tab shows no Delivery table.
