# Research: New-Project Template and Onboarding

## 1. Template files and host variants

**Decision**: `template/` holds the files of a new repo. The CI caller has one variant for each
host in `template/ci/<host>.yml`; the command copies the chosen one to `.github/workflows/ci.yml`.
Each variant is the CI job of `ci-node.yml` plus, when the host has one, the deploy job, as the
current repos have it (Beter-dan-de-MIDI for Pages, boek-de-bus for Vercel). Each variant has
`workflow_dispatch:`, so the Maintainer can run it again after the secrets are set.

Values that differ for each project go in repo variables, not in command options: Firebase
`project-id: ${{ vars.FIREBASE_PROJECT_ID }}`, SSH `known-hosts`, `target` and `pattern` from
`vars.SSH_KNOWN_HOSTS`, `vars.SSH_TARGET`, `vars.SSH_PATTERN`. So the command has no options for
each host, the table lists them, and R9 of spec 008 checks that they exist.

**Rationale**: whole files, no template language; each variant is about 10 lines (Principle IV)
and the test reads them as they are.

**Alternatives**: one `ci.yml` with markers for the deploy job (a small template language for 5
files); a deploy job in a separate file (the deploy must need the CI job, so it must be in the
same workflow).

## 2. Minimal project files

**Decision**: `package.json` with `name` `{{id}}`, `private: true`, the script `build` (copy
`index.html` to `dist/`), and `@biomejs/biome` as the only dev dependency; `index.html` is a
placeholder page "{{name}}: work in progress". `ci-node` lints with `biome ci .` and runs the
build, and Pages and Firebase deploy `dist`. The Maintainer replaces the build with the framework.

`ci-node` stops without a lockfile (`bun.lock`, `yarn.lock` or `package-lock.json`). The template
has no lockfile, because Renovate would then update a lockfile that no repo uses. The command runs
`bun install` in the copy before the first commit, so the new repo starts with `bun.lock` and the
newest Biome in the range.

**Rationale**: R1 needs a Node project; CI must pass on the first push.

## 3. Making the repo

**Decision**: copy to a temp folder, fill `{{id}}` and `{{name}}`, `git init -b main`, one commit
"chore: start from the project template (spec 011)", then `gh repo create ImreBoersma/<repo>
--public|--private --description <name> --source <dir> --push`. The default branch is `main`
from the pushed branch; issues are on by default.

Settings after the push (spec 008 R6 to R8): `PATCH /repos/{repo}` with `has_issues: true`,
`PUT /repos/{repo}/vulnerability-alerts`, `DELETE /repos/{repo}/automated-security-fixes`. All
three are idempotent. For the host `pages`: `GET /repos/{repo}/pages`; on 404, `POST
/repos/{repo}/pages` with `build_type: workflow` (Pages with GitHub Actions as the source). For a
private repo with `pages`, the output shows "Pages for a private repo needs a paid GitHub plan."
and continues; when the `POST` fails, the step fails with the GitHub message.

**Alternatives**: the GitHub "generate from template" API needs a template repo (clarified: no);
creating the repo empty and writing the files through the Git data API (more calls, same result).

## 4. Resume and refusal (FR-008, FR-009)

**Decision**: before any change, the command reads: the catalog (id, name, `ImreBoersma/<repo>`)
from `projects.yaml` on `main` through the API (the same text that the catalog PR changes; not the
local file, which can be on another branch), the repo, and the PR of the branch
`new-project/<id>` in `projects`.

| State | Action |
|---|---|
| id, name or repo in the catalog | stop: "in the catalog" |
| repo exists, first commit is not the template commit | stop: "repo exists; use spec 008 and campaigns" |
| repo exists with the template commit | skip "make repo" |
| settings already as spec 008 (and Pages on for `pages`) | skip "settings" (the calls are idempotent; the plan shows "done") |
| open PR from `new-project/<id>` | skip "catalog PR" |

The login check: `gh auth status` and a read of the `projects` repo permission (`admin` or
`maintain`); the `gh` token needs the scope `repo` (classic) or a fine-grained token with
Administration write. A failed check stops before the first change.

## 5. The catalog PR

**Decision**: insert text, do not re-write the YAML. The project block goes after the last item of
`projects:`; the secret entries go at the end of the `# Project repos.` part of `secrets:`. After
the insert, `parseCatalog` and `parseSecrets` must accept the text and find the new id; else the
command stops before the PR. The commit and the PR use `writeCommit`, `setBranch` and `openPr` of
`status/src/campaign/github.ts`, branch `new-project/<id>`, title "feat: add <name> to the
catalog (spec 011)".

The `expires` of each new secret entry: when the catalog has the same name with a date (a shared
token, for example `BOARD_TOKEN` or `VERCEL_TOKEN`), use that date; else `never`, so the page of
spec 013 shows the warning until the Maintainer writes the date.

**Rationale**: `yaml` keeps comments, but a re-write changes the empty fields and the quoting of
the other entries; a text insert changes only the new lines.

## 6. The secrets table

**Decision**: from the host map plus `BOARD_TOKEN` for a public repo. Columns: Name, Kind (secret
or variable), Repo, Command. Secrets: `gh secret set <NAME> -R ImreBoersma/<repo>` (it asks for
the value with the echo off); variables: `gh variable set <NAME> -R ImreBoersma/<repo>`. Last row:
`gh workflow run ci.yml -R ImreBoersma/<repo>` after the values are set.

A GitHub secret cannot be read back. For a shared name (a name that the catalog has in other
repos, for example `BOARD_TOKEN`, `VERCEL_TOKEN`), the value is the same token as in those repos;
the Maintainer pastes it from the password manager. When the Maintainer does not have the value,
the table gives the other path: make a new token, merge the catalog PR, then `bun run secret-set
<NAME>` (spec 015). It sets the new value in each repo of the catalog list, now with the new repo,
and the Maintainer updates the `expires` dates. The output names this path below the table for
each shared name.

## 7. The dialog

**Decision**: one more modal in `render.ts`, opened from the ⌘K item "New project" (and only
there; hidden without scripts). Fields: id, name, repo, visibility (select), stack, host (select
from the host map). A pure function `newProjectCommand(fields)` in `client.ts` builds
`cd status && bun run new-project --id … --name '…' …` with POSIX single quotes (`'` → `'\''`)
and checks the id (`^[a-z0-9-]+$`) and the repo (`^[A-Za-z0-9._-]+$`). The page puts the catalog
ids and `ImreBoersma/` repo names inline as JSON (about 0.5 KB), so the dialog shows "This id is
in the catalog". Copy uses `navigator.clipboard.writeText`; when it is not available, the command
text is selected.

## 8. The page size budget in gzip

**Decision**: one test in `status/tests/size.test.ts`: build the CSS, render the 20-site worst
case of spec 019 with that CSS inline, and check `Bun.gzipSync(html).length < 30_000`. The raw
budgets (CSS < 60 KB in `css.test.ts`, HTML < 90 KB in `render.test.ts`) are removed. Spec 019
SC-005 gets a note: replaced by the gzip budget of spec 011.

**Rationale**: GitHub Pages sends the page with gzip (measured 2026-11-09: live page 109.7 KB raw,
19.1 KB sent). The worst case is 147.7 KB raw and 18.7 KB gzip; 30 KB gives room for this spec
and specs 021 and 022, and still fails when a font, an image or a library goes inline. The
service worker of spec 020 also keeps a copy for the next visit.

**Alternatives**: keep 150 KB raw and build the dialog in the script (works, but each next feature
must fit a number that does not show the load time); raise the raw limit (same problem).
