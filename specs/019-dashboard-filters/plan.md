# Implementation Plan: Status Page Filters, Sorting and Detail Views

**Branch**: `019-dashboard-filters` | **Date**: 2026-11-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/019-dashboard-filters/spec.md`

## Summary

The status page keeps its generator and its data. The look moves to DaisyUI 5 on Tailwind 4: a
build step compiles `status/src/page.css` (Tailwind, DaisyUI, two themes with the colours of spec
012) to CSS that the page puts inline. Each project is a list row that links to `#p-<id>`; its
details are a DaisyUI modal that opens with `:target`, so the pop-up and its link work without a
script. A small inline script adds the filters, the sort, the tabs and the address handling
(`?q=&state=&stakeholder=&site=&sort=&tab=` plus `#p-<id>`), and keeps the focus right. Without
the script, all projects and all tabs show one after the other.

## Technical Context

**Language/Version**: TypeScript on Bun 1.4, in the existing `status/` package.

**Primary Dependencies**: new dev dependencies `tailwindcss@4.3.4`, `@tailwindcss/cli@4.3.4`,
`daisyui@5.7.50` (build time only; nothing loads in the browser from other sites). Renovate keeps
them current with the shared preset.

**Storage**: none.

**Testing**: `bun test` for the view model (summary fact, sort keys, filter values), the rendered
HTML (rows, modals, data attributes, tabs), the browser functions (filter, sort, address; pure
functions on plain objects, so no DOM library is needed), the compiled CSS
(no external URL to load, size), and the contrast of the theme colours. A browser check in light,
dark, 360 px, keyboard only and scripts off.

**Target Platform**: GitHub Pages; current desktop and phone browsers.

**Project Type**: change to the existing static page generator, plus a CSS build step.

**Performance Goals**: page < 150 KB (SC-005); CSS build < 2 s in the run (spike: 0.9 s).

**Constraints**: €0. No files from other sites (spec 007 FR-011). Works without scripts (FR-008).
Keyboard and contrast (FR-009, FR-010). The content and privacy rules of specs 001, 007, 012, 013.

**Scale/Scope**: 11 projects, 1 to 2 stakeholders, 0 to 3 campaigns.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Result | Note |
|---|---|---|
| II. Catalog is the only project list | Pass | Rows, filters and stakeholder values come from the catalog. |
| III. No secrets or private data | Pass | Same data as now; the modals show what the page shows. |
| IV. Use shared configuration | Pass | The new dev dependencies follow the shared Renovate preset. |
| VII. Read-only views for stakeholders | Pass | `?stakeholder=Harmonieorkest+Brummen` is a view for one stakeholder, without an account. |
| VIII. Keep the work small | Pass, with a cost | One build step and 3 dev dependencies; no framework, no server. Decided by the Maintainer (spec Assumptions). |
| X. ASD-STE100 | Pass | Labels and messages in STE. |

Re-check after Phase 1: no violations.

## Project Structure

### Documentation (this feature)

```text
specs/019-dashboard-filters/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── page.md       # structure: header, controls, tabs, rows, modals, data attributes
│   └── address.md    # the page address: query and hash
└── tasks.md          # made by /speckit-tasks
```

### Source Code

```text
status/src/page.css          # new: Tailwind + DaisyUI input, two themes from TOKENS
status/scripts/build-css.ts  # new: writes status/build/page.css (theme values from style.ts)
status/src/client.ts         # new: the browser functions (filter, sort, address), copied inline
status/src/view.ts           # changed: summaryFact, sortKeys, filterValues
status/src/render.ts         # changed: header, controls, tabs, rows, modals; inline CSS and script
status/src/style.ts          # changed: TOKENS stay; the old css() goes away (DaisyUI does it)
status/package.json          # changed: dev dependencies; "css" script; "start" runs it first
.github/workflows/status-page.yml  # changed: bun install already runs; no other change (start builds the CSS)
.gitignore                   # changed: status/build/
status/tests/                # client.test.ts, css.test.ts new; render and view tests changed
```

**Structure Decision**: the browser code is pure functions in `client.ts` with tests, put in the
page with `toString()` as `relTime` of spec 012. The CSS is built, not committed.

## Complexity Tracking

| Item | Why needed | Simpler option rejected because |
|---|---|---|
| CSS build step and 3 dev dependencies | DaisyUI is the Maintainer's choice; Tailwind compiles only the used classes into the page | A CDN link breaks spec 007 FR-011; hand-written CSS is the spec 012 approach that this feature replaces on purpose |
