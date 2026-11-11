# Feature Specification: Status Page Filters, Sorting and Detail Views

**Feature Branch**: `019-dashboard-filters` (not created; no git hook is installed)

**Created**: 2026-11-06

**Status**: Draft

**Input**: "Let's put DaisyUI in this dashboard. So we can make some filtering, sorting and hiding
some data behind other screens or pop ups. Make a spec for this."

## Clarifications

### Session 2026-11-06

- Q: Do "HOB" and "Harmonieorkest Brummen" become one stakeholder name? → A: Yes, "Harmonieorkest
  Brummen" for pretband, pretband-backend and hob-nl (changed in the catalog on 2026-11-06).
- Q: Spec 001 forbids stakeholder names on the page; may the stakeholder filter show
  "Harmonieorkest Brummen"? → A: Yes for organisations: spec 001's forbidden list now says "names
  of people"; organisation names are already public in the catalog and on the roadmap.
- Q: Does the pop-up of a project have its own link? → A: Yes. While the pop-up is open, the page
  address has the project id; a link with that id opens the page with that pop-up open.

### Session 2026-11-11 (review)

- Q: In which order are the rows of one state group? → A: Name order (A to Z), not the catalog
  order (Maintainer decision 2026-11-11; the code stays).
- Q: Does the page have a dark scheme? → A: Yes, since 2026-11-10 (Maintainer request): a dark
  theme with the bumblebee colours on a dark base, chosen only by the browser setting
  (`prefers-color-scheme`); there is no switch. Both themes pass the contrast test.
- Q: Which colour has red text on the base (`text-error`)? → A: A separate theme colour
  `--color-error-text` (54% in the light theme, 70% in the dark theme), 4.5:1 or more on the base;
  badges and alerts keep `--color-error`.
- Q: How does a field show the keyboard focus? → A: A 1px ring in the text colour at 45%.
- Q: Does the pop-up show the uptime bar? → A: No. The pop-up shows the state and the uptime
  percentage; the bar of 30 marks is in the tab "History" (research.md §8, page size).
- Q: How does a pop-up open when the script runs? → A: With the class `modal-open`; `:target`
  opens it only without the script (research.md §8).
- Q: Below which width do the filters fold? → A: Below 640 pixels (the `sm` width).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See a short list, and the details of one project in a pop-up (Priority: P1)

