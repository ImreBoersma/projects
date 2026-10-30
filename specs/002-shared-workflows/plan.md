# Implementation Plan: Shared CI and Deploy Workflows

**Branch**: `002-shared-workflows` | **Date**: 2026-10-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-shared-workflows/spec.md`

## Summary

Four reusable workflows in `projects/.github/workflows/`: one CI workflow for Node projects and one
deploy workflow for each host in use (GitHub Pages, Firebase, Vercel). CI finds the package manager
from the lock file, runs `biome ci`, then the `build` and `test` scripts if they exist, and gives the
build output to the deploy job as an artifact. Each project repo gets a caller of approximately 10
lines. The Vercel repos stop production deploys from the Vercel Git integration. The default
branch of Beter-dan-de-MIDI changes from `pwa` to `main`. The status page of
spec 001 also moves to the shared Pages deploy.

## Technical Context

**Language/Version**: GitHub Actions workflow YAML (reusable workflows, `workflow_call`).

**Primary Dependencies**: `actions/checkout@v7`, `actions/setup-node@v7`, `oven-sh/setup-bun@v2`,
`actions/upload-artifact`, `actions/download-artifact`, `actions/upload-pages-artifact@v5`,
`actions/deploy-pages@v5`, `FirebaseExtended/action-hosting-deploy`, Vercel CLI (fixed version).
The repos already use these major versions.

**Storage**: none. Secrets in the Actions secrets of each project repo. `VERCEL_ORG_ID` and
`VERCEL_PROJECT_ID` as Actions variables.

**Testing**: `actionlint` on the shared workflows. One real repo on a branch ref before each merge
(constitution, Development Workflow). Validation steps in [quickstart.md](./quickstart.md).

**Target Platform**: GitHub Actions `ubuntu-latest`.

**Project Type**: shared CI/CD configuration.

**Performance Goals**: CI in less than 5 minutes for each repo.

**Constraints**: €0 each month. Caller maximum 15 lines (SC-003). No secret in a workflow file or a
log. Hosts do not change (Principle V).

**Scale/Scope**: 5 project repos, 4 shared workflows, 1 workflow-lint workflow.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Result | Note |
|---|---|---|
| I. GitHub for all project work | Pass | All deploys run in GitHub Actions, also Vercel. |
| II. Catalog is the only project list | Pass | The host of Beter-dan-de-MIDI is corrected in `projects.yaml`. |
| III. No secrets or private data | Pass | Secrets are Actions secrets, passed by name. |
| IV. Shared configuration | Pass | Callers only call shared workflows. |
| V. One pipeline | Pass | Each project with a host deploys through a shared workflow. The spec 001 exception ends (research.md §12). |
| VI. Sites off the HomeLab | Pass | No host changes. |
| VII. Read-only views | Pass | No change. |
| VIII. Keep the work small | Pass | No new host or tool. No release process for the workflows. |
| IX. Spec Kit only for application code | Pass | Configuration with a spec, at the request of the Maintainer. |
| X. ASD-STE100 | Pass | Step names, messages and comments use STE. |
| Development Workflow: `environment: production` | Pass | Pages uses `github-pages`, as the constitution permits since v2.1.1 (T004). |
| Repos of other owners | Pass | pretband-backend does not change. |

Re-check after Phase 1: no new violations.

## Project Structure

### Documentation (this feature)

```text
specs/002-shared-workflows/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── workflows.md
│   └── caller.md
└── tasks.md             # made by /speckit-tasks
```

### Source Code

```text
projects/ (this repo)
├── .github/workflows/
│   ├── ci-node.yml                  # new, shared CI
│   ├── deploy-pages.yml             # new, shared deploy
│   ├── deploy-firebase.yml          # new, shared deploy
│   ├── deploy-vercel.yml            # new, shared deploy
│   ├── lint-workflows.yml           # new, actionlint
│   └── status-page.yml              # changed: deploy job calls deploy-pages.yml
├── projects.yaml                    # changed: host of beter-dan-de-midi
└── status/src/github.ts             # changed: also read environment github-pages

each project repo (see contracts/caller.md)
├── .github/workflows/ci.yml         # replaced by the caller
├── vercel.json                      # Vercel repos only
└── .npmrc                           # Beter-dan-de-MIDI only
```

**Structure Decision**: the shared workflows are flat files in `.github/workflows/`, because GitHub
permits reusable workflows only there. The project repo changes are one PR for each repo.

## Complexity Tracking

No violations. The GitHub Pages environment was an exception in the first version of this plan.
The constitution amendment v2.1.1 (2026-10-30) permits it.
