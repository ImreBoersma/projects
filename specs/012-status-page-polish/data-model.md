# Data Model: Status Page Visual Polish

All values are calculated in `view.ts` from the existing `StatusPage` (spec 001, 007, 009, 010).
Nothing is stored.

## TotalState

| Field | Type | Rule |
|---|---|---|
| `kind` | `"correct" \| "problems" \| "not-available"` | `problems` when the number of problems > 0; else `not-available` when one or more rows have "check not available" (research.md §4); else `correct`. |
| `problems` | number | Sum of `problems.length` of all rows (same count as the summary line of spec 007). |
| `text` | string | `All correct`, `1 problem`, `<n> problems`, `Check not available`. |
| `title` | string | `(<n>) Project status` when `problems` > 0, else `Project status`. |

## Section

| Field | Type | Rule |
|---|---|---|
| `id` | `"problems" \| "not-available" \| "other"` | |
| `title` | string | `Projects with problems`, `Check not available`, `Other projects`. |
| `rows` | `ProjectStatus[]` | Catalog order. Each row is in exactly one section. Empty sections do not show. |

## BadgeKind

`"good" | "warn" | "bad" | "unknown"`.

| Value | Kind |
|---|---|
| Site `up` / `down` / `not-available` | good / bad / unknown |
| CI `passed` / `failed` / `unknown` | good / bad / unknown |
| Deploy `succeeded` / `failed` / `in-progress` / unknown | good / bad / unknown / unknown |
| Certificate days: ≤ 14 / 15–28 / > 28 / not known | bad / warn / good / unknown |
| Renewal days: ≤ 30 / 31–60 / > 60 | bad / warn / good |
| `Data not available`, `No repo`, `Unknown` | unknown |

Limits come from `CERT_LIMIT` and `RENEWAL_LIMIT` of `expiry/expiry.ts`; the warning limit is two
times that value.

## RelativeTime

`relTime(isoTime: string, nowMs: number): string`. Rules: research.md §3. Self-contained, no
outside values (it is copied into the inline script).
