# Contract: caller workflow in a project repo

File: `.github/workflows/ci.yml`. It contains only calls to shared workflows (FR-009). Maximum
15 lines without blank lines (SC-003).

## CI only (Reperatie-Formulier)

```yaml
name: CI
on:
  push: { branches: [main] }
  pull_request:
jobs:
  ci:
    uses: ImreBoersma/projects/.github/workflows/ci-node.yml@main
```

## CI and deploy (example: scales-exercises)

```yaml
name: CI
on:
  push: { branches: [main] }
  pull_request:
jobs:
  ci:
    uses: ImreBoersma/projects/.github/workflows/ci-node.yml@main
    with: { artifact: build }
    secrets: { build-env: "${{ secrets.BUILD_ENV }}" }
  deploy:
    needs: ci
    uses: ImreBoersma/projects/.github/workflows/deploy-firebase.yml@main
    with: { project-id: imre-boersma, target: scales }
    secrets: { firebase-service-account: "${{ secrets.FIREBASE_SERVICE_ACCOUNT_IMRE_BOERSMA }}" }
```

The deploy workflow checks the event and the branch itself, so the caller has no `if:`.

## CI and Pages deploy (example: Beter-dan-de-MIDI)

```yaml
name: CI
on:
  push: { branches: [main] }
  pull_request:
jobs:
  ci:
    uses: ImreBoersma/projects/.github/workflows/ci-node.yml@main
    with: { artifact: dist }
  deploy:
    needs: ci
    permissions: { pages: write, id-token: write }
    uses: ImreBoersma/projects/.github/workflows/deploy-pages.yml@main
```

A shared workflow gets only the permissions that the caller job gives. The Pages deploy needs
`pages: write` and `id-token: write`.

## Each repo

| Repo | CI `artifact` | Deploy | Other files |
|---|---|---|---|
| Beter-dan-de-MIDI | `dist` | `deploy-pages.yml` | Default branch `pwa` renamed to `main`. `.npmrc` (`legacy-peer-deps=true`). Build sets the Vite `base` and copies `index.html` to `404.html`. |
| boek-de-bus | — | `deploy-vercel.yml` | `vercel.json` with `git.deploymentEnabled.main: false` |
| personal-website | — | `deploy-vercel.yml` | `vercel.json` with `git.deploymentEnabled.main: false` |
| Reperatie-Formulier | — | none | — |
| scales-exercises | `build` | `deploy-firebase.yml` | Secret `BUILD_ENV` with the six `REACT_APP_*` lines |

Old files to remove: `ci.yml`, `main.yml`, `node.js.yml`, `firebase-hosting-merge.yml` (FR-012).
`dependabot.yml` stays until spec 003.
