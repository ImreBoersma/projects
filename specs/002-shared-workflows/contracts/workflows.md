# Contract: shared workflows

All files are in `ImreBoersma/projects/.github/workflows/`. Callers use `@main`.

## `ci-node.yml`

| Kind | Name | Required | Default | Meaning |
|---|---|---|---|---|
| input | `node-version` | no | `24` | Node version |
| input | `artifact` | no | empty | Folder to upload as artifact `build` after the build |
| secret | `build-env` | no | — | `KEY=value` lines, written to `.env.local` before the build |

Steps, in this order. A failed step stops CI.

1. Checkout.
2. Find the package manager from the lock file (research.md §2). No lock file → fail with
   "No lock file found. Add bun.lock, yarn.lock or package-lock.json.".
3. Install with the frozen lock file.
4. `biome ci .`
5. If `build-env` is set: write `.env.local`. If a `build` script exists: run it.
6. If a `test` script exists: run it.
7. If `artifact` is set: upload the folder as artifact `build`. Missing folder → fail.

Permissions: `contents: read`. Concurrency: `ci-<workflow>-<ref>`, cancel in progress.

## `deploy-pages.yml`

| Kind | Name | Required | Meaning |
|---|---|---|---|
| — | — | — | No inputs. It deploys artifact `build`. |

Job `deploy`: runs only on the default branch, never for a pull request. `environment: github-pages`. Permissions
`pages: write`, `id-token: write`. Steps: download `build`, upload it as the Pages artifact,
deploy. Concurrency `deploy-<repo>`, no cancel.

## `deploy-firebase.yml`

| Kind | Name | Required | Meaning |
|---|---|---|---|
| input | `project-id` | yes | Firebase project, for example `imre-boersma` |
| input | `target` | no | Hosting target in `firebase.json`, for example `scales` |
| secret | `firebase-service-account` | yes | Service account JSON |

Job `deploy`: runs only on the default branch, never for a pull request. `environment: production`. Steps:
checkout (for `firebase.json`), download `build` into the `public` folder of `firebase.json`, deploy
to channel `live`. Concurrency `deploy-<repo>`, no cancel.

## `deploy-vercel.yml`

| Kind | Name | Required | Meaning |
|---|---|---|---|
| secret | `vercel-token` | yes | Vercel token |
| variable (repo) | `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | yes | Read from the Actions variables of the caller repo |

Job `deploy`: runs only on the default branch, never for a pull request. `environment: production`. Steps:
checkout, Node, bun if `bun.lock` exists, `vercel pull --yes --environment=production`,
`vercel build --prod`,
`vercel deploy --prebuilt --prod`. The Vercel CLI version is fixed. Concurrency `deploy-<repo>`, no
cancel.

## Rules for all deploy workflows

- The deploy job runs for `push`, `schedule` and `workflow_dispatch` on the default branch, so that
  the scheduled status page also deploys. Project callers start only on `push` to `main` and on
  `pull_request`, so a project deploys only on a push to `main` (FR-007).

- A missing secret or variable fails the job with a message that names it (spec edge case).
- No secret value goes to the log.
- Messages and step names use ASD-STE100.
