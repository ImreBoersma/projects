# Status page

This package makes the project status page and the problem issues. The workflow
`.github/workflows/status-page.yml` runs it each hour (minute 17). The design is in
`specs/001-project-status-page/` and the later specs. All commands of this package, with their
options: [../README.md](../README.md).

## Run locally

Install the dependencies:

```sh
bun install
```

Make the page:

```sh
STATUS_READ_TOKEN=<token> CONFORMANCE_READ_TOKEN=<token> bun run start --mode page --out ../_site
```

Show the issue actions. This command does not change issues:

```sh
STATUS_READ_TOKEN=<token> GITHUB_TOKEN=<token> bun run start --mode issues --dry-run
```

Run the checks:

```sh
bun test
bun run lint
bun run typecheck
```

## Secrets

| Secret                   | Contents                                                                                                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `STATUS_READ_TOKEN`      | Fine-grained PAT. Owner `ImreBoersma`. All repos. Read access: Metadata, Contents, Pull requests, Commit statuses, Actions, Deployments.                                       |
| `STATUS_READ_TOKEN_HOB`  | Optional. The same permissions, owner `harmonieorkest-brummen`. The organisation must approve it.                                                                              |
| `CONFORMANCE_READ_TOKEN` | Fine-grained PAT. Owner `ImreBoersma`. All repos. Read access: Metadata, Contents, Administration, Secrets, Variables (spec 008). Also used for the versions table (spec 016). |

Without a token for an owner, the page shows "Data not available" for the repos of that owner.
Without `CONFORMANCE_READ_TOKEN`, the setup check and the versions of the `ImreBoersma` repos are
not available. The expiry dates of the tokens are in the `secrets` list of `projects.yaml`.

## Schedule limit

GitHub disables scheduled workflows in a public repo after 60 days without repo activity. Then
the page and the issues stop. The page shows a warning when its data is more than 3 hours old.
Push one commit to start the schedule again.
