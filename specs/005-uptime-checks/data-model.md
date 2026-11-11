# Data Model: Uptime Checks on the Status Page

No stored data. Each status run makes these values again.

## Project (changed)

| Field | Type | Rule |
|---|---|---|
| `domain` | host name or null | from the catalog; empty is null; must pass the host name rule (research.md §8, FR-009) |

## Uptime

One result for each row of the page.

| Value | When | Page text |
|---|---|---|
| `up` | an attempt gives status 200–299 after redirects, within 10 seconds | Up |
| `down` | both attempts fail (research.md §3, §4) | Down |
| `no-domain` | the project has no `domain` | No domain (superseded by spec 012 FR-011: no Site group) |
| `not-available` | 2 or more domains and all are down in this run (FR-008) | Check not available |

Field on `ProjectStatus`: `uptime: { state: "up" | "down" | "no-domain" | "not-available"; at: Date | null }`.
`at` is the time of the check; it is `null` for `no-domain`.

## Problem (changed)

New reason `site-down`, key `<project id>/site-down`.

| Rule | Source |
|---|---|
| A row with `uptime.state = "down"` gets the problem `site-down`, also when the row has no repo or no repo data | FR-007, research.md §6 |
| `not-available` gives no problem, and the open `site-down` issues stay open | FR-008 |
| Rows with problems come first (spec 001) | FR-007 |

## State changes of a `site-down` issue

```text
up/no issue --two failed attempts--> down --issues job--> issue open
down/issue open --still down--> no second issue
down/issue open --up--> issue closed
any --all sites down--> not-available --> no change to issues
```
