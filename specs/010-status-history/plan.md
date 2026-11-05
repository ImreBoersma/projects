# Implementation Plan: Status History on a Data Branch

**Branch**: `010-status-history` | **Date**: 2026-11-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-status-history/spec.md`

## Summary

The job `build` of `status-page.yml` fetches the last 90 days of results from the branch `data`,
adds the result of this run in memory, and uses all of them for the "since" times, the uptime of
30 days with a bar, and the average time to repair. It writes the new result line as a second
artifact. A new job `history` (after `build`, not for pull requests) appends that line to the day
file on `data` and pushes. A failed push does not stop the page deploy, but it makes the run fail
(FR-009).

## Technical Context

**Language/Version**: TypeScript on Bun, in the existing `status/` package. GitHub Actions YAML.

**Primary Dependencies**: none new. `git` on the runner.

**Storage**: branch `data` of `ImreBoersma/projects`: `history/YYYY-MM-DD.ndjson`, one JSON line for
each run (research.md §1).

**Testing**: `bun test` with fixtures of results for "since", uptime, day marks and the average
time to repair. A run on a branch with a copy of the history folder.

**Target Platform**: GitHub Actions, `status-page.yml`, each hour (spec 005, external trigger).

**Project Type**: change to an existing generator and its workflow.

**Performance Goals**: the read of 90 days (about 2 200 lines) and the calculation take less than
1 second.

**Constraints**: €0 each month. No new token (FR-010). Only states, problem keys and times are
stored (FR-008). Page less than 100 KB (SC-005).

**Scale/Scope**: 11 projects, about 24 results each day, about 3 KB each day.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Result | Note |
|---|---|---|
| I. GitHub for all project work | Pass | The history is a branch of `projects`. |
| II. Catalog is the only project list | Pass | Results are keyed by the catalog `id`. |
| III. No secrets or private data | Pass | States, problem keys and times only; the problem keys are already public in the issue markers. |
| VII. Read-only views for stakeholders | Pass | Uptime, bars, "since" and repair time on the public page (clarification). |
| VIII. Keep the work small | Pass | No database, no service; one more job in the existing workflow. |
| IX. Spec Kit only for application code | Pass | Generator code. |
| X. ASD-STE100 | Pass | Page text uses STE. |

Re-check after Phase 1: no violations. The job `history` gets `contents: write`; the other jobs keep
their permissions (research.md §3).

## Project Structure

### Documentation (this feature)

```text
specs/010-status-history/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── history-file.md   # format of a day file on `data`
│   └── page.md           # "since", uptime, bar, repair time
└── tasks.md              # made by /speckit-tasks
```

### Source Code

```text
projects/ (this repo)
├── .github/workflows/status-page.yml   # changed: fetch `data` in build; new job `history`
├── status/src/history/store.ts         # new: read day files, make the result line (pure parse + format)
├── status/src/history/stats.ts         # new: since, uptime, day marks, repair time (pure)
├── status/src/types.ts                 # changed: history values on ProjectStatus and StatusPage
├── status/src/render.ts                # changed: "since", uptime and bar, repair time
├── status/src/main.ts                  # changed: read history, add this run, write the result line
└── status/tests/                       # history tests and fixtures

branch `data` (new, orphan)
├── README.md                           # what this branch is; do not merge it
└── history/YYYY-MM-DD.ndjson
```

**Structure Decision**: the read and the write of files are separate from the calculation
(`stats.ts`), so that each rule of the spec has a fixture test.

## Complexity Tracking

No violations.
