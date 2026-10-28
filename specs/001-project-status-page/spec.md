# Feature Specification: Project Status Page

**Feature Branch**: `001-project-status-page` (not created; no git hook is installed)

**Created**: 2026-10-28

**Status**: Draft

**Input**: User description: "US1. See the status of all projects (P1). As the Maintainer, I want
one page that shows the status of each project, so that I can find problems without opening each
repo. Given a project in projects.yaml, when the scheduled workflow runs, then the page shows these
items: last commit, open PRs, open Renovate PRs, CI status, last deploy. Given an archived project,
the page does not show it."

## Clarifications

### Session 2026-10-28

- Q: Which record should the page use as the "last deploy" of a project? → A: GitHub deployment
  records, from host integrations or from the shared workflows. Projects without records show
  "unknown".
- Q: Which conditions should mark a project as a problem on the page? → A: Failed last CI, failed
  last deploy, a Renovate PR open for more than 14 days, or an `active` project with no commit for
  more than 90 days.
- Q: Should the update also notify the Maintainer when a project gets a new problem? → A: Yes. Open
  one GitHub issue for each new problem, and close it when the problem stops.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See the status of all projects on one page (Priority: P1)

The Maintainer opens one page. The page shows one row for each project in the catalog that is not
archived. Each row shows the date of the last commit, the number of open PRs, the open Renovate
PRs, the CI status and the last deploy. The Maintainer does not open each repo to get this data.

**Why this priority**: this is the main value of the feature. Without it, the Maintainer must open
approximately 15 repos one by one.

**Independent Test**: add three projects to the catalog, one of them `archived`. Run the update.
Open the page. Make sure that it shows two rows with all five items.

**Acceptance Scenarios**:

1. **Given** a project with status `active` in the catalog, **When** the scheduled update runs,
   **Then** the page shows the project with the date of its last commit, open PRs, open Renovate
   PRs, CI status and last deploy.
2. **Given** a project with status `maintenance` in the catalog, **When** the update runs,
   **Then** the page shows the project and its status.
3. **Given** a project with status `archived` in the catalog, **When** the update runs, **Then** the
   page does not show the project.
4. **Given** a project that is not in the catalog, **When** the update runs, **Then** the page does
   not show the project.

---

### User Story 2 - Find problems quickly (Priority: P2)

The page marks the projects that have a problem. The Maintainer sees these projects first and does
not read all rows.

**Why this priority**: the goal is to find problems. A list without marks is useful, but slower to
read.

**Independent Test**: make the CI fail in one project. Run the update. Make sure that the page marks
that project and shows it at the top.

**Acceptance Scenarios**:

1. **Given** a project with a failed last CI run, **When** the update runs, **Then** the page marks
   the project as a problem.
2. **Given** a project with a failed last deploy, **When** the update runs, **Then** the page marks
   the project as a problem.
3. **Given** a project with a Renovate PR that is open for more than 14 days, **When** the update
   runs, **Then** the page marks the project as a problem.
4. **Given** a project with status `active` and no commit for more than 90 days, **When** the
   update runs, **Then** the page marks the project as a problem.
5. **Given** a project with status `maintenance` and no commit for more than 90 days, **When** the
   update runs, **Then** the page does not mark the project as a problem for this reason.
6. **Given** projects with and without problems, **When** the Maintainer opens the page, **Then**
   the projects with problems are at the top.

---

### User Story 3 - Know if the data is current (Priority: P3)

The page shows the time of the last update. The Maintainer knows if the data is current.

**Why this priority**: if the update stops, old data looks correct. The time of the update shows
this problem.

**Independent Test**: run the update. Make sure that the page shows the date and time of that run.

**Acceptance Scenarios**:

1. **Given** a completed update, **When** the Maintainer opens the page, **Then** the page shows the
   date and time of that update.
2. **Given** that the last update is more than 48 hours old, **When** the Maintainer opens the page,
   **Then** the page shows a warning that the data is old.

---

### User Story 4 - Get an issue for each new problem (Priority: P2)

When a project gets a new problem, the update opens a GitHub issue for it. When the problem stops,
the update closes the issue. The Maintainer gets the normal GitHub notification and does not have to
open the page each day.

**Why this priority**: the page shows problems only when the Maintainer opens it. An issue comes to
the Maintainer.

**Independent Test**: make the CI fail in one project. Run the update. Make sure that one issue
opens. Run the update again. Make sure that no second issue opens. Make the CI pass. Run the update.
Make sure that the issue closes.

**Acceptance Scenarios**:

1. **Given** a project without a problem, **When** an update finds a new problem, **Then** the update
   opens one issue for that project and that reason.
2. **Given** an open issue for a problem, **When** the next update finds the same problem, **Then**
   the update does not open a second issue.
3. **Given** an open issue for a problem, **When** the next update does not find that problem,
   **Then** the update closes the issue.
4. **Given** a project with two problems, **When** the update runs, **Then** there are two issues,
   one for each reason.

---

### Edge Cases

- A catalog entry has no repo (for example hob.nl or pretband). The page shows the project and shows
  "No repo" for the five items. The page does not mark it as a problem.
- A project has no CI or no deploy record. The page shows "Unknown" for that item. The page does not
  mark it as a problem.
- A repo has no commits. The page shows "Unknown" for the last commit. The page does not mark the
  project as inactive.
- The repo of a project is owned by a different owner (for example `harmonieorkest-brummen`). The
  page shows the same items if the data is available.
