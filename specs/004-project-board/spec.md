# Feature Specification: Project Board and Public Roadmap

**Feature Branch**: `004-project-board` (not created; no git hook is installed)

**Created**: 2026-10-30

**Status**: Draft

**Input**: PLAN.md, feature 004: "One user-level GitHub Project. The issues stay in each repo.
Fields: Project, Priority, Status, Stakeholder. A public Roadmap view for stakeholders, with a
filter. The shared workflow adds new issues to the board. Find out if a user project can contain
issues from `harmonieorkest-brummen/pretband-backend`."

## Clarifications

### Session 2026-10-30

- Q: Which items are on the roadmap? → A: Only items that the Maintainer marks with the field Roadmap = Yes.

### Session 2026-11-03

- Q: Can the token with `repo` scope be in each project repo? → A: No. It stays in `projects`.
  Private repos get no caller, and the sync adds their issues (FR-005, FR-011, SC-001).

### Session 2026-11-11 (review)

- Q: How do the issues of repos of other owners go to the board? → A: Through the sync, not a
  caller: this repo does not change repos of other owners. This is true for
  `harmonieorkest-brummen/pretband-backend` (public) and `harmonieorkest-brummen/hob-nl` (private,
  spec 006). FR-005 and SC-001 have this exception.
- Q: How often does the sync run? → A: Each hour, in the `issues` job of the status page workflow
  (spec 005 made the status run hourly). A private or other-owner issue is on the board within
  about 1 hour.
- Q: What happens when the sync fails, for example with a revoked token? → A: The `issues` job of
  the status page fails before the watchdog ping of spec 005, so the watchdog also sends an alert.
- Q: Do the board tokens expire? → A: Yes. `BOARD_TOKEN` and `BOARD_SYNC_TOKEN` expire on
  2027-11-06 (checked on GitHub by the Maintainer, 2026-11-13, T040). The catalog, PLAN.md and
  research.md §3 give this date.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See all work of all projects on one board (Priority: P1)

The Maintainer opens one board. It shows the open issues of all projects. Each item has the
fields Project, Priority, Status and Stakeholder. The Maintainer sorts and filters the board to
select the next task.

**Why this priority**: now the tasks are in approximately 10 repos. The Maintainer must open each
repo to find the next task.

**Independent Test**: add issues from two repos to the board. Set Priority on both. Filter on one
project. Make sure that only the issues of that project show.

**Acceptance Scenarios**:

1. **Given** open issues in two or more project repos, **When** the Maintainer opens the board,
   **Then** the board shows all of them.
2. **Given** an item on the board, **When** the Maintainer sets Project, Priority, Status or
   Stakeholder, **Then** the board keeps the value.
3. **Given** an issue that closes in its repo, **When** the Maintainer opens the board, **Then** the
   item shows the status Done.

---

### User Story 2 - New issues go to the board automatically (Priority: P1)

The Maintainer or a stakeholder opens an issue in a project repo. The issue goes to the board with
the Project field set. The Maintainer does not add it by hand.

**Why this priority**: a board that misses issues is not reliable. The built-in auto-add of GitHub
has a limit on the number of repos.

**Independent Test**: open an issue in a project repo that has the caller workflow (spec 002). Make
sure that it is on the board within 5 minutes, with the correct Project value.

**Acceptance Scenarios**:

1. **Given** a project repo in the catalog, **When** an issue opens in it, **Then** the issue goes
   to the board with Project set to the catalog `name`.
2. **Given** an issue that opens in `projects` with the label `status-problem` (spec 001), **When**
   it opens, **Then** it goes to the board with Project set to the project of the problem.
3. **Given** a repo that is not in the catalog, **When** an issue opens in it, **Then** the issue
   does not go to the board.

---

### User Story 3 - Stakeholders see the roadmap without a login (Priority: P2)

A board member opens a public link. The link shows a roadmap of planned work. The board member does
not need a GitHub account (Principle VII).

**Why this priority**: stakeholders ask about progress. A public roadmap answers these questions
without a meeting or an email.

**Independent Test**: open the roadmap link in a private browser window with no GitHub login. Make
sure that it shows the planned items and no internal data.

**Acceptance Scenarios**:

1. **Given** the roadmap link, **When** a person without a GitHub login opens it, **Then** the
   roadmap shows.
2. **Given** an item that is selected for the roadmap, **When** a stakeholder opens the roadmap,
   **Then** the item shows with its title, project and status.
3. **Given** an item from a private repo, an item with the label `status-problem`, or an item that
   is not selected, **When** a stakeholder opens the roadmap, **Then** the item does not show.

