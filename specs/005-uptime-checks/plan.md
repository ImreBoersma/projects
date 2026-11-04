# Implementation Plan: Uptime Checks on the Status Page

**Branch**: `005-uptime-checks` | **Date**: 2026-11-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-uptime-checks/spec.md`

## Summary

The status page generator of spec 001 gets an uptime check. Each status run sends an HTTPS GET to
each catalog `domain` of a project that is not archived, and tries a second time after a failure.
The page gets a column "Site". A site that is down is a problem `site-down`, with the problem and
issue rules of spec 001. When all sites are down in one run, the result is "Check not available"
and the issues stay as they are. The status page schedule changes from two times each day to each
hour.

## Technical Context

**Language/Version**: TypeScript on Bun, in the existing `status/` package.

**Primary Dependencies**: none new. `fetch` of Bun, with `redirect: "follow"` and
`AbortSignal.timeout()`.

**Storage**: none. Each run checks again. No history (spec: no uptime percentage).

**Testing**: `bun test` with an injected fetch function for the check, the retry and the
all-down rule. A local run against a catalog copy with a domain that does not respond.

**Target Platform**: GitHub Actions `ubuntu-latest`, scheduled `status-page.yml` in the public
`projects` repo.

**Project Type**: change to an existing generator.

**Performance Goals**: each attempt stops after 10 seconds (FR-003). All domains are checked at
the same time, so the check adds a maximum of approximately 25 seconds to a run.

**Constraints**: €0 each month. No HomeLab (FR-010, Principle VI). No site content or error text
on the page or in issues (FR-011).

**Scale/Scope**: 4 domains now (`imreboersma.nl`, `scales-imreboersma.web.app`, `pretband.nl`,
`harmonieorkestbrummen.nl`). 24 runs each day.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Result | Note |
|---|---|---|
| I. GitHub for all project work | Pass | Actions, Pages, Issues. |
| II. Catalog is the only project list | Pass | Domains come only from `domain` in `projects.yaml`. |
| III. No secrets or private data | Pass | No tokens for the check. Domains are public. |
| VI. Sites off the HomeLab | Pass | The check runs on GitHub runners. |
| VII. Read-only views for stakeholders | Pass | The public page shows Up or Down, with no site content. |
| VIII. Keep the work small | Pass | No monitoring service. One more module in the existing generator. |
| IX. Spec Kit only for application code | Pass | The check is application code. |
| X. ASD-STE100 | Pass | Page text, problem text and issue text use STE. |

Re-check after Phase 1: no violations.

## Project Structure

### Documentation (this feature)

```text
specs/005-uptime-checks/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── catalog.md        # rule for `domain`
│   └── page.md           # column "Site", problem text
└── tasks.md              # made by /speckit-tasks
```

### Source Code

```text
projects/ (this repo)
├── .github/workflows/status-page.yml   # changed: cron each hour
├── status/src/uptime.ts                # new: checkSite(), checkAll() with the all-down rule
├── status/src/types.ts                 # changed: Project.domain, Uptime, Reason "site-down"
├── status/src/catalog.ts               # changed: validate `domain` (FR-009)
├── status/src/problems.ts              # changed: site-down problem, also for rows without a repo
├── status/src/issues.ts                # changed: keep site-down issues when the check is not available
├── status/src/render.ts                # changed: column "Site"
├── status/src/main.ts                  # changed: run the check in both modes
└── status/tests/                       # uptime.test.ts new; catalog, problems, issues, render tests changed
```

**Structure Decision**: the check is a module of the status generator, because the page and the
issue rules are already there. A separate workflow would need a second page or a shared state
file (research.md §1).

## Complexity Tracking

No violations.
