# Data Model: Shared CI and Deploy Workflows

This feature has no stored data. The entities are workflow files and their settings.

## Shared workflow

| Field | Value |
|---|---|
| `file` | `ci-node.yml`, `deploy-pages.yml`, `deploy-firebase.yml`, `deploy-vercel.yml` |
| `inputs`, `secrets` | See [contracts/workflows.md](./contracts/workflows.md) |
| `environment` | `production`, or `github-pages` for Pages (research.md §7) |

## Caller workflow

| Field | Rule |
|---|---|
| `repo` | An own repo in `projects.yaml` with status `active` or `maintenance` and a Node project |
| `jobs` | `ci` (always), `deploy` (only when the catalog `host` has a shared deploy workflow) |
| length | Maximum 15 lines without blank lines |

## Host to deploy workflow

| Catalog `host` | Shared workflow | Environment |
|---|---|---|
| GitHub Pages | `deploy-pages.yml` | `github-pages` |
| Firebase | `deploy-firebase.yml` | `production` |
| Vercel | `deploy-vercel.yml` | `production` |
| empty | none (CI only) | — |

## Catalog change

`beter-dan-de-midi`: `host` changes from `Azure Static Web Apps` to `GitHub Pages` (research.md §1).

## Deployment record (read by spec 001)

| Field | Source |
|---|---|
| environment | `production`, `Production` or `github-pages` |
| `createdAt` | start of the deploy job |
| `latestStatus.state` | `SUCCESS` when the deploy job passes, `FAILURE` when it fails |
