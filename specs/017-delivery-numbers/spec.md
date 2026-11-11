# Feature Specification: Delivery Numbers for Each Project

**Feature Branch**: `017-delivery-numbers`

**Created**: 2026-11-10

**Status**: Draft

**Input**: PLAN.md 017: "From GitHub data and the history of spec 010: deploys each month, time
from PR open to merge, age of Renovate PRs when merged, time to repair (already in spec 010).
Shown for 90 days, for each project and in total. No problems or issues from these numbers.
Reason: feedback on where the maintenance time goes."

## Clarifications

### Session 2026-11-10

- Q: Does the table show the production deploys as one column for each month, or as one 90-day
  total? → A: One cell: the 90-day total, then the counts for each month as small text, oldest
  first ("13 · 2/5/3/3").
- Q: Does the table show the time to repair for each project, or only the total? → A: Only the
  total. The tab "History" already shows it in the line of spec 010 above the table, so the table
  has no repair column. A value for each project waits for spec 021 (history charts), when the
  history has more data.

## Current state (2026-11-10)

Read from GitHub for 2026-08-12 to 2026-11-10, to show what the numbers tell:

| Repo | Merged PRs | Of them dependency updates | Median age of a merged dependency update | Production deploys |
|---|---|---|---|---|
| Beter-dan-de-MIDI | 14 | 10 | 15 h | 13 |
| boek-de-bus | 5 | 1 | 2 h | 14 (and Preview) |
| personal-website | 20 | 15 | 0 h | 43 (with Preview) |
| Reperatie-Formulier | 13 | 11 | 0 h | 0 |
| scales-exercises | 58 | 47 | 33 h | 6 |
| pretband-backend | 14 | 14 | 270 h | 48 (with Preview) |
| hob-nl | 0 | 0 | — | 17 |
| HomeLab | 22 | 20 | 55 h | 0 |

Findings: 118 of the 146 merged PRs are dependency updates (Renovate, Dependabot, the HomeLab
Renovate app). The other PRs are merged in less than 2 hours (the Maintainer opens and merges
them). So the useful numbers are the count and the age of the dependency updates, and the deploys;
the time from open to merge of the other PRs is near 0. Some repos deploy Preview builds; these are
not deliveries.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See where the maintenance work goes (Priority: P1)

The Maintainer opens the tab "History" of the status page. Below the uptime, a table "Delivery
(90 days)" shows one row for each project with a repo and a total row: the merged PRs, how many
of them are dependency updates, the median age of a dependency update when it was merged, the
median time from open to merge of the other PRs, and the production deploys.

**Why this priority**: today the Maintainer cannot see that scales-exercises had 47 dependency
updates in 90 days, or that the updates of pretband-backend wait 11 days. With the table, the
Maintainer sees which repo takes the time, and where a change (fewer dependencies, a different
Renovate group, archive) gives the most.

**Independent Test**: render the page with fixture numbers for three projects. Make sure that the
table shows one row for each project, the total row, and "—" where a number has no data.

**Acceptance Scenarios**:

1. **Given** a repo with 14 merged PRs in 90 days, 10 of them by a dependency bot, **When** the
   page is made, **Then** its row shows 14 and 10.
2. **Given** dependency updates that were open 2, 10 and 50 hours before the merge, **When** the
   page is made, **Then** the row shows a median of 10 hours.
3. **Given** a repo without merged PRs, **When** the page is made, **Then** its PR cells show 0
   and "—" for the times.
4. **Given** all rows, **When** the page is made, **Then** the total row shows the sum of the
   counts and the median of all the times (not the median of the medians).
5. **Given** a merged PR older than 90 days, **When** the page is made, **Then** it is not
   counted.

---

### User Story 2 - See the deploys each month (Priority: P2)

In the same table, one cell shows the production deploys: the 90-day total, then the counts for
each calendar month as small text, oldest first (each calendar month that the 90 days touch, 4
and in rare cases 5; the first month starts at the start of the 90 days), for example "13 · 2/5/3/3". A deploy to a
preview environment does not count.

**Why this priority**: a month without a deploy of an active site is a sign; a month with many is
where the work was. It is less important than the PR numbers, because the deploy count follows
from the merges.

**Independent Test**: render the page with fixture deploys in three months and one preview
deploy. Make sure that the total and each month count are correct and the preview is not counted.

**Acceptance Scenarios**:

1. **Given** deploys to `production`, `Production` and `github-pages`, **When** the page is made,
   **Then** all three count.
