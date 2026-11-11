# Implementation Plan: Shared Renovate Preset

**Branch**: `003-renovate-preset` | **Date**: 2026-11-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-renovate-preset/spec.md`

## Summary

One Renovate preset `renovate/default.json` in `projects`: weekend window (Saturday and Sunday; HomeLab keeps Saturday 02:00–06:00), 3-day release age, one
automerged patch group, one manual minor group, security updates at once. The free hosted Mend
Renovate app runs it for the five Node repos and `projects`. HomeLab keeps its self-hosted Renovate
and extends the preset, with automerge off. Dependabot version updates go away. The status page
also counts the PRs of the HomeLab Renovate app.

## Technical Context

**Language/Version**: Renovate JSON configuration. TypeScript on Bun for the status page change.

**Primary Dependencies**: Mend Renovate GitHub App (hosted, free). `renovate-config-validator`
from the `renovate` npm package, fixed version, for validation only.

**Storage**: none.

**Testing**: `renovate-config-validator` in a workflow of `projects`. One real repo with a branch
reference before the merge (constitution). `bun test` for the status page change.

**Target Platform**: GitHub repos of `ImreBoersma`.

**Project Type**: shared configuration, and one small change to the status page.

**Performance Goals**: none.

**Constraints**: €0 each month. Automerge only after all checks pass, without branch protection
(research.md §3). Nothing automerges in HomeLab.

**Scale/Scope**: 7 repos (5 Node repos, HomeLab, `projects`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Result | Note |
|---|---|---|
| I. GitHub for all project work | Pass | Renovate runs as a GitHub App. No other tool. |
| II. Catalog is the only project list | Pass | The scope is the catalog entries with a repo (FR-008). |
| III. No secrets or private data | Pass | No tokens in this feature. HomeLab keeps its app key as a secret. |
| IV. Shared configuration | Pass | One preset, Renovate in place of Dependabot. Ends the spec 001 exception. |
| VI. Sites off the HomeLab | Pass | No change. |
| VIII. Keep the work small | Pass | Hosted app, no new workflow except the validator. |
| IX. Spec Kit only for application code | Pass | Configuration with a spec, at the request of the Maintainer. The status page change is application code. |
| X. ASD-STE100 | Pass | Rule descriptions and PR text use STE. |
| Development Workflow: test the preset on a real repo | Pass | research.md §10. |
| Repos of other owners | Pass | pretband-backend does not change. |

Re-check after Phase 1: no violations.

## Project Structure

### Documentation (this feature)

```text
specs/003-renovate-preset/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── preset.md
└── tasks.md             # made by /speckit-tasks
```

### Source Code

```text
projects/ (this repo)
├── renovate/default.json                 # new, the preset
├── renovate.json                         # new, extends the preset
├── .github/workflows/lint-renovate.yml   # new, renovate-config-validator
├── .github/workflows/status-page.yml     # changed: CI on pull requests (research.md §12)
├── status/src/github.ts                  # changed: Renovate author rule (research.md §9)
└── status/tests/github.test.ts           # changed: test for the author rule

each Node repo
├── renovate.json                         # new
└── .github/dependabot.yml                # removed (4 repos)

HomeLab
└── .github/renovate.json                 # changed: extends the preset, automerge off
```

**Structure Decision**: the preset is in `renovate/`, as the constitution and PLAN.md name it. The
repo config of `projects` is in the root, where the hosted app looks first.

## Complexity Tracking

No violations.
