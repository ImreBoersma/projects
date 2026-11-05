# Feature Specification: Status Page Visual Polish

**Feature Branch**: `012-status-page-polish` (not created; no git hook is installed)

**Created**: 2026-11-05

**Status**: Draft

**Input**: "Status page visual polish (PLAN.md 012): a header with the state of all projects as one
coloured badge above the summary line; state badges in the cells (Up, Down, Passed, Failed,
Succeeded) with colour and text; rows grouped with problem projects first in a separate section;
relative times next to dates with the exact date in a tooltip; a favicon and a page title with the
number of problems; each link opens in a new tab with rel noopener noreferrer and a visible new-tab
mark plus screen-reader text; the same static page without external fonts, scripts or styles,
light and dark schemes, and the phone card layout of spec 007."

## Clarifications

### Session 2026-11-05

- Design revision after the first release (Maintainer: "make it feel more serene and simple"):
  colour only for states that need attention, one list item per project in place of a table of
  9 columns, relative times only (exact time in the tooltip), no facts without a value, more
  white space. Changes FR-004, FR-006 and FR-011; research.md §9.

- Q: Should relative times be fixed when the page is generated, or update while the page is open?
  → A: Fixed when generated, then updated by a small script in the page. Without the script, the
  page still works.
- Q: Where does a project without a problem but with "Data not available" go? → A: In a third
  section, "Check not available", between "Projects with problems" and "Other projects".
- Q: Do state badges get a fourth kind, "warning"? → A: Yes. Four kinds: good, warning, bad,
  unknown. Warning is for expiry and renewal dates close to the problem limit of spec 009.
  Correction during the plan: spec 009 has no warning period, so FR-004 sets one (more than the
  limit, at most two times the limit).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See the total state from the browser tab and the top of the page (Priority: P1)

The Maintainer keeps the status page open in a browser tab. The tab title shows the number of
problems, and the favicon shows the state by colour and shape. When the Maintainer opens the page,
one badge at the top shows the total state: "All correct", "<n> problems" or "Check not available".

**Why this priority**: now the Maintainer must open the page and read the summary line to know if
action is necessary. A tab title and a badge give that in one look.

**Independent Test**: render the page with 2 problems. Make sure that the title starts with
"(2)", the favicon is the problem icon, and the badge says "2 problems" in the problem colour.

**Acceptance Scenarios**:

1. **Given** 0 problems and all checks available, **When** the page opens, **Then** the badge says
   "All correct", the title has no number, and the favicon is the "correct" icon.
2. **Given** 2 problems, **When** the page opens, **Then** the badge says "2 problems", the title
   starts with "(2)", and the favicon is the "problem" icon.
3. **Given** 0 problems but one or more projects with a check that is not available (FR-005),
   **When** the page opens, **Then** the badge says "Check not available" and the favicon is the
   "check not available" icon.
4. **Given** any state, **When** the page opens, **Then** the summary line of spec 007 and the
   history line of spec 010 stay below the badge.

---

### User Story 2 - Read a state in a cell from a badge (Priority: P1)

Each state value in a cell (site Up or Down, CI Passed or Failed, deploy Succeeded or Failed) shows
as a small badge with a colour and the text. A bad state uses the problem colour, a good state the
correct colour, and an unknown state is grey.

**Why this priority**: now all values are plain text of the same weight. The Maintainer must read
each cell to find the bad one.

**Independent Test**: render a row with site Down, CI Passed and deploy Failed. Make sure that
each value is a badge with its text, and that Down and Failed use the problem colour.

**Acceptance Scenarios**:

1. **Given** a site that is down, **When** the page opens, **Then** the site cell shows a badge
   "Down" in the problem colour, with the time of the check next to it.
2. **Given** a CI result "Passed", **When** the page opens, **Then** the CI cell shows a badge
   "Passed" in the correct colour.
3. **Given** a certificate that expires in 20 days (warning period of FR-004), **When** the page opens, **Then** the
   expiry cell shows a badge in the warning colour with the date and the relative time.
4. **Given** a value "Unknown" or "Data not available", **When** the page opens, **Then** the cell
   shows a grey badge with that text.
5. **Given** the page in grey scale (no colour), **When** the Maintainer reads it, **Then** each
   state is still clear from its text.

---

### User Story 3 - See the projects with problems first (Priority: P2)

The page shows three sections: "Projects with problems" first, then "Check not available" (no
problem, but one or more checks could not run, FR-005), then "Other projects". In each section
the order of the catalog stays.

