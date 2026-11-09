# Feature Specification: Status App Basics

**Feature Branch**: `020-status-app-basics` (not created; no git hook is installed)

**Created**: 2026-11-06

**Status**: Draft

**Input**: PLAN.md 020: "Data file (`status.json`), since your last visit, installable app with
the problem count on its icon, shortcut links in the pop-ups, and a command box (⌘K)."

## Clarifications

### Session 2026-11-06

- Q: What does "what changed" compare against? → A: The last visit on this device when there is
  one; else the last 24 hours (first visit, other device, private window), from the problem
  history of spec 010.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See what changed since my last visit (Priority: P1)

The Maintainer opens the status page. Above the list, a short line says what changed since the
last visit in this browser: "Since yesterday 18:00: 2 new, 1 fixed". The rows with a new problem
or a new warning have a "New" mark. A "Fixed" list (folded) shows the problems that stopped since
then. When the Maintainer opens the page again later, the comparison starts from that visit.

**Why this priority**: the page updates each hour. The question on each visit is "what is
different", not "what is the state"; now the Maintainer must remember the last state.

**Independent Test**: open the page. In the next update, add a problem to one project (fixture
or real). Open the page again. Make sure that the line says "1 new" and that the row has the "New"
mark.

**Acceptance Scenarios**:

