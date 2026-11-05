# Implementation Plan: hob.nl in Git with a Deploy Workflow

**Branch**: `006-hob-nl-deploy` | **Date**: 2026-11-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-hob-nl-deploy/spec.md`

## Summary

The custom code of hob.nl (the `hob-*` must-use plugins) is in the private repo
`harmonieorkest-brummen/hob-nl` (first commit 2026-11-05). A new shared workflow `deploy-ssh.yml`
in `projects` checks the PHP syntax, then copies only the `hob-*` items to
`~/html/wp-content/mu-plugins` on GoDaddy with rsync over SSH (password through `sshpass`, pinned
host key), with `environment: production`. A caller in `hob-nl` runs it on push to `main` and on
dispatch. The catalog entry `hob-nl` gets its `repo`.

## Technical Context

**Language/Version**: GitHub Actions YAML; PHP 8 (`php -l` on the runner) for the syntax check.

**Primary Dependencies**: `rsync` (runner and server, server checked: `/usr/bin/rsync`),
`sshpass` (runner, from apt). No third-party action.

**Storage**: none.

**Testing**: actionlint; a deploy from a test branch with `--dry-run`; a real deploy of a small
change; a check that the GoDaddy files are not changed.

**Target Platform**: GitHub Actions `ubuntu-latest` → GoDaddy Managed WordPress
(`512403.eu13.ssh.myftpupload.com`, user `client_…`, site in `~/html`).

**Project Type**: shared deploy workflow plus a caller in a repo of another owner.

**Performance Goals**: a deploy in less than 2 minutes (SC-003: live within 5 minutes).

**Constraints**: €0 each month. Change only `hob-*` in `mu-plugins` (FR-005). No secret in git
(FR-002). Setup in `harmonieorkest-brummen` is manual (constitution, Additional Constraints).

**Scale/Scope**: 7 files (131 KB).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Result | Note |
|---|---|---|
| II. Catalog is the only project list | Pass | `hob-nl` gets `repo: harmonieorkest-brummen/hob-nl`. |
| III. No secrets or private data | Pass | Password, host and user are Actions secrets of `hob-nl`. The first commit was scanned (research.md §1). |
| IV. Shared configuration | Pass | The caller only calls `deploy-ssh.yml`. |
| V. One pipeline | Pass | Push to `main` deploys through the shared workflow. |
| VI. Sites off the HomeLab | Pass | The site stays on GoDaddy. |
| VIII. Keep the work small | Pass | Only the custom code is in git; no new host. |
| X. ASD-STE100 | Pass | README, workflow text and commit messages use STE. |
| Development Workflow: `environment: production` | Pass | Tested 2026-11-05: the private repo of a free organisation records the deployment (research.md §4). |
| Development Workflow: test shared workflow on a real repo | Pass | Caller on the branch first (quickstart.md §2). |
| Repos of other owners | Pass | The Maintainer made the repo and the secrets by hand. This repo only gives the shared workflow. |

Re-check after Phase 1: no violations. One risk to accept: the SSH password gives access to the
full site (research.md §2).

## Project Structure

### Documentation (this feature)

```text
specs/006-hob-nl-deploy/
├── plan.md
├── research.md
├── quickstart.md
├── contracts/
│   ├── deploy-ssh.md    # interface of the shared workflow
│   └── caller.md        # the caller in hob-nl
└── tasks.md             # made by /speckit-tasks
```

No `data-model.md`: there is no data. The deploy target is in research.md §3.

### Source Code

```text
projects/ (this repo)
├── .github/workflows/deploy-ssh.yml   # new: shared deploy with rsync over SSH
└── projects.yaml                      # changed: repo of hob-nl

harmonieorkest-brummen/hob-nl (repo of the organisation)
├── mu-plugins/hob-*                   # the custom code (first commit a0a7690)
├── .github/workflows/deploy.yml       # new: caller
└── .github/workflows/access-test.yml, env-test.yml   # removed after the tests
```

**Structure Decision**: one generic shared workflow for an rsync deploy over SSH, with inputs for
the source, the target and the name pattern. hob.nl is the only user now (spec assumption).

## Complexity Tracking

No violations.
