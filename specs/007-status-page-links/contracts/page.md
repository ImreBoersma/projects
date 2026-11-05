# Contract: page changes

Changes the page contracts of spec 001 and spec 005. Text uses ASD-STE100.

## Header

```text
Project status
Roadmap · Project board                          (links, research.md §7)
Last update: <YYYY-MM-DD HH:MM> UTC
[Warning: this data is more than 3 hours old.]   (spec 005)
<summary line>
```

## Summary line (FR-007)

| State | Text |
|---|---|
| problems | `<n> problems in <m> projects. <k> projects without a problem. <u> of <c> sites are up.` |
| no problems | `No problems. <k> projects. <u> of <c> sites are up.` |
| no site checked | the site sentence is not shown |

Use "problem" and "project" in the singular when the number is 1.

## Cells

Each link rule is in [data-model.md](../data-model.md), "Links of a row". The cell text does not
change. A cell without a source has no link.

Each `<td>` has `data-label="<column name>"` for the card layout.

## Card layout (FR-008)

At a width of 600 pixels or less:

- Each row is a card with a border and a gap to the next card.
- Each cell is one line: column name, then value.
- The header row of the table is hidden.
- The page has no horizontal scroll at 360 pixels.

## Link style (FR-012)

- Links have an underline.
- `:focus-visible` gives a 2-pixel outline.
- Link colours are defined in `:root` and again for the dark scheme.

## Forbidden content

The rules of spec 001 stay (FR-016, FR-018). Links contain only: the catalog repo, the catalog
domain, the commit id, the Renovate app login, issue numbers of `projects` and fixed GitHub paths.
`render.test.ts` checks that the fixture values for commit messages, PR titles, branch names and
user names do not occur in the output, also not in links.

## Pointer

Spec 012 (design revision 2026-11-05) replaces the table and the card layout of this contract with a list: see
[specs/012-status-page-polish/contracts/page.md](../../012-status-page-polish/contracts/page.md).