---

### Edge Cases

- An issue is in `harmonieorkest-brummen/pretband-backend`. If a user-level board cannot contain
  it, a small board for that organisation contains it. The result of this check is recorded.
- An issue moves to a different repo. The board keeps the item.
- A project changes to `archived` in the catalog. Its open items stay on the board until the
  Maintainer closes them. New issues of that repo do not go to the board.
- The auto-add fails, for example because a token expired. The workflow run fails, so the
  Maintainer gets a notification. When the sync fails, the status page `issues` job fails before
  its watchdog ping (spec 005), so the watchdog also sends an alert.
- An issue title contains internal data. The Maintainer does not select it for the roadmap.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: There MUST be one user-level GitHub Project for all projects of `ImreBoersma`.
- **FR-002**: The issues MUST stay in the repo of each project. The board MUST NOT copy them.
- **FR-003**: The board MUST have the fields Project, Priority, Status, Stakeholder and Roadmap.
- **FR-004**: The values of Project MUST be the `name` values of the catalog entries that are not
  archived, plus the archived entries that still have open items on the board.
- **FR-005**: A new issue in a public catalog repo of the owner `ImreBoersma` MUST go to the board
  automatically, through the shared workflow of spec 002, with the Project field set. An open
  issue in a private catalog repo, or in a catalog repo of another owner (`pretband-backend`,
  `hob-nl`), MUST go to the board with the next scheduled sync, with the Project field set. Issues that
  Renovate opens (the Dependency Dashboard) MUST NOT go to the board, because they are not tasks.
- **FR-006**: A `status-problem` issue MUST go to the board with the Project of the problem.
- **FR-007**: The board MUST have a Roadmap view that a person without a GitHub login can open.
- **FR-008**: The board MUST have a field Roadmap (Yes or No, default No). The Roadmap view MUST
  show only items with Roadmap = Yes.
- **FR-009**: The Roadmap view MUST NOT show items from private repos, `status-problem` items,
  cost, credentials or private notes (Principle VII).
- **FR-010**: The issues of `harmonieorkest-brummen/pretband-backend` MUST be on a board: the user
  board if GitHub permits it, or a separate board of that organisation if not.
- **FR-011**: Tokens for the auto-add MUST be Actions secrets (Principle III). A token with write
  access to repos MUST be only in the secrets of `projects`.

### Key Entities

- **Board**: the GitHub Project. It contains items and views.
- **Item**: one issue on the board, with the fields Project, Priority, Status, Stakeholder and Roadmap.
- **Roadmap view**: the public view for stakeholders, with a filter.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the issues that open in public catalog repos of `ImreBoersma` after the
  feature starts are on the board within 5 minutes. 100% of the issues that open in private
  catalog repos or in repos of other owners are on the board within about 1 hour (the status page
  runs each hour, spec 005; first 05:00 and 17:00 UTC, so 13 hours).
- **SC-002**: The Maintainer finds the open tasks of all projects in one place in less than 1
  minute.
- **SC-003**: A stakeholder opens the roadmap without a GitHub account.
- **SC-004**: 0 items from private repos or with internal data are on the roadmap.
- **SC-005**: The feature costs €0 each month to operate.

## Assumptions

- The board is public, so that the Roadmap view is public. GitHub hides items from private repos
  from viewers without access. FR-009 does not depend on this alone: the roadmap filter also
  removes them.
- Priority values: P1, P2, P3. Status values: Todo, In progress, Done. Stakeholder values are the
  `stakeholder` names in the catalog, not contact details (Principle III).
- Issues that are open before the feature starts are added by the sync, which also adds issues
  that the auto-add missed.
- The auto-add uses a token with write access to the board, because the workflow token of a repo
  cannot write to a user-level project. To read issues of private repos, a classic PAT needs the
  `repo` scope, which also gives write access to all repos. That token stays in `projects`, so
  private repos get no caller and their issues come with the sync.
- A board is configuration (Principle IX). This spec gives the acceptance tests.

## Principles Affected

| Principle | How this feature affects it |
|---|---|
| I. GitHub for all project work | Uses GitHub Projects. No other tool. |
| II. Catalog as the only project list | The Project values come from the catalog. |
| III. No secrets or private data | Tokens are Actions secrets. Stakeholders only by name or role. |
| IV. Shared configuration | The auto-add is in the shared workflow, not in each repo. |
| VII. Read-only views for stakeholders | Public roadmap, no login, no internal data. |
| X. ASD-STE100 | Field names, view names and issue text use STE. |
