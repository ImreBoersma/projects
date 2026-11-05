# Data Model: Renewals and Certificate Expiry

No stored data. Each run makes these values again.

## Project (changed)

| Field | Type | Rule |
|---|---|---|
| `renewals` | list of `{ name: string; date: string }` | from catalog field `renewal`; `name` non-empty, at most 40 characters, unique in the project without case; `date` `YYYY-MM-DD` and a real date |

## Expiry (new, on ProjectStatus)

| Field | Type | Rule |
|---|---|---|
| `certificate` | `{ date: string; days: number } \| "not-known" \| null` | `null` when there is no domain |
| `renewals` | list of `{ name; date; days; source: "catalog" \| "registry" }` | catalog renewals plus the registry "Domain"; for a "Domain" in both, the earlier date |
| `registryNotKnown` | boolean | the project has a registered domain, the registry gives no date in this run, and the catalog has no "Domain"; `false` for a domain that is not registered (RDAP 400/404) |

## Problem (changed)

| Field | Rule |
|---|---|
| `reason` | new values `cert-expiring`, `renewal-due` |
| `key` | `<id>/cert-expiring`, `<id>/renewal-due/<slug>` (research.md §6) |
| `text` | optional; the page and the issue title use it instead of the fixed text |

## Limits

| Value | Problem when |
|---|---|
| certificate days | 14 or less |
| renewal days | 30 or less, also negative |
| "not known" | never |
