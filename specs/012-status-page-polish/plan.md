# Implementation Plan: Status Page Visual Polish

**Branch**: `012-status-page-polish` | **Date**: 2026-11-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/012-status-page-polish/spec.md`

## Summary

The generator of the status page gets a pure view layer (`view.ts`) that calculates the total
state, the three sections, the kind of each state badge and the relative times from the
`StatusPage` data. `render.ts` only turns that view into HTML. A token module (`style.ts`) holds
the colours for the light and the dark scheme, the badge styles and the three favicons, and a unit
test checks the contrast of each token pair (SC-004). One inline script updates the relative times
each minute; it is the same function that makes the times on the server. No UI library
(research.md §1).

## Technical Context

**Language/Version**: TypeScript on Bun 1.4, in the existing `status/` package.

**Primary Dependencies**: none new. No UI library, no CSS framework (research.md §1).

**Storage**: none.

**Testing**: `bun test` for the view functions, the contrast of the tokens, the rendered HTML (link
attributes, sections, title, favicon) and the inline script. A local render checked at 360 and 1100
pixels wide, in the light and the dark scheme, and with scripts off.

**Target Platform**: GitHub Pages; current desktop and phone browsers.

**Project Type**: change to an existing static page generator.

**Performance Goals**: the page stays one file under 100 KB with 20 projects (now 16 KB).

**Constraints**: €0 each month. No files from other sites. Scripts only inline, and all content
and links work without them (FR-010). WCAG 2.1 AA contrast (FR-009). The content rules of spec 001
FR-018 stay.

**Scale/Scope**: 11 catalog projects, 4 with a domain.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Result | Note |
|---|---|---|
| II. Catalog is the only project list | Pass | Section order is the catalog order. |
| III. No secrets or private data | Pass | No new data; only the look and the order change. |
| VII. Read-only views for stakeholders | Pass | The public page gets easier to read; no account needed. |
| VIII. Keep the work small | Pass | Two new modules in `status/src/`, no dependency, no new service. |
| IX. Spec Kit only for application code | Pass | Generator code. |
| X. ASD-STE100 | Pass | Badge text, section titles, "opens in a new tab" use STE. |

Re-check after Phase 1: no violations. Two spec corrections were made before this plan (spec
Clarifications): FR-010 now allows the existing stale-check script, and FR-004 sets its own
warning period, because spec 009 has none.

## Project Structure

### Documentation (this feature)

```text
specs/012-status-page-polish/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── page.md          # total state, badges, sections, times, links, favicon, tokens
└── tasks.md             # made by /speckit-tasks
```

### Source Code

```text
status/
├── src/view.ts      # new: pure view model (total state, sections, badge kinds, relTime)
├── src/style.ts     # new: colour tokens (light, dark), CSS, favicons
├── src/render.ts    # changed: uses view.ts and style.ts; sections; badges; new-tab links; script
├── src/links.ts     # unchanged (the URLs stay; render adds the new-tab attributes)
└── tests/
    ├── view.test.ts     # new
    ├── style.test.ts    # new: contrast of each token pair, both schemes
    └── render.test.ts   # changed
specs/001-project-status-page/contracts/page.md  # changed: pointer to this contract
```

**Structure Decision**: the decisions about state go in `view.ts`, separate from the HTML. That
makes each rule testable, and it is the part a later status app can use again (research.md §2).

## Complexity Tracking

No violations.
