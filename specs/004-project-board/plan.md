# Implementation Plan: Project Board and Public Roadmap

**Branch**: `004-project-board` | **Date**: 2026-11-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-project-board/spec.md`

## Summary

One public user-level GitHub Project "Projects" with the fields Project, Priority, Status,
Stakeholder and Roadmap. A new shared workflow `add-to-board.yml` adds each new issue of a catalog
repo to the board and sets Project from the catalog. Each own repo calls it from a small caller.
`pretband-backend` gets no caller, because this repo does not change repos of other owners. The
sync adds its issues, as for the private repos (research.md §1). A sync script in `projects` keeps the Project and
Stakeholder options equal to the catalog, adds `status-problem` issues, sets Project on items that do not have it, and removes
private and `status-problem` items from the roadmap. The Roadmap view filters on `roadmap:Yes`.

## Technical Context

**Language/Version**: TypeScript on Bun, in the existing `status/` package. GitHub Actions YAML.

**Primary Dependencies**: GitHub Projects (v2) GraphQL API. `yaml` (already in `status/`).

**Storage**: the GitHub Project. No other storage.

**Testing**: `bun test` with fixtures for the catalog lookup, the marker parse and the sync plan.
Real issues in one test repo before the merge (constitution, Development Workflow).

**Target Platform**: GitHub Actions `ubuntu-latest`, GitHub.com user project of `ImreBoersma`.

**Project Type**: shared workflow and a small Bun script.

**Performance Goals**: an issue of a public repo is on the board within 5 minutes, and an issue of
a private repo within 13 hours (SC-001). The add job runs on the
`issues` event, so it takes less than 1 minute.

**Constraints**: €0 each month. Classic PATs are necessary: `BOARD_TOKEN` (`project`) in the
public repos, `BOARD_SYNC_TOKEN` (`project`, `repo`) only in `projects` (research.md §3). No change to the
settings of `harmonieorkest-brummen` repos.

**Scale/Scope**: 6 own catalog repos (4 public with a caller, 2 private through the sync),
`projects`, and `pretband-backend`. Fewer than 100 open issues.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Result | Note |
|---|---|---|
| I. GitHub for all project work | Pass | GitHub Projects only. |
| II. Catalog is the only project list | Pass | The add job and the sync read `projects.yaml`. No repo list in code or in view filters. |
| III. No secrets or private data | Pass | Both tokens are Actions secrets. The token with `repo` is only in `projects`. Stakeholders by name only. |
| IV. Shared configuration | Pass | One shared workflow. Each caller is 11 lines (contracts/caller.md). |
| VII. Read-only views for stakeholders | Pass | Public project, Roadmap view, no login. Sync removes private and problem items (research.md §5). |
| VIII. Keep the work small | Pass | Event workflow, and the sync runs in the existing status page schedule. No server. |
| IX. Spec Kit only for application code | Pass | The add and sync scripts are application code. The board is configuration. |
| X. ASD-STE100 | Pass | Field, option and view names use STE. |
| Development Workflow: test on a real repo | Pass | quickstart.md §3. |
| Repos of other owners | Pass | The sync adds the `pretband-backend` issues. No change in that repo. |

Re-check after Phase 1: no violations. One risk to accept: `BOARD_SYNC_TOKEN` has `repo` scope.
It is only in `projects` (research.md §3).

## Project Structure

### Documentation (this feature)

```text
specs/004-project-board/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── caller.md
│   ├── add-to-board.md
│   └── board.md
└── tasks.md             # made by /speckit-tasks
```

### Source Code

```text
projects/ (this repo)
├── .github/workflows/add-to-board.yml    # new, reusable: add one issue to the board
├── .github/workflows/board.yml           # new: caller for issues of projects
├── .github/workflows/board-sync.yml      # new: sync on dispatch, with dry run
├── .github/workflows/status-page.yml     # changed: the issues job also runs the sync
├── status/src/board/project.ts           # new: catalog lookup, marker parse, sync plan (pure)
├── status/src/board/graphql.ts           # new: Projects v2 queries and mutations
├── status/src/board/add.ts               # new: entry point of the add job
├── status/src/board/sync.ts              # new: entry point of the sync job
├── status/tests/board.test.ts            # new
└── status/package.json                   # changed: scripts board:add and board:sync

each public own repo in the catalog (4)
└── .github/workflows/board.yml           # new caller, secret BOARD_TOKEN
```

**Structure Decision**: the board code goes in the existing Bun package `status/`, because it uses
the same catalog parser and the same `yaml` dependency. A second package would copy the parser
(Principle VIII). The package name stays `status`. Rename it only if a third tool comes.

## Complexity Tracking

No violations.
