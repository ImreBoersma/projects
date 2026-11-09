# Contract: `template/`

| File in `template/` | File in the new repo | Note |
|---|---|---|
| `ci/<host>.yml` | `.github/workflows/ci.yml` | one variant, research §1 |
| `.github/workflows/board.yml` | same | public repos only |
| `renovate.json` | same | `extends` the preset only |
| `biome.json` | same | the shared Biome settings of the current repos |
| `package.json` | same | `{{id}}`; script `build`; dev dependency `@biomejs/biome` |
| `index.html` | same | placeholder page with `{{name}}` |
| `.gitignore` | same | `node_modules/`, `dist/`, `.env*`, `.vercel` |
| `README.md` | same | `{{name}}`, the link to the status page, "Made from the template of spec 011" |

The command adds `bun.lock` (research §2). No other file.

## Rules (checked by `status/tests/template.test.ts`)

For each CI variant, the facts of a repo made from the template (public, with `package.json`)
pass R1 to R5 of spec 008:

- R1: `ci.yml` calls `ImreBoersma/projects/.github/workflows/ci-node.yml@main`.
- R2: `board.yml` calls `add-to-board.yml@main`.
- R3: each workflow sets `permissions` with `contents: read`; a deploy job adds only the
  permissions of its shared workflow.
- R4: `renovate.json` extends `github>ImreBoersma/projects//renovate/default`.
- R5: no `.github/dependabot.yml`.

Each workflow is at most 15 lines (Principle IV: about 10). Placeholders are only `{{id}}` and
`{{name}}`; a test checks that no other `{{` remains after the fill.

## Example: `ci/vercel.yml`

```yaml
name: CI
on:
  push: { branches: [main] }
  pull_request:
  workflow_dispatch:
permissions: { contents: read }
jobs:
  ci:
    uses: ImreBoersma/projects/.github/workflows/ci-node.yml@main
  deploy:
    needs: ci
    uses: ImreBoersma/projects/.github/workflows/deploy-vercel.yml@main
    secrets: { vercel-token: "${{ secrets.VERCEL_TOKEN }}" }
```
