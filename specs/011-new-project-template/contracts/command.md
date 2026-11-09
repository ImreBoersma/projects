# Contract: `bun run new-project`

Run in `status/`, with the `gh` login of the Maintainer.

```text
bun run new-project --id <id> --name <name> --repo <repo> --visibility public|private \
  --stack <stack> --host pages|vercel|firebase|ssh|none [--dry-run]
```

All options except `--dry-run` are required. A wrong value stops with the rule of data-model.md.

## Output

```text
New project: <name> (ImreBoersma/<repo>, public, Vercel)
[done]  check     The id, the name and the repo are free.
[to do] repo      Make ImreBoersma/<repo> from the template (ci: vercel).
                  Files: .github/workflows/ci.yml, .github/workflows/board.yml, renovate.json,
                  biome.json, package.json, bun.lock, index.html, .gitignore, README.md
[to do] settings  Issues on, vulnerability alerts on, Dependabot security updates off.
                  (host pages: also Pages on, source GitHub Actions)
[to do] catalog   Open the PR "feat: add <name> to the catalog (spec 011)" in ImreBoersma/projects.

Set these secrets and variables:
| Name | Kind | Repo | Command |
|---|---|---|---|
| BOARD_TOKEN | secret | ImreBoersma/<repo> | gh secret set BOARD_TOKEN -R ImreBoersma/<repo> |
| VERCEL_TOKEN | secret | ImreBoersma/<repo> | gh secret set VERCEL_TOKEN -R ImreBoersma/<repo> |
| VERCEL_ORG_ID | variable | ImreBoersma/<repo> | gh variable set VERCEL_ORG_ID -R ImreBoersma/<repo> |
| VERCEL_PROJECT_ID | variable | ImreBoersma/<repo> | gh variable set VERCEL_PROJECT_ID -R ImreBoersma/<repo> |
Then: gh workflow run ci.yml -R ImreBoersma/<repo>
BOARD_TOKEN and VERCEL_TOKEN are the same tokens as in the other repos. Without the value: make a
new token, merge the catalog PR, then run `bun run secret-set <NAME>` (sets all repos).
Make the host side by hand (Vercel project). Write the expiry dates in the catalog PR.
```

A dry run prints the same lines with "Dry run: no change." at the start and the end; each step
stays `[to do]` or `[done]`. A real run prints each step as it ends, with `[done]` or `[failed]`
and the message; after a failure, it prints "Run the same command again to continue." and stops
with exit code 1.

## Errors (stop before any change, exit code 1)

| Case | Message |
|---|---|
| id, name or repo in the catalog | `<field> "<value>" is in the catalog.` |
| repo exists without the template commit | `ImreBoersma/<repo> exists. To bring an existing repo in line, use the conformance check (spec 008) and a campaign (spec 015).` |
| no `gh` login, or not enough rights | `The gh login cannot make repos or change settings: <reason>.` |
| `git` or `gh` not found | `<tool> is not installed.` |

The command never reads a secret value, and never writes one to an argument, a file or the
output.
