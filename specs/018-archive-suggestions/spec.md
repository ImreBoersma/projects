# Feature Specification: Archive Suggestions for Old Projects

**Feature Branch**: `018-archive-suggestions`

**Created**: 2026-11-16

**Status**: Draft

**Input**: PLAN.md 018: "A project with no commit, no deploy and no open work for 12 months gets a
suggestion on the page: "Archive?" with a link to a checklist. The checklist: archive the repo,
keep or stop the domain and the hosting, set the catalog status to `archived`, remove it from the
board. Reason: fewer projects means less maintenance (Principle VIII)."

## Clarifications

### Session 2026-11-16

- Q: Can the Maintainer stop the suggestion for one project without archiving it? → A: Yes, for a
  time: the catalog field `keep` with a date and a reason. Until that date the project gets no
  suggestion; after it, the suggestion comes back, so each kept project gets a new decision.
- Q: Do the campaign PRs of the Maintainer (spec 015, label `campaign`) count as work on a
  project? → A: No. A campaign PR and the commits it brings to the default branch do not count,
  as bot work does not count (FR-002).

## Current state (2026-11-16)

Read from GitHub for the 8 catalog repos, to show what "no activity" means in practice:

| Repo | Last commit (all) | Last commit by a person | Last deploy | Open PRs (person / bot) | Open issues |
|---|---|---|---|---|---|
| Beter-dan-de-MIDI | 2026-11-15 | 2026-11-11 | 2026-11-15 | 0 / 2 | 0 |
| boek-de-bus | 2026-11-14 | 2026-11-03 | 2026-11-14 | 0 / 3 | 0 |
| personal-website | 2026-11-06 | 2026-11-06 | 2026-11-15 | 0 / 2 | 0 |
| Reperatie-Formulier | 2026-11-02 | 2026-11-02 | none | 0 / 1 | 0 |
| scales-exercises | 2026-11-03 | 2026-11-03 | 2026-11-03 | 0 / 2 | 3 |
| pretband-backend | 2026-10-20 | 2026-07-29 | 2026-11-05 | 0 / 5 | 0 |
| hob-nl | 2026-11-05 | 2026-11-05 | 2026-11-05 | 0 / 0 | 0 |
| HomeLab | 2026-11-13 | 2026-11-13 | none | 0 / 3 | 0 |

Findings: each repo except hob-nl has open bot PRs (Renovate, Dependabot), and bot merges cause
new commits and deploys. If bot work counts as activity, no repo with Renovate can ever become
"old". So only the work of a person counts. The 3 catalog projects without a repo (pretband,
dev-toolkit, lower-management) have no data. Today no project is near 12 months; the oldest work
by a person is pretband-backend (2026-07-29, 3.5 months).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See which projects can be archived (Priority: P1)

The Maintainer opens the status page. A project that had no work by a person for 12 months shows
the badge "Archive?" in its row and a short line in its detail view: "No commit, PR or issue by a
person since <date>." The badge links to the archive checklist.

**Why this priority**: each project costs maintenance (Renovate PRs, token renewals, conformance
fixes, campaigns) also when nobody uses it. Without a signal, an old project stays in the catalog
and takes this time forever.

**Independent Test**: give a test catalog a project whose repo data has a last commit by a person
13 months ago, no open PR and no open issue by a person. Build the page. Make sure the row shows
"Archive?" and the link to the checklist, and that a project with a commit 11 months ago does not.

**Acceptance Scenarios**:

1. **Given** a project whose last commit by a person is more than 12 months old, with no open PR
   and no open issue by a person, **When** the page updates, **Then** its row shows "Archive?" with
   a link to the checklist, and the detail view gives the date of the last work.
2. **Given** the same project with one open issue by a person, **When** the page updates, **Then**
   it shows no suggestion.
3. **Given** a project whose only commits and PRs in 12 months come from bots or campaigns,
   **When** the page updates, **Then** it shows the suggestion (bot and campaign work does not
   count).
4. **Given** a project with a suggestion, **When** the page updates, **Then** its state dot, the
   problem count and the issues of spec 001 do not change (a suggestion is not a problem or a
   warning).

---

### User Story 2 - Archive a project with a checklist (Priority: P2)

The Maintainer follows the link and gets one checklist with the steps to archive a project: archive
the repo, decide for the domain and the hosting (keep or stop), set `status: archived` in the
catalog, remove the project from the board, and remove its secrets from the catalog.

**Why this priority**: the suggestion is only useful if archiving is easy and complete. A
half-archived project (repo archived, domain still paid, secrets still listed) still costs time
and money.

**Independent Test**: open the checklist from the badge link. Make sure that it lists each step,
and that after the steps the project is no longer on the page (spec 001: archived projects are
hidden).

**Acceptance Scenarios**:

1. **Given** the badge, **When** the Maintainer follows the link, **Then** the checklist opens and
   lists the steps in order.
2. **Given** a project with `status: archived` in the catalog, **When** the page updates, **Then**
   the project and its suggestion are not on the page.

---

### Edge Cases

