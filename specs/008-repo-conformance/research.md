# Research: Repo Conformance Check

Checked against the real API on 2026-11-05 with scales-exercises: `vulnerability-alerts` gave 204,
`automated-security-fixes` gave `{"enabled":false}`, `actions/secrets` and `actions/variables`
gave names, and the repo gave `has_issues`, `default_branch` and `private`.

## 1. What each rule reads

| Rule | REST call | Fails when |
|---|---|---|
| R1 CI caller | `contents/package.json` (exists?), `contents/.github/workflows` and each file | `package.json` exists and no workflow has `uses: ImreBoersma/projects/.github/workflows/ci-node.yml@main` |
| R2 Board caller | repo `private`, workflow files | the repo is public and no workflow has `uses: ImreBoersma/projects/.github/workflows/add-to-board.yml@main` |
| R3 Caller permissions | workflow files | a workflow that uses a shared workflow of `projects` has no top-level `permissions`, has `permissions: {}`, or has no `contents: read` |
| R4 Renovate | `contents/renovate.json`, else `contents/.github/renovate.json` | no file, or `extends` does not contain exactly `github>ImreBoersma/projects//renovate/default` (a `#branch` ref fails) |
| R5 No Dependabot updates | `contents/.github/dependabot.yml` and `.yaml` | the file exists |
| R6 Issues on | repo `has_issues` | `false` |
| R7 Security alerts | `vulnerability-alerts` (204 on, 404 off), `automated-security-fixes` | alerts off, or security fixes on |
| R8 Default branch | repo `default_branch` | not `main` |
| R9 Secrets and variables | `actions/secrets`, `actions/variables`, workflow files | a `secrets.NAME` (not `GITHUB_TOKEN`) that is not a repo secret, or a `vars.NAME` that is not a repo variable |

R9 finds the error of spec 002, where the Vercel ids were secrets: the caller uses `vars.VERCEL_ORG_ID`,
and the repo has no variable with that name.

## 2. Token

**Decision**: a new fine-grained PAT, `CONFORMANCE_READ_TOKEN`, for the owner `ImreBoersma`, all
repositories, no expiry date, with only read permissions: Metadata, Contents, Administration,
Secrets, Variables. It is an Actions secret of `projects` and goes only to the conformance step.

**Rationale**: `vulnerability-alerts` and `automated-security-fixes` need "Administration: read".
The names of secrets and variables need "Secrets: read" and "Variables: read". `STATUS_READ_TOKEN`
reads only repo data for the page; a separate token keeps that token small, and a leak of the new
token gives no write access.

**Alternatives**: extend `STATUS_READ_TOKEN`. Rejected: it would give settings access to the page
query, which does not need it. Use `BOARD_SYNC_TOKEN` (classic, `repo`). Rejected: it has write
access; FR-010 asks for read only.

**Not confirmed**: that "Administration: read" is sufficient for both settings endpoints with a
fine-grained token. quickstart.md §2 tests it.

## 3. When the check runs (FR-008)

**Decision**: in each status run, in both jobs, as the uptime check of spec 005.

**Rationale**: about 120 calls each hour is small. A daily schedule needs a second workflow or a
state file to know if it already ran today.

## 4. One problem for each repo, with details

**Decision**: one problem `not-conformant` for each repo, key `<id>/not-conformant`. `Problem`
gets an optional `detail: string[]` with the names of the failed rules. The page shows the problem
text and, under it, the rule names. The issue body lists the failed rules at the time the issue
opens, each with a link to `docs/conformance.md#<rule anchor>`, and says that the status page shows
the current list.

**Rationale**: one issue for each repo keeps notifications low. The issue rules of spec 001 do not
change an open issue, so the body can become old; the page is always current.

**Alternatives**: one problem for each rule. Rejected: up to 9 issues for one repo.

## 5. Check not available (FR-007)

**Decision**: a rule result is `not-available` when one of its reads gives 403, 404 where 404 does
not mean "off" or "no file", 5xx, or a network error. A `not-available` result makes no problem.
When one or more rules of a repo are `not-available`, the page shows a grey note "Setup check not available: <rule ids>" in the Problems cell. The note is not a problem: it does not change the sort order and opens no issue. It
makes a missing token permission visible on the page.
For R7, 404 of `vulnerability-alerts` means "off" only when the repo read itself passed.

## 6. Exceptions (FR-003)

**Decision**: a new optional catalog field `exceptions`, a map from rule id to reason, for example:

```yaml
exceptions:
  R2: The repo is private. Issues come with the board sync (spec 004).
```

The catalog validation accepts only `R1` to `R9` and a non-empty reason.

**Rationale**: the catalog is the only project list (Principle II). A reason makes the exception
easy to review later.

## 7. Repair document (FR-009)

**Decision**: `docs/conformance.md` in `projects`, one section for each rule with the heading
`R<n> <name>`, the reason, and numbered repair steps (`gh` commands where possible). The GitHub
anchor of the heading is the link target.

## 8. The 5 deviations of the first week (SC-003)

| Deviation | Rule that finds it |
|---|---|
| Issues off, so Renovate made no Dependency Dashboard | R6 |
| Old Dependabot config and PRs | R5 |
| A default branch that is not `main` (Beter-dan-de-MIDI) | R8 |
| Vercel ids as secrets, not variables | R9 |
| A caller with `permissions: {}` (scales-exercises) | R3 |

Each one gets a fixture test.

## 9. The `projects` repo itself

**Decision**: `projects` is not checked. It is not in the catalog (Principle II), and its own CI
already checks its workflows (actionlint) and its Renovate config (`lint-renovate.yml`). Decided by
the Maintainer on 2026-11-05.
