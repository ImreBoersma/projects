---

description: "Task list for hob.nl in git with a deploy workflow"
---

# Tasks: hob.nl in Git with a Deploy Workflow

**Input**: Design documents from `/specs/006-hob-nl-deploy/`

**Prerequisites**: plan.md, spec.md, research.md, contracts/, quickstart.md

**Tests**: the deploy is workflow YAML and configuration, so the tests are actionlint and the real
runs of quickstart.md (dry run, real change, removed file, syntax error, restore). There is no
application code in this feature.

**Organization**: US1 (code in git) is mostly done during planning. US2 adds the shared deploy and
the caller. US3 connects hob.nl to the status page.

**Repos**: paths without a prefix are in `ImreBoersma/projects`. Paths with the prefix `hob-nl:`
are in `harmonieorkest-brummen/hob-nl`
(local clone `~/RiderProjects/Personal/clients/hob-nl`).

**Caution**: each push to `main` of `hob-nl` with the caller deploys to the live site.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files or repos, no dependencies)
- **[Story]**: the user story of the task (US1, US2, US3)

---

## Phase 1: Setup

- [X] T001 Create the branch `006-hob-nl-deploy` in this repo. `deploy-ssh.yml` stays on this branch until T014.
- [X] T002 Manual (Maintainer): make the private repo `harmonieorkest-brummen/hob-nl`. Done 2026-11-05.
- [X] T003 Manual (Maintainer): set the Actions secrets `HOB_SSH_HOST`, `HOB_SSH_USER` and `HOB_SSH_PASSWORD` of `hob-nl` (contracts/caller.md), and remove `HOB_SSH_PRIVATE_KEY`. Done 2026-11-05.
- [X] T021 Manual (Maintainer): set the Actions variable `HOB_SSH_KNOWN_HOSTS` of `hob-nl` (contracts/caller.md): `gh variable set HOB_SSH_KNOWN_HOSTS -R harmonieorkest-brummen/hob-nl --body "512403.eu13.ssh.myftpupload.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAILwQwncFCRpxxYViJR+ogl8E73kt/A2c+4QA7q9Qd5r4"`. Needed before T008. Done 2026-11-05.

---

## Phase 2: User Story 1 - The custom code of hob.nl is in git (Priority: P1)

**Goal**: the `hob-*` must-use plugins are in git, without secrets.

**Independent Test**: clone `hob-nl`; it contains the 3 `hob-*` items of research.md §1 and no `wp-config.php`, core, third-party code or uploads.

- [X] T004 [US1] First commit of `hob-nl:mu-plugins/` (`hob-admin.php`, `hob-huisstijl.css`, `hob-docs/`) with `hob-nl:.gitignore` and `hob-nl:README.md`, after the secret scan of research.md §1. Done 2026-11-05 (commit a0a7690).
- [X] T005 [US1] Scan the full history of `hob-nl` (all commits, also the test workflows) for `wp-config`, `DB_PASSWORD`, `AUTH_KEY`, private keys and passwords: `git -C ~/RiderProjects/Personal/clients/hob-nl log -p --all | grep -inE 'wp-config|db_password|auth_key|BEGIN .*PRIVATE|password\s*='`. Expected: only the known matches of research.md §1 (WordPress function names). Record the result in `specs/006-hob-nl-deploy/research.md` §9. Done 2026-11-05: see research.md §9.
- [X] T006 [US1] Manual (Maintainer): add `wp-content/mu-plugins/hob-*` to the ignore list of `.vscode/sftp.json` (FR-012). Done 2026-11-05.

**Checkpoint**: the custom code is in git, and git is the only way to change it.

---

## Phase 3: User Story 2 - A push to `main` deploys the change (Priority: P1) 🎯 MVP

**Goal**: a push to `main` of `hob-nl` copies only the `hob-*` items, checks the site, and puts the previous version back on an error.

**Independent Test**: quickstart.md §3: a comment line in `hob-admin.php` is on the server after the push, and the site works.