4. **Given** deploys 2, 5, 3 and 3 in the 4 months of the window, **When** the page is made, **Then** the cell
   shows "13 · 2/5/3/3", and the text for screen readers names the months ("August 2, September
   5, October 3, November 3").
2. **Given** a deploy to `Preview`, **When** the page is made, **Then** it does not count.
3. **Given** a repo without deploys (for example a repo that the HomeLab deploys), **When** the
   page is made, **Then** the deploy cell shows "—", not 0.

---

### Edge Cases

- A dependency update is a PR whose author is a bot account (the login ends in `[bot]`, for
  example `renovate[bot]`, `dependabot[bot]`, `imreboersma-homelab-renovate[bot]`). A campaign PR
  of spec 015 is opened by the Maintainer, so it counts as an other PR.
- A PR that was closed without a merge: not counted.
- A repo with more than 100 merged PRs in 90 days: all are counted (the read continues to the
  next page until the PRs are older than 90 days).
- A repo that the read token cannot read: the row shows "Not available" and is not in the total.
- An archived project: not in the table.
- A project without a repo: not in the table.
- A time of less than 1 hour shows as "< 1 h"; 48 hours or more shows in days ("11 d").
- The table shows only counts and times, no PR titles, branch names or logins (spec 001 FR-018);
  this is also true for the private repos.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The status run (page mode) MUST read, for each repo of a catalog project that is not
  archived, the PRs merged in the last 90 days (the merge time in the window) and the deployments
  created in the window.
- **FR-002**: A PR whose author is a bot account (GitHub marks the account as a bot; its login
  ends in `[bot]`) MUST count as a dependency update. Each
  other merged PR MUST count as an other PR.
- **FR-003**: For each project, the table MUST show: merged PRs (count), dependency updates
  (count), the median time from open to merge of the dependency updates, the median time from
  open to merge of the other PRs, and the production deploys (one cell: the 90-day total, then the
  count for each calendar month of FR-005 as small text, oldest first). The table has
  no time to repair: the line of spec 010 above it shows the total.
- **FR-004**: The total row MUST show the sum of the counts and the median of all the times of
  all rows that are available.
- **FR-005**: A deploy MUST count only when its environment is `production`, `Production` or
  `github-pages` (the environments that spec 001 reads). The months MUST be each calendar month (UTC)
  that the 90-day window touches (4, or 5 when the window starts on the last day of a month); deploys before the 90-day window MUST NOT count.
- **FR-006**: The table MUST be in the tab "History", below the uptime list, with the title
  "Delivery (90 days)", in the HTML of the page (it shows without the script).
- **FR-007**: The numbers MUST NOT make a problem or an issue, and MUST NOT change a dot, a badge
  or the total state.
- **FR-008**: The table MUST contain only counts, times and project names; no PR title, branch
  name, login or text of a repo (spec 001 FR-018).
- **FR-009**: A repo that the run cannot read MUST show "Not available" in its row, MUST NOT be in
  the total, and MUST NOT stop the run.
- **FR-010**: Times MUST show as "< 1 h", whole hours below 48 hours, and whole days from 48
  hours. A cell without data MUST show "—".

### Key Entities

- **Delivery row**: a project; the counts (merged PRs, dependency updates); the times from open to
  merge of the dependency updates and of the other PRs; the deploy total and the count for each
  month of the window; or the state "not available".
- **Window**: the last 90 days to the time of the run; the calendar months that it touches (4 or 5).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The Maintainer finds the project with the most dependency updates and the project
  with the oldest updates in less than 30 seconds, on one page.
- **SC-002**: With the data of 2026-11-10, the table shows scales-exercises with 58 merged PRs (47
  dependency updates) and pretband-backend with the highest median age of the dependency updates.
- **SC-003**: The numbers are at most 1 hour old (the hourly run).
- **SC-004**: The page for the 20-site worst case stays below 30 KB gzip (the budget of spec 011).
- **SC-005**: The feature costs €0 each month to operate and needs no new token.

## Assumptions

- The read tokens can read the PRs and the deployments of each repo: the status run already reads
  both for the status facts (spec 001). No new permission.
- The median is a better number than the average for PR times: one PR that waited for weeks does
  not hide the normal time.
- The table is for the Maintainer. It is on the public page, as the uptime and the time to repair
  (spec 010 clarification), with counts and times only.
- The time from open to merge of the other PRs is near 0 today (the Maintainer opens and merges
  them). It stays in the table because it shows when a PR waits for a review, for example for a
  stakeholder.
- The text on the page uses ASD-STE100.

## Principles Affected

| Principle | How this feature affects it |
|---|---|
| II. Catalog is the only project list | The table has the catalog projects that are not archived. |
| III. No secrets or private data | Counts and times only; no text from private repos. |
| VIII. Keep the work small | Uses the tokens and the history that exist; no issue; one table in an existing tab. |
| X. ASD-STE100 | Page text uses STE. |
