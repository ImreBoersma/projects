# Quickstart: Archive Suggestions for Old Projects

## Tests

```sh
cd status
bun test && bun run typecheck && bun run lint
```

Expected: the person test (a Dependabot squash merge with a `User` commit author is not a person;
a `campaign` PR is not a person; a direct push by a user is a person; `renovate[bot]` is not), the
12-month rule (11 months: nothing; 13 months: `suggest`), an open issue by a person stops it,
`keep` before, on and after its date, `orEarlier`, not available, the catalog errors of `keep`,
the paged read with a fake fetch (stop at the first person commit, at most 5 pages), and the row
and detail HTML.

## Token permission (Maintainer, once)

| Token | Where | Change |
|---|---|---|
| `STATUS_READ_TOKEN` | GitHub → Settings → Developer settings → Fine-grained tokens | Repository permissions → Issues: Read-only |
| `STATUS_READ_TOKEN_HOB` | the same | Issues: Read-only; then `harmonieorkest-brummen` approves the request |

The secret values do not change. Before the change, the log shows `Archive <repo>: not sure (no
issue data)` and the page shows no suggestion.

## Local run with real data

```sh
cd status
STATUS_READ_TOKEN=… STATUS_READ_TOKEN_HOB=… bun run start -- --out <scratchpad>/site
```

Expected: a log line `Archive <repo>: last work <date>` for each repo, no text. Today no project
gets a suggestion (the oldest work by a person is pretband-backend, 2026-07-29).

To see the badge, run the render test with a project whose last work is 13 months old, or set a
test catalog `keep` date in the past on a fake project.

## After the merge

Check every workflow run on the merge commit. The page shows no "Archive?" badge today (no project
is 12 months old).