- [X] T007 [US2] Create `.github/workflows/deploy-ssh.yml` from `specs/006-hob-nl-deploy/contracts/deploy-ssh.md`: `on: workflow_call` with the inputs `known-hosts`, `source`, `target`, `pattern`, `php-lint` (default `true`), `health-urls` (default empty) and the secrets `ssh-host`, `ssh-user`, `ssh-password`. Job `deploy`: `if: github.event_name != 'pull_request' && github.ref == format('refs/heads/{0}', github.event.repository.default_branch)` (as `deploy-pages.yml`; a dispatch of another branch does not deploy); `environment: production`; concurrency `deploy-${{ github.repository }}`, no cancel; `permissions: contents: read`. Steps: checkout with `fetch-depth: 0`; `php -l` on each `*.php` under `source` when `php-lint` is true; install `sshpass`; write `known-hosts` to a file; rsync `-rlt --delete --checksum --itemize-changes --include='/<pattern>' --include='/<pattern>/***' --exclude='*'` with `--dry-run` first, then without, through `sshpass -e ssh -o UserKnownHostsFile=<file> -o StrictHostKeyChecking=yes -o PubkeyAuthentication=no`; when `health-urls` is set, the check of contract step 8 (each URL with `?deploy=<run id>` added for the Cloudflare cache; fail on HTTP 5xx, no answer, or the text `There has been a critical error on this website`); on a failure, step 9 (check out `github.event.before` on a push with a real value, else `HEAD~1`, into a separate folder, rsync it with the same filter, check again, log the result, `exit 1`). Pass the password only as the environment value `SSHPASS`. Never use `-a`, `--delete-excluded` or `--force`. Step names in ASD-STE100. Add a header comment with the link to the contract. Run actionlint. Done: rsync uses `-rl` (no times) after the first test (research.md §9).
- [X] T008 [US2] In `hob-nl`, remove `hob-nl:.github/workflows/access-test.yml` and `hob-nl:.github/workflows/env-test.yml`, and add `hob-nl:.github/workflows/deploy.yml` from `specs/006-hob-nl-deploy/contracts/caller.md`, but with `deploy-ssh.yml@006-hob-nl-deploy` (test before the merge, constitution). Needs T007 pushed. Push to `main` of `hob-nl`. Done 2026-11-05 (hob-nl 7f308c6; the removal of the test workflows is in bc3ee70).
- [X] T009 [US2] Validate quickstart.md §2 with the deploy of T008: the job passes; the dry-run log has no changed `hob-*` item (git and server are the same) and no line for a GoDaddy item; the check of the 2 URLs passes; the deployment record is `production` with status `success` (`gh api repos/harmonieorkest-brummen/hob-nl/deployments`). When the check fails but the site works in a browser (for example a Cloudflare or GoDaddy answer to the runner), record the HTTP status and the first line of the body, and stop for the Maintainer: the check must not restore without a real error. Done 2026-11-05: see research.md §9.
- [X] T010 [US2] Validate quickstart.md §3 and §4: a comment line in `hob-nl:mu-plugins/hob-admin.php` (push, check the log and the site, then remove it again); a test file `hob-nl:mu-plugins/hob-test.txt` (push, then remove it in git and push; the log shows `*deleting hob-test.txt` and no GoDaddy item). Record the time from the push to the end of the job for each deploy (SC-003: at most 5 minutes). Done 2026-11-05: 28 seconds; see research.md §9.
- [X] T011 [US2] Validate quickstart.md §5 on `main` (a dispatch of another branch does not deploy): push a commit with a syntax error in a `hob-*` PHP file; expected: `php -l` fails and the log has no rsync step, so the server does not change; then push the revert commit right away and make sure that its deploy passes. Done 2026-11-05: see research.md §9.
- [X] T012 [US2] Validate quickstart.md §7 on `main`: one commit adds the guarded call `if (isset($_GET['hob-deploy-test'])) { hob_missing_function(); }` to a `hob-*` PHP file and the health URL `https://harmonieorkestbrummen.nl/?hob-deploy-test=1` to `hob-nl:.github/workflows/deploy.yml`. Expected: the check fails on the test URL, the log shows the restore of the previous commit, the job fails, and the site works (also with the test query string). Visitors without the query string see no change. Then push the revert commit right away and make sure that its deploy passes. Done 2026-11-05: see research.md §9.
- [X] T013 [US2] Open the PR of `006-hob-nl-deploy` into `main` of this repo. actionlint must pass. Done 2026-11-05: #16.
- [X] T022 [US2] Restore to the last version that passed the check, not to the commit before, in `.github/workflows/deploy-ssh.yml` (marker file `~/.deploy-last-good-<repo>` on the server; contracts/deploy-ssh.md steps 9 and 10), and add the steps after a failed deploy to `hob-nl:README.md`. Done 2026-11-05: research.md §9.
- [ ] T014 [US2] Ask the Maintainer to merge the PR. After the merge, change `deploy-ssh.yml@006-hob-nl-deploy` to `@main` in `hob-nl:.github/workflows/deploy.yml`, push to `main` of `hob-nl`, and make sure that the deploy passes.
- [X] T015 [US2] Manual (Maintainer), FR-008: in a terminal, `ssh <site user>@<host> 'cd html && wp config get DISALLOW_FILE_EDIT'`. If the result is not `1` or `true`, run `wp config set DISALLOW_FILE_EDIT true --raw`. Record the result in research.md §9. Done 2026-11-05: `hob-admin.php` already sets `DISALLOW_FILE_EDIT` (research.md §7); no manual step.

