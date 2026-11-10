# projects

The control repo of the projects of ImreBoersma: the catalog (`projects.yaml`), the status page
(<https://imreboersma.github.io/projects/>), the shared workflows and the Renovate preset. The
plan is in [PLAN.md](PLAN.md).

## Commands

Run all commands in `status/`. A command that changes a repo uses the `gh` login of the
Maintainer; use `--dry-run` first.

### new-project

```text
bun run new-project --id <id> --name <name> --repo <repo> --visibility public|private
                    --stack <stack> --host pages|vercel|firebase|ssh|none [--dry-run]
```

Makes a new repo under `ImreBoersma` from `template/`, sets the repo settings, opens the catalog
PR and shows the secrets to set. Run it again to continue after an error. The ⌘K box of the
status page ("New project") makes this command. Spec 011.

### campaign

```text
bun run campaign <id> [--dry-run] [--reopen <catalog id>] [--overwrite <catalog id>]
```

Opens or updates one PR in each target repo with the changes of `campaigns/<id>.yaml` (write a
file, or replace a text). `--dry-run` shows the diffs and changes nothing. `--reopen` reopens a
closed PR. `--overwrite` updates a branch that has hand changes (the hand changes go away). Not for
dependency versions (Renovate) or secret values. Format: [campaigns/README.md](campaigns/README.md).
Spec 015.

### secret-set

```text
bun run secret-set <NAME>
```

Asks for the value (not shown) and sets the secret `<NAME>` in each repo that the catalog list
`secrets` gives for it. The value is not in an argument, a file or the log. Then write the new
expiry date in `projects.yaml` by hand, if the new value has one. Spec 015.

### start

```text
bun run start [--mode page|issues] [--out <dir>] [--dry-run]
              [--catalog <file>] [--history <dir>] [--history-out <file>]
```

Makes the status page (`--mode page`, the default, into `--out`, default `../_site`) or opens and
closes the problem issues (`--mode issues`; with `--dry-run` it only shows them). Needs the read
tokens in the environment: `STATUS_READ_TOKEN`, `STATUS_READ_TOKEN_HOB`,
`CONFORMANCE_READ_TOKEN`, and `GITHUB_TOKEN` for the issues. The workflow `status-page.yml` runs
it each hour. Spec 001.

### Checks

```text
bun test             all tests
bun run lint         Biome
bun run typecheck    TypeScript, no output files
bun run css          builds build/page.css (start runs it first)
```

### CI only

```text
bun run board:add              adds a new issue to the project board (workflow add-to-board.yml)
bun run board:sync [--dry-run]   makes the board agree with the catalog (workflow board-sync.yml)
```

These need `BOARD_URL` and a board token, and run in GitHub Actions. Spec 004.
