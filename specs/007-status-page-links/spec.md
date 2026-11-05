# Feature Specification: Status Page Links and Layout

**Feature Branch**: `007-status-page-links` (not created; no git hook is installed)

**Created**: 2026-11-05

**Status**: Draft

**Input**: "Status page v2: links and a clearer layout. Each cell links to its source: the project
to the repo, CI to the last run, the deploy to the deploy and its log, Renovate PRs to the filtered
PR list, a problem to its issue, the site to the domain. A summary line, a card layout on a phone,
and a link to the public roadmap."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Go from a problem to its cause in one click (Priority: P1)

The Maintainer opens the status page and sees a problem, for example "The last CI run failed.". The
Maintainer clicks the cell and the source opens: the failed run, the deploy log, the open Renovate
PRs, or the issue of the problem.

**Why this priority**: now the page shows a problem, but the Maintainer must find the repo, the run
or the issue by hand. That is the most frequent action after a look at the page.

**Independent Test**: make a test row with a failed CI run. Open the page. Click the CI cell. Make
sure that the list of workflow runs of that repo opens.

**Acceptance Scenarios**:

1. **Given** a project with a repo, **When** the Maintainer clicks the project name, **Then** the repo
   opens.
2. **Given** a project with a CI result, **When** the Maintainer clicks the CI cell, **Then** the
   workflow runs of the default branch of that repo open.
3. **Given** a project with a deploy, **When** the Maintainer clicks the deploy cell, **Then** the
   deployments of that repo open.
4. **Given** a project with open Renovate PRs, **When** the Maintainer clicks the Renovate cell,
   **Then** the list of open PRs of Renovate in that repo opens.
5. **Given** a problem with an open issue, **When** the Maintainer clicks the problem text, **Then**
   that issue opens.
6. **Given** a project with a domain, **When** the Maintainer clicks the site cell, **Then** the site
   opens.

---

### User Story 2 - See the total state at the top (Priority: P2)

The page starts with one summary line: the number of problems, the number of projects without a
problem, and the number of sites that are up. The Maintainer knows in a few seconds if action is
necessary.

**Why this priority**: with 12 or more rows, the Maintainer must read the full table to know if all
is correct.

**Independent Test**: render the page with 2 problem rows and 10 rows without a problem. Make sure
that the summary says 2 problems and 10 projects without a problem.

**Acceptance Scenarios**:

1. **Given** rows with and without problems, **When** the page opens, **Then** the summary shows the
   number of problems and the number of projects without a problem.
2. **Given** projects with a domain, **When** the page opens, **Then** the summary shows how many
   sites are up, of the sites that were checked.
3. **Given** no problems, **When** the page opens, **Then** the summary says that there are no
   problems.

---

### User Story 3 - Use the page on a phone (Priority: P2)

The Maintainer or a stakeholder opens the page on a phone. Each project shows as a card with the
same values and links. The page does not scroll to the side.

**Why this priority**: the Maintainer gets an issue notification on the phone and opens the page
there. The table is too wide for a phone now.

**Independent Test**: open the page at a width of 360 pixels. Make sure that there is no horizontal
scroll and that each value and link of a row is in its card.

**Acceptance Scenarios**:

1. **Given** a screen of 360 pixels wide, **When** the page opens, **Then** each project shows as a
   card and the page does not scroll to the side.
2. **Given** a wide screen, **When** the page opens, **Then** the page shows the table.

---

### User Story 4 - Find the roadmap and the board (Priority: P3)

The header of the page links to the public roadmap (spec 004) and to the project board.

**Why this priority**: stakeholders who see the status page can then also find the planned work.

**Independent Test**: open the page. Click the roadmap link. Make sure that the public Roadmap view
opens.

**Acceptance Scenarios**:

1. **Given** the page, **When** a person clicks "Roadmap", **Then** the public Roadmap view opens.

---

### Edge Cases

- A project has no repo. Its name is not a link, or links to the site when it has a domain. Its
  data cells have no link.
- The data of a repo is not available. The cells show "Data not available" without a link.
- A project has a problem, but the issue is not open yet (the issues job runs after the page). The
  problem text has no link. The next update adds the link.
- A link points to a private repo. A visitor without access gets the "not found" page of GitHub.
  The link shows no data that the catalog does not already show.
- A project has no CI result or no deploy ("Unknown"). The cell has no link.
- The site check is "Check not available". The site cell links to the site.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The project name MUST link to the repo, or to the site when the project has no repo
  but has a domain.
- **FR-002**: The CI cell MUST link to the workflow runs of the default branch of the repo, when the
  CI result is not "Unknown".
- **FR-003**: The deploy cell MUST link to the deployments of the repo, when a deploy is known.
- **FR-004**: The Renovate cell MUST link to the open PRs of Renovate in the repo, when the number
  is more than 0.
- **FR-005**: Each problem text MUST link to its open `status-problem` issue, when that issue
  exists.
- **FR-006**: The site cell MUST link to `https://<domain>/`, when the project has a domain.
- **FR-007**: The page MUST show a summary line above the table: the number of problems, the
  number of projects without a problem, and the number of sites that are up of the sites that were
  checked.
- **FR-008**: On a screen that is 600 pixels wide or less, the page MUST show each project as a
  card, without horizontal scroll.
- **FR-009**: The header MUST link to the public Roadmap view and to the project board.
- **FR-010**: Links MUST contain only the catalog repo, the catalog domain, issue numbers and fixed
  GitHub paths. The page MUST NOT show commit messages, PR titles, branch names or user names
  (FR-018 of spec 001).
- **FR-011**: The page MUST NOT load scripts, fonts or styles from other sites.
- **FR-012**: Each link MUST be visible as a link without colour (for example an underline), and
  MUST show a visible focus for keyboard use.

### Key Entities

- **Row**: one project, with its values and the link of each value.
- **Summary**: the counts of FR-007 for one update.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From a problem on the page, the Maintainer opens its source in 1 click.
- **SC-002**: 100% of the cells that have a source (FR-001 to FR-006) have a link.
- **SC-003**: At 360 pixels wide, the page has 0 pixels of horizontal scroll.
- **SC-004**: The Maintainer knows from the summary line in less than 5 seconds if there is a
  problem.
- **SC-005**: The feature costs €0 each month to operate.

## Assumptions

- The page stays one static page on GitHub Pages, made by the update of spec 001.
- The links point to the standard GitHub pages of a repo (runs, deployments, filtered PR list,
  issue). The page does not need tokens to show them.
- Links to private repos stay on the page. The Maintainer has access; others get "not found".
- The issue numbers come from the open `status-problem` issues of `projects`, which the update
  already reads.
- The roadmap link is `https://github.com/users/ImreBoersma/projects/4/views/3` and the board link
  is `https://github.com/users/ImreBoersma/projects/4` (spec 004).
- Views for one stakeholder (for example HOB) are not in the scope of this feature.

## Principles Affected

| Principle | How this feature affects it |
|---|---|
| I. GitHub for all project work | Links go to GitHub pages. |
| III. No secrets or private data | Links contain no tokens and no text from private repos. |
| VII. Read-only views for stakeholders | The summary and the phone layout make the public page easier to read. |
| VIII. Keep the work small | Same static page; no new service. |
| X. ASD-STE100 | Summary text and link text use STE. |