**Checkpoint**: hob.nl deploys through the shared workflow, with a check and a restore.

---

## Phase 4: User Story 3 - hob.nl is a normal project on the status page (Priority: P3)

**Goal**: the row of hob.nl shows the last commit and the last deploy.

**Independent Test**: quickstart.md §6.

- [ ] T016 [P] [US3] Manual (Maintainer), FR-011: give `STATUS_READ_TOKEN_HOB` (the fine-grained token for `harmonieorkest-brummen`) read access to `hob-nl`: on GitHub, Settings, Developer settings, Fine-grained tokens, the token, Repository access: add `hob-nl` (or "All repositories"), with read access to Metadata, Contents, Pull requests and Deployments.
- [ ] T017 [US3] In `projects.yaml`, set `repo: harmonieorkest-brummen/hob-nl` for `hob-nl`. Run the status page locally with `STATUS_READ_TOKEN_HOB` unknown (the value is only an Actions secret): make sure that the catalog loads. Push to `main` (a catalog change, no code), and make sure in the status run that the row of hob.nl shows the last commit and the last deploy, not "No repo" or "Data not available" (SC-004).

**Checkpoint**: hob.nl is a normal row on the status page.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T018 [P] In `specs/002-shared-workflows/contracts/workflows.md`, add a line under the title: "Spec 006 adds `deploy-ssh.yml`: see `specs/006-hob-nl-deploy/contracts/deploy-ssh.md`".
- [ ] T019 [P] Add §9 "Validation results" to `specs/006-hob-nl-deploy/research.md`: T005, T009 to T012, T014, T015, T017, with run ids and dates.
- [ ] T020 [P] In `PLAN.md`, mark spec 006 as done in the feature table and the Done list.

---

## Dependencies & Execution Order

- **Setup**: T001 first; T002 and T003 are done; T021 before T008.
- **US1**: T004 and T006 are done; T005 can run at any time.
- **US2**: T007 needs T001. T008 needs T007 (pushed) and T021. T009 → T010 → T011 → T012, one after the other, because each one deploys to the live site. T013 after T012. T014 needs the merge. T015 at any time.
- **US3**: T016 at any time. T017 needs T016 and at least one deploy (T009).
- **Polish**: after all stories.

## Parallel Example

```text
T005  history scan of hob-nl (local)
T015  DISALLOW_FILE_EDIT check (Maintainer, terminal)
T016  STATUS_READ_TOKEN_HOB access (Maintainer, GitHub settings)
```

## Implementation Strategy

1. **MVP (US2)**: the shared deploy with the check and the restore. It is the main value and the
   main risk, so the tests T009 to T012 run before the merge.
2. **US3**: one catalog line and one token setting.
3. Each deploy test is a real deploy to the live site, from `main`, followed by a revert commit.
   The tests change only comment lines, a test file and a guarded test call; visitors do not see
   them. The syntax error of T011 never reaches the server.