**Why this priority**: with 11 or more rows, a problem row can be at the bottom of the table.

**Independent Test**: render the page with a problem in the last project of the catalog. Make
sure that this project is the first row, in the section "Projects with problems".

**Acceptance Scenarios**:

1. **Given** 2 projects with problems, **When** the page opens, **Then** the first section has
   these 2 projects, in catalog order, and the second section has the other projects.
2. **Given** 0 problems, **When** the page opens, **Then** the page shows only the section of the
   other projects, without an empty problem section.
3. **Given** a project without a problem but with a check that is not available, **When** the page opens,
   **Then** it shows in the section "Check not available".
4. **Given** a phone screen, **When** the page opens, **Then** all sections use the card layout
   of spec 007.

---

### User Story 4 - Read times as "3 days ago" (Priority: P2)

Each date or time on the page (last commit, last deploy, the time of the site check, "since" of a
problem, expiry dates) shows a relative time next to it, for example "3 days ago" or "in 40 days".
The exact date and time in UTC is in a tooltip and stays available to screen readers.

**Why this priority**: the Maintainer must now calculate the age of a commit or a deploy from the
date.

**Independent Test**: render the page with a last commit of 3 days before the time of the update.
Make sure that the cell shows "3 days ago", and that the tooltip shows the exact date and time.

**Acceptance Scenarios**:

1. **Given** a last commit 3 days before the update, **When** the page opens, **Then** the cell
   shows "3 days ago" and the tooltip shows the exact UTC time.
2. **Given** a certificate that expires in 40 days, **When** the page opens, **Then** the expiry
   cell shows "in 40 days" next to the date.
3. **Given** a time less than 1 hour before the update, **When** the page opens, **Then** the cell
   shows the minutes, for example "25 minutes ago".

---

### User Story 5 - Keep the status page open when a link is clicked (Priority: P2)

Each link on the page opens in a new tab, also the links to the roadmap and the board. Each link
shows a small mark that it opens a new tab, and a screen reader says "opens in a new tab".

**Why this priority**: the Maintainer goes from a problem to its source (spec 007) and then wants
to go back to the page to see the next problem. Now the page is replaced.

**Independent Test**: open the page and click the CI cell of a row. Make sure that the run opens
in a new tab and the status page stays open. Make sure that a screen reader reads "opens in a new
tab" for the link.

**Acceptance Scenarios**:

1. **Given** any link on the page, **When** the Maintainer clicks it, **Then** the target opens in
   a new tab, and the new tab cannot control the status page.
2. **Given** any link, **When** the page opens, **Then** a small new-tab mark is visible after the
   link text.
3. **Given** a screen reader, **When** it reads a link, **Then** it reads the link text and
   "opens in a new tab".

### Edge Cases

- No data at all (all projects "Data not available", for example a token error): the badge says
  "Check not available"; the title shows no number of problems.
- Problems and "Data not available" at the same time: the badge shows the problems; the summary
  line still shows the rest.
- A time in the future (for example an expiry date): the relative time uses "in <n> days".
- The page stays open for hours in a tab: the script of FR-006 updates the relative times. When
  scripts are off, the times of the update show, the stale warning of spec 001 (more than 3 hours)
  stays, and the tooltip always shows the exact time.
- A problem with an `inactive` reason only: it counts as a problem, the same as on the page now.
- A project without a domain: no site badge, the same as now.
- Dark colour scheme: all badges and the favicon stay readable.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The page MUST show one state badge above the summary line of spec 007. The badge
  MUST show "All correct" when there are 0 problems and all checks are available, "<n> problems"
  (or "1 problem") when there are problems, and else "Check not available".
- **FR-002**: The page title MUST start with "(<n>) " when there are problems, followed by the
  current title. With 0 problems, the title MUST NOT contain a number.
- **FR-003**: The page MUST have a favicon in the page itself (not a separate file from another
  site), with a different icon for each state of FR-001. Each icon MUST be different in shape, not
  only in colour.
- **FR-004**: A state that is not good MUST show as a badge with its text: warning (warning
  colour), bad (problem colour), unknown (grey). A good state MUST show as plain text without a
  colour (design revision 2026-11-05). Expiry and renewal dates use the same kinds. A date is bad
  at or below the problem limit of spec 009 (certificate 14 days, renewal 30 days). A date is a
  warning above that limit and at or below two times the limit (certificate 15 to 28 days,
  renewal 31 to 60 days). Each project has a dot of its most important kind, with a text for
  screen readers.
