# Contract: the archive suggestion on the page

## Row (spec 019 `row()`)

After the project name and the "New" badge, only for `archive.state === "suggest"`:

```html
<span class="badge badge-sm badge-ghost">Archive?</span>
```

The row stays one link to the detail view. The dot, the summary fact, `data-keys` and the filters
do not change (FR-005).

## Detail view (`modal()` facts)

A last fact group "Archive":

| State | `<dt>` | `<dd>` |
|---|---|---|
| `suggest` | Archive | `No commit, PR or issue by a person since <time datetime="2025-07-29">2025-07-29</time>.` + ` ` + link "Archive checklist" |
| `suggest`, `orEarlier` | Archive | `No commit, PR or issue by a person since <time datetime="2025-07-29">2025-07-29</time> or earlier.` + link |
| `kept` | Archive | `Kept until <time datetime="2027-06-01">2027-06-01</time>: <reason>.` (reason HTML-escaped) |
| none | (no group) | |

Dates are `YYYY-MM-DD`, as the catalog dates: "since 15 months ago" does not read well, and the
date of a past work does not change. The link opens
`https://github.com/ImreBoersma/projects/blob/main/docs/archive.md` in a new tab, as the other
links (spec 007).

## status.json

`archive` is part of the view model of each project (spec 020): the same fields as data-model.md.
