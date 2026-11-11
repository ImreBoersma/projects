# Feature Specification: Status History on a Data Branch

**Feature Branch**: `010-status-history` (not created; no git hook is installed)

**Created**: 2026-11-05

**Status**: Draft

**Input**: "Status history on a data branch: each status update adds its result to a small JSON
file per day on a separate branch `data` of `projects`. The status page shows the uptime
percentage and a 30-day bar per site, how long each problem has been open, and the average time
to repair. 90 days on the page; git keeps older days. A missing run is a gap, not downtime."

## Clarifications

### Session 2026-11-05

- Q: Which problems count for the average time to repair? → A: Only faults: `site-down`,
  `ci-failed`, `deploy-failed` and `cert-expiring`. Reminders and maintenance signals
  (`renovate-stale`, `inactive`, `not-conformant`, `renewal-due`) do not count; they still show
  "since" (US2).
- Q: Are the average time to repair and the "since" times on the public page, or only the uptime?
  → A: All on the public page: uptime, bars, "since" and the average time to repair. The problems
  are already public on the page and in the issues; a second private page is not necessary.

### Session 2026-11-11 (review)

- Q: How far in the future may a stored result be? → A: At most 10 minutes after the time of the
  run. A result later than that is ignored.
- Q: What does a result line hold? → A: The projects that are not archived, and also the
  pseudo-project `shared` for the problems of the shared setup (spec 013), so that "since" works
  for them.
- Q: What does the update ignore when a stored result cannot be read? → A: The whole line. One
  project entry that is not valid makes the line not valid. The log gives the number of skipped
  lines.
- Q: How long is a fault that started before the 90-day window? → A: The update reads only the
  last 90 days, so the fault counts from the start of the window. Its time to repair is then too
  short. This is accepted.
- Q: How is the average time to repair rounded? → A: Below 1 hour: whole minutes. Below 10 hours:
  hours with one decimal. Up to 48 hours: whole hours. More than 48 hours: whole days.
- Q: Which start does "History from" use, and which does " or before" use? → A: "History from" is
  the date of the first day file on the branch `data`, also when it is older than 90 days.
  " or before" shows when the row of a problem goes back to the first result that the update read
  (the start of the 90-day window, or the first day file when it is newer).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Each update is kept (Priority: P1)

Each status update keeps its result: for each project, the site state and the open problems, with
the time. The results stay when a later update fails or writes a bad page.

**Why this priority**: all other stories need the stored results. Now each update replaces the page,
and the earlier results are lost.

**Independent Test**: run 3 updates. Make sure that the stored results contain 3 entries with their
times, and that the page of `main` and its history did not change.

**Acceptance Scenarios**:

1. **Given** an update, **When** it completes, **Then** its result is stored with its time, and the
   results of earlier updates stay.
2. **Given** stored results, **When** an update fails before it stores its result, **Then** the
   earlier results do not change.
3. **Given** results older than 90 days, **When** the page is made, **Then** the page does not use
   them, and they stay available in the history.

---

### User Story 2 - See how long a problem is open (Priority: P1)

Each problem on the page shows since when it is open, for example "CI failing for 3 days" or "Down
since 14:00".

**Why this priority**: the Maintainer sees at once if a problem is new or old, and can select the
next task.

**Independent Test**: keep a problem open in 3 updates in a row. Make sure that the page shows the
time of the first of them.

**Acceptance Scenarios**:

1. **Given** a problem that is in each update since a time T, **When** the page is made, **Then** the
   problem shows "since T" (a time today, else a date and a number of days). (Superseded by spec
   012 FR-006: the page shows "Started <relative time>" with the UTC time in the tooltip.)
2. **Given** a problem that stopped and came back, **When** the page is made, **Then** "since" is the
   time it came back.
3. **Given** a missing update between two updates with the same problem, **When** the page is made,
   **Then** the problem counts as open during the gap ("since" does not change).

---

### User Story 3 - See the uptime of each site (Priority: P2)

For each project with a domain, the page shows the percentage of checks in the last 30 days that
gave "Up", and a bar of 30 days with a mark for each day.

**Why this priority**: the board or a client can ask how reliable a site is. The answer is then on
the public page.

**Independent Test**: store results with 1 "Down" check on one day and "Up" on all other checks.
Make sure that the percentage is correct and that only that day has the "down" mark.

**Acceptance Scenarios**:

1. **Given** the checks of the last 30 days, **When** the page is made, **Then** the percentage is
   the number of "Up" checks divided by the number of "Up" and "Down" checks.
2. **Given** a day with a "Down" check, **When** the page is made, **Then** that day has the "down"
   mark in the bar.
3. **Given** a day without checks (no update, or "Check not available"), **When** the page is
   made, **Then** that day has the "no data" mark, and it does not change the percentage.
4. **Given** fewer than 30 days of results, **When** the page is made, **Then** the bar shows the
   days with results and "no data" for the other days, and the page says from which date the
   history starts.

---

### User Story 4 - See the average time to repair (Priority: P3)