- **FR-005**: The page MUST show the projects in three sections, in this order: "Projects with
  problems"; "Check not available"; "Other projects". A project is "check not available" when it
  has 0 problems and one or more of these: its repo data is "Data not available"; its site check
  is not available; one or more of its setup checks (spec 008) are not available. A certificate or
  domain date that is "not known" does not count (normal for a platform subdomain, spec 009). This
  is the only definition; the badge, the favicon and the sections use it. In each section, the catalog
  order MUST stay. A section without projects MUST NOT show.
- **FR-006**: Each date or time on the page MUST show as a relative time, calculated from
  the time of the update: "now" when less than 1 minute, minutes when less than 1 hour, hours
  when less than 48 hours, else days. A date without a time uses whole days ("today", "in 40
  days"). The uptime marks of spec 010 keep only their date in the tooltip (30 relative times in
  one bar give no value).
  The exact date and time in UTC MUST be in a tooltip and in text for screen readers (design
  revision 2026-11-05: the exact value is not shown next to the relative time). A small
  script in the page MUST update the relative times each minute while the page is open. Without
  the script, the page MUST show the relative times of the update.
- **FR-007**: Each link MUST open in a new tab and MUST NOT give the new tab access to the status
  page (no opener, no referrer).
- **FR-008**: Each link MUST show a small visible new-tab mark, and MUST have the text "opens in a
  new tab" for screen readers. The mark MUST NOT be read twice.
- **FR-009**: All colours MUST be tokens with a light and a dark value. Text and badges MUST have a
  contrast ratio of 4.5:1 or more in both schemes (WCAG 2.1 AA). Colour MUST NOT be the only signal
  of a state.
- **FR-010**: The page MUST NOT load scripts, fonts or styles from other sites (spec 007 FR-011).
  Scripts MUST be in the page itself: the stale check of spec 001 and the script of FR-006. All
  content and links MUST work without scripts.
- **FR-011**: The page MUST show each project as one list item (name, problems, a line of facts),
  not as a table, and MUST have no horizontal scroll at 360 pixels wide. A fact with no value
  (0 PRs, no domain, an unknown CI result) MUST NOT show (design revision 2026-11-05; replaces
  the table and the card layout of spec 007 FR-008).
- **FR-012**: The links of spec 007, the content rules of spec 001 (FR-018) and the history
  values of spec 010 MUST stay. This feature changes only the look and the order.

### Key Entities

- **Total state**: one of "all correct", "problems" or "check not available", with the number of
  problems. It sets the badge, the title and the favicon.
- **State badge**: a state value with its kind (good, warning, bad, unknown).
- **Section**: a group of rows ("Projects with problems", "Check not available" or "Other
  projects").

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From the browser tab, the Maintainer knows in less than 2 seconds if there is a
  problem, without a click.
- **SC-002**: When there is a problem, its project is in the first rows of the page in 100% of the
  updates.
- **SC-003**: 100% of the links open in a new tab and have the new-tab text for screen readers.
- **SC-004**: All text and badges have a contrast ratio of 4.5:1 or more in the light and the dark
  scheme.
- **SC-005**: At 360 pixels wide, the page has 0 pixels of horizontal scroll.
- **SC-006**: The page stays less than 100 KB and loads 0 files from other sites.
- **SC-007**: The feature costs €0 each month to operate.

## Assumptions

- The page stays one static page on GitHub Pages, made by the update of spec 001, each hour. The
  data on the page changes only with the update; the script of FR-006 changes only the relative
  times.
- The badge and the favicon use the same definition of a problem as the summary line of spec 007.
- "Check not available" is defined in FR-005.
- The favicon is a small SVG in the page. Old browsers that do not show an SVG favicon show no
  favicon; the title still shows the number.
- The text of the page stays English, in ASD-STE100.
- Views for one stakeholder, sort or filter controls, and a different design system are not in the
  scope of this feature.

## Principles Affected

| Principle | How this feature affects it |
|---|---|
| III. No secrets or private data | No new data on the page; only the look and the order change. |
| VII. Read-only views for stakeholders | The badge, the sections and the relative times make the public page easier to read. |
| VIII. Keep the work small | Same static page, one small script in the page, no new service. |
| X. ASD-STE100 | Badge text, section titles and the new-tab text use STE. |
