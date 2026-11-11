# Feature Specification: Changes in All Repos at Once (Campaigns)

**Feature Branch**: `015-repo-campaigns` (not created; no git hook is installed)

**Created**: 2026-11-06

**Status**: Draft

**Input**: PLAN.md 015: "One command opens the same change as a PR in each catalog repo (for
example 'Node 22 to 24', a new shared workflow version), with one label for the campaign. The
status page shows each open campaign: the number of PRs merged, open and failed. Reason: changes
for all repos (presets, shared CI, conformance repairs) are now done by hand, one repo at a time."

## Clarifications

### Session 2026-11-11 (review)

- Q: How long does a campaign stay on the page? → A: Until it is done, and 7 days after that. A
  campaign that started more than 180 days ago is not read only when it is done (no target repo is
  open, failed CI or to do) (Maintainer, 2026-11-11). The code skips each campaign after 180 days
  now; tasks.md T026 repairs it.
- Q: What does a second run do when nothing changed? → A: It writes no commit and reports
  `up to date #n` (a new commit would start CI again for nothing). When the branch has commits that
  the command did not make, it reports `changed by hand #n` and changes nothing.
- Q: Can `secret-set` read the value from a pipe? → A: No. It needs a terminal and refuses stdin
  that is not a TTY, so that the value cannot come from the shell history.
- Q: How does a change that is needed again after a merge count? → A: As `to-do` on the page.
- Q: What does the command report for a closed PR when the change is not needed any more? → A:
  `not needed` (a closed PR is `closed` only while the change is still needed).
- Q: Can an archived project be in an explicit `repos` list? → A: Now it is a parse error, so
  archiving a project stops each campaign that lists it. The edge case asks to leave it out; tasks.md
  T031 repairs the code.
- Q: What does the page show without a campaign? → A: The tab "Campaigns" (spec 019) with "No open
  campaign.", not "no section".

### Session 2026-11-06

- Analysis 2026-11-06: the identity of a campaign PR is its branch `campaign/<id>` (labels cannot
  be made in repos of another owner); the page counts also "to do"; a merged PR and a needed change
  give a new PR (FR-002, FR-005, FR-007).

- Q: Can a campaign run a command in each repo, or only make fixed file changes? → A: Fixed file
  changes only (write or replace a file, replace text). A command can come later when a real case
  needs it.
- Q: Does the command that sets one secret in many repos (US3) stay in this spec? → A: Yes, as
  P3. It uses the catalog list of spec 013 and is built last; it can be dropped if time is short.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Open one change in all repos with one command (Priority: P1)

The Maintainer writes a campaign in this repo: a short id, a title, a reason, the repos it
applies to, and the change (files to write, or text to replace). One command makes the branch
`campaign/<id>` and a PR in each repo that needs the change, all with the same title. A repo that already has the change gets no PR.

**Why this priority**: changes for all repos (the Renovate preset of spec 003, the shared CI of
spec 002, repairs of spec 008) are now done by hand in 5 to 8 repos. This takes an afternoon and
gives errors, for example a wrong repo list or a typo in one repo.

**Independent Test**: write a campaign that adds one line to `README.md` in 2 test repos. Run the
command. Make sure that each repo has one PR from the branch `campaign/<id>`, the same title and a body
with the reason and a link to the campaign. Run the command again: no second PR.

**Acceptance Scenarios**:

1. **Given** a campaign for all repos of the catalog, **When** the Maintainer runs the command,
   **Then** each repo that needs the change gets one PR from the branch `campaign/<id>`.
2. **Given** a repo that already has the change, **When** the command runs, **Then** that repo
   gets no PR and the result says "not needed".
3. **Given** a campaign with open PRs, **When** the Maintainer changes the campaign and runs the
   command again, **Then** the open PRs get the new change (one PR for each repo stays).
4. **Given** a dry run, **When** the Maintainer runs the command with it, **Then** the command
   shows for each repo the change that it would make, and changes no repo.