- A project without a repo has no data: no suggestion.
- A repo whose only work by a person in 12 months is a campaign PR: the suggestion shows
  (FR-002).
- The repo data is not available (token error, rate limit): no suggestion for that project in
  that run. A missing value never counts as "old".
- A repo with more bot commits than one read can contain: the search for the last commit by a
  person continues until it finds one or reaches the start of the 12 months.
- A new repo with fewer than 12 months of history and no commit by a person: the date of the
  repo creation counts as the last work, so a new repo gets no suggestion in its first 12 months.
- An archived repo on GitHub whose catalog status is not yet `archived`: the suggestion shows,
  because the catalog step is not done.
- A project that is complete and in use, with no changes needed (for example a site of a past
  event that stays online): the Maintainer sets `keep` with a date and a reason (FR-008). The
  suggestion comes back after the date.
- A `keep` date in the past: the field has no effect; the suggestion shows when FR-003 is true.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: For each catalog project with a repo and status `active` or `maintenance`, each
  status run MUST find the date of the last work by a person: the latest of the last commit on
  the default branch by a person, the last PR opened by a person and the last issue opened by a
  person.
- **FR-002**: Work by a bot MUST NOT count. A bot is an author that GitHub marks as a bot (for
  example Renovate, Dependabot, GitHub Actions and the HomeLab Renovate app). A campaign PR of
  spec 015 (label `campaign`) and the commits it brings to the default branch MUST NOT count
  either: a campaign is the same change in all repos, not work on one project.
- **FR-003**: A project MUST get the suggestion when its last work by a person is more than 12
  months old and it has no open PR and no open issue by a person.
- **FR-004**: The project row MUST show a badge "Archive?" that links to the checklist. The
  detail view MUST show "No commit, PR or issue by a person since <date>." with the date.
- **FR-005**: The suggestion MUST NOT change the state of the project, the problem and warning
  counts, the filters of spec 019 or the issues of spec 001.
- **FR-006**: When the data of a project is not available, the page MUST show no suggestion for
  it.
- **FR-007**: The repo MUST contain one checklist for archiving a project, with these steps:
  archive the repo on GitHub; keep or stop the domain and the hosting (and record the choice);
  set `status: archived` in `projects.yaml`; remove the project from the board; remove its entries
  from the `secrets` list in the catalog; revoke the tokens that only this project uses.
- **FR-008**: A catalog project MAY have the field `keep` with `until` (a date, YYYY-MM-DD) and
  `reason` (1 to 80 characters). Both are required when `keep` is set; else the catalog check
  stops the run with an error (spec 001 FR-015). Until the date (inclusive), the project gets no
  suggestion, and its detail view shows "Kept until <date>: <reason>." After the date, the
  field has no effect.
- **FR-009**: The suggestion MUST follow the content rules of spec 001: a date and a fixed text;
  no text from private repos and no names of people.

### Key Entities

- **Last work**: for one project, the date of the latest commit, PR or issue by a person, or the
  date of the repo creation when there is none.
- **Archive suggestion**: a project, the date of its last work, and the link to the checklist. It
  exists only when FR-003 is true.
- **Archive checklist**: one page in the repo with the steps of FR-007.
- **Keep**: an optional catalog field of a project: a date and a reason. It stops the suggestion
  until the date.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A project with no work by a person for more than 12 months shows the suggestion
  within 1 status run after it passes the 12 months.
- **SC-002**: 0 suggestions for projects with work by a person in the last 12 months, also when
  bots worked in the repo each day. Campaign PRs alone do not stop a suggestion.
- **SC-003**: The Maintainer archives a project completely in less than 15 minutes with the
  checklist.
- **SC-004**: 0 changes to the project state, problem counts and issues because of a suggestion.
- **SC-005**: The feature costs €0 each month and adds no token.
- **SC-006**: A project with a `keep` date gets no suggestion until that date, and gets it again
  within 1 status run after the date when FR-003 is still true.

## Assumptions

- The 12 months come from PLAN.md and are fixed; no setting.
- Deploys do not count as separate work. A deploy comes from a commit, and the deploys after a
  bot merge are bot work. A deploy without a commit (for example a manual re-run) does not show
  that a person changes the project. This replaces "no deploy" of PLAN.md.
- The data comes from GitHub with the status tokens that exist. The history of spec 010 starts
  2026-11-05 and is too short for 12 months, so it is not used.
- Projects without a repo stay out of scope; the page already shows "No repo" for them.
- The board removal step is manual; the board sync of spec 004 does not remove projects.
- The checklist is in English (repo text, ASD-STE100), like `docs/conformance.md`.

## Principles Affected

| Principle | How this feature affects it |
|---|---|
| II. Catalog is the only project list | The final step of an archive is the catalog status. The `keep` decision is in the catalog. |
| III. No secrets or private data | A date and a fixed text only; no text from private repos. |
| VIII. Keep the work small | The purpose: fewer projects. Uses the tokens that exist; no issue, no new tab. |
| X. ASD-STE100 | Page text and the checklist use STE. |
