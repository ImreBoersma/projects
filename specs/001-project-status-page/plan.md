# Implementation Plan: Project Status Page

**Branch**: `001-project-status-page` | **Date**: 2026-10-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-project-status-page/spec.md`

## Summary

A scheduled GitHub Actions workflow in the `projects` repo reads `projects.yaml`. It sends one
GitHub GraphQL query for all repos in the catalog. A Bun script calculates the problems, makes one
static HTML page and publishes it to GitHub Pages. The same run opens and closes one issue for each
problem in the `projects` repo. There is no server and no database. The open issues are the only
state between runs.

## Technical Context

**Language/Version**: TypeScript on Bun 1.x (constitution: bun for new work)

**Primary Dependencies**: `yaml` (catalog parser). GitHub GraphQL and REST through `fetch`, with no
SDK. Biome for lint and format.

**Storage**: none. `projects.yaml` is the input. Open issues with the label `status-problem` keep
the problem state between runs.

**Testing**: `bun test`, with fixed GraphQL responses as fixtures. No network in tests.

**Target Platform**: GitHub Actions `ubuntu-latest`. Output on GitHub Pages.

**Project Type**: CLI script that a scheduled workflow runs; output is a static site.

**Performance Goals**: one complete run in less than 2 minutes for approximately 20 repos.

**Constraints**: €0 each month. Use less than 1% of the GitHub API rate limit. The page MUST NOT
contain text from private repos (FR-018). The page MUST work without JavaScript, except the
48-hour warning.

**Scale/Scope**: approximately 15 to 20 catalog entries. One page. A maximum of 4 problem types.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Result | Note |
|---|---|---|
| I. GitHub for all project work | Pass | Actions, Pages, Issues and the GraphQL API only. |
| II. Catalog is the only project list | Pass | The script reads only `projects.yaml`. |
| III. No secrets or private data | Pass | Tokens are Actions secrets. The page and issues show no private text. |
| IV. Shared configuration | Exception | No Renovate until the shared preset exists. See Complexity Tracking. |
| V. One pipeline | Exception | The page deploys with `actions/deploy-pages` in this repo. See Complexity Tracking. |
| VI. Sites off the HomeLab | Pass | GitHub Pages hosts the page. |
| VII. Read-only views for stakeholders | Pass | Public page, no login, no internal data. |
| VIII. Keep the work small | Pass | Static output, scheduled workflow, one runtime dependency. |
| IX. Spec Kit only for application code | Pass | The script is application code. |
| X. ASD-STE100 | Pass | Page text and issue text use STE. See [contracts/issue.md](./contracts/issue.md). |
| Bun and Biome | Pass | Bun runtime, Biome in CI. |
| Repos of other owners | Pass | Read only. Issues open only in `projects`. |

Re-check after Phase 1: no change. The design adds no new violations.

## Project Structure

### Documentation (this feature)

```text
specs/001-project-status-page/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── catalog.md
│   ├── page.md
│   └── issue.md
└── tasks.md             # made by /speckit-tasks
```

### Source Code (repository root)

```text
projects.yaml                        # catalog (input)
status/
├── package.json
├── tsconfig.json
├── biome.json
├── src/
│   ├── main.ts                      # sequence: read, query, evaluate, render, reconcile issues
│   ├── catalog.ts                   # parse and validate projects.yaml
│   ├── github.ts                    # GraphQL query and mapping to ProjectStatus
│   ├── problems.ts                  # FR-009 rules (pure functions)
│   ├── render.ts                    # static HTML (pure function)
│   └── issues.ts                    # compare problems with open issues, open and close
└── tests/
    ├── fixtures/                    # fixed GraphQL responses
    ├── catalog.test.ts
    ├── problems.test.ts
    ├── render.test.ts
    └── issues.test.ts
.github/workflows/status-page.yml    # schedule, manual start, push on projects.yaml
```

**Structure Decision**: one small package in `status/`, so that the root stays free for
`projects.yaml`, `renovate/` and the shared workflows. The rule logic
(`problems.ts`, `render.ts`, the compare step in `issues.ts`) has no network calls, so the tests
need no mocks.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Principle V: the page does not deploy through a shared deploy workflow | The shared deploy workflows do not exist yet. This repo is the repo that will contain them. | A shared Pages workflow for one consumer is an abstraction for projects that do not exist (Principle VIII). Change to a shared workflow when a second Pages project exists. |
| Principle IV: `status/` has dependencies without Renovate for a limited time | The shared Renovate preset does not exist yet. | A local Renovate config that is not the shared preset breaks Principle IV in a different way. Add `renovate.json` when the preset exists; until then the dependencies are `yaml` and Biome only. |
