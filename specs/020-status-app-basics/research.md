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
each row with the state `warn`: `<id>/warning`. The page has a small table reason → text
(`PROBLEM_TEXT`, and "A warning." for `warning`) as inline data, so the browser can write
"<project name>: <text>" for a fixed key from a stored visit, the same as the update does for the
24-hour list (analysis U1). Fixed keys of a project that is not on the page any more are left out
(analysis U2). The page has them inline (`data-keys` on each row
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
  `scope` "./", `display` "standalone", `theme_color` `#fdc700` (the bumblebee primary
  `oklch(85% 0.199 91.936)` in hex),
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

## 8. The icon badge is not live (side note 2026-11-09)

**Decision**: the badge is set only while the page is open. A badge that changes in the
background needs a push message from a server (Web Push), and the €0 setup has no server.
Periodic Background Sync (Chromium only, installed apps only, the browser picks the interval,
often once a day or less) could refresh it without a server, but it is not reliable enough to
count on; not built. The spec Assumptions say that the badge is a reminder, not an alarm.

## 9. Validation results

| # | Check | Date | Result |
|---|---|---|---|
| T021 | Tests, lint, types | 2026-11-09 | 292 tests pass (baseline 268); Biome and `tsc` clean. CSS 57.8 KB. |
| 1 | Changes line (SC-001) | 2026-11-09 | First visit: "In the last 24 hours: 0 new, 0 fixed". With a stored visit 2 hours old that had `hob-nl/ci-failed`: "Since your visit 2 hours ago: 0 new, 1 fixed", the fixed list "hob.nl: The last CI run failed."; the exact time in the tooltip. The line is at 284 px, above the controls, without scrolling. |
| 2 | Data file | 2026-11-09 | `status.json` 3.5 KB with 11 projects, version 1. |
| 3 | App | 2026-11-09 | `manifest.webmanifest` loads; `sw.js` controls the page; the cache holds the page and `status.json` (the offline answer ignores the query). The badge API is present in Chrome; the badge itself needs the installed app (Maintainer). |
| 4 | Shortcuts | 2026-11-09 | The hob.nl modal has CI runs, Deployments, Renovate dashboard and Issues of `harmonieorkest-brummen/hob-nl`; the header has "Run the status update now". |
| 5 | ⌘K | 2026-11-09 | Cmd+K opens the box; "hob" shows hob.nl; Enter opens its modal (`#p-hob-nl`). |
| 6 | Sizes | 2026-11-09 | Page 108.5 KB with live data. Worst case (20 sites, problems, dates) 89.6 KB of HTML + 57.8 KB CSS = 147.4 KB (limit 150 KB): close to the limit. |
| Found | In the implementation | 2026-11-09 | (1) The shortcuts made the worst case 110 KB: the new-tab mark is now CSS (`a[target=_blank]::after`) and the screen-reader text one hidden element `#nt` for all links (`aria-describedby`), so a copy has no mark either. (2) Uptime bars: one element for each run of equal days with CSS stripes (History 18.6 → 5.6 KB). (3) The inline script is minified (whitespace only; Bun keeps the top-level names, identifier renaming gives nothing). (4) Side note: the icon badge is not live; recorded in the spec Assumptions and §8. (5) The "no files from other sites" test now allows files next to the page (`manifest.webmanifest`). |
| Live (T025) | 2026-11-09 | Merge c456ad5: build, history, issues and deploy passed. Live: `status.json` 3.5 KB (`application/json`, version 1, 11 projects, "All correct", 24-hour base from 2026-11-08 08:00 UTC), `manifest.webmanifest` (`application/manifest+json`), `sw.js`, `icon.svg`, `icon-maskable.svg`; the page has the manifest link, the inline changes and the command box. Install on the phone: Maintainer. |
