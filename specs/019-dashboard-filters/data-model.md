# Data Model: Status Page Filters, Sorting and Detail Views

Made by the generator from `ProjectStatus` (specs 001–015). Nothing is stored.

## Row (one project)

| Field / attribute | Value |
|---|---|
| `id` | catalog id; the modal is `#p-<id>` |
| `data-name` | project name, lower case |
| `data-state` | `bad` \| `warn` \| `unknown` \| `good` (`rowKind` of spec 012) |
| `data-stakeholder` | catalog `stakeholder` or empty |
| `data-site` | `yes` when the project has a domain, else `no` |
| `data-commit` | ISO time of the last commit, or empty (sorts last) |
| `data-expiry` | `YYYY-MM-DD` of the nearest certificate, renewal or secret date, or empty (sorts last) |
| `data-order` | the position in the list of the run: problems first, then name order (tie-break; decision 2026-11-11) |
| summary | `summaryFact` (research.md §5): text and kind |

## View (the page address)

| Field | Values | Default |
|---|---|---|
| `q` | text, case-insensitive part of the name | empty |
| `state` | `problems`, `warnings`, `not-available`, `correct`, empty | empty (all) |
| `stakeholder` | a catalog stakeholder value, empty | empty (all) |
| `site` | `yes`, `no`, empty | empty (all) |
| `sort` | `state`, `name`, `commit`, `expiry` | `state` |
| `tab` | `projects`, `campaigns`, `tokens`, `history` | `projects` |
| hash | `#p-<id>` | none |

`state=problems` ↔ `data-state=bad`, `warnings` ↔ `warn`, `not-available` ↔ `unknown`,
`correct` ↔ `good`. An unknown value is ignored and gives a note.

## Sort keys

- `state`: `bad` < `warn` < `unknown` < `good`, then `data-order`.
- `name`: `data-name`, then `data-order`.
- `commit`: oldest `data-commit` first; empty last.
- `expiry`: nearest `data-expiry` first; empty last.

## Tab counts

- Projects: the number of rows with `bad` (problem count).
- Campaigns: the number of campaigns with failed CI.
- Shared tokens: the number of shared problems plus "No expiry" names.
- History: no count.
