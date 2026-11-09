# Shared setup rules

The status page checks each own repo of the catalog against these rules each hour (spec 008). A
repo that fails a rule gets the problem "The repo does not follow the shared setup." and one issue.
The page and the issue link to the section of each failed rule.

A new project starts with `cd status && bun run new-project … --dry-run` (spec 011): it makes a
repo from `template/` that passes R1 to R8, and prints the secrets and variables to set; R9 passes
when they are set. Use the rules below for a repo that exists already.

A rule that does not apply to a repo can get an exception in `projects.yaml`, with a reason:

```yaml
    exceptions:
      R2: The repo is private. The board sync adds its issues (spec 004).
```

## R1 CI caller

**Reason**: each Node repo uses the shared CI of `projects` (spec 002, Principle IV).

**Applies to**: repos with a `package.json` in the root.

**Repair**:

1. Add `.github/workflows/ci.yml` from `specs/002-shared-workflows/contracts/caller.md`.
2. Make sure that it uses `ImreBoersma/projects/.github/workflows/ci-node.yml@main`. A test branch
   (for example `@004-project-board`) fails this rule.
3. Merge the PR when CI passes.

## R2 Board caller

**Reason**: new issues of a public repo go to the project board within minutes (spec 004).

**Applies to**: public repos. Private repos get their issues through the board sync.

**Repair**:

1. Add `.github/workflows/board.yml` from `specs/004-project-board/contracts/caller.md`.
2. Make sure that the repo has the secret `BOARD_TOKEN`:

   | Name | Kind | Value or source | Where |
   |---|---|---|---|
   | `BOARD_TOKEN` | Actions secret | the classic PAT with scope `project` (spec 004) | the repo |

   ```sh
   gh secret set BOARD_TOKEN -R ImreBoersma/<repo>
   ```

## R3 Caller permissions

**Reason**: a caller with `permissions: {}` does not start (`startup_failure`), and a caller
without `permissions` gets the default permissions (spec 002).

**Applies to**: each workflow that uses a workflow of `ImreBoersma/projects`.

**Repair**:

1. Open each caller in `.github/workflows/`.
2. Set `permissions: { contents: read }` at the top level. Do not use `permissions: {}`.

## R4 Renovate preset

**Reason**: all repos use the shared Renovate preset, not Dependabot (spec 003, Principle IV).

**Applies to**: all repos.

**Repair**:

1. Add `renovate.json` (or `.github/renovate.json`) with
   `"extends": ["github>ImreBoersma/projects//renovate/default"]`.
2. Do not add a branch ref such as `#003-renovate-preset`.
3. Format the file with the Biome of the repo, if the repo has Biome.

## R5 No Dependabot updates

**Reason**: Renovate makes the update PRs. Two tools make each update two times (spec 003).

**Applies to**: all repos.

**Repair**:

1. Delete `.github/dependabot.yml` (or `.yaml`) in a PR.
2. Close the open Dependabot PRs: `gh pr list -R ImreBoersma/<repo> --author app/dependabot`.

## R6 Issues on

**Reason**: Renovate makes its Dependency Dashboard as an issue, and the status page and the board
use issues (specs 001, 003, 004).

**Applies to**: all repos.

**Repair**:

```sh
gh repo edit ImreBoersma/<repo> --enable-issues
```

## R7 Security alerts

**Reason**: Renovate reads the vulnerability alerts and opens the security PRs. Dependabot security
updates are off, so that each fix gets one PR (spec 003).

**Applies to**: all repos.

**Repair**:

```sh
gh api -X PUT repos/ImreBoersma/<repo>/vulnerability-alerts
gh api -X DELETE repos/ImreBoersma/<repo>/automated-security-fixes
```

## R8 Default branch

**Reason**: the shared workflows deploy and check `main` (spec 002).

**Applies to**: all repos.

**Repair**:

1. On GitHub, open Settings, Branches, and rename the default branch to `main`.
2. Update local clones: `git branch -m <old> main && git fetch origin && git branch -u origin/main main`.
3. Check the deploy settings of the host (for example the GitHub Pages branch).

## R9 Secrets and variables

**Reason**: a caller that uses a missing secret or variable fails or deploys without its settings.
Ids that are not secret (for example Vercel ids) are variables, not secrets (spec 002).

**Applies to**: each workflow that uses a workflow of `ImreBoersma/projects`.

The page and the issue do not name the missing value. Find it with these steps:

1. List what the callers use:

   ```sh
   grep -ohE '(secrets|vars)\.[A-Za-z0-9_]+' .github/workflows/*.yml | sort -u
   ```

2. List what the repo has:

   ```sh
   gh secret list -R ImreBoersma/<repo>
   gh variable list -R ImreBoersma/<repo>
   ```

3. Compare. `GITHUB_TOKEN` is always there. Each `secrets.NAME` must be in the secret list, and
   each `vars.NAME` must be in the variable list.
4. Set each missing value with the correct kind:

   | Name | Kind | Value or source | Where |
   |---|---|---|---|
   | the missing `secrets.NAME` | Actions secret | the value from its service | the repo |
   | the missing `vars.NAME` | Actions variable | the value from its service | the repo |

   ```sh
   gh secret set NAME -R ImreBoersma/<repo>
   gh variable set NAME -R ImreBoersma/<repo> --body "<value>"
   ```

5. If a value is set with the wrong kind, delete it (`gh secret delete NAME` or
   `gh variable delete NAME`) and set it again with the correct kind.