5. **Given** a repo where the change fails (for example the text to replace is not in the file),
   **When** the command runs, **Then** that repo gets no PR, the result shows the error for that repo, and the
   other repos continue.

---

### User Story 2 - See the progress of each campaign on the status page (Priority: P1)

The status page shows each open campaign: the title, and the number of repos with a merged PR, an
open PR, an open PR with failed CI, and "not needed". Each number links to the list of those PRs.
When all PRs are merged or closed, the campaign shows as done for 7 days, then it goes away.

**Why this priority**: without it, the Maintainer must open each repo to know which PR still
waits. The page already shows the state of each project; a campaign is the same question across
projects.

**Independent Test**: render the page with a campaign of 5 repos: 2 merged, 2 open, 1 open with
failed CI. Make sure that the page shows these numbers and a link to the open PRs.

**Acceptance Scenarios**:

1. **Given** an open campaign, **When** the page opens, **Then** it shows the title and the
   numbers merged, open, failed CI, closed, to do (needed, no PR yet) and not needed.
2. **Given** a campaign PR with a failed CI run, **When** the page opens, **Then** that PR counts
   as "failed CI" and the campaign shows as a warning.
3. **Given** all PRs of a campaign are merged or closed, **When** the page opens, **Then** the
   campaign shows "done" for 7 days after the last merge, then it does not show.
4. **Given** no open campaign, **When** the page opens, **Then** there is no campaign section.

---

### User Story 3 - Set one secret in many repos (Priority: P3)

The Maintainer sets one secret value in all repos that the catalog lists for that secret name
(spec 013), with one command, without typing the value in a file or in the chat. Example: the
rotation of `BOARD_TOKEN` in 5 repos on 2026-11-06.

**Why this priority**: a rotation of a shared token is rare (once a year after spec 013), and the
loop works by hand. But a wrong repo list or a typo in the loop broke the board token on
2026-11-06.

**Independent Test**: run the command for a test secret name that the catalog lists in 2 repos.
Make sure that both repos have the secret, with a new update time, and that the value is not in
the shell history or in a log.

**Acceptance Scenarios**:

1. **Given** a secret name that the catalog lists in 5 repos, **When** the Maintainer runs the
   command and types the value one time, **Then** the secret is set in those 5 repos and the
   command lists them.
2. **Given** a secret name that the catalog does not list, **When** the command runs, **Then** it
   stops and sets nothing.
3. **Given** the value, **When** the command runs, **Then** the value does not show on the screen,
   in a file or in a log.

### Edge Cases

- A repo that the Maintainer cannot write to (other owner without access): the result shows "no
  access" for that repo; the other repos continue.
- An archived catalog project: not part of a campaign, also when an explicit `repos` list names it
  (it is left out, not an error).
- A PR of the campaign that the Maintainer closed without a merge: it counts as "closed"; the next
  run of the command does not open it again for that repo, unless the Maintainer asks for it.
- A text replacement where the old text is not in the file, and the new text is not there either:
  "failed" for that repo, with the file name. When the new text is already there: "not needed".
- A change that Renovate also makes (a dependency version): not a campaign. The campaign text
  tells the Maintainer to use Renovate for dependencies (constitution Principle IV).
- Two campaigns that change the same file in one repo: each has its own branch and PR; a merge
  conflict shows on the second PR as usual.
- A campaign PR in a repo without CI: CI shows as "no CI", not as failed.
- The command stops in the middle (network error): a new run continues; it does not make a second
  PR for a repo.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A campaign MUST be a file in this repo with an id (unique), a title, a reason, a
  start date, the target repos (all catalog repos, or a list of catalog ids), and the change: files to write
  (complete content), or text to replace in a file (old text, new text). A campaign MUST NOT run a
  command in a repo.
- **FR-002**: One command MUST apply a campaign: for each target repo, make the change on a branch
  `campaign/<id>`, and open or update one PR with the campaign title and a body with the reason
  and a link to the campaign file. The branch name is the identity of the campaign PRs. The PR
  gets the label `campaign` in the own repos; in a repo of another owner only when that label
  exists (no setting changes there).
