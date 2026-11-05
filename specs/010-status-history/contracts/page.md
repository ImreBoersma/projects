# Contract: page changes for the history

Changes the page contracts of specs 001, 005, 007 and 009. Spec 012 can change the look.

## Problems cell

After each problem text, `(since HH:MM)` when it started today (UTC), else
`(since YYYY-MM-DD, <n> days)`. When the row goes back to the start of the history, add
` or before`, for example `(since 2026-11-05 or before)`.

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

- `Average time to repair: <h> hours (<n> faults, 90 days).` (or minutes when less than 1 hour,
  days when more than 48 hours)
- `No repaired faults in the last 90 days.` when there are none.

Under the summary, in small text: `History from <date>.`

## Forbidden content

The rules of spec 001 stay. The history adds only numbers, dates and states.
