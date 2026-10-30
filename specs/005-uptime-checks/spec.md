# Feature Specification: Uptime Checks on the Status Page

**Feature Branch**: `005-uptime-checks` (not created; no git hook is installed)

**Created**: 2026-10-30

**Status**: Draft

**Input**: PLAN.md, feature 005: "Check each production `domain` in `projects.yaml` on a schedule.
Show the result on the status page and open an issue when a site is down. Do not use the HomeLab
blackbox-exporter for this. Principle VI: the HomeLab monitoring monitors only the HomeLab."

## Clarifications

### Session 2026-10-30

- Q: How frequently must the system check the sites? → A: Each hour.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See if each site is up (Priority: P1)

The Maintainer opens the status page. For each project with a production domain, the page shows if
the site responded at the last check, and the time of that check.

**Why this priority**: orchestra and client sites are the work that stakeholders see. A site that
is down is the most urgent problem.

**Independent Test**: add a catalog entry with a domain that does not respond. Run the update. Make
sure that the page shows "Down" for that project and "Up" for a working site.

**Acceptance Scenarios**:

1. **Given** a project with a `domain` that responds correctly, **When** the check runs, **Then** the
   page shows "Up" for the project.
2. **Given** a project with a `domain` that does not respond correctly, **When** the check runs,
   **Then** the page shows "Down" and marks the project as a problem.
3. **Given** a project with no `domain`, **When** the check runs, **Then** the page shows "No
   domain" and does not mark the project.
4. **Given** an `archived` project, **When** the check runs, **Then** the check ignores it.

---

### User Story 2 - Get an issue when a site is down (Priority: P1)

When a site goes down, the update opens a GitHub issue. When the site is up again, the update closes
the issue. This uses the issue rules of spec 001.

**Why this priority**: the Maintainer does not look at the page each hour. An issue comes to the
Maintainer.

**Independent Test**: point a test entry at a domain that does not respond. Run the check. Make sure
that one issue opens. Run again. Make sure that no second issue opens. Point the entry at a working
domain. Make sure that the issue closes.

**Acceptance Scenarios**:

1. **Given** a site that was up, **When** a check finds it down, **Then** one issue opens for that
   project with the reason "The site does not respond correctly.".
2. **Given** an open issue for a site, **When** the next check finds it down, **Then** no second
   issue opens.
3. **Given** an open issue for a site, **When** a check finds it up, **Then** the issue closes.

---

### User Story 3 - Do not get issues for short errors (Priority: P2)

A site that does not respond one time, but responds a short time later, does not open an issue.

**Why this priority**: issues for short network errors cause notifications that the Maintainer
ignores. Then the Maintainer also ignores the real problems.

**Independent Test**: make a test site fail only the first request. Run the check. Make sure that
the page shows "Up" and that no issue opens.

**Acceptance Scenarios**:

1. **Given** a site that fails the first attempt and responds at the second attempt, **When** the
   check runs, **Then** the result is "Up".
2. **Given** a site that fails both attempts, **When** the check runs, **Then** the result is
   "Down".

---

### Edge Cases

- The TLS certificate of a site is not valid or expired. The result is "Down".
- A site redirects, for example from `http` to `https` or to `www`. The check follows the redirects.
  The final response decides the result.
- A site responds with a maintenance page and an error status. The result is "Down".
- The check itself cannot connect to the internet. The update does not open issues for all sites.
  It shows "Check not available" and keeps the open issues.
- A catalog `domain` contains a path or a scheme. The catalog validation accepts only a host name.
- The page shows only "Up", "Down", "No domain" or "Check not available", and the time of the check.
  It does not show the content or the error text of a site (FR-018 of spec 001).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST read the domains only from the `domain` field in `projects.yaml`
  (Principle II).
- **FR-002**: The system MUST check each `domain` of each project that is not archived.
- **FR-003**: A site is "Up" when it gives a success response over HTTPS, after redirects, within
  10 seconds. All other results are "Down".
- **FR-004**: The system MUST try a second time, a short time after a failed attempt. The site is
  "Down" only when both attempts fail.
- **FR-005**: The system MUST check the sites each hour, on a schedule.
- **FR-006**: The status page MUST show the result and the time of the last check for each project.
- **FR-007**: A "Down" result MUST be a problem with the reason `site-down`, with the problem rules,
  sort order and issue rules of spec 001.
- **FR-008**: If all sites are "Down" in one check, the system MUST show "Check not available" and
  MUST NOT open or close issues for this reason.
- **FR-009**: The catalog validation MUST reject a `domain` that is not a host name.
- **FR-010**: The check MUST NOT use the HomeLab or a service on the HomeLab (Principle VI).
- **FR-011**: The page and the issues MUST NOT show content or error text from a site.

### Key Entities

- **Uptime check**: one check of one domain at one time. It has a result (Up, Down) and a time.
- **Problem `site-down`**: a new problem reason, in addition to the four reasons of spec 001.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the non-archived projects with a domain show an uptime result on the page.
- **SC-002**: A site that stays down opens an issue within 2 hours.
- **SC-003**: A single failed request that the second attempt repairs opens 0 issues.
- **SC-004**: The feature costs €0 each month to operate.

## Assumptions

- The check runs in GitHub Actions in the public `projects` repo. Scheduled runs can start some
  minutes late. This is sufficient for sites of orchestras and small clients.
- This feature does not measure response time or calculate an uptime percentage.
- Certificate expiry warnings before the expiry date are not in the scope of this feature.
- The HomeLab keeps its own monitoring for HomeLab services only (Principle VI).
- The domains in the catalog are public. They are not private data.

## Principles Affected

| Principle | How this feature affects it |
|---|---|
| I. GitHub for all project work | Actions, Pages and Issues only. |
| II. Catalog as the only project list | The domains come only from `projects.yaml`. |
| VI. Sites off the HomeLab | The check does not use the HomeLab. PLAN.md item 3 is changed for this reason. |
| VII. Read-only views for stakeholders | Stakeholders see if their site is up on the public page. |
| VIII. Keep the work small | Scheduled workflow, no monitoring service. |
| X. ASD-STE100 | Page text and issue text use STE. |
