# Implementation Plan: Version Drift Between Projects

**Branch**: `016-version-drift` | **Date**: 2026-11-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/016-version-drift/spec.md`

## Summary

In page mode, the status run reads `package.json`, `.nvmrc`, `.node-version` and `bun.lock` of
each repo of a catalog project that is not archived, with the read tokens that it has now (research §1). With
the `ci.yml` text that the run has already read and the default of the shared `ci-node.yml`, it
makes one VersionRow for each repo with a `package.json`: 7 tools, each with the text, the source
and the lowest major version of the range. A pure drift step marks each version that is one or
more major versions behind the highest major of that tool in the repos. The page gets a tab
"Versions" with one table; the tab label shows the number of marked repos. No problem, no issue,
no change to `status.json`.

## Technical Context

**Language/Version**: TypeScript on Bun 1.4, in the existing `status/` package.

**Primary Dependencies**: none new (`yaml` is already a dependency).

**Storage**: none; the table is made again in each run.

**Testing**: `bun test`: the range parser and the safe text rule (`versions/parse.ts`), the
sources and their order with a fake fetch (`versions/read.ts`), the drift step with the
2026-11-10 fixture (SC-002), the panel HTML and the tab count, the ⌘K item, the contrast of the
mark in both themes, the gzip budget.

**Target Platform**: GitHub Actions (the hourly status run); the page in Chrome, Edge, Safari.

**Project Type**: extension of the status page generator.

**Performance Goals**: 4 GET requests for each repo, in parallel with the other reads; the run
stays within its current time (about 1 minute).

**Constraints**: €0; no new token (SC-005); no text from private repos except the safe version
texts (spec 001 FR-018, research §5); page < 30 KB gzip for 20 sites.

**Scale/Scope**: 6 repos with a `package.json` today, 20 in the worst case; 7 tools.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Result | Note |
|---|---|---|
| I. GitHub for all project work | Pass | Reads the repos through the GitHub API. |
| II. Catalog is the only project list | Pass | Only the repos of the catalog projects that are not archived. |
| III. No secrets or private data | Pass | Only version texts that match the safe text rule, and source names; the tokens go only in the header. |
| IV. Use shared configuration | Pass | The Node default is read from the shared `ci-node.yml`, not copied. |
| VII. Read-only views for stakeholders | Pass | The page stays read-only and public. |
| VIII. Keep the work small | Pass | No dependency, no token, no issue; one tab and one table without sort or filter. |
| IX. Spec Kit only for application code | Pass | The status generator is application code. |
| X. ASD-STE100 | Pass | Page text in STE. |

Re-check after Phase 1: no violations.

## Project Structure

### Documentation (this feature)

```text
specs/016-version-drift/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── page.md         # the tab "Versions": tab, panel, cells, mark
└── tasks.md            # made by /speckit-tasks
```

### Source Code

```text
status/src/versions/
├── parse.ts          # new: lowestMajor(range), safeText(text), nodeFromCi(workflowText), sharedNodeDefault(text)
├── read.ts           # new: readVersions(projectId, repo, token, workflowTexts, nodeDefault, fetch) → VersionRow | null
└── drift.ts          # new: markDrift(rows) → rows with behind/highest; markedCount(rows)
status/src/types.ts   # changed: Tool, ToolVersion, VersionRow; StatusPage.versions
status/src/main.ts    # changed: page mode reads the versions after the conformance and secrets reads
status/src/render.ts  # changed: tab "Versions", versionsSection()
status/src/client.ts  # changed: "versions" in the tab list and the ⌘K tab items
status/src/page.css   # changed: .versions table and .drift mark
status/tests/         # new: versions-parse, versions-read, versions-drift;
                      #   changed: render, client, style (mark contrast), helpers (worst case), size
```

**Structure Decision**: a folder `versions/` like `expiry/` and `secrets/`: pure parse and drift
functions with unit tests, and one reader with an injected `fetch`, as `conformance/read.ts`.
`main.ts` keeps the `ci.yml` texts that it reads now (the map `workflowTexts` and the secrets
compare) so that no file is read two times.

## Complexity Tracking

No violations.
