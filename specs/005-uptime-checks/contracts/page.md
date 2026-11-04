# Contract: page changes

Changes the page contract of spec 001 (`specs/001-project-status-page/contracts/page.md`).

## New column "Site"

After the column "Problems", before "Last commit".

| `uptime.state` | Cell text |
|---|---|
| `up` | `Up HH:MM` (UTC time of the check) |
| `down` | `Down HH:MM` |
| `no-domain` | `No domain` |
| `not-available` | `Check not available` |

The column shows the value also in rows with `no-repo` or `unavailable` repo data. Those rows
keep "No repo" or "Data not available" in the other data columns.

The cell never shows site content, an HTTP status or an error text (FR-011).

## Stale warning

The warning of the header shows when the update is more than **3 hours** old (spec 001 used 48
hours). Text: "Warning: this data is more than 3 hours old."

## New problem text

| reason | Text |
|---|---|
| `site-down` | The site does not respond correctly. |

## Issue

Same format as `specs/001-project-status-page/contracts/issue.md`. Title:
`<project name>: The site does not respond correctly.` Marker:
`<!-- status-problem: <id>/site-down -->`. The board sync of spec 004 adds the issue to the board
with the Project of the marker.

## Tests

`render.test.ts` checks the four cell texts and that a fixture error text (for example
`certificate has expired`) does not occur in the output.
