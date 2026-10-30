# Quickstart: validate the shared workflows

## Prerequisites

- The shared workflows are on a branch of `projects`, for example `002-shared-workflows`.
- `actionlint` passes on `.github/workflows/` of `projects`.
- The secrets and variables of [contracts/caller.md](./contracts/caller.md) exist in each repo.

## 1. Test one repo before the merge (constitution, Development Workflow)

1. In scales-exercises, on a branch, replace the workflows with the caller of contracts/caller.md.
   Use `@002-shared-workflows` in place of `@main`.
2. Open a PR. Expected: CI runs install, lint, build, test. No deploy job runs (US2/AC4).
3. Push a commit with a Biome error. Expected: CI fails at lint (US1/AC2).
4. Repair the error. Merge the PR. Expected: CI passes, then the deploy job runs. The site changes.
5. Run the status page workflow. Expected: scales-exercises shows the deploy date and "Succeeded".

## 2. Merge the shared workflows

1. Merge the branch of `projects` into `main`.
2. Change `@002-shared-workflows` to `@main` in scales-exercises.

## 3. Each other repo

For each repo in contracts/caller.md:

1. Add the caller and the other files. Remove the old workflow files.
2. Open a PR. Expected: CI passes. No deploy.
3. Merge. Expected: a deploy for repos with a host. Reperatie-Formulier gets CI only.
4. For the Vercel repos: expected one production deployment from GitHub Actions and no production
   deployment from the Vercel Git integration. A PR branch still gets a Vercel preview.

## 4. Package managers (US1/AC4)

Expected: the CI logs show `npm ci` for Beter-dan-de-MIDI, `bun install` for boek-de-bus and
`yarn install` for scales-exercises.

## 5. One change for all repos (US3)

1. In `projects`, add a harmless step to `ci-node.yml`, for example a step that prints the Node
   version.
2. Push to two project repos. Expected: both runs show the new step. Remove the step.

## 6. Status page

1. Run the status page workflow. Expected: it deploys through `deploy-pages.yml`.
2. Expected: each project with a host shows a last deploy, not "Unknown" (SC-002).
