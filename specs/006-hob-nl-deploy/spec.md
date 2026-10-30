# Feature Specification: hob.nl in Git with a Deploy Workflow

**Feature Branch**: `006-hob-nl-deploy` (not created; no git hook is installed)

**Created**: 2026-10-30

**Status**: Draft

**Input**: PLAN.md, feature 006: "Put `wp-content/themes` and the custom plugins in a git repo. Do
not put `wp-config.php` or the WordPress core in git (Principle III). Deploy with SSH and rsync from
a workflow on push to `main`."

## Clarifications

### Session 2026-10-30

- Q: Which owner gets the repo? → A: There is no repo now. Make it with `git init` from the files on the hosting, then put it in `harmonieorkest-brummen`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The custom code of hob.nl is in git (Priority: P1)

The theme and the custom plugins of hob.nl are in a git repo. The Maintainer sees each change and
can go back to an earlier version. Now the only copy is on the hosting and on one computer.

**Why this priority**: without git, a mistake on the server cannot be undone, and the code is lost
if the hosting account is lost.

**Independent Test**: clone the repo. Make sure that it contains the theme and the custom plugins
and that it does not contain `wp-config.php`, the WordPress core or uploads.

**Acceptance Scenarios**:

1. **Given** the new repo, **When** the Maintainer clones it, **Then** it contains the active theme
   and the custom plugins of hob.nl.
2. **Given** the new repo and its full history, **When** the Maintainer searches it, **Then** it does
   not contain `wp-config.php`, passwords, keys, the WordPress core, third-party plugins or uploads.

---

### User Story 2 - A push to `main` deploys the change (Priority: P1)

The Maintainer pushes a change to `main`. A shared deploy workflow (spec 002) copies the theme and
the custom plugins to the hosting. It makes a production deployment record, so that the status page
shows the last deploy of hob.nl.

**Why this priority**: Principle V requires that each project deploys through the shared workflow.
Now the Maintainer copies files by hand.

**Independent Test**: change a text in the theme. Push to `main`. Make sure that the site shows the
change and that the status page shows the deploy.

**Acceptance Scenarios**:

1. **Given** a push to `main`, **When** the deploy runs, **Then** the changed files are on the
   hosting and the site shows the change.
2. **Given** a file that the Maintainer removed from the theme in git, **When** the deploy runs,
   **Then** the file is removed from the theme folder on the hosting.
3. **Given** a deploy, **When** it runs, **Then** it does not change, add or remove files outside
   the theme and the custom plugin folders.
4. **Given** a failed deploy, **When** the status page updates, **Then** it shows "Failed" for the
   last deploy of hob.nl.

---

### User Story 3 - hob.nl is a normal project on the status page (Priority: P3)

The catalog entry of hob.nl gets the new repo. The status page shows the same items for hob.nl as
for the other projects, not "No repo".

**Why this priority**: it follows from US1 and US2 with one catalog change.

**Independent Test**: set `repo` of `hob-nl` in `projects.yaml`. Run the status update. Make sure
that the row of hob.nl shows the last commit and the last deploy.

**Acceptance Scenarios**:

1. **Given** the `repo` of hob.nl in the catalog, **When** the status page updates, **Then** it shows
   the last commit, open PRs, CI and the last deploy of hob.nl.

---

### Edge Cases

- A WordPress update or a plugin update in the admin panel changes files on the hosting. These
  files are not in git, so the deploy does not change them.
- A person changes a theme file in the WordPress theme editor. The next deploy replaces the change.
  The theme editor is turned off, so that the hosting and git stay the same.
- The SSH key is not valid. The deploy fails with a message, and the site does not change.
- The deploy stops halfway. The next deploy completes the copy. The Maintainer can start the deploy
  again manually.
- A file on the hosting contains a secret, for example a licence key in a plugin. It does not go
  in git. It stays only on the hosting or in a secret.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A git repo in `harmonieorkest-brummen` MUST contain the active theme and the custom
  plugins of hob.nl. The first commit MUST come from the current files on the hosting.
- **FR-002**: The repo MUST NOT contain `wp-config.php`, credentials, the WordPress core,
  third-party plugins or uploads, also not in its history (Principle III).
- **FR-003**: The repo MUST be private.
- **FR-004**: A push to `main` MUST start a deploy through a shared deploy workflow in `projects`
  (Principle V).
- **FR-005**: The deploy MUST change only the theme folder and the custom plugin folders on the
  hosting. It MUST remove files in these folders that are not in git.
- **FR-006**: The deploy job MUST use `environment: production` (constitution, Development
  Workflow).
- **FR-007**: The SSH key and the host data MUST be Actions secrets (Principle III).
- **FR-008**: The theme file editor in the WordPress admin MUST be turned off.
- **FR-009**: The `hob-nl` entry in `projects.yaml` MUST get the new `repo`.
- **FR-010**: The Maintainer MUST be able to start the deploy manually.
- **FR-011**: The status token `STATUS_READ_TOKEN_HOB` (spec 001) MUST have read access to the new
  repo, so that the status page shows hob.nl.

### Key Entities

- **hob.nl repo**: the git repo with the theme and the custom plugins.
- **Deploy target**: the theme folder and the custom plugin folders on the WordPress hosting.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the custom code of hob.nl is in git.
- **SC-002**: 0 secrets are in the repo or its history.
- **SC-003**: A change goes live within 5 minutes after the push to `main`, with no manual step.
- **SC-004**: The status page shows a last deploy for hob.nl, not "No repo" or "Unknown".
- **SC-005**: The feature costs €0 each month to operate.

## Assumptions

- The WordPress hosting gives SSH access. If it does not, the deploy method changes (for example
  SFTP) and this spec must be updated.
- The current theme and custom plugins on the hosting are the correct version. The first commit
  takes them from the hosting.
- Database content, pages and posts are not in the scope of this feature. Editors continue to
  change them in the WordPress admin.
- WordPress core and third-party plugin updates stay in the WordPress admin. Renovate does not
  update them.
- The hosting does not change in this feature (Principle V).
- The Maintainer can make repos and secrets in `harmonieorkest-brummen`. The Maintainer does this
  setup in the organisation by hand. This repo does not change the settings of that organisation
  (constitution, Additional Constraints).
- Before `STATUS_READ_TOKEN_HOB` exists, the status page shows "Data not available" for hob.nl.
- The shared deploy workflow for SSH is added to `projects` as part of this feature, because only
  hob.nl uses it.

## Principles Affected

| Principle | How this feature affects it |
|---|---|
| II. Catalog as the only project list | The `hob-nl` entry gets its `repo`. |
| III. No secrets or private data | `wp-config.php` and keys stay out of git. SSH data are Actions secrets. |
| Repos of other owners | The repo is in `harmonieorkest-brummen`. Its setup is manual, not from this repo. |
| V. One pipeline | hob.nl deploys through a shared workflow on push to `main`. |
| VI. Sites off the HomeLab | hob.nl stays on its WordPress hosting. |
| VIII. Keep the work small | Only the custom code goes in git. No new host. |
| X. ASD-STE100 | Repo text and commit messages use STE. |
