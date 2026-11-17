# Implementation Plan: Archive Suggestions for Old Projects

**Branch**: `018-archive-suggestions` | **Date**: 2026-11-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/018-archive-suggestions/spec.md`

## Summary

In page mode, the status run sends one GraphQL query for each read token with, for each repo:
the creation date, the commits of the default branch with the author type and the label of the
PR that brought them, the newest PRs and issues with their author type, and the open PRs and
issues (research §1, §2). A pure function finds the last work by a person (no bot, no `campaign`
PR) and decides: a suggestion, a `keep` until a date, or nothing. The project row gets a badge
"Archive?"; the detail view gets one line with the date and the link to `docs/archive.md`. No
problem, no issue, no change to the state.

## Technical Context

**Language/Version**: TypeScript on Bun 1.4, in the existing `status/` package.

**Primary Dependencies**: none new.

**Storage**: none; the data is read again in each run. The `keep` field is in `projects.yaml`.

**Testing**: `bun test`: the person test (bot, campaign, direct push), last work and the
12-month rule, `keep` (before, on and after the date), not available, the catalog check of
`keep`, the paged read with a fake fetch, the row and detail HTML.

**Target Platform**: GitHub Actions (the hourly status run); the page in Chrome, Edge, Safari.

**Project Type**: extension of the status page generator.

**Performance Goals**: one query for each token (2 today); a next commit page only for a repo
whose first 100 commits have no work by a person (none today).

**Constraints**: €0; no new token (SC-005), but "Issues: Read-only" is added to
`STATUS_READ_TOKEN` and `STATUS_READ_TOKEN_HOB` (research §1; without it, no suggestion); the page shows a date and fixed text only (spec 001
FR-018); the query asks for no title, body or message; logins are read only for the bot test of a
direct push and never logged or shown.

**Scale/Scope**: 8 repos today, 20 in the worst case; at most 5 commit pages (500 commits) for
each repo.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Result | Note |
|---|---|---|
| I. GitHub for all project work | Pass | The data comes from GitHub; the checklist is a file in the repo. |
| II. Catalog is the only project list | Pass | Catalog projects with a repo; `keep` is a catalog field; the last archive step is the catalog status. |
| III. No secrets or private data | Pass | No new secret; one more read permission (Issues) on the status tokens. No text fields in the query except label names and a login for the bot test, both used only in the run. |
| VII. Read-only views for stakeholders | Pass | Public, read-only; the badge is a fixed text. |
| VIII. Keep the work small | Pass | The purpose is fewer projects. Existing tokens, one query, no issue, no new tab. |
| IX. Spec Kit only for application code | Pass | The status generator is application code. |
| X. ASD-STE100 | Pass | Page text and `docs/archive.md` in STE. |

Re-check after Phase 1: no violations.

## Project Structure

### Documentation (this feature)

```text
specs/018-archive-suggestions/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── page.md          # the badge in the row and the line in the detail view
│   └── catalog.md       # the field `keep`
└── tasks.md             # made by /speckit-tasks
```

### Source Code

```text
status/src/archive/
├── rule.ts           # new: isPersonCommit, lastWork(raw), archiveState(raw, keep, now)
└── read.ts           # new: buildArchiveQuery(repos), readArchive(projects, env, fetch)
status/src/catalog.ts # changed: parse `keep` (until, reason)
status/src/types.ts   # changed: Project.keep; ArchiveState; ProjectStatus.archive
status/src/main.ts    # changed: page mode reads the archive data and sets ProjectStatus.archive
status/src/render.ts  # changed: badge in row(); line in modal() facts
docs/archive.md       # new: the archive checklist (FR-007)
status/tests/         # new: archive-rule, archive-read; changed: catalog, render
```

**Structure Decision**: a folder `archive/` as `delivery/` of spec 017: pure functions with unit
tests, and one reader with an injected `fetch` that groups the repos by token.

## Complexity Tracking

No violations.
