# Implementation Plan: Website Quality Checks

**Branch**: `023-site-quality` | **Date**: 2026-11-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/023-site-quality/spec.md`

## Summary

A new daily workflow checks each catalog site: one PageSpeed Insights call gives the speed,
accessibility and field data; own code walks up to 50 pages of the site for broken links and reads
the security headers of the home page. The run writes one day file `quality/YYYY-MM-DD.json` to
the branch `data`, and opens, updates or closes one `status-problem` issue for each site that is
poor in 2 checks in a row. The hourly status run reads the newest day file and shows it: a tab
"Quality", the project pop-up, a warning on the row, `status.json`, and one Dutch sentence about
speed on the stakeholder page. The shared CI gets an optional legacy-scan step that writes a job
summary.

## Technical Context

**Language/Version**: TypeScript on Bun, in the existing `status/` package; workflow YAML.

**Primary Dependencies**: none new. Bun `HTMLRewriter` for the link walk; PageSpeed Insights API
v5; `npx modern-web-guidance@1.0.1` in CI only.

**Storage**: `quality/YYYY-MM-DD.json` on the branch `data` (spec 010).

**Testing**: `bun test` with fixture PSI responses, a fake `fetch` for the link walk and
`robots.txt`, fixture day files for the 2-checks rule, the page size test (SC-006), and the
forbidden-word test of the stakeholder page (spec 022).

**Target Platform**: GitHub Actions (ubuntu-latest); GitHub Pages.

**Project Type**: extension of the status generator, plus one workflow.

**Performance Goals**: the daily run finishes in less than 10 minutes for 4 sites (PSI about 30 s
each; the link walk at most about 60 s each at 1 request each second); about 30 minutes for 20
sites. The job stops after 45 minutes (`timeout-minutes`).

**Constraints**: €0; PSI with a key in a project without billing; 1 request each second to a site;
`robots.txt`; page < 30 KB gzip; no scripts necessary; content rules of spec 001 FR-018.

**Scale/Scope**: 4 sites today, 20 for the worst case; 1 stakeholder.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Result |
|---|---|---|
| I. GitHub for all work | Checks in Actions, results on Pages, issues in this repo. | Pass |
| II. Catalog is the only project list | Sites from the catalog `domain`; the key in `secrets`. | Pass |
| III. No secrets or private data | One new secret `PSI_API_KEY`, listed without its value; no text from private repos. | Pass |
| IV. Shared configuration | The legacy scan is one input of `ci-node.yml`. | Pass |
| V. One pipeline | Same deploy; the quality run only writes data. | Pass |
| VI. Sites off the HomeLab | Not affected. | Pass |
| VII. Give Stakeholders Read-Only Views | One B1 sentence; no developer facts. | Pass |
| VIII. Keep the work small | A daily scheduled workflow, no service. Free-tier terms read on 2026-11-18 (research.md §2): the Google APIs Terms permit this use; the page shows own scores and levels, not API content. The quota is checked in T043. | Pass |
| IX. Spec Kit for application code | This spec. | Pass |
| X. ASD-STE100 | Spec, plan, issues, page text in STE; the stakeholder sentence in Dutch B1. | Pass |

Re-check after Phase 1: no change. The one new item is the secret `PSI_API_KEY` (research.md §2),
which Principle III and spec 013 permit when the catalog lists it.

## Project Structure

### Documentation (this feature)

```text
specs/023-site-quality/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── quality-file.md
│   ├── issue.md
│   ├── page.md
│   └── ci-input.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
.github/workflows/
├── site-quality.yml        # new: daily check, day file to branch data, issues
├── status-page.yml         # unchanged: the build step already has ../_data
└── ci-node.yml             # input legacy-scan and one step

status/src/
├── quality/                # new
│   ├── psi.ts              # call PSI, parse speed, accessibility, field data
│   ├── links.ts            # robots.txt, page walk, link status
│   ├── headers.ts          # 4 security headers
│   ├── level.ts            # levels of FR-003
│   ├── store.ts            # read and write quality/YYYY-MM-DD.json
│   ├── issues.ts           # 2-checks rule, issue text, open/update/close
│   └── main.ts             # entry of the daily run
├── types.ts                # QualityCheck, QualityResult; ProjectStatus.quality
├── main.ts                 # read the newest day file into the rows
├── view.ts                 # rowKind: warn for a quality warning or poor
├── render.ts               # tab "Quality", pop-up results
├── data.ts                 # status.json: quality per project
├── issues.ts               # updateIssue (PATCH body)
├── board/project.ts        # findEntry reads the site-quality marker
└── stakeholder/            # text.ts, view.ts, render.ts: the speed sentence

status/tests/quality-*.test.ts # tests of each module (flat, as the other tests)
projects.yaml               # secrets: PSI_API_KEY
status/package.json         # script "quality"
```

**Structure Decision**: a new folder `status/src/quality/` as the other features (`expiry/`,
`versions/`); the daily run is a second entry (`bun run quality`) of the same package, so it
shares the catalog parser, the issue API and the tests.

## Complexity Tracking

No violations.
