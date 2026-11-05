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

### Session 2026-11-05

- Q: Where is the custom code? → A: Only in `wp-content/mu-plugins`: `hob-admin.php`,
  `hob-huisstijl.css` and the folder `hob-docs/` (5 PHP files). The theme `ketos` and the plugins
  `kubio-pro`, `skaut-google-drive-gallery` and `display-a-meta-field-as-block` are third-party
  code; the pages are in the database (Kubio).
- Q: What is the hosting? → A: GoDaddy Managed WordPress, with SSH (`*.myftpupload.com`). The site
  is in `~/html`. In `mu-plugins`, GoDaddy has its own files (owner `root`): `gd-system-plugin.php`,
  `gd-system-plugin/`, `object-cache-pro.php`, `object-cache-pro/`, `vendor/`. The deploy must
  never change or remove them.
- Q: After the git deploy starts, can the `hob-*` files still change on the server through the
  SFTP sync of VS Code (`.vscode/sftp.json`)? → A: No. Git is the only way to change them. The
  `hob-*` files go in the ignore list of `.vscode/sftp.json`; the SFTP sync stays for other work.
- Q: When the site does not work after a deploy, does the deploy find it and put back the
  previous version itself? → A: Yes. After the copy, the deploy opens the home page and
  `/wp-admin/`; on HTTP 5xx or the WordPress "critical error" page, it copies the `hob-*` files of
  the previous commit back and marks the deploy as failed.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The custom code of hob.nl is in git (Priority: P1)

The custom must-use plugins (`hob-*`) of hob.nl are in a git repo. The Maintainer sees each change and
can go back to an earlier version. Now the only copy is on the hosting and on one computer.

**Why this priority**: without git, a mistake on the server cannot be undone, and the code is lost
if the hosting account is lost.

**Independent Test**: clone the repo. Make sure that it contains the `hob-*` must-use plugins
and that it does not contain `wp-config.php`, the WordPress core or uploads.

**Acceptance Scenarios**:

1. **Given** the new repo, **When** the Maintainer clones it, **Then** it contains the `hob-*`
   must-use plugins of hob.nl.
2. **Given** the new repo and its full history, **When** the Maintainer searches it, **Then** it does
   not contain `wp-config.php`, passwords, keys, the WordPress core, third-party plugins or uploads.

---

### User Story 2 - A push to `main` deploys the change (Priority: P1)

The Maintainer pushes a change to `main`. A shared deploy workflow (spec 002) copies the `hob-*` must-use
plugins to the hosting. It makes a production deployment record, so that the status page
shows the last deploy of hob.nl.

**Why this priority**: Principle V requires that each project deploys through the shared workflow.
Now the Maintainer copies files by hand.

**Independent Test**: change a text in `hob-admin.php`. Push to `main`. Make sure that the site shows the
change and that the status page shows the deploy.

**Acceptance Scenarios**:

1. **Given** a push to `main`, **When** the deploy runs, **Then** the changed files are on the
   hosting and the site shows the change.
2. **Given** a `hob-*` file that the Maintainer removed in git, **When** the deploy runs, **Then**
   the file is removed from `mu-plugins` on the hosting, and the files of GoDaddy stay.
3. **Given** a deploy, **When** it runs, **Then** it does not change, add or remove files that are not
   `hob-*` files in `mu-plugins`.
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
- A person changes a `hob-*` file on the hosting by SSH or SFTP. The next deploy replaces the
  change. The `hob-*` files are only changed in git; the SFTP sync of VS Code ignores them
  (FR-012).
- GoDaddy updates its own must-use plugins in the same folder. The deploy does not touch them.
- A new custom file does not start with `hob-`. The deploy does not copy it. All custom files get
  the prefix `hob-`.
- The SSH password is not valid (for example after a change). The deploy fails with a message,
  and the site does not change.
- A `hob-*` file has an error that only shows when it runs. The check after the deploy finds it
  and puts back the previous version (FR-013).
- The deploy stops halfway. The next deploy completes the copy. The Maintainer can start the deploy
  again manually.
- A file on the hosting contains a secret, for example a licence key in a plugin. It does not go
  in git. It stays only on the hosting or in a secret.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A git repo in `harmonieorkest-brummen` MUST contain the custom must-use plugins of
  hob.nl: each file and folder in `wp-content/mu-plugins` whose name starts with `hob-`. The first
  commit MUST come from the current files on the hosting.
- **FR-002**: The repo MUST NOT contain `wp-config.php`, credentials, the WordPress core,
  third-party plugins or uploads, also not in its history (Principle III).
- **FR-003**: The repo MUST be private.
- **FR-004**: A push to `main` MUST start a deploy through a shared deploy workflow in `projects`
  (Principle V).
- **FR-005**: The deploy MUST change only the `hob-*` files and folders in
  `wp-content/mu-plugins` on the hosting. It MUST remove a `hob-*` file or folder that is not in
  git. It MUST NOT change or remove any other file, also not the files of GoDaddy in the same
  folder.
- **FR-006**: The deploy job MUST use `environment: production` (constitution, Development
  Workflow).
- **FR-007**: The SSH login data (host, user, password or key) MUST be Actions secrets
  (Principle III).
- **FR-008**: The theme and plugin file editors in the WordPress admin MUST be turned off
  (`DISALLOW_FILE_EDIT`), if they are not already off.
- **FR-009**: The `hob-nl` entry in `projects.yaml` MUST get the new `repo`.
- **FR-010**: The Maintainer MUST be able to start the deploy manually.
- **FR-011**: The status token `STATUS_READ_TOKEN_HOB` (spec 001) MUST have read access to the new
  repo, so that the status page shows hob.nl.
- **FR-012**: Git MUST be the only way to change the `hob-*` files. The ignore list of the SFTP sync
  (`.vscode/sftp.json` on the computer of the Maintainer) MUST contain `wp-content/mu-plugins/hob-*`,
  so that a sync cannot upload them.
- **FR-013**: After each deploy, the workflow MUST check the home page and `/wp-admin/`. On HTTP
  5xx, or on the WordPress "critical error" page, it MUST copy the `hob-*` files of the previous
  commit back to the hosting and MUST mark the deploy as failed.
- **FR-014**: The deploy MUST stop before the copy when a `hob-*` PHP file has a syntax error.

### Key Entities

- **hob.nl repo**: the git repo with the `hob-*` must-use plugins.
- **Deploy target**: the `hob-*` files and folders in `~/html/wp-content/mu-plugins` on the
  GoDaddy hosting.

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
- The current `hob-*` files on the hosting are the correct version. The first commit
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
