# Quickstart: validate the repo conformance check

## 1. Token

Two steps: make the token on GitHub, then store its value as a secret.

**Step 1: make the token.** Open <https://github.com/settings/personal-access-tokens/new>
(Settings, Developer settings, Personal access tokens, Fine-grained tokens).

| Setting | Value |
|---|---|
| Token name | `projects conformance read` |
| Resource owner | `ImreBoersma` |
| Expiration | No expiration, if GitHub offers it; else the longest option (record the renewal date in `PLAN.md`) |
| Repository access | All repositories |
| Repository permissions, all Read-only | Metadata, Contents, Administration, Secrets, Variables |
| Account permissions | none |

Copy the token value. GitHub shows it only one time.

**Step 2: store the value as a secret.**

| Name | Kind | Value | Where |
|---|---|---|---|
| `CONFORMANCE_READ_TOKEN` | Actions secret | the token of step 1 | repo `ImreBoersma/projects` |

```sh
gh secret set CONFORMANCE_READ_TOKEN -R ImreBoersma/projects
gh secret list -R ImreBoersma/projects
```

## 2. Unit tests

```sh
cd status && bun test && bun run lint && bunx tsc --noEmit -p .
```

Expected: all tests pass, also one fixture test for each of the 5 deviations of research.md §8.

## 3. Local run on the real repos

Paste the token in a local environment value only for this command; do not save it in a file.

```sh
cd status
CONFORMANCE_READ_TOKEN=<token> STATUS_READ_TOKEN=$(gh auth token) bun run start --out <scratchpad>/site
```

Expected: one log line for each repo, `Conformance <repo>: pass` or the failed rules. No
`not-available` for R7 and R9 (this proves the token permissions). Repos that you know are
correct show `pass`.

## 4. Make a deviation (US1, SC-003)

In a test repo of the catalog, turn off issues (`gh repo edit <repo> --enable-issues=false`).
Run §3 again. Expected: the repo shows "The repo does not follow the shared setup." and "R6 Issues
on". Turn issues on again.

## 5. Issue (US2)

Run the issues mode with `--dry-run` during §4. Expected: `Open: <name>: The repo does not follow
the shared setup.` Do not run without `--dry-run` with a test deviation.

## 6. Repair document (US3)

Open `docs/conformance.md` on GitHub. Expected: a section for each rule R1 to R9, and each link
of the page goes to the correct section.
