# Contract: page changes for the history

Changes the page contracts of specs 001, 005, 007 and 009. Spec 012 can change the look.

Since spec 012 (FR-006) the problem time shows as "Started <relative time>", with the UTC time in
the tooltip, and since spec 019 the bar of 30 marks is in the tab "History". The rules below for
the start, " or before", the uptime and the time to repair stay the same.

## Problems cell

After each problem text, `(since HH:MM)` when it started today (UTC), else
`(since YYYY-MM-DD, <n> days)`. When the row goes back to the start of the history, add
` or before`, for example `(since 2026-11-05 or before)`. The start is the first result that the
update read: the start of the 90-day window, or the first day file when it is newer.

## Site cell

Under the existing value (`Up 15:00`): `<p>% (30 days)` with one decimal, or `No data (30 days)`,
and a bar of 30 marks, old to new. Each mark is a small inline box with a class `up`, `down` or
`no-data` and a `title` with the date and the state. The bar has an `aria-label`:
`Uptime of the last 30 days: <n> days down, <m> days without data`.

Mark colours: tokens in `:root` and for the dark scheme. `down` uses the problem colour; `no-data`
is grey. The state is also in the `title` and the `aria-label`, so it is not only a colour.

Not shown for a project without a domain.

## Summary line

A second sentence after the summary of spec 007:

- `Average time to repair: <h> hours (<n> faults, 90 days).` Below 1 hour: whole minutes. Below
  10 hours: hours with one decimal. Up to 48 hours: whole hours. More than 48 hours: whole days.
- `No repaired faults in the last 90 days.` when there are none.

Under the summary, in small text: `History from <date>.` The date is the first day file on the
branch `data`, also when it is older than 90 days.

## Forbidden content

The rules of spec 001 stay. The history adds only numbers, dates and states.

## Pointer

Spec 012 changes the look and the order of this page: see
[specs/012-status-page-polish/contracts/page.md](../../012-status-page-polish/contracts/page.md).
