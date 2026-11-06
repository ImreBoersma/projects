# Contract: the commands

Run in `status/`. Both use the Maintainer's `gh` login; neither runs in CI.

## `bun run campaign <id> [--dry-run] [--reopen <catalog id>]`

1. Parse `campaigns/<id>.yaml` and the catalog. Stop on an error.
2. For each target repo, in catalog order, one line:

```text
boek-de-bus        opened   #42
personal-website   updated  #17
scales-exercises   not needed
hob-nl             failed   .github/workflows/ci.yml: the old text is not in the file
pretband-backend   no access
```

3. `--dry-run`: the same lines with `would open` / `would update`, and below each needed repo a
   diff of each changed file. No write to any repo.
4. Exit code 0 when no repo failed, else 1. A failed repo does not stop the others.
5. `--reopen <id>`: for that repo, a closed PR of the campaign is reopened and updated.

## `bun run secret-set <NAME>`

1. Read the catalog list of spec 013. Take the entries with `name: <NAME>` and kind
   `actions-secret`. None: stop with `<NAME> is not in the catalog as an actions-secret.`
2. Show the repos. Ask `Value (not shown):` with echo off. Empty value: stop.
3. For each repo: `gh secret set <NAME> -R <repo>`, value on stdin. One line for each repo: `set`
   or `failed: <gh exit text>` (the gh text never contains the value).
4. The value is not in an argument, a file, the environment of a child process, or a log line.
