# Research: Status App Basics

## 1. The changes of the last 24 hours (fallback of clarification 1)

**Decision**: `recentChanges(results, now)` in `status/src/history/stats.ts`, from the stored
results of spec 010 plus the current one: take the newest result at or before `now - 24 h` (the
"old" result) and the current result. Started = keys in the current result, not in the old one.
Stopped = keys in the old result, not in the current one, for a project that is still in the
catalog. Without an old result (history shorter than 24 hours): compare with the first result.

The history lines store keys only, not texts. The text of a stopped problem is made from its key:
the project name and `PROBLEM_TEXT` of its reason (for example "hob.nl: The last CI run failed.").

**Rationale**: no new data; the history already holds each hourly result.

## 2. Keys for "new" and "fixed"

**Decision**: the keys are the problem keys (`<id>/<reason>[/<slug>]`) plus one warning key for
each row with the state `warn`: `<id>/warning`. The page has them inline (`data-keys` on each row
and a list for the whole page), so the compare needs no data file.

## 3. The last visit in local storage

**Decision**: one key `project-status:visits` with `{ last: { time, keys }, current: { time,
keys } }`. On each page load: when `now - current.time > 10 minutes`, `last = current`; then
`current = { now, keys of this page }`. The page compares with `last` (FR-002). Without `last`,
or when local storage throws: the 24-hour changes of the page. A pure function
`compareVisit(stored, nowKeys, nowTime)` gives `{ base: "visit" | "24h", since, newKeys,
fixedKeys }` and the next stored value; it is tested without a browser.

## 4. The data file

**Decision**: `status.json` next to `index.html` ([contracts/status-json.md](./contracts/status-json.md)),
made by `statusJson(page)` from the same view functions as the rows (`rowKind`, `summaryFact`,
`rowData`, `nextExpiry`) and the problems with their issue URLs. A test renders a fixture page and
its data file and checks: same states and facts, and none of the forbidden fixture values of the
spec 001 privacy test.

## 5. The installable app

**Decision**:

- `manifest.webmanifest`: `name` "Project status", `short_name` "Status", `start_url` "./",
  `scope` "./", `display` "standalone", `theme_color` the bumblebee primary as hex,
  `background_color` white, icons: the "correct" favicon SVG as `any` and as `maskable`
  (`sizes: "any"`, type `image/svg+xml`), written as files `icon.svg` and
  `icon-maskable.svg`.
- `sw.js`: network first for the page and `status.json`; on success it stores the copy; on a
  network error it gives the stored copy. No other caching, so a new update always shows when
  online (FR-007). The page registers it with `navigator.serviceWorker.register("sw.js")`.
- Badge: `navigator.setAppBadge(n)` when `n > 0`, `clearAppBadge()` when 0, only when the
  functions exist.

**Note**: Chrome and Edge accept an SVG icon for installation. iOS uses `apple-touch-icon`, which
must be a PNG; without a PNG the home-screen icon is a screenshot. Accepted for now (no image tool
in the build); a PNG can be added later.

## 6. Shortcut URLs

**Decision** (in `status/src/links.ts`, for a project with a repo):

| Label | URL |
|---|---|
| CI runs | `https://github.com/<repo>/actions` |
| Deployments | `https://github.com/<repo>/deployments` |
| Renovate dashboard | `https://github.com/<repo>/issues?q=is%3Aissue+is%3Aopen+in%3Atitle+%22Dependency+Dashboard%22` |
| Issues | `https://github.com/<repo>/issues` |

Header: "Run the status update now" → `https://github.com/ImreBoersma/projects/actions/workflows/status-page.yml`.

**Rationale**: the dashboard search works without the issue number (the status run does not read
issue titles, spec 001 FR-018). A repo without a dashboard issue shows an empty search with the
filter; acceptable.

## 7. The command box

**Decision**: a DaisyUI modal with an input and a list. `searchCommands(items, text)` in
`client.ts` (pure): items are the projects (name, `#p-<id>`), the 4 tabs and the 4 state filters;
match = the text is in the label (case-insensitive), projects first, at most 8 results. Arrow keys
move, Enter runs, Escape closes. ⌘K / Ctrl+K opens it from anywhere (`preventDefault`).
