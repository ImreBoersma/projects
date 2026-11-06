# Implementation Plan: Changes in All Repos at Once (Campaigns)

**Branch**: `015-repo-campaigns` | **Date**: 2026-11-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/015-repo-campaigns/spec.md`

## Summary

A campaign is a YAML file in `campaigns/<id>.yaml`: title, reason, target repos and a list of
fixed file changes. `bun run campaign <id>` runs on the Maintainer's machine with the `gh` login:
for each target repo it reads the files of the default branch through the GitHub API, applies the
changes in memory, and, when there is a difference, writes one commit to the branch
`campaign/<id>` and opens or updates one PR. No clone, no command in a repo. The status run applies
the same pure change function read-only, so it knows "not needed" without any stored result, and
reads the campaign PRs by branch name with its read tokens. `bun run secret-set <NAME>` sets one
secret in all repos that the catalog list of spec 013 gives for the name.

## Technical Context

**Language/Version**: TypeScript on Bun 1.4, in the existing `status/` package.

**Primary Dependencies**: none new (`yaml`; `gh` CLI on the Maintainer's machine for the token and
for `gh secret set`).

**Storage**: campaign files in `campaigns/`; no stored results (research.md §3).

**Testing**: `bun test` for the campaign parser, the change function, the PR plan, the page
section and the repo choice of the secret command; a dry run and a real run against 2 test repos.

**Target Platform**: the Maintainer's macOS shell (commands); GitHub Actions and Pages (status).

**Project Type**: CLI commands and an extension of the status generator.

**Performance Goals**: a campaign for 8 repos runs in less than 1 minute (SC-001 is < 10 minutes
including writing the file).

**Constraints**: €0. No write token in CI (FR-006). No secret values in files, logs or history
(FR-009, FR-010). No change to the settings of repos of another owner (constitution).

**Scale/Scope**: 8 catalog repos with a repo field; 1 to 3 campaigns open at a time.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Result | Note |
|---|---|---|
| I. GitHub for all project work | Pass | Each change is a PR; tracking by branch name and GitHub search links. |
| II. Catalog is the only project list | Pass | Target repos come from the catalog; `repos: all` means all catalog repos that are not archived. |
| III. No secrets or private data | Pass | Campaign changes are plain file content; the secret command reads the value from a hidden prompt and passes it on stdin only. |
| IV. Use shared configuration | Pass | Campaigns move repos to the shared setup. Dependency versions stay with Renovate: the campaign contract says so; no code check (research.md §7). |
| VIII. Keep the work small | Pass | No clone, no new service, no new token. |
| "Do not change settings of other-owner repos" | Pass | No labels are made in repos of another owner (research.md §4). |
| X. ASD-STE100 | Pass | PR body, log and page text use STE. |

Re-check after Phase 1: no violations.

## Project Structure

### Documentation (this feature)

```text
specs/015-repo-campaigns/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── campaign-file.md   # campaigns/<id>.yaml
│   ├── commands.md        # bun run campaign, bun run secret-set
│   └── page.md            # the section "Campaigns"
└── tasks.md               # made by /speckit-tasks
```

### Source Code

```text
campaigns/                            # new: one YAML file for each campaign
status/src/campaign/parse.ts          # new: campaign file parser
status/src/campaign/apply.ts          # new: pure change function (files in, files out, result)
status/src/campaign/github.ts         # new: read files, write one commit, open/update the PR
status/src/campaign/run.ts            # new: the command `bun run campaign`
status/src/campaign/status.ts         # new: read PRs by branch, classify, for the status run
status/src/secret-set.ts              # new: the command `bun run secret-set`
status/src/main.ts, types.ts          # changed: campaign states for the page
status/src/render.ts                  # changed: section "Campaigns"
status/package.json                   # changed: scripts campaign, secret-set
status/tests/campaign-*.test.ts       # new
```

**Structure Decision**: one folder `status/src/campaign/`; the change function is pure and shared
by the command and the status run, so the dry run, the real run and the page agree.

## Complexity Tracking

No violations.
