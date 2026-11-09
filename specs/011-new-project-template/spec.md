# Feature Specification: New-Project Template and Onboarding

**Feature Branch**: `011-new-project-template`

**Created**: 2026-11-09

**Status**: Draft

**Input**: PLAN.md 011: "A template repo with the CI caller, the board caller, `renovate.json` and
the Biome config. A command that makes the repo from the template, sets the settings of spec 008,
opens the catalog PR, and shows the table of secrets and variables to set. Reason: a new project
now needs changes in 4 to 5 repos. Spec 008 finds the deviations; this spec prevents them."

## Clarifications

### Session 2026-11-09

- Q: Does the command also onboard an existing repo? → A: No. New repos only; existing repos use
  the conformance check of spec 008 and the campaigns of spec 015.
- Q: Where does the template live: a separate template repo or a folder in `projects`? → A: A
  `template/` folder in `projects`. The command copies it into the new repo.
- Q: Can a new project be started from the status app? → A: The ⌘K box of spec 020 gets the item
  "New project", which opens a dialog that builds the command from the fields for the Maintainer
  to copy. The page runs nothing (spec 020 FR-010).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Start a new project in one command (Priority: P1)

The Maintainer starts a new project, for example a small site for an orchestra. One command, with
the project name, the repo name and the host, makes the repo from the template, sets the repo
settings of spec 008, and opens a PR in `projects` that adds the project to the catalog. At the
end, the command shows a table with each secret and variable that the Maintainer must set, where
to set it, and the command to set it.

**Why this priority**: this is the full gain of the spec. Now the Maintainer copies files from an
old repo, sets settings by hand, edits the catalog and finds the secrets from the deploy workflow;
spec 008 then reports what was forgotten.

**Independent Test**: run the command for a test repo with the host "GitHub Pages". Merge the
catalog PR. Make sure that the next conformance check of spec 008 shows no failed rule for the
repo, except R9 for secrets that are not set yet.

**Acceptance Scenarios**:

1. **Given** a name that no repo has yet, **When** the Maintainer runs the command, **Then** the
   repo exists with the files of the template, the default branch `main`, and the settings of
   spec 008 (issues on, vulnerability alerts on, Dependabot security updates off).
2. **Given** the host "Vercel", **When** the command runs, **Then** the repo has the deploy caller
   of the shared Vercel workflow, and the table lists `VERCEL_TOKEN` and the other names that this
   workflow needs.
3. **Given** the command is done, **When** the Maintainer opens `projects`, **Then** a PR adds the
   project to the catalog with its repo, status `active`, stack and host, and adds the secret
   entries of spec 013 (names and places only).
4. **Given** the catalog PR is merged and the secrets are set, **When** the next conformance check
   runs, **Then** the repo passes all rules of spec 008 that apply to it.

---

### User Story 2 - Try the command without changes (Priority: P1)

Before the real run, the Maintainer runs the command with a dry-run option. It shows the repo it
would make, the files, the settings, the catalog entry and the secrets table, and changes nothing.

**Why this priority**: making a repo is hard to undo (a deleted repo name stays reserved for a
time, and a catalog PR must be closed by hand). The same rule as the campaigns of spec 015.

**Independent Test**: run the dry run. Make sure that no repo, branch or PR was made, and that the
output lists the same items as a real run.

**Acceptance Scenarios**:

1. **Given** the dry-run option, **When** the command runs, **Then** it shows each step and makes
   no change on GitHub.
2. **Given** a repo name that exists already, **When** the command runs (dry run or real), **Then**
   it stops before any change with the message that the repo exists.

---

### User Story 3 - Keep the template in line with the rules (Priority: P2)

The template is a folder in `projects`, next to the shared workflows that its callers use. A
change to a shared workflow or a rule of spec 008 changes the template in the same PR, and the CI
of `projects` checks the template files. So a new repo never starts with an old setup.

**Why this priority**: a template that is out of date makes new deviations, which is the problem
this spec removes. It is P2 because the template is correct on the first day.

**Independent Test**: in a branch, remove the `permissions` line from the template CI caller. Make
sure that the CI of `projects` fails on that PR with the name of the rule.

**Acceptance Scenarios**:

1. **Given** a PR in `projects` that changes the template, **When** CI runs, **Then** it checks the
   template files with the file rules of spec 008 (R1 to R5) and fails on a deviation.