The page shows, for the last 90 days, the average time from the start of a fault to its end. A
fault is a problem `site-down`, `ci-failed`, `deploy-failed` or `cert-expiring`.

**Why this priority**: the Maintainer sees if problems are repaired fast. It is useful, but not
necessary for daily work.

**Independent Test**: store 2 closed problems of 2 hours and 6 hours. Make sure that the page shows
4 hours.

**Acceptance Scenarios**:

1. **Given** closed faults in the last 90 days, **When** the page is made, **Then** the page shows
   their average duration and their number.
2. **Given** a closed `inactive` problem of 20 days and a closed `ci-failed` fault of 2 hours,
   **When** the page is made, **Then** the average is 2 hours.
3. **Given** no closed faults, **When** the page is made, **Then** the page shows "No repaired
   faults in the last 90 days".

---

### Edge Cases

- The first update after the start of this feature has no earlier results. The page shows the new
  values from that date, with "history from <date>".
- An update cannot store its result, for example because of a network error. The page is still
  made and published, and the run fails, so that the Maintainer gets a notification.
- Two updates run at almost the same time. Both results are kept.
- A project is archived or removed from the catalog. Its stored results stay; the page does not show
  it.
- A project id changes in the catalog. The history of the old id is not moved; the new id starts a
  new history.
- The stored results contain an entry that cannot be read. The update ignores the line of that
  entry, writes a log line with the number of skipped lines, and continues.
- The clock of an update is wrong. Results are sorted by their stored time; a result more than 10
  minutes in the future is ignored.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Each status update MUST store its result: the time, and for each project the site
  state (Up, Down, No domain, Check not available) and the keys of the open problems.
- **FR-002**: The results MUST be stored on the branch `data` of `projects`, as one file for each
  day. The branch `main` and its history MUST NOT change because of the stored results.
- **FR-003**: Results MUST stay when a later update fails, and when a page is published with an
  error.
- **FR-004**: The page MUST use the results of the last 90 days. Older results MUST stay on the
  branch.
- **FR-005**: Each problem on the page MUST show since when it is open (US2). A missing update
  MUST NOT end a problem.
- **FR-006**: For each project with a domain, the page MUST show the uptime percentage of the last
  30 days and a bar of 30 days (US3). Days without "Up" or "Down" checks MUST NOT change the
  percentage.
- **FR-007**: The page MUST show the average time to repair of the faults that closed in the last
  90 days, and their number (US4). Faults are the problems `site-down`, `ci-failed`,
  `deploy-failed` and `cert-expiring`; other problems do not count. A fault that started before the
  window counts from the start of the window.
- **FR-008**: The stored results MUST NOT contain text from repos, names of persons, tokens or
  site content (spec 001 FR-018). They contain only states, problem keys and times.
- **FR-009**: An update that cannot store its result MUST still publish the page, and MUST then
  fail, so that the Maintainer gets a notification.
- **FR-010**: The history MUST NOT need a service outside GitHub, and MUST NOT need a new token
  (Principles I and III).

### Key Entities

- **Result**: one status update: a time, and for each project id the site state and the open
  problem keys.
- **Day file**: the results of one day (UTC).
- **Problem period**: the time from the first to the last result in a row with the same problem
  key, for one project.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the completed status updates have a stored result.
- **SC-002**: 0 results are lost when a later update fails or publishes a bad page.
- **SC-003**: The Maintainer sees for each open problem since when it is open, without a search in
  issues or logs.
- **SC-004**: A stakeholder can read the uptime percentage of the last 30 days of each site on the
  public page.
- **SC-005**: The page with history stays less than 100 KB. (Superseded by spec 019 SC-005 and
  spec 011: HTML with CSS of the 20-site worst case < 30 KB gzip.)
- **SC-006**: The feature costs €0 each month to operate.

## Assumptions

- The status update runs each hour (spec 005, external trigger), so about 24 results each day.
- One day file has about 24 results with 11 projects; with only states and keys it stays small.
  The branch grows by about 1 to 2 MB each year.
- The workflow token of `projects` can write to the branch `data`; no new token is necessary.
- The runs are started by an external trigger (spec 005) through `workflow_dispatch`. The rule of
  GitHub that stops a schedule after 60 days without activity does not stop these runs, so this
  feature does not need to make activity.
- This feature changes the decision of spec 005 "no uptime percentage".
- The look of the bar and the times can change with spec 012 (visual polish).
- Results from before the start of this feature do not exist and are not made.

## Principles Affected

| Principle | How this feature affects it |
|---|---|
| I. GitHub for all project work | The history is a branch of `projects`; no other service. |
| III. No secrets or private data | The history has only states, problem keys and times. |
| VII. Read-only views for stakeholders | The uptime, the bars, the "since" times and the average time to repair are on the public page (clarification 2026-11-05). They contain no cost, credentials or private notes. |
| VIII. Keep the work small | No database or service that runs all the time. |
| X. ASD-STE100 | Page text uses STE. |
