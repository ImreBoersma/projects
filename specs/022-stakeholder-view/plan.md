# Implementation Plan: Stakeholder View and Status Badges

**Branch**: `022-stakeholder-view` | **Date**: 2026-11-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/022-stakeholder-view/spec.md`

## Summary

The page run writes more static files next to `index.html`: one Dutch page for each stakeholder
(`s/<slug>.html`), one SVG badge for each project (`badge/<id>.svg`) and a `404.html`. All facts
come from the `StatusPage` that the run already makes; nothing new is read from GitHub. A pure
function makes the view model (projects of the stakeholder, site state, uptime, next renewal, the
"needs attention" items; only CI and deploy faults count as a problem); a second function renders it with fixed B1 Dutch texts, the inline CSS
of the status page and a print layout. A third function makes the badge SVG.

## Technical Context

**Language/Version**: TypeScript on Bun 1.4, in the existing `status/` package.

**Primary Dependencies**: none new (Tailwind and DaisyUI build the CSS, as in spec 019).

**Storage**: none; static files on GitHub Pages.

**Testing**: `bun test` with fixtures for the 3 HOB projects (SC-003, SC-004), forbidden words
(FR-004), badge states and contrast, page size; a browser check for print and for no scripts.

**Target Platform**: GitHub Pages; current browsers; the GitHub image proxy for README badges.

**Project Type**: extension of the status generator.

**Performance Goals**: stakeholder page < 15 KB gzip with 20 projects; badge < 1 KB; the status
page stays < 30 KB gzip (spec 011).

**Constraints**: €0; no new token or service; works without scripts; no external files; Dutch
B1 for the view, English for the badges; content rules of spec 001 FR-018.

**Scale/Scope**: 1 stakeholder (3 projects) today; 11 badges.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Result |
|---|---|---|
| I. GitHub for all work | Files on GitHub Pages from the existing workflow. | Pass |
| II. Catalog is the only project list | Stakeholders, projects, domains and renewals from `projects.yaml`. | Pass |
| III. No secrets or private data | Names, addresses, dates, percentages, states only; forbidden-word test. | Pass |
| IV. Shared configuration | No new config. | Pass |
| V. One pipeline | Same page run and deploy. | Pass |
| VI. Sites off the HomeLab | Not affected. | Pass |
| VII. Read-only views for stakeholders | The reason for the feature: a page without an account and without developer facts. | Pass |
| VIII. Keep the work small | Static files, about 20 fixed sentences, no library, no service. | Pass |
| IX. Spec Kit for application code | This spec. | Pass |
| X. ASD-STE100 | Spec, plan, code comments in STE. The text of the view is Dutch B1. | Deviation, see Complexity Tracking |

Re-check after Phase 1: no change. The design adds no service, token or external file.

## Project Structure

### Documentation (this feature)

```text
specs/022-stakeholder-view/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── stakeholder-page.md
│   └── badge.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
status/
├── src/
│   ├── stakeholder/
│   │   ├── view.ts      # stakeholderViews(page): StakeholderView[]; slug(); untilText()
│   │   ├── text.ts      # the Dutch B1 sentences and Dutch dates (contracts/stakeholder-page.md)
│   │   ├── render.ts    # renderStakeholderPage(view, css), notFoundPage()
│   │   └── badge.ts     # badge(status): { id, svg }
│   ├── page.css         # + @source "./stakeholder/", + @media print block
│   ├── render.ts        # + one "View for <stakeholder>" link in the header nav (FR-013)
│   └── main.ts          # writes s/<slug>.html, badge/<id>.svg, 404.html after index.html
└── tests/
    ├── stakeholder-view.test.ts
    ├── stakeholder-render.test.ts
    ├── badge.test.ts
    └── size.test.ts     # + the stakeholder page budget
```

**Structure Decision**: one folder `status/src/stakeholder/` as for `delivery/` and `archive/`
(specs 017, 018). `main.ts` only writes the files; all rules are in pure functions with tests.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Principle X: the text of the stakeholder page is Dutch at taalniveau B1, not ASD-STE100 | The HOB board reads Dutch (spec clarification 2026-11-17). ASD-STE100 exists only for English. B1 has the same aims: short sentences, common words, active voice. | English in STE: board members must translate a page that exists to tell them something in less than 1 minute (SC-001). The deviation is only for the text of this page; code, comments, specs and badges stay in STE English. |
