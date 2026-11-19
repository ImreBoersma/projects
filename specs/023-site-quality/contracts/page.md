# Contract: Page, Data File and Stakeholder Sentence

## Tab "Quality"

After the tab "Versions". Address `?tab=quality`. Heading line: `Checked on <date>` (the date of
the newest day file), or `Not checked yet` when there is no file.

| Site | Speed (phone) | Accessibility | Broken links | Security headers |
|---|---|---|---|---|
| harmonieorkestbrummen.nl | `Warning 71` · Lab test only · Report | `Good 96` · 1 rule fails · Report | `Poor: 1 broken` + list (≤ 10) | `Warning: 2 of 4` · missing names · Report |

- Each level is a badge with text and colour (spec 012): `Good`, `Warning`, `Poor`, `Not checked`.
- With field data, the speed cell adds `Real users: LCP <s> s, INP <ms> ms, CLS <value>`.
- More than 10 broken links: `and <n> more`; it links to the quality issue when the run knows its
  number (T033), else it is plain text.
- A result from an earlier day file (fallback, research.md §7) adds `from <d MMM>` to the cell, for
  example `Good 94 · from 17 Nov`. A site whose newest check is "not checked" and that has no
  earlier result in 30 days shows `Not checked` with the note (`Site down`, `No key`,
  `Service error`).
- All report links open a new tab, with the mark of spec 012.
- The tab count badge shows the number of sites with a poor result.

## Project pop-up (spec 019)

A block "Quality" with the same 4 cells, for a project with a `domain`, but without the list of
broken links (the count only; the tab has the list). Implementation note 2026-11-18: with the list
in each pop-up, the 20-site worst case was 31.4 KB gzip; without it, and with the path as the link
text, 27.7 KB (FR-013).

## Row state

A warning or poor quality result makes `rowKind` `warn` (FR-006). It does not add a problem, does
not change the total state, the favicon, the tab title or `changes`.

## status.json

Each project with a site gets `site.quality`:

```json
{
  "checkedAt": "2026-11-19T04:44:10Z",
  "speed": { "level": "warn", "score": 71, "field": null, "report": "…" },
  "accessibility": { "level": "good", "score": 96, "failed": 1, "report": "…" },
  "links": { "level": "poor", "pages": 38, "broken": 1, "blocked": 2 },
  "headers": { "level": "warn", "missing": ["content-security-policy", "referrer-policy"], "report": "…" }
}
```

`links.broken` is a count here; the list is in the issue and on the page. `null` when the site
is not checked yet. `version` stays 1: the field is new, and readers ignore unknown fields.

## Stakeholder page (spec 022)

In the site block, after the uptime sentence:

| Speed level | Sentence |
|---|---|
| good | `De website laadt snel op een telefoon.` |
| poor | `De website laadt langzaam op een telefoon. De beheerder weet het.` |
| warn, not checked, no file | (no sentence) |

The top line does not change. The forbidden-word test of spec 022 also checks that the page has
no score, "accessibility", header name or report link.
