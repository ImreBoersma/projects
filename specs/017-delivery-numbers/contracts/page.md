# Contract: the Delivery table in the tab "History"

After the uptime list of the History panel:

```html
<h3 class="mt-6 mb-2 text-sm font-semibold">Delivery (90 days)</h3>
<p class="mb-2 text-sm">Merged PRs and production deploys of the last 90 days. An update is a PR
of a bot (Renovate, Dependabot). Times are medians from open to merge.</p>
<div class="overflow-x-auto">
<table class="data-table text-sm">
<thead><tr><th scope="col">Project</th><th scope="col">Merged PRs</th><th scope="col">Updates</th>
<th scope="col">Update time</th><th scope="col">Other PR time</th><th scope="col">Deploys</th></tr></thead>
<tbody>
<tr><th scope="row">scales-exercises</th><td>58</td><td>47</td><td>33 h</td><td>&lt; 1 h</td>
<td>6 <span class="opacity-60" aria-hidden="true">· 0/0/1/5</span><span class="sr"> (August 0, September 0, October 1, November 5)</span></td></tr>
<tr><th scope="row">HomeLab</th><td>22</td><td>20</td><td>2 d</td><td>1 h</td><td>—</td></tr>
<tr><th scope="row">pretband-backend</th><td colspan="5">Not available</td></tr>
</tbody>
<tfoot><tr><th scope="row">Total</th><td>…</td><td>…</td><td>…</td><td>…</td><td>…</td></tr></tfoot>
</table></div>
```

| Cell | Rule |
|---|---|
| Project | the catalog name, no link (the projects list has the links) |
| Merged PRs, Updates | counts; 0 when there are none |
| Update time, Other PR time | median, the time text of research §5; "—" without PRs |
| Deploys | total, then the month counts (4 or 5) as small text, oldest first; "—" when the total is 0 |
| Not available | one cell, `colspan="5"`; the row is not in the total |
| Total | `<tfoot>`, the sums and the medians of all durations (FR-004) |

- Month names for screen readers: English month names (UTC) of the months of the window.
- The CSS class `versions` of spec 016 becomes `data-table`, used by both tables.
- No problem, no issue, no badge, no change to the total state or `status.json`.
