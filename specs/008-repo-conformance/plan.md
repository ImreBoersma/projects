# Implementation Plan: Repo Conformance Check

**Branch**: `008-repo-conformance` | **Date**: 2026-11-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-repo-conformance/spec.md`

## Summary

The status page generator gets a conformance module. For each own catalog repo it reads files,
settings and the names of secrets and variables with a new read-only token, and applies the rules
R1 to R9 of the spec. A repo that fails a rule gets the problem `not-conformant`, with the failed
rule names on the page; the issue rules of spec 001 open one issue for each repo. Exceptions come
from a new catalog field. A new document `docs/conformance.md` gives each rule and its repair
steps. The check runs in each status run (each hour), which is more than FR-008 asks.

## Technical Context

**Language/Version**: TypeScript on Bun, in the existing `status/` package.

**Primary Dependencies**: `yaml` (already in `status/`) to read workflow files. GitHub REST API.

**Storage**: none.

**Testing**: `bun test` with fixtures for each rule, also one fixture for each of the 5 deviations
of the first week of November (SC-003). A local run against the real repos with the new token.

**Target Platform**: GitHub Actions, `status-page.yml`.

**Project Type**: new module in an existing generator.

**Performance Goals**: approximately 10 REST calls for each repo, 6 repos: about 60 calls for
each job, 120 for each run. GitHub permits 5000 calls each hour for a token.

**Constraints**: €0 each month. Read only (FR-010). No file content, setting values or secret
values on the page or in issues (FR-006). Repos of other owners are not checked.

**Scale/Scope**: 6 own catalog repos now (5 Node repos and HomeLab), 9 rules.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Result | Note |
|---|---|---|
| I. GitHub for all project work | Pass | GitHub API and Issues. |
| II. Catalog is the only project list | Pass | Repos and exceptions come from `projects.yaml`. |
| III. No secrets or private data | Pass | The token is an Actions secret. Only secret names are read; the API cannot give values. Only rule names are shown. |
| IV. Shared configuration | Pass | The check makes the shared setup visible. |
| VIII. Keep the work small | Pass | Runs in the existing status run; no new workflow. |
| IX. Spec Kit only for application code | Pass | Generator code. |
| X. ASD-STE100 | Pass | Rule names, problem text, issue text and `docs/conformance.md` use STE. |
| Repos of other owners | Pass | Not checked (FR-001). |

Re-check after Phase 1: no violations.

## Project Structure

### Documentation (this feature)

```text
specs/008-repo-conformance/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── catalog.md       # field `exceptions`
│   ├── rules.md         # what each rule reads and when it fails
│   └── page.md          # problem text, rule names, issue text
└── tasks.md             # made by /speckit-tasks
```

### Source Code

```text
projects/ (this repo)
├── docs/conformance.md                 # new: each rule and its repair steps (FR-009)
├── .github/workflows/status-page.yml   # changed: CONFORMANCE_READ_TOKEN in both jobs
├── status/src/conformance/rules.ts     # new: pure rule functions R1–R9 on repo facts
├── status/src/conformance/read.ts      # new: read the repo facts with the REST API
├── status/src/conformance/workflows.ts # new: pure parse of caller workflows (uses, permissions, secrets, vars)
├── status/src/types.ts                 # changed: Project.exceptions, Reason "not-conformant", Problem.detail
├── status/src/catalog.ts               # changed: validate `exceptions`
├── status/src/problems.ts              # changed: not-conformant problem
├── status/src/issues.ts                # changed: issue text with the rule list and links
├── status/src/render.ts                # changed: rule names under the problem text
├── status/src/main.ts                  # changed: run the check in both modes
└── status/tests/                       # conformance tests and fixtures
```

**Structure Decision**: the reads (`read.ts`) are separate from the rules (`rules.ts`,
`workflows.ts`), so that each rule is a pure function with a fixture test. The rules get one
`RepoFacts` object for each repo (data-model.md).

## Complexity Tracking

No violations.