- The update cannot get data for one project. The page shows the other projects and marks that
  project as "Data not available".
- The catalog contains an error. The update stops and keeps the last correct page. The CI run of the
  update fails, so the Maintainer gets a notification.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST read the list of projects only from `projects.yaml`.
- **FR-002**: The system MUST show each project with status `active` or `maintenance`.
- **FR-003**: The system MUST NOT show projects with status `archived`.
- **FR-004**: For each project, the system MUST show the date of the last commit on the main branch.
- **FR-005**: For each project, the system MUST show the number of open PRs.
- **FR-006**: For each project, the system MUST show the number of open Renovate PRs and the age of
  the oldest one.
- **FR-007**: For each project, the system MUST show the result of the last CI run on the main
  branch: passed, failed or unknown.
- **FR-008**: For each project, the system MUST show the date and the result of the last GitHub
  deployment record on the production environment, or "Unknown" if there is no record.
- **FR-009**: The system MUST mark a project as a problem when one or more of these conditions is
  true:
  - Its last CI run failed.
  - Its last deploy failed.
  - A Renovate PR is open for more than 14 days.
  - Its status is `active` and it has no commit on the main branch for more than 90 days.
- **FR-009a**: The system MUST show the reason for each problem mark.
- **FR-009b**: When the update finds a new problem, the system MUST open one issue in the
  `projects` repo for that project and that reason.
- **FR-009c**: The system MUST NOT open a second issue for a problem that already has an open issue.
- **FR-009d**: When a problem stops, the system MUST close its issue.
- **FR-009e**: The issues MUST obey FR-018. They MUST NOT contain text from private repos.
- **FR-010**: The system MUST show projects with problems before projects without problems.
- **FR-011**: The system MUST update the page on a schedule, a minimum of two times each day, so
  that SC-004 is true when GitHub starts a scheduled run late.
- **FR-012**: The Maintainer MUST be able to start an update manually.
- **FR-013**: The system MUST show the date and time of the last update. It MUST show a warning when
  the last update is more than 48 hours old.
- **FR-014**: If the update cannot get data for one project, the system MUST show the other
  projects.
- **FR-015**: If the catalog contains an error, the system MUST keep the last correct page and the
  update MUST fail.
- **FR-016**: The page MUST NOT show secrets, tokens, cost or private notes.
- **FR-017**: The page MUST be public. A person MUST NOT need a login to see it.
- **FR-018**: The page MUST NOT show text from private repos, for example commit messages, PR titles
  or branch names. It MUST show only project names, dates, counts and results.

### Key Entities

- **Project**: one entry in the catalog. It has a name, a repo, a host, a domain, a stakeholder and a
  status (`active`, `maintenance` or `archived`).
- **Project status**: the data that the update collects for one project at one time. It contains the
  date of the last commit, the number of open PRs, the open Renovate PRs, the CI result, the last
  deploy and the problem mark.
- **Problem**: one condition from FR-009 for one project. It has a project, a reason and a start
  date. It has a maximum of one open issue.
- **Status page**: the output of one update. It contains one project status for each project that
  is not archived, and the time of the update.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The Maintainer can find all projects with a problem in less than 1 minute, without
  opening a repo.
- **SC-002**: 100% of the projects in the catalog that are not archived are on the page.
- **SC-003**: 0 archived projects are on the page.
- **SC-004**: The data on the page is never more than 24 hours old during normal operation.
- **SC-005**: A new project is on the page after the next update, with no change other than its
  catalog entry.
- **SC-006**: The feature costs €0 each month to operate.
- **SC-007**: A stakeholder can open the page without a GitHub account.

## Assumptions

- This feature makes a first `projects.yaml` with only the fields that it reads (`id`, `name`,
  `repo`, `status`). The other catalog fields of Principle II are not in the scope of this feature.
- "Last deploy" comes only from GitHub deployment records. Vercel and Azure Static Web Apps make
  these records now. The shared deploy workflows must also make them. hob.nl shows "unknown" until
  it deploys through a workflow.
- A Renovate PR is a PR that Renovate opened. The page counts these PRs also in the total of open PRs.
- The main branch of each repo is `main`, or the default branch if the repo uses a different name.
- A daily update is sufficient. The Maintainer does not need real-time data.
- The page is static output, and a scheduled workflow makes it (Principle VIII).
- Uptime of production sites is not in the scope of this feature.
- The issues are in the `projects` repo, not in the project repos. This does not change repos of
  other owners. The `projects` repo is public, so the issues are public.
- When the update stops for a project with "data not available", it does not close the open issues
  of that project.
- The page is in English and uses ASD-STE100 (Principle X).
- The `projects` repo becomes public, so that it can publish the page at no cost.
- Project names and domains are not private data. Stakeholder names on the page are not necessary;
  the page does not show them.

## Principles Affected

| Principle | How this feature affects it |
|---|---|
| II. Catalog as the only project list | The page reads the project list only from `projects.yaml`. |
| III. No secrets or private data | Tokens are Actions secrets. The page and issues show no private text (FR-016, FR-018). |
| IV. Shared configuration | Exception for a limited time: no Renovate until the shared preset exists. See plan.md. |
| V. One pipeline | Exception: the page deploys directly to GitHub Pages. See plan.md. |
| VII. Read-only views for stakeholders | The page is public and needs no login (FR-017). |
| VIII. Keep the work small | Static page, scheduled workflow, no server, no database. |
| X. ASD-STE100 | The page text and the issue text use STE. |