- **FR-003**: A repo where the change gives no difference MUST get no PR and MUST show as "not
  needed".
- **FR-004**: The command MUST have a dry run that shows the change for each repo and changes
  nothing.
- **FR-005**: The command MUST NOT make a second PR for a repo that has an open or closed (not
  merged) PR of the campaign, except with the reopen option for that repo. When the PR is merged
  and the change is needed again (the campaign changed), the command MUST open a new PR; when the
  PR is merged and the change is not needed, the result is "merged". The command MUST NOT
  overwrite a campaign branch that has commits it did not make (a hand fix), except with an
  overwrite option for that repo. The command MUST continue with the next repo when one repo
  fails.
- **FR-006**: The command MUST run on the Maintainer's machine with the Maintainer's own access.
  The status update MUST NOT get write access to the project repos for this feature.
- **FR-007**: The status page MUST show each open campaign with the numbers merged, open, failed
  CI, closed, to do (needed, no PR) and not needed, a link to a GitHub search of the PRs from the
  branch `campaign/<id>`, and "done" for 7 days after the last PR is merged or closed. A campaign
  that started more than 180 days ago MAY be skipped (not read) only when it is done.
- **FR-008**: A campaign with a PR that has a failed CI run MUST show as a warning on the page. It
  MUST NOT make a problem or an issue.
- **FR-009**: The secret command (US3) MUST use the repos that the catalog list of spec 013 gives
  for the secret name, MUST ask for the value without showing it, and MUST NOT write the value to
  a file, a log or the shell history.
- **FR-010**: The campaign file, the PR texts and the page MUST NOT contain secret values
  (Principle III).

### Key Entities

- **Campaign**: id, title, reason, target repos, change (a list of file writes and text
  replacements), start date.
- **Campaign PR**: repo, PR number, state (open, merged, closed), CI result.
- **Campaign result**: for each target repo one of: PR opened, PR updated, up to date (the branch
  already has the change), changed by hand (not updated), merged, closed, not needed, failed (with
  the error), no access.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A change for 8 repos takes the Maintainer less than 10 minutes, from the campaign
  file to 8 open PRs.
- **SC-002**: 0 repos of the target list are missed: each repo has a PR or a "not needed" or a
  failure in the result.
- **SC-003**: A second run of the same campaign makes 0 new PRs when nothing changed.
- **SC-004**: The Maintainer sees on 1 page which campaign PRs still wait, within 1 hour after a
  change.
- **SC-005**: A shared secret is set in all its repos with 1 command and 1 entry of the value.
- **SC-006**: The feature costs €0 each month to operate.

## Assumptions

- The Maintainer's `gh` login can push branches and open PRs in all catalog repos, also in
  `harmonieorkest-brummen` (the Maintainer pushes there already, spec 006). Opening a PR does not
  change the settings of a repo of another owner (constitution).
- The status update reads the campaign PRs with the read tokens that it has (`Pull requests: read`
  and `Commit statuses: read` of spec 001); no new token.
- A campaign PR is merged by the Maintainer, as each PR now. The command never merges.
- Dependency updates stay with Renovate (Principle IV); campaigns are for other changes:
  workflow callers, configuration files, `.nvmrc`, repair steps of spec 008.
- Campaign files stay in this repo after the campaign is done, as a record.

## Principles Affected

| Principle | How this feature affects it |
|---|---|
| I. GitHub for all project work | Each change is a PR from the branch `campaign/<id>`; the page links to a search of those PRs. |
| II. Catalog is the only project list | Target repos come from the catalog only. |
| III. No secrets or private data | No values in campaign files or PRs; the secret command does not store the value. |
| IV. Use shared configuration | Campaigns move the repos to the shared setup; dependencies stay with Renovate. |
| VIII. Keep the work small | One command and one page section; no write token in CI. |
| X. ASD-STE100 | Campaign, PR and page text use STE. |
