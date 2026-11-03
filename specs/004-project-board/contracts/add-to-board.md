# Contract: shared workflow `add-to-board.yml`

Trigger: `workflow_call`. The caller runs it on `issues: [opened, transferred]`.

## Interface

| Kind | Name | Required | Note |
|---|---|---|---|
| secret | `board-token` | yes | classic PAT, scopes `project` and `repo` (research.md §3) |

No inputs. The job reads the issue from `github.event.issue` and the repo from
`github.repository`.

## Behaviour

1. Check out `ImreBoersma/projects` at `main` (catalog and `status/`).
2. `bun run board:add`. It finds the catalog entry (data-model.md, "Catalog lookup").
3. No entry: write "Not in the catalog: <repo>. Not added." to the log. Exit 0.
4. Entry: add the issue to the board. Set Project to the entry `name`. Set Roadmap to No.
5. The issue is already on the board: set only an empty Project. Exit 0.
6. The Project option for the entry does not exist: exit 1 with "Run the board sync: no Project
   option <name>."
7. A token or API error: exit 1. GitHub sends a notification (spec edge case).

Job permissions: `contents: read`. The job writes to the board only with `board-token`.

Constant: the board URL `https://github.com/users/ImreBoersma/projects/<N>` is in the shared
workflow as an environment value. It is not a secret.

## Shared workflow `board-sync.yml` (in `projects` only)

Triggers: `push` to `main` that changes `projects.yaml`, `workflow_dispatch`. The issues job of
`status-page.yml` also runs `bun run board:sync` on each scheduled status run (research.md §7).
Secret: `BOARD_TOKEN`. It runs `bun run board:sync` (research.md §4 and §5). With
`workflow_dispatch` input `dry-run: true`, it writes the planned changes to the log and changes
nothing.
