# Data Model: New-Project Template and Onboarding

## New project input

| Field | Rule |
|---|---|
| `id` | `^[a-z0-9-]+$`; not an id in the catalog |
| `name` | text, 1 to 60 characters; not a name in the catalog |
| `repo` | `^[A-Za-z0-9._-]+$`; the full name `ImreBoersma/<repo>` is not in the catalog and does not exist on GitHub (except a repo from an earlier run of this command, research §4) |
| `visibility` | `public` or `private` |
| `stack` | text, for example "Vite, React"; written to the catalog as it is |
| `host` | a key of the host map |
| `dryRun` | boolean |

## Host map (`status/src/new-project/hosts.ts`)

| Key | Catalog `host` | CI variant | Secrets | Variables |
|---|---|---|---|---|
| `pages` | GitHub Pages | `template/ci/pages.yml` | — | — |
| `vercel` | Vercel | `template/ci/vercel.yml` | `VERCEL_TOKEN` | `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` |
| `firebase` | Firebase | `template/ci/firebase.yml` | `FIREBASE_SERVICE_ACCOUNT` | `FIREBASE_PROJECT_ID` |
| `ssh` | Shared hosting | `template/ci/ssh.yml` | `SSH_HOST`, `SSH_USER`, `SSH_PASSWORD` | `SSH_KNOWN_HOSTS`, `SSH_TARGET`, `SSH_PATTERN` |
| `none` | (empty) | `template/ci/none.yml` | — | — |

A public repo also gets `.github/workflows/board.yml` and the secret `BOARD_TOKEN` (spec 008 R2).
A test checks that the secret and variable names of each row are the names that its CI variant
uses (the same parse as R9).

## Setup step

| Step | Done when |
|---|---|
| `check` | always first; read only |
| `repo` | the repo exists with the template commit |
| `settings` | issues on, vulnerability alerts on, security fixes off; for `pages`, Pages on with the source GitHub Actions |
| `catalog-pr` | an open PR from `new-project/<id>` in `projects` |

State of each step: `done`, `to do`, `failed` (with the message). A dry run shows `to do` and
`done` without a change.

## Catalog entries (in the PR)

Project block, in the format of spec 001 `contracts/catalog.md`:

```yaml
  - id: <id>
    name: <name>
    repo: ImreBoersma/<repo>
    status: active
    stack: <stack>
    host: <catalog host>
    domain:
    stakeholder:
    renewal:
```

One secret entry for each secret of the host map row (and `BOARD_TOKEN` when public), kind
`actions-secret`, `where: ImreBoersma/<repo>`, `project: <id>`, `expires` from research §5.
Variables are not in the secret list (spec 013 lists secrets only).

## Secrets table row

`name`, `kind` (`secret` or `variable`), `repo`, `command` (research §6).