2. **Given** a dependency in the template (for example the Biome version), **When** Renovate runs
   on `projects`, **Then** it updates the template with the other dependencies of `projects`.

---

### User Story 4 - Get the command from the status app (Priority: P3)

On the status page or in the installed app, the Maintainer presses ⌘K and chooses "New project".
A dialog asks for the project id, the name, the repo name, the visibility, the stack and the host,
and shows the full command with these values. A button copies it. The Maintainer pastes it in a
terminal in `projects`.

**Why this priority**: it removes the need to remember the command and its options, but a new
project starts a few times a year; the command alone is enough.

**Independent Test**: press ⌘K, choose "New project", fill in the fields. Make sure that the copied
command, run with the dry-run option, shows the same values.

**Acceptance Scenarios**:

1. **Given** the page, **When** the Maintainer types "new" in the ⌘K box and presses Enter,
   **Then** the "New project" dialog opens with the focus in the first field.
2. **Given** the filled fields, **When** the Maintainer clicks "Copy", **Then** the command with
   the values is on the clipboard, and the dialog shows "Copied".
3. **Given** a project id that is in the catalog already, **When** it is typed, **Then** the
   dialog shows that the id exists, as the command would refuse it.
4. **Given** the dialog, **When** it is used, **Then** the page sends no request.

### Edge Cases

- The repo name exists already (also an archived repo) and was not made by this command: stop
  before any change. The command does
  not onboard an existing repo; the message points to the conformance check of spec 008 and the
  campaigns of spec 015.
- The command stops in the middle (network error, no access): it shows which steps are done and
  which are not, and a second run continues from the first step that is not done. It never makes
  a second repo or a second catalog PR.
- A host without a shared deploy workflow (for example WordPress hosting): the command makes the
  repo without a deploy caller, and the output says that the Maintainer must add the deploy by
  hand.
- A private repo with the host GitHub Pages: Pages for private repos needs a paid GitHub plan. The
  command shows a warning and continues.
- A repo for an organisation that is not `ImreBoersma` (for example `harmonieorkest-brummen`):
  out of scope. The command refuses it; the Maintainer does not change settings of other owners.
- A private repo: the board caller rule R2 does not apply (spec 008); the command does not add it.
- The Maintainer's GitHub login has no right to make repos or change settings: the command stops
  before any change and shows the missing right.
- The project id or name exists already in the catalog: stop before any change.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A template folder `template/` in `projects` MUST exist with the CI caller of the shared CI workflow at `@main`, the
  board caller of spec 004, `renovate.json` that extends the shared preset of spec 003, the Biome
  config, and no Dependabot config for version updates. Each caller workflow MUST set
  `permissions` with `contents: read` (spec 008 R3).
- **FR-002**: One command MUST take the project id, the name, the repo name, the visibility
  (public or private), the stack and the host, and MUST make the repo from the template in the
  owner `ImreBoersma`.
- **FR-003**: The command MUST set the repo settings of spec 008: default branch `main`, issues on,
  vulnerability alerts on, Dependabot security updates off. For the host GitHub Pages, it MUST
  also turn on Pages with GitHub Actions as the source, so the first deploy can pass.
- **FR-004**: For a host that has a shared deploy workflow (GitHub Pages, Vercel, Firebase, SSH),
  the command MUST add the deploy caller of that workflow to the repo. For other hosts, it MUST
  add no deploy caller and say so in the output.
- **FR-005**: The command MUST open one PR in `projects` that adds the project to the catalog and
  adds one secret entry of spec 013 for each secret that the callers of the new repo need, with
  the name, the kind and the place. The PR MUST NOT contain secret values.
- **FR-006**: At the end, the command MUST show a table with, for each secret and variable that
  the callers of the new repo need: the name, the kind (secret or variable), the repo, and the
  command to set it (for a secret, the `secret-set` command of spec 015 or `gh secret set`, which
  asks for the value). The command MUST NOT ask for or read secret values itself.
- **FR-007**: The command MUST have a dry run that shows each step, the files, the settings, the
  catalog entry and the table, and makes no change.
- **FR-008**: The command MUST stop before any change when the repo exists and was not made by this
  command (it has no template commit), when the project id or
  name is in the catalog, when the owner is not `ImreBoersma`, or when the login has not enough
  rights.
