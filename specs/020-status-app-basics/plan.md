# Implementation Plan: Status App Basics

**Branch**: `020-status-app-basics` | **Date**: 2026-11-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/020-status-app-basics/spec.md`

## Summary

The page run writes three more files next to `index.html`: `status.json` (the view model of each
project and the changes of the last 24 hours), `manifest.webmanifest` and `sw.js`. The page gets
the current keys and the 24-hour changes inline (it stays complete without the data file). Small
browser functions in `client.ts` compare with the last visit in local storage (else with the 24
hours), mark new rows, list the fixed problems, set the app badge, open the command box (⌘K), and
register the service worker (network first, cache only without a network). The pop-ups get
shortcut links to GitHub pages; the header gets the link to the status workflow.

## Technical Context

**Language/Version**: TypeScript on Bun 1.4, in the existing `status/` package.

**Primary Dependencies**: none new.

**Storage**: the browser's local storage (one key, this device only); the files on GitHub Pages.

**Testing**: `bun test` for the 24-hour changes (from history fixtures), the data file (content
and forbidden fields), the visit compare (pure function), the command search, the shortcut URLs,
the manifest and the service worker text; a browser check for install, offline, badge, ⌘K.

**Target Platform**: GitHub Pages; Chrome and Edge (install, badge), Safari and Firefox (no
badge; Safari installs from "Add to Home Screen").

**Project Type**: extension of the status generator and its browser code.

**Performance Goals**: page < 150 KB; data file < 50 KB for 20 projects; service worker < 2 KB.

**Constraints**: €0; no server; no write request from the page (FR-010); no external files; works
without scripts (the script parts do not show).

**Scale/Scope**: 11 projects; 0 to 20 changes in 24 hours.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Result | Note |
|---|---|---|
| I. GitHub for all project work | Pass | Shortcuts go to GitHub pages. |
| III. No secrets or private data | Pass | `status.json` has the page content only; a test checks the forbidden content of spec 001. Local storage holds keys and a time, on this device. |
| VII. Read-only views for stakeholders | Pass | Public, read-only data file. |
| VIII. Keep the work small | Pass | No server, no account, no dependency. |
| X. ASD-STE100 | Pass | Labels and messages in STE. |

Re-check after Phase 1: no violations.

## Project Structure

### Documentation (this feature)

```text
specs/020-status-app-basics/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── status-json.md   # the data file
│   ├── app.md           # manifest, service worker, badge
│   └── page.md          # changes line, New marks, fixed list, shortcuts, command box
└── tasks.md             # made by /speckit-tasks
```

### Source Code

```text
status/src/history/stats.ts   # changed: recentChanges(results, now) for the last 24 hours
status/src/data.ts            # new: statusJson(page) — the data file
status/src/app.ts             # new: manifest() and serviceWorker() texts
status/src/links.ts           # changed: shortcut URLs
status/src/client.ts          # changed: compareVisit, searchCommands, start() extensions
status/src/render.ts          # changed: inline keys and changes, changes line, New marks,
                              #   fixed list, shortcuts, command box, manifest and icon links
status/src/main.ts            # changed: write status.json, manifest.webmanifest, sw.js
status/tests/                 # data, app, changes tests new; client, render, links changed
```

**Structure Decision**: all new files come from the same run and the same view model, so the
page, the data file and the app agree.

## Complexity Tracking

No violations.
