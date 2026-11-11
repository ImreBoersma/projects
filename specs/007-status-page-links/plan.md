# Implementation Plan: Status Page Links and Layout

**Branch**: `007-status-page-links` | **Date**: 2026-11-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-status-page-links/spec.md`

## Summary

The status page generator of spec 001 adds a link to each cell that has a source, a summary line
above the table, links to the roadmap and the board in the header, and a card layout for screens
of 600 pixels or less. The links use the catalog repo and domain, fixed GitHub paths, the commit
id of the last commit, issue numbers and the login of the Renovate app. The page stays one static
HTML file with inline CSS and no external files.

## Technical Context

**Language/Version**: TypeScript on Bun, in the existing `status/` package.

**Primary Dependencies**: none new.

**Storage**: none.

**Testing**: `bun test` for the link builder, the summary and the rendered HTML. A local render
checked at 360 and 1100 pixels wide in a browser.

**Target Platform**: GitHub Pages; current desktop and phone browsers.

**Project Type**: change to an existing static page generator.

**Performance Goals**: the page stays one file under 50 KB with 20 projects. (Superseded: spec 019
SC-005 allowed 150 KB, and since spec 011 the budget is 30 KB gzip for 20 sites; spec 020 adds
`status.json`, the manifest, the service worker and icons next to the page.)

**Constraints**: €0 each month. No text from private repos on the page (FR-010, spec 001
FR-018). No external scripts, fonts or styles (FR-011).

**Scale/Scope**: 12 catalog projects now, 8 with a repo, 4 with a domain.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Result | Note |
|---|---|---|
| I. GitHub for all project work | Pass | Links go to GitHub. Pages hosts the page. |
| II. Catalog is the only project list | Pass | Repos and domains come from `projects.yaml`. |
| III. No secrets or private data | Pass | No tokens in links. The data for links is ids, numbers and fixed paths (research.md §1–§4). |
| VII. Read-only views for stakeholders | Pass | Summary and phone layout on the public page. |
| VIII. Keep the work small | Pass | Changes in `render.ts`, `github.ts`, `main.ts`; one more permission in the workflow. |
| IX. Spec Kit only for application code | Pass | Generator code. |
| X. ASD-STE100 | Pass | Summary, link text and labels use STE. |

Re-check after Phase 1: no violations. One spec deviation to fix in `/speckit-analyze`: FR-010
lists the allowed link data; the Renovate link also uses the login of the Renovate app, and the
CI link uses the commit id (research.md §1, §3). Resolved: T017 added both to FR-010.

## Project Structure

### Documentation (this feature)

```text
specs/007-status-page-links/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── page.md          # links, summary, header, card layout
└── tasks.md             # made by /speckit-tasks
```

### Source Code

```text
projects/ (this repo)
├── .github/workflows/status-page.yml   # changed: job build gets issues: read and GITHUB_TOKEN
├── status/src/github.ts                # changed: request the commit oid; keep the Renovate app login
├── status/src/types.ts                 # changed: ProjectStatus.links data (commit oid, Renovate app, issue numbers)
├── status/src/links.ts                 # new: pure functions that make each URL
├── status/src/render.ts                # changed: links, summary, header links, card CSS, data-label attributes
├── status/src/main.ts                  # changed: read open status-problem issues in page mode
├── specs/001-project-status-page/contracts/page.md  # changed: pointer to this contract
└── status/tests/                       # links.test.ts new; render and github tests changed
```

**Structure Decision**: the URL rules go in a new pure module `links.ts`, so that each rule has a
unit test. The page stays in `render.ts`.

## Complexity Tracking

No violations.
