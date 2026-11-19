# Data Model: Website Quality Checks

## QualityLevel

`"good" | "warn" | "poor" | "not-checked"`. The page maps them to the badge kinds of spec 012:
`good`, `warn`, `bad`, `unknown`.

## QualityCheck (one site, one day)

| Field | Type | Rule |
|---|---|---|
| `projectId` | string | A catalog id with a `domain`, not archived. |
| `domain` | string | From the catalog. |
| `checkedAt` | ISO time | The time of the run. |
| `speed` | SpeedResult | FR-002, research.md §3. |
| `accessibility` | AccessibilityResult | FR-002. |
| `links` | LinkResult | FR-002, FR-005. |
| `headers` | HeaderResult | FR-002, research.md §5. |

## SpeedResult

| Field | Type | Rule |
|---|---|---|
| `level` | QualityLevel | Score bands; poor when a field metric is SLOW. |
| `score` | number \| null | 0 to 100. |
| `field` | `{ source: "url" \| "origin"; lcpMs?: number; inpMs?: number; cls?: number; slow: string[] }` \| null | null = "Lab test only". `slow` lists the metric names with category SLOW. |
| `report` | string | `https://pagespeed.web.dev/analysis?url=https://<domain>/&form_factor=mobile` |

## AccessibilityResult

| Field | Type | Rule |
|---|---|---|
| `level` | QualityLevel | Score bands. |
| `score` | number \| null | 0 to 100. |
| `failed` | number \| null | Audits with weight > 0 and score 0. |
| `report` | string | The same PSI report link. |

## LinkResult

| Field | Type | Rule |
|---|---|---|
| `level` | QualityLevel | good: 0 broken, 0 blocked; warn: 0 broken, ≥ 1 blocked; poor: ≥ 1 broken. |
| `pages` | number | Pages read (≤ 50). |
| `broken` | `{ url: string; page: string; status: number \| "error" }[]` | All broken links (the page shows 10). |
| `blocked` | number | Links to other hosts with 403, 429 or 999. |

## HeaderResult

| Field | Type | Rule |
|---|---|---|
| `level` | QualityLevel | 4 good; 1 to 3 warn; 0 poor. |
| `present` | string[] | Of `strict-transport-security`, `content-security-policy`, `x-content-type-options`, `referrer-policy`. |
| `missing` | string[] | The other ones. |
| `report` | string | `https://developer.mozilla.org/en-US/observatory/analyze?host=<domain>` |

A result with level `not-checked` has null values and an empty list; the day file keeps the
reason in `note` (`"no key"`, `"site down"`, `"service error"`), never an error text from the
site.

## QualityDay (the day file)

`{ version: 1, date: "YYYY-MM-DD", checks: QualityCheck[] }`. See
[contracts/quality-file.md](./contracts/quality-file.md).

## QualityIssue state

| From | Event | To |
|---|---|---|
| none | poor kinds of today ∩ poor kinds of the previous day file ≠ ∅ | open, body lists poor kinds of today |
| open | the poor kinds of today change, and are not empty | open, body updated |
| open | no kind is poor today, and at least one kind was checked | closed, with a comment |
| open | all 4 kinds not checked today | open, no change |

## Page view of a site (with fallback)

The page does not show the newest `QualityCheck` as it is. For each kind, it takes the result of
the newest day file; when that result is `not-checked`, it takes the newest earlier day file of
the last 30 days where that kind was checked, and sets `from: "YYYY-MM-DD"` (the date of that
file) on the result. A result without `from` is from the newest file. The issue rule does not use
this view (research.md §7).

## Changes to existing types

- Each result type gets the optional field `from?: string` (page view only; never in a day file).
- `ProjectStatus.quality?: QualityCheck` (page mode only, the page view above).
- `StatusPage.qualityDate?: string | null` (the date of that file; null when there is none).
