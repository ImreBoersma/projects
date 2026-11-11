# Implementation Plan: Expiry of Tokens and Secrets

**Branch**: `013-secret-expiry` | **Date**: 2026-11-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/013-secret-expiry/spec.md`

## Summary

The catalog gets a top-level list `secrets`: each secret that the projects and this repo use,
with its place and an expiry date, `never` or `none`. Each status run reads the expiry date of its own
GitHub tokens from the response header of one GitHub request, merges it with the catalog (earlier
date wins), and makes a `secret-expiring` problem for a date 30 days or less away, with the issue
rules of spec 001 and the colours of spec 012. Each run also compares the secret names in the
workflow files of the catalog repos and of this repo with the list, and shows a setup note for a
name that is not listed.

## Technical Context

**Language/Version**: TypeScript on Bun 1.4, in the existing `status/` package.

**Primary Dependencies**: none new (`yaml` already parses the catalog).

**Storage**: the catalog `projects.yaml`; no new store.

**Testing**: `bun test`: catalog parse, expiry merge, problems and issue text, workflow compare,
page rendering, and a privacy test with fixture secret values.

**Target Platform**: the GitHub Actions status run (hourly) and GitHub Pages.

**Project Type**: change to the existing status generator.

**Performance Goals**: at most 3 extra GitHub requests in each run (one for each status token).

**Constraints**: €0. No secret values anywhere (Principle III). No new secret or permission: the
run reads its tokens from the environment that it already has.

**Scale/Scope**: approximately 15 to 25 secrets over 11 projects and this repo.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Result | Note |
|---|---|---|
| II. Catalog is the only project list | Pass | The secrets list is in the catalog; `project` must be a catalog id. |
| III. No secrets or private data | Pass | Names, places, dates only. The header of the catalog file changes from "no secrets" to "no secret values" (research.md §6). A privacy test with fixture values. |
| IV. Use shared configuration | Pass | No change to the project repos. |
| VIII. Keep the work small | Pass | Uses `parseCaller` of spec 008, the renewal rules of spec 009 and the badges of spec 012. |
| X. ASD-STE100 | Pass | Problem, issue and page text use STE. |

Re-check after Phase 1: no violations.

## Project Structure

### Documentation (this feature)

```text
specs/013-secret-expiry/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── catalog.md      # the `secrets` list
│   └── page-issue.md   # page, problem and issue text
└── tasks.md            # made by /speckit-tasks
```

### Source Code

```text
projects.yaml                         # changed: header text; new top-level list `secrets`
status/src/catalog.ts                 # changed: parseSecrets(), checked against project ids
status/src/secrets/expiry.ts          # new: merge, problems
status/src/secrets/read.ts            # new: tokenExpiry() reads the header; workflow texts of other repos
status/src/secrets/compare.ts         # new: names used in workflows vs the list
status/src/conformance/read.ts        # unchanged; its workflow texts are used again
status/src/main.ts                    # changed: checkSecrets(); shared problems in the issue run
status/src/issues.ts                  # changed: steps for secret-expiring; the "shared" owner
status/src/problems.ts, types.ts      # changed: reason secret-expiring, Secret types
status/src/view.ts, render.ts         # changed: secrets in the Expiry line; group "Shared tokens"
status/tests/                         # secrets-*.test.ts new; catalog, render, issues changed
specs/001-project-status-page/contracts/catalog.md  # changed: pointer to contracts/catalog.md
```

**Structure Decision**: a new folder `status/src/secrets/` like `expiry/` of spec 009: pure
functions for the merge, the problems and the compare, and one small read function with I/O.

## Complexity Tracking

No violations.