The page shows each project as one short row: the dot, the name, and one line with the most
important fact (the worst state, for example "CI failed" or "Certificate in 20 days", or "All
correct"). A click on the row (or Enter on the keyboard) opens a pop-up with all the details of
that project: problems with their issue links and "since", Site (state and uptime; the bar is in the tab
"History"), Code (CI,
deploy, last commit, PRs), Expiry (certificate, renewals, secrets), and the links to the sources.
Escape or the close button closes the pop-up; the page stays at the same place.

**Why this priority**: with 11 projects and 3 lines of facts each, the page is long, and most
facts are "all correct". The Maintainer wants to scan the state first and read the details only
for the project that needs attention.

**Independent Test**: open the page. Make sure that each project is one row with one summary line.
Click the row of a project. Make sure that a pop-up shows all its facts and links, and that Escape
closes it and returns the keyboard focus to that row.

**Acceptance Scenarios**:

1. **Given** a project with a problem, **When** the page opens, **Then** its row shows the problem
   text as the summary line, in the problem colour.
2. **Given** a project with no problem and no warning, **When** the page opens, **Then** its row
   shows "All correct" in plain text.
3. **Given** any row, **When** the Maintainer clicks it or presses Enter on it, **Then** a pop-up
   opens with all the details and links of that project (the same content as the facts of spec
   012).
4. **Given** an open pop-up, **When** the Maintainer presses Escape or clicks the close button,
   **Then** the pop-up closes, the focus goes back to the row, and the project id leaves the page
   address.
5. **Given** a link with the id of a project, **When** it opens, **Then** the page shows the pop-up
   of that project.
6. **Given** a browser without scripts, **When** the page opens, **Then** each row can still open
   its details (the page stays usable without scripts).

---

### User Story 2 - Filter the projects (Priority: P1)

Above the list: a search field for the project name, and filters for the state (problems,
warnings, check not available, all correct), the stakeholder, and "has a site". The list and the
count update at once. The filter is in the page address, so a link opens the same view; for example
a link for the HOB board shows only the HOB projects.

**Why this priority**: the Maintainer looks for one project or one group, and a stakeholder wants
to see only the projects for them (constitution Principle VII) without a GitHub account.

**Independent Test**: open the page with the stakeholder filter "Harmonieorkest Brummen" in the
address. Make sure that only those projects show, with the count "3 of 11". Clear the filter: all
11 show.

**Acceptance Scenarios**:

1. **Given** the search text "bus", **When** the Maintainer types it, **Then** only the projects
   whose name contains "bus" (case-insensitive) show.
2. **Given** the state filter "problems", **When** it is selected, **Then** only projects with a
   problem show.
3. **Given** a filter, **When** the Maintainer copies the page address and opens it in a new
   window, **Then** the same filter is active.
4. **Given** a filter with no result, **When** it is active, **Then** the page says "No project
   matches the filter" and shows a button to clear it.
5. **Given** filters, **When** they are active, **Then** the total state at the top (spec 012)
   still counts all projects, not only the filtered ones.

---

### User Story 3 - Sort the projects (Priority: P2)

A sort control: by state (default: problems, then warnings, then check not available, then all
correct, as the sections of spec 012), by name, by last commit, by the next expiry date.

**Why this priority**: "which project had no work for the longest time" and "what expires first"
are frequent questions that the current order does not answer.

**Independent Test**: choose "next expiry". Make sure that the project with the nearest
certificate, renewal or secret date is first.

**Acceptance Scenarios**:

1. **Given** the default sort, **When** the page opens, **Then** the order is problems, warnings,
   check not available, all correct; in each group the name order (A to Z).
2. **Given** "last commit", **When** it is selected, **Then** the project with the oldest last
   commit is first; projects without a repo are last.
3. **Given** "next expiry", **When** it is selected, **Then** the project with the nearest date of
   any kind is first; projects without dates are last.
4. **Given** a sort, **When** the page address is copied, **Then** the sort is in it, the same as
   the filters.

---

### User Story 4 - Other screens for campaigns, shared tokens and history (Priority: P2)

The page has tabs: "Projects" (default), "Campaigns" (spec 015), "Shared tokens" (spec 013) and
"History" (the uptime and repair time of spec 010). Each tab shows its content; the tab is in the
page address. A tab with something that needs attention shows a small count (for example
"Campaigns 1" when a campaign PR has failed CI).

**Why this priority**: these parts are useful but not daily; now they make the main page long.

**Independent Test**: open the page. Make sure that only the projects show, with the tabs above
them. Click "Shared tokens": the shared tokens show and the address has the tab.

**Acceptance Scenarios**:

1. **Given** the page, **When** it opens, **Then** the tab "Projects" is active.
2. **Given** a click on a tab, **When** it is done, **Then** only that content shows and the
   address has the tab.
3. **Given** a failed CI run in a campaign, **When** the page opens, **Then** the tab "Campaigns"
   shows a warning count.
4. **Given** a browser without scripts, **When** the page opens, **Then** all content shows one
   part after the other.

### Edge Cases

- A filter value in the address that does not exist (for example an old stakeholder name): the
  filter is ignored and the page shows all projects with a short note.
- A pop-up open and the page updates its relative times (spec 012 script): the pop-up stays open.
- A small screen (below 640 pixels, for example 360 pixels): the filters fold into one "Filters"
  button that opens them; no horizontal scroll.
- Many stakeholders later: the stakeholder filter is a list built from the catalog, not fixed text.
- The page is old (stale warning of spec 001): the warning shows above the tabs on all tabs.
- Keyboard only: all filters, sorts, tabs, rows and pop-ups work with Tab, Enter, Space and
  Escape.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The page MUST use the DaisyUI component styles (Maintainer's choice) for the
  controls, rows, pop-ups and tabs. All styles MUST be in the page itself; the page MUST NOT load
  files from other sites (spec 007 FR-011).
- **FR-002**: Each project MUST show as one row with the dot, the name and one summary line (its
  most important fact). All details MUST be in a pop-up for that project.
- **FR-003**: The page MUST have a name search, a state filter, a stakeholder filter (from the
  catalog) and a "has a site" filter, with a count "<shown> of <all>".
- **FR-004**: The page MUST have a sort by state (default), name, last commit and next expiry.
- **FR-005**: The filters, the sort, the active tab and the open pop-up (project id) MUST be in the
  page address, so that a link opens the same view. A link with a project id that is not in the
  catalog opens the page without a pop-up.
- **FR-006**: The page MUST have the tabs "Projects", "Campaigns", "Shared tokens" and "History",
  each with a count when something in it needs attention.
- **FR-007**: The total state, the title and the favicon (spec 012) MUST count all projects,
  independent of filters and tabs.
- **FR-008**: Without scripts, the page MUST show all projects and all tabs as content one after
  the other, and each project's details MUST be reachable.
- **FR-009**: All controls MUST work with the keyboard; a pop-up MUST keep the focus inside while
  it is open and give it back to its row when it closes; each control MUST have a text for screen
  readers.
- **FR-010**: Text and controls MUST have a contrast ratio of 4.5:1 or more; colour MUST NOT be the
  only signal. Theme change 2026-11-06 (Maintainer): the page uses the DaisyUI theme "bumblebee";
  status badges are solid, because the bumblebee colours are too light as text. Since 2026-11-10:
  a dark theme with the same colours on a dark base, chosen only by the browser setting
  (`prefers-color-scheme`, no switch); red text on the base uses `--color-error-text`; fields
  show the focus with a 1px ring in the text colour at 45%. Both themes pass the contrast test.
- **FR-011**: The rules of the earlier specs MUST stay: the links and content rules (spec 001 and
  007), relative times and new-tab links (spec 012), no secret values (spec 013).

### Key Entities

- **View**: the search text, the filters, the sort, the tab and the open project; kept in the page
  address.
- **Project row**: dot, name, summary line (the worst fact), link to its pop-up.
- **Project details**: the facts, problems and links of spec 012, in a pop-up.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The main view is at most 1 screen high on a laptop (1100 × 800) for 11 projects.
- **SC-002**: The Maintainer finds a given project and opens its details in less than 5 seconds.
- **SC-003**: A stakeholder link shows only that stakeholder's projects, with 0 clicks after
  opening.
- **SC-004**: 100% of the controls work with the keyboard only.
- **SC-005**: The page stays less than 150 KB and loads 0 files from other sites.
  Since spec 011: HTML with CSS of the 20-site worst case < 30 KB gzip (research §8 of spec
  011); the raw limit is removed.
- **SC-006**: At 360 pixels wide, the page has 0 pixels of horizontal scroll.
- **SC-007**: The feature costs €0 each month to operate.

## Assumptions

- The page stays one static page on GitHub Pages, made by the status run each hour; filtering,
  sorting, tabs and pop-ups happen in the browser with a small script in the page. No server, no
  framework that runs in the browser.
- DaisyUI is the Maintainer's choice. The styles are made when the page is built and put in the
  page; this changes the decision "no UI library" of spec 012 (research.md §1) and is the first
  step of "the status page as an app" in PLAN.md, without a framework.
- The calm look of spec 012 stays the target: colour only for states that need attention, white
  space, one column. The DaisyUI theme is "bumblebee" (research.md §9), with a dark
  variant for a dark browser setting.
- Stakeholder values come from the catalog field `stakeholder`. One name for each group:
  "Harmonieorkest Brummen" for pretband, pretband-backend and hob-nl (clarification 2026-11-06).
- The data on the page is the same as now; this feature changes how it shows, not what is
  measured.

## Principles Affected

| Principle | How this feature affects it |
|---|---|
| II. Catalog is the only project list | Filters and stakeholder values come from the catalog. |
| III. No secrets or private data | No new data; the pop-ups show what the page shows now. |
| VII. Read-only views for stakeholders | A filter link is a view for one stakeholder, without an account. |
| VIII. Keep the work small | One static page with a small script; no framework, no server. A build step for the styles is the added cost. |
| X. ASD-STE100 | Labels, filters and messages use STE. |
