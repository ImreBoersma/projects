# Research: Shared CI and Deploy Workflows

All facts about the project repos are from the GitHub API on 2026-10-30.

## 1. Current state of the repos

| Repo | Default branch | Package manager | Biome | Scripts | Live deploy now |
|---|---|---|---|---|---|
| Beter-dan-de-MIDI | `pwa` (renamed to `main`, §6) | npm (`--legacy-peer-deps`) | yes, `src/**/*.ts` only | `build` (tsc + vite) | GitHub Pages, env `github-pages` |
| boek-de-bus | `main` | bun | yes | `build`, `test` | Vercel Git integration, env `Production` |
| personal-website | `main` | npm | yes | `build` | Vercel Git integration, env `Production` |
| Reperatie-Formulier | `main` | npm | yes | `build` | none (private, no host) |
| scales-exercises | `main` | yarn 4 | yes | `build`, `test` | Firebase action, no deployment record |

- **Finding**: Beter-dan-de-MIDI does not deploy to Azure Static Web Apps. `swa-cli.config.json`
  is only for a manual CLI deploy. The live site is `imreboersma.github.io/Beter-dan-de-MIDI`.
  The catalog value `host: Azure Static Web Apps` is wrong.
- **Finding**: all five repos already use Biome. No repo needs a move from ESLint.
- **Finding**: four repos have Dependabot auto-merge jobs in their CI file. These jobs go away
  with the old CI files. Spec 003 adds the Renovate automerge.

## 2. Package manager detection

- **Decision**: the shared CI finds the package manager from the lock file: `bun.lock` → bun,
  `yarn.lock` → yarn (through corepack), `package-lock.json` → npm. Install commands:
  `bun install --frozen-lockfile`, `yarn install --immutable`, `npm ci`.
- **Rationale**: FR-003. No input to set, so the caller stays short.
- **Alternatives considered**: an input `package-manager` (one more line in each caller, and it can
  disagree with the lock file). The `packageManager` field (only scales-exercises sets it).
- **Note**: Beter-dan-de-MIDI needs `--legacy-peer-deps`. It gets `.npmrc` with
  `legacy-peer-deps=true`, so that `npm ci` works without a flag.

## 3. Lint, build and test steps

- **Decision**: lint is always `biome ci .` through the package manager (`npx`, `yarn`, `bunx`).
  Build runs the `build` script and test runs the `test` script, each only when the script exists
  (FR-004).
- **Rationale**: the `lint` scripts differ (personal-website writes fixes). `biome ci` never writes
  and reads `biome.json`, so each repo controls its own file scope.
- **Alternatives considered**: run the `lint` script (not uniform, and one writes files).
- **Dropped**: the `npm audit` step of Beter-dan-de-MIDI. Spec 003 (Renovate with security
  updates) replaces it.

## 4. Build-time environment values

- **Decision**: an optional secret `build-env`. It contains `KEY=value` lines. The shared CI writes
  it to `.env.local` before the build.
- **Rationale**: scales-exercises needs six `REACT_APP_*` values at build time. A reusable workflow
  cannot pass any environment variable unless it names it. Vite and Next.js both read `.env.local`.
- **Alternatives considered**: one named secret for each value (not generic). Build in the deploy
  workflow (two builds, and CI does not test the deployed build).

## 5. Build output from CI to deploy

- **Decision**: the shared CI has an input `artifact` (a folder, for example `dist`). When set, CI
  uploads the folder as artifact `build`. The deploy workflow downloads it. Vercel is the exception:
  `vercel build` makes its own output with the environment of the Vercel project.
- **Rationale**: one build, and the deployed files are the files that CI tested. Artifacts are
  shared between the jobs of one run, also across reusable workflows.

## 6. Deploy only from the default branch

- **Decision**: rename the default branch of Beter-dan-de-MIDI from `pwa` to `main`, so that all
  repos use `main` (FR-007). Each deploy workflow runs its deploy job only when the event is `push`
  and the ref is the default branch of the repo. The callers start CI on `push` to `main` and on
  `pull_request`.
- **Rationale**: one branch name in all repos and in the callers. The default-branch check stays
  generic, and PRs never deploy (US2/AC4). A `push` trigger only on `main` prevents two CI runs
  for each PR commit.
- **Alternatives considered**: keep `pwa` and write "default branch" in the spec (two names for the
  same concept).

## 7. GitHub Pages and `environment: production`

- **Decision**: the Pages deploy job uses `environment: github-pages`. The status page (spec 001)
  also reads the environment `github-pages`. The constitution rule in Development Workflow gets
  an amendment: a GitHub Pages deploy job sets `environment: github-pages`.
- **Rationale**: `actions/deploy-pages` deploys to the `github-pages` environment. Its branch rules
  are on that environment. A second, empty job with `environment: production` only to make a record
  is extra logic for no gain.
- **Alternatives considered**: an extra "record" job with `environment: production` (more lines in
  the shared workflow, and two deployment records for one deploy).

## 8. Vercel deploys through GitHub Actions

- **Decision**: `deploy-vercel.yml` runs the Vercel CLI: `vercel pull --environment=production`,
  `vercel build --prod`, `vercel deploy --prebuilt --prod`, with `environment: production`. Each
  Vercel repo gets `vercel.json` with `"git": { "deploymentEnabled": { "main": false } }`.
- **Rationale**: FR-013. The setting stops the Git integration for `main` only. Preview deploys for
  other branches continue, so the spec assumption about lost previews does not occur.
- **Secrets**: `VERCEL_TOKEN` (secret). `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` are not secret;
  they are Actions variables of the repo.
- **Alternatives considered**: disconnect the Git integration (no previews). `amondnet/vercel-action`
  (a third-party action for three CLI commands).

## 9. Secrets from caller to shared workflow

- **Decision**: each caller passes its secrets by name (`secrets: { firebase-service-account: ... }`),
  not with `secrets: inherit`.
- **Rationale**: the caller shows which secrets go to the shared workflow. scales-exercises keeps its
  existing secret names, so no secret must be made again. `inherit` does not work for a repo of a
  different owner (spec 006).

## 10. Version of the shared workflows

- **Decision**: callers use `@main`. To test a change, a caller on a branch uses `@<branch>` of
  `projects`.
- **Rationale**: US3. A change on `main` goes to all repos at their next run. The constitution
  requires a test on one real repo before the merge.
- **Alternatives considered**: tags such as `@v1` (a release step for each change; useful only
  with more users).

## 11. Concurrency

- **Decision**: CI: group `ci-<ref>`, cancel in progress. Deploy: group `deploy-<repo>`, no cancel.
- **Rationale**: a new push makes an old CI run useless. A deploy must complete, and the second
  deploy waits (edge case "two pushes").

## 12. Status page deploy

- **Decision**: the status page in `projects` uses `deploy-pages.yml`. Its build job uploads the
  artifact `build` instead of a Pages artifact.
- **Rationale**: Beter-dan-de-MIDI is the second Pages project. The Principle V exception of spec
  001 ends.

## 13. Lint for the shared workflows

- **Decision**: a workflow in `projects` runs `actionlint` on each push and PR that changes
  `.github/workflows/**`.
- **Rationale**: an error in a shared workflow breaks CI in all repos. HomeLab already uses
  actionlint.