- **FR-009**: When a step fails, the command MUST show the steps that are done and the steps that
  are not done. A second run with the same input MUST continue and MUST NOT make a second repo or
  a second catalog PR.
- **FR-010**: The command MUST run on the Maintainer's machine with the Maintainer's own GitHub
  login (as spec 015 FR-006). No CI workflow gets a token that can make repos.
- **FR-011**: The CI of `projects` MUST check the template files with the file rules of spec 008
  (R1 to R5) and MUST fail on a deviation. Renovate MUST update the dependencies of the template.
- **FR-012**: The repair document of spec 008 (`docs/conformance.md`) MUST say that new projects
  start with this command.
- **FR-013**: The ⌘K box of spec 020 MUST have the item "New project". It MUST open a dialog with
  labelled fields for the input of FR-002 (visibility and host as choices, the host list from the
  host map), the command built from the values, and a copy button. The dialog MUST show when the
  id or the repo name is in the catalog. It MUST NOT send a request (spec 020 FR-010) and MUST
  keep the rules of spec 019 (keyboard, contrast, hidden without scripts, page size).

### Key Entities

- **Template**: the folder `template/` in `projects` with the shared files of FR-001; it is not a
  project and is not in the catalog.
- **New project input**: id, name, repo name, visibility, stack, host.
- **Host map**: for each host with a shared deploy workflow, the deploy caller file and the names
  and kinds of the secrets and variables it needs.
- **Setup step**: one action of the command (`check`, `repo` with the deploy caller, `settings`,
  `catalog-pr`), with a state: done, to do, failed.
- **Secrets table**: one row for each secret or variable of the new repo: name, kind, repo, set
  command.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new project needs changes in 0 repos by hand, other than setting the secret values
  and merging the catalog PR (now 4 to 5 repos).
- **SC-002**: A repo made by the command passes 100% of the rules of spec 008 that apply to it, on
  the first conformance check after its secrets are set.
- **SC-003**: From the start of the command to the open catalog PR takes less than 5 minutes.
- **SC-004**: The dry run and the real run list the same steps, files and table rows in 100% of
  the tests.
- **SC-005**: No secret value appears in the template, the catalog PR, the command output or a
  log.
- **SC-006**: From the status app, the Maintainer gets a correct command in less than 1 minute,
  without the documentation.
- **SC-007**: The feature costs €0 each month to operate.

## Assumptions

- The command makes the shared setup only, not the app code. The Maintainer adds the framework
  (Vite, Next.js and others) after the repo exists. Until then, the CI of the new repo runs on the
  template's minimal project files.
- New repos are made in the owner `ImreBoersma` only. Repos of stakeholder organisations are made
  by those organisations; they can be added to the catalog by hand, as now.
- The command lives in this repo, next to the campaign and `secret-set` commands of spec 015, and
  uses the GitHub CLI login of the Maintainer.
- The catalog PR uses the format of spec 001 (`contracts/catalog.md`) and the secret entries of
  spec 013. A secret with a name that other repos have (a shared token) gets the same expiry date;
  a new name gets `never`, so the page of spec 013 warns until the Maintainer writes the date.
- A GitHub secret cannot be read back. For a shared token, the Maintainer pastes the value from
  the password manager; without it, the Maintainer makes a new token and sets it in all repos
  with the `secret-set` command of spec 015 after the catalog PR is merged.
- The command does not make anything on the host (a Vercel project, a Firebase site, DNS). The
  secrets table names the values that come from the host, and the Maintainer makes the host side
  by hand.
- The Renovate app (spec 003) is installed for all repos of the owner, so a new repo gets
  Renovate without a separate step.
- Text in the template, the command and the PR is English, in ASD-STE100.

## Principles Affected

| Principle | How this feature affects it |
|---|---|
| I. GitHub for all project work | The repo, its settings and the catalog change are made on GitHub; the catalog change is a PR. |
| II. Catalog is the only project list | The command adds the project to the catalog; it refuses an id that exists. |
| III. No secrets or private data | The command and the PR contain names and places only; values are set with the commands of spec 015. |
| IV. Use shared configuration | A new repo starts with the shared callers and the shared preset. |
| VIII. Keep the work small | One template folder and one command; no token for repo creation in CI; the app only builds the command text. |
| X. ASD-STE100 | Template, command and PR text use STE. |
