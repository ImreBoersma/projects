# Implementation Plan: New-Project Template and Onboarding

**Branch**: `011-new-project-template` | **Date**: 2026-11-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/011-new-project-template/spec.md`

## Summary

A folder `template/` in `projects` holds the files of a new repo: the CI caller (one variant for
each host), the board caller, `renovate.json`, `biome.json`, a minimal `package.json` with a
placeholder page, `.gitignore` and `README.md`. A test in the status package reads these files
and runs the file rules R1 to R5 of spec 008 on them, so CI fails on a deviation; Renovate updates
`template/package.json` with the other dependencies of `projects`.

`bun run new-project` (in `status/`, next to `campaign` and `secret-set`) copies the template with
the CI variant of the host, makes the repo with `gh repo create --source --push`, sets the
settings of spec 008, and opens the catalog PR through the GitHub API (the client of spec 015).
It prints the secrets table from a host map. Each step checks the state first, so a second run
continues. A dry run prints the same steps and changes nothing.

The ⌘K box of spec 020 gets "New project": a small dialog that builds the same command from
fields. The host list comes from the same host map.

The page size budget changes from raw bytes (CSS < 60 KB, HTML < 90 KB) to one gzip budget:
HTML with the CSS of the 20-site worst case < 30 KB gzip (research §8). Measured today: 147.7 KB
raw, 18.7 KB gzip.

## Technical Context

**Language/Version**: TypeScript on Bun 1.4, in the existing `status/` package.

**Primary Dependencies**: none new. `gh` CLI and `git` on the Maintainer's machine (as spec 015).

**Storage**: files in `template/`; `projects.yaml` through a PR.

**Testing**: `bun test`: the template rules (R1 to R5 for each host variant), the host map, the
copy and placeholder fill, the step plan and the resume logic with a fake GitHub client, the
catalog text insert (re-parsed with `parseCatalog` and `parseSecrets`), the secrets table, the
command text of the dialog (quoting), the gzip page budget. A real run on a test repo
(quickstart).

**Target Platform**: macOS terminal of the Maintainer; the status page in Chrome, Edge, Safari.

**Project Type**: CLI command and template files in the control repo; extension of the page.

**Performance Goals**: command < 5 minutes to the open PR (SC-003); page HTML + CSS < 30 KB gzip
for 20 sites.

**Constraints**: €0; no write token in CI (FR-010); no secret value read or printed (FR-006);
owner `ImreBoersma` only; the dialog sends no request.

**Scale/Scope**: a few new projects each year; 5 host variants (Pages, Vercel, Firebase, SSH,
none).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Result | Note |
|---|---|---|
| I. GitHub for all project work | Pass | The repo and the catalog PR are made on GitHub. |
| II. Catalog is the only project list | Pass | The command refuses an id, name or repo in the catalog; the project starts to count only after the PR merge. |
| III. No secrets or private data | Pass | The table has names and commands only; `gh secret set` asks for the value. A test checks that the command never reads stdin for a value. |
| IV. Use shared configuration | Pass | Each caller only calls a shared workflow, about 10 lines; the template has no copy of shared logic. |
| V. One pipeline, not one host | Pass | Each host variant uses the shared deploy workflow. |
| VIII. Keep the work small | Pass | One folder, one command, one dialog; no new dependency, no server. |
| IX. Spec Kit only for application code | Pass | The command and the dialog are application code; the template files are configuration that the command copies. |
| X. ASD-STE100 | Pass | Template, output, PR and dialog text in STE. |

Re-check after Phase 1: no violations.

## Project Structure

### Documentation (this feature)

```text
specs/011-new-project-template/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── template.md     # the files of template/ and the host variants
│   ├── command.md      # bun run new-project: options, steps, output, errors
│   └── dialog.md       # the "New project" dialog in the ⌘K box
└── tasks.md            # made by /speckit-tasks
```

### Source Code

```text
template/                          # new: the files of a new repo (contracts/template.md)
├── .github/workflows/board.yml
├── ci/{pages,vercel,firebase,ssh,none}.yml   # one of them becomes .github/workflows/ci.yml
├── renovate.json, biome.json, package.json, index.html, .gitignore, README.md
status/src/new-project/
├── hosts.ts                       # new: the host map (shared by the command and the page)
├── template.ts                    # new: read template/, pick the CI variant, fill {{name}}, {{id}}
├── catalog-edit.ts                # new: insert the project and secret entries as text
├── steps.ts                       # new: the step plan, the state checks, the secrets table
└── run.ts                         # new: options, dry run, gh and git calls
status/src/campaign/github.ts      # reused: findPr, writeCommit, setBranch, openPr
status/src/render.ts               # changed: "New project" item and dialog, inline ids and repos
status/src/client.ts               # changed: newProjectCommand(), dialog start
status/package.json                # changed: script new-project
status/tests/                      # new: template, hosts, new-project, catalog-edit, size;
                                   #   changed: css.test.ts, render.test.ts (raw budgets go)
.github/workflows/status-page.yml  # changed: paths include template/**
docs/conformance.md                # changed: new projects start with the command (FR-012)
specs/019-dashboard-filters/spec.md  # changed: SC-005 note → the gzip budget of spec 011
```

**Structure Decision**: the command lives in the status package because it reuses the catalog
parser, the conformance rules and the GitHub client of spec 015. The template lives at the repo
root, next to `.github/workflows/`, because its callers point at those files.

## Complexity Tracking

No violations.