1. **Given** a first visit in this browser (or a browser without storage), **When** the page
   opens, **Then** the line compares with the last 24 hours ("In the last 24 hours: 1 new, 0
   fixed"), with the same "New" marks; the visit is remembered for the next time.
2. **Given** a problem that was not there at the last visit, **When** the page opens, **Then**
   its row has a "New" mark and the line counts it as new.
3. **Given** a problem that was there at the last visit and is gone now, **When** the page opens,
   **Then** the line counts it as fixed and the "Fixed" list names it with its project.
4. **Given** no change since the last visit, **When** the page opens, **Then** the line says
   "No change since <time>".
5. **Given** the page opened again within 10 minutes, **When** it opens, **Then** the comparison
   still uses the visit before (a reload does not clear the marks).

---

### User Story 2 - The data as a file (Priority: P1)

Each status update also publishes a data file next to the page, with the same content as the
page: the total state, the time of the update, and for each project its state, its most
important fact, its problems (text and issue link), its site state and uptime, and its dates.
The page features of this spec and of specs 021 and 022 read this file.

**Why this priority**: it is the base for the other parts, and for a later app.

**Independent Test**: after an update, open the data file. Make sure that it has 11 projects with
the same state and facts as the page, and no forbidden content (spec 001 contract).

**Acceptance Scenarios**:

1. **Given** an update, **When** it is done, **Then** the data file is at a fixed address next to
   the page, with the time of the update.
2. **Given** the data file and the page of the same update, **When** they are compared, **Then**
   each project has the same state, summary fact and problems.
3. **Given** the content rules of spec 001 (no text from private repos, no names of people, no
   secret values), **When** the data file is made, **Then** it obeys them.

---

### User Story 3 - Install the page as an app (Priority: P2)

The Maintainer installs the status page on the phone or the computer (the browser's "Install" or
"Add to Home Screen"). It opens full screen with its own icon. Without a network, it shows the
last state it loaded, with the stale warning. Where the system supports it, the app icon shows
the number of problems as a badge.

**Why this priority**: the Maintainer checks the state on the phone; an app icon with a count is
faster than a bookmark.

**Independent Test**: install the page in Chrome. Make sure that it opens in its own window with
the status icon. Turn the network off and open it: the last state shows with the stale warning.

**Acceptance Scenarios**:

1. **Given** a supported browser, **When** the Maintainer opens the page, **Then** the browser
   offers to install it, with the name "Project status" and an icon.
2. **Given** the installed app and a network, **When** it opens, **Then** it shows the newest
   update (never an old copy when a new one is available).
3. **Given** the installed app without a network, **When** it opens, **Then** it shows the last
   loaded state and the stale warning of spec 001 when the data is older than 3 hours.
4. **Given** 2 problems and a system that supports icon badges, **When** the app opens, **Then**
   the icon shows "2"; with 0 problems the badge goes away.

---

### User Story 4 - Act on a problem in one click (Priority: P2)

The pop-up of a project has shortcut links to the GitHub pages that do the work: the last CI
run (with its "Re-run" button), the deployments, the Renovate dependency dashboard of the repo,
and the page of the project issues. The header has a link "Run the status update now" to the
page of the status workflow (with its "Run workflow" button).

**Why this priority**: from a problem, the Maintainer goes to the place to repair it; now some of
these pages need 3 or more clicks on GitHub.

**Independent Test**: open the pop-up of a project with a repo. Make sure that each shortcut
opens the right GitHub page in a new tab.

**Acceptance Scenarios**:

1. **Given** a project with a repo, **When** its pop-up opens, **Then** it shows the shortcuts
   "CI runs", "Deployments", "Renovate dashboard" and "Issues", each to that repo.
2. **Given** a project without a repo, **When** its pop-up opens, **Then** it shows no shortcuts.
3. **Given** the header, **When** the Maintainer clicks "Run the status update now", **Then** the
   workflow page of the status update opens, where GitHub asks for its own login.
4. **Given** any shortcut, **When** it is used, **Then** the status page sends no request with
   write access; the action happens on GitHub after GitHub's own login.

---

### User Story 5 - Jump with the keyboard (Priority: P3)

⌘K (Mac) or Ctrl+K opens a command box. The Maintainer types a part of a project name, a tab
name or a filter ("problems", "HOB"), and Enter goes there: the pop-up of the project, the tab,
or the filter.

**Why this priority**: useful, but with 11 projects the search field already does most of it.

**Independent Test**: press ⌘K, type "hob", press Enter. Make sure that the pop-up of hob.nl
opens.

**Acceptance Scenarios**:

1. **Given** the page, **When** the Maintainer presses ⌘K or Ctrl+K, **Then** the command box
   opens with the focus in it.
2. **Given** the text "hob", **When** the box shows the results, **Then** the first result is the
   project hob.nl; arrow keys move, Enter opens it.
3. **Given** the text "campaigns" or "problems", **When** Enter is pressed, **Then** the tab or
   the state filter opens.
4. **Given** the box, **When** Escape is pressed, **Then** it closes and the focus goes back.

### Edge Cases

- A browser that blocks local storage (private window): the comparison uses the last 24 hours, as
  on a first visit.
- A very old last visit (more than 30 days): the line says "Since <date>" with the counts; the
  "Fixed" list shows at most 20 names.
- A project that is new in the catalog since the last visit: its problems count as new.
- A project removed from the catalog: its old problems do not count as fixed.
- The data file cannot be written: the page still deploys; the run fails so that the
  Maintainer sees it (as the history of spec 010).
- A system without icon badges (for example some phones): no badge, no error.
- The installed app and a new update while it is open: the next opening shows the new update;
  the open page keeps its state and its stale warning.
- ⌘K in a text field of the page: the box opens too (the shortcut wins over the field).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The browser MUST remember, only on this device, the time and the problem and
  warning keys of the last visit, and nothing else.
- **FR-002**: The page MUST show "Since <time>: <n> new, <m> fixed" (or "No change since <time>")
  and a "New" mark on each row with a new problem or warning. A visit counts as the last visit
  only when it is more than 10 minutes after the one before. Without a stored visit, the page
  MUST compare with the last 24 hours: problems that started in that time are new, problems that
  stopped in that time are fixed (from the history of spec 010), with the text "In the last 24
  hours: …". The 24-hour compare covers problems only: the history does not store warnings, so a
  new warning gets the "New" mark only against a stored visit (analysis I1).
- **FR-003**: The page MUST list the fixed problems (project and text) in a folded list, at most
  20.
- **FR-004**: Each update MUST publish a data file next to the page with the content of FR-005,
  and the page MUST NOT need it to show its content (the page stays complete in itself).
- **FR-005**: The data file MUST contain the time of the update, the total state, and for each
  project: id, name, state, summary fact, problems (text, issue link), site state and uptime
  percentage, the next expiry date, and the stakeholder organisation. It MUST obey the content
  rules of spec 001.
- **FR-006**: The page MUST be installable as an app (name, icon, full-screen start) and MUST
  show the last loaded state without a network.
- **FR-007**: With a network, the installed app MUST show the newest update; a stored copy is
  used only when the network fails.
- **FR-008**: Where the system supports it, the app icon MUST show the number of problems, and
  no badge with 0 problems.
- **FR-009**: The pop-up of a project with a repo MUST have shortcut links to its CI runs,
  deployments, Renovate dependency dashboard and issues; the header MUST have a link to the
  workflow page of the status update. All shortcuts follow the new-tab rules of spec 012.
- **FR-010**: The page MUST NOT send a request that changes anything on GitHub or another service.
- **FR-011**: ⌘K or Ctrl+K MUST open a command box that finds projects, tabs and state filters by
  part of their name, with arrow keys, Enter and Escape, and screen-reader texts.
- **FR-012**: The rules of spec 019 MUST stay: works without scripts (the parts of this spec that
  need a script do not show then), keyboard, contrast, page size less than 150 KB.

### Key Entities

- **Visit**: time and the set of problem and warning keys; stored in this browser only.
- **Change**: new keys and fixed keys between the visit (or 24 hours ago) and now.
- **Recent changes**: for the last 24 hours, the problem keys that started and the ones that
  stopped, with their project and text; made by the update from the history of spec 010.
- **Data file**: the content of FR-005 for one update.
- **Shortcut**: a label and a GitHub address for a project or for the status workflow.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On each visit, the Maintainer sees what changed since the last visit in less than 3
  seconds, without reading the list.
- **SC-002**: 100% of the problems that started or stopped between two visits show as new or
  fixed.
- **SC-003**: The installed app opens with the newest update when online, and with the last state
  when offline, in 100% of the tests.
- **SC-004**: From a problem, the GitHub page to repair it is at most 2 clicks away.
- **SC-005**: The page with all parts stays less than 150 KB and loads no file from other sites;
  the data file is less than 50 KB for 20 projects.
- **SC-006**: The feature costs €0 each month to operate.

## Assumptions

- The page stays on GitHub Pages; the data file and the app files are published next to it by
  the same run. No server.
- Local storage is per browser and per device; the Maintainer's phone and computer have their
  own "last visit". That is acceptable; no account is added.
- Icon badges work in some systems only (for example installed apps in Chrome and Edge on
  desktop); elsewhere there is no badge.
- The icon badge shows the count of the last time the app was open; nothing updates it in the
  background, because that needs push messages from a server (side note 2026-11-09). It is a
  reminder, not an alarm: the alarm is the GitHub issue of each problem (spec 001), or a pushed
  digest later.
- The Renovate dependency dashboard is the "Dependency Dashboard" issue of each repo; a repo
  without it gets the link to its open Renovate PRs (spec 007) in its place.
- The text of the page stays English, in ASD-STE100.

## Principles Affected

| Principle | How this feature affects it |
|---|---|
| I. GitHub for all project work | Shortcuts go to GitHub pages; actions happen there. |
| III. No secrets or private data | The data file has the page content only; the last visit stays in the browser. |
| VII. Read-only views for stakeholders | The data file is read-only and public, like the page. |
| VIII. Keep the work small | No server, no account; a data file and small browser code. |
| X. ASD-STE100 | Labels and messages use STE. |
