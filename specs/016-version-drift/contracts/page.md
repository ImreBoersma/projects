# Contract: the tab "Versions"

## Tab

- Label "Versions", `data-tab="versions"`, `href="?tab=versions"`, between "Shared tokens" and
  "History". With one or more marked rows: `<span class="badge badge-sm badge-warning ml-1">n</span>`.
- `?tab=versions` opens it (client `pick`); the ⌘K box has the item "Tab: Versions".

## Panel (`#tab-versions`)

Title "Versions". Above the table, one line: "The versions that each repo asks for. A marked
version is one or more major versions behind the newest repo."

```html
<div class="overflow-x-auto">
<table class="versions text-sm">
<thead><tr><th scope="col">Repo</th><th scope="col">Node</th><th scope="col">Bun</th>
<th scope="col">Next.js</th><th scope="col">React</th><th scope="col">TypeScript</th>
<th scope="col">Biome</th><th scope="col">@types/node</th></tr></thead>
<tbody>
<tr><th scope="row"><a href="https://github.com/ImreBoersma/boek-de-bus" target="_blank" rel="noopener" aria-describedby="nt">boek-de-bus</a></th>
<td title="default of ci-node.yml">24 <span class="opacity-60">(default)</span></td>
<td title="bun.lock">newest (CI)</td>
<td title="dependencies">16.4.1</td>
<td title="dependencies">19.2.4</td>
<td class="drift" title="devDependencies; 2 major versions behind 7">^5<span class="sr"> (2 major versions behind 7)</span></td>
<td title="devDependencies">2.2.0</td>
<td class="drift" title="devDependencies; 6 major versions behind 26">^20<span class="sr"> (6 major versions behind 26)</span></td></tr>
</tbody></table></div>
```

| Cell | Text |
|---|---|
| tool not used | "—" |
| Node from the shared default | "24 (default)" |
| Bun without a version, with a lock file | "newest (CI)" |
| not a number range, safe text | the text, no mark |
| not a number range, not safe | "Other" |
| row `not-available` | "Not available" in the first tool cell, `colspan="7"` |

- Repo label: the name after `/`; the full `owner/name` in the link.
- Rows in catalog order. No sort, no filter (Principle VIII).
- `.drift`: `▼` before the text through `::before` (not in a copy), a background
  `color-mix(in oklab, var(--color-warning) 35%, var(--color-base-100))`, the text in the base text
  colour. The contrast test checks base text on this mix in both themes (≥ 4.5).
- Without versions on the page: "No version data."

## Not changed

`status.json`, the projects list, the detail modals, the dots, the total state, the issues.
