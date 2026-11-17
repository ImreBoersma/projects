# Feature Specification: Stakeholder View and Status Badges

**Feature Branch**: `022-stakeholder-view`

**Created**: 2026-11-17

**Status**: Draft

**Input**: PLAN.md 022: "Stakeholder view: with `?stakeholder=<organisation>` the page can show a
plain-language view without the technical facts (CI, Renovate, commits): 'The website was online
for 30 days. The domain renewal is in 5 months. Nothing needs your attention.' A print layout for a
monthly page in a board meeting. Status badges: the status run writes one small SVG for each
project ('hob.nl ● online'), for the README of each repo and the footer of a site. No external
badge service. Both follow the content rules of spec 001 (organisation names allowed, names of
people not). Reason: constitution Principle VII (read-only views for stakeholders)."

## Clarifications

### Session 2026-11-17

- Q: Is the view a separate page or a mode of `?stakeholder=`? → A: A separate static page for each
  stakeholder, for example `/projects/s/harmonieorkest-brummen.html` (Maintainer). The filter link
  of spec 019 stays as it is, for the Maintainer.
- Q: Which language does the view use? → A: Dutch, at language level B1 (taalniveau B1, as the
  Dutch government uses for text to the public), because the board reads Dutch (Maintainer).
  ASD-STE100 exists only for English, so B1 is the rule for the Dutch text: short sentences,
  common words, active voice, one message in each sentence. The badges stay in English. This is a
  deviation from Principle X for the text of the view only; the plan records it.
- Q: Which problems make "Has a problem" for a project without a site, and "problem" on a badge?
  → A: Only faults: CI failed and deploy failed (Maintainer, review 2026-11-17). Old Renovate PRs,
  no recent work, conformance and secret expiry are work of the Maintainer; they would tell the
  board that something is wrong when nothing is broken.
- Q: Who renews the domains, the board or the Maintainer? → A: The Maintainer renews them, and for some
  domains pays and then sends a payment request to the board (Maintainer, 2026-11-17). So a renewal is
  information for the board, not an action: it shows in the project block and never makes "Needs
  attention". The view does not mention payment or cost (Principle VII).
- Q: Is one failed hourly site check enough to put an offline site in the top line? → A: No
  (Maintainer, 2026-11-17). The project block shows "offline" at once; the top line changes only
  when the site is offline in each check for 2 hours or more (offline since 2 hours or longer).
  The rule uses the time, not a count of runs, because the status page runs more often than once
  an hour after a push.
- Q: How does the Maintainer find the address of a stakeholder view? → A: The header links of the
  status page get one link for each stakeholder view (Maintainer, review 2026-11-17).

## Current state (2026-11-17)

One stakeholder is in the catalog: Harmonieorkest Brummen, with 3 projects.

| Project | Site | Renewal | What the board sees today |
|---|---|---|---|
| hob.nl | harmonieorkestbrummen.nl, up since 5 Nov (100 %) | Domain 2027-05-01 | The full status page with the filter `?stakeholder=Harmonieorkest+Brummen` (spec 019): CI, deploys, Renovate PRs, commits, conformance |
| Pretband | pretband.nl, up since 5 Nov (100 %) | Domain 2027-02-01 | Same |
| Pretband backend | no site (Vercel API) | none | Same |

Findings: the filter of spec 019 gives the board the right projects, but with the facts of a
developer. A board member cannot tell from "Renovate PRs 2, conformance R4" if something needs the
board. The renewal of pretband.nl is in 76 days; nothing on the page tells the board this in its
words (the Maintainer renews it; spec clarification 2026-11-17). Spec 021 (history charts) is moved after this spec: the history has 13 days without a
fault, so charts show nothing yet.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A board member sees in one minute if something needs the board (Priority: P1)

A board member of Harmonieorkest Brummen opens one link. The page shows each project of the
orchestra in plain sentences: is the site online, how long it was online in the last 30 days, when
the next renewal is, and one line that says if something needs the attention of the board. The page
shows no CI, Renovate, commit, PR, conformance or version facts.

**Why this priority**: this is the reason for the spec (Principle VII). Today the board gets a
developer page. With this view, the Maintainer can send one link instead of an explanation.

**Independent Test**: build the page with fixture data for the 3 HOB projects. Open the stakeholder
view. Make sure that it shows the sentences of FR-003 and none of the facts of FR-004.

**Acceptance Scenarios**:

1. **Given** hob.nl is up and was up 100 % in the last 30 days, **When** the board member opens the
   view, **Then** it shows "De website harmonieorkestbrummen.nl is online." and "De afgelopen 30
   dagen was de website 100 % van de tijd online."
2. **Given** a domain renewal of pretband.nl on 2027-02-01 and today 2026-11-17, **When** the view
   opens, **Then** it shows "De beheerder verlengt de domeinnaam vóór 1 februari 2027 (over 2 maanden)."
   and no attention item.
3. **Given** no project needs attention (FR-005), **When** the view opens, **Then** the top line
   says "Er is niets waar het bestuur iets mee moet."
4. **Given** harmonieorkestbrummen.nl is down since 2 hours or longer, **When** the view opens,
   **Then** the top line says that the website is offline and that the Maintainer knows (an issue
   is open), and the project shows "Offline since <time>".
4a. **Given** harmonieorkestbrummen.nl is down since less than 2 hours, **When** the view opens,
   **Then** the project shows "Offline since <time>" and the top line still says that nothing
   needs the board.
5. **Given** the view, **When** the board member reads it, **Then** it shows no CI, deploy,
   Renovate, commit, PR, conformance, token or version fact, and no name of a person.

---

### User Story 2 - Print one page for the board meeting (Priority: P2)

Before the monthly board meeting, the Maintainer or a board member prints the stakeholder view. The
print is one A4 page with the date of the data, the top line, and one block for each project,
without menus, buttons or links that do not work on paper.

**Why this priority**: the board meets with paper on the table. It is less important than the view
itself, because the view on a screen already gives the answer.

**Independent Test**: open the view for 3 projects and use print preview in a browser. Make sure
that it is one A4 page and shows the date of the data.

**Acceptance Scenarios**:

1. **Given** the view of 3 projects, **When** it is printed on A4, **Then** it fits on one page.
2. **Given** the print, **When** a reader looks at it, **Then** it shows "Status on <date> <time>"
   and the address of the view as text.
3. **Given** the print, **When** a reader looks at it, **Then** it has no buttons, filters, tabs or
   pop-ups.

---

### User Story 3 - A status badge in a README and in a site footer (Priority: P3)

The status run writes one small image for each project, for example "hob.nl ● online" in green.
The Maintainer puts it in the README of the repo. A site can show it in its footer. The image is on
the status page host, so no external badge service is necessary.

**Why this priority**: it shows the state where people already look (the repo, the site), but the
view of US1 gives the same facts with more context.

**Independent Test**: build the page with fixture data for one project that is up and one that is
down. Make sure that two images are written next to the page, with the right text and colour.

**Acceptance Scenarios**:

1. **Given** hob.nl is up, **When** the run is done, **Then** its badge shows "hob.nl" and
   "online" in green.
2. **Given** a site is down, **When** the run is done, **Then** its badge shows "offline" in red.
3. **Given** a project without a site, **When** the run is done, **Then** its badge shows the state
   of the project (FR-008) and not "online".
4. **Given** a badge in a README on GitHub, **When** the state changes, **Then** the badge shows
   the new state within the cache time of GitHub images (FR-009).

---

### Edge Cases

- A stakeholder with one project, or many: the view lists each project of the stakeholder; the
  print can use more pages when it has more than 4 projects (SC-002 is for up to 4).
- An address of a stakeholder that is not in the catalog (an old or wrong link): the not-found page
  of the site, with a link to the full status page; no error in the run.
- A project with no site and no renewal (Pretband backend): its block shows only "Works" or "Has a
  problem, the Maintainer knows", from the project state, without technical facts.
- Check not available (the status run could not check the site): the view says "Not checked at
  <time>"; this is not "offline" and does not need the attention of the board.
- Old data (the page is more than 3 hours old, spec 005): the view shows the same warning as the
  status page, in plain words: "This information is from <time>. It can be old."
- Less than 30 days of history: the uptime sentence says "since <date>" instead of "in the last 30
  days" (history starts 2026-11-05).
- An archived project of the stakeholder: not in the view and no badge.
- A project without a stakeholder: it gets a badge, but it is in no stakeholder view.
- Content rules: the view and the badges show only organisation names, project names, site
  addresses, dates, percentages and states (spec 001 FR-018); no names of people.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The status run MUST make one stakeholder view for each `stakeholder` value in the
  catalog, with the projects of that stakeholder that are not archived. The view MUST be in the
  HTML of the page, so it shows without scripts (as spec 019).
- **FR-002**: The view MUST be a separate static page for each stakeholder, at a fixed address
  from the stakeholder name (for example `/projects/s/harmonieorkest-brummen.html`), that a person
  can open without an account and send in an e-mail. The filter `?stakeholder=` of spec 019 MUST
  NOT change.
- **FR-003**: For each project, the view MUST show only these facts, in full sentences: the site
  state (online, offline since a time, not checked) and its address; the uptime percentage of the
  last 30 days (or since the start of the history); the next renewal that is today or later, with
  its name, date and the time to it in months or days, as a fact that the Maintainer handles; and, for a project without a site, "Works" or "Has a problem, the
  Maintainer knows". Only a fault (CI failed, deploy failed) makes "Has a problem"; other problems
  of the status page do not show in the view.
- **FR-004**: The view MUST NOT show CI, deploy, Renovate, commit, PR, conformance, token, secret,
  version, delivery or archive facts, problem keys, or links to GitHub.
- **FR-005**: The view MUST start with one top line. "Needs attention" MUST be true only for a site
  that is offline now and offline since 2 hours or longer (each check in that time). A site that is
  offline for a shorter time shows "offline" in its project block only. When the start of the
  offline time is not known (no history), the time of the check is the start. A renewal MUST NOT make "Needs attention" (the Maintainer renews). Otherwise
  the line MUST say that nothing needs the board ("Er is niets waar het bestuur iets mee moet."). A problem that only the Maintainer can repair
  (for example CI) MUST NOT make "Needs attention"; the project shows "Has a problem, the Maintainer
  knows".
- **FR-006**: The view MUST show the time of the data, the old-data warning of spec 005 in plain
  words, and a link to the full status page.
- **FR-007**: The view MUST have a print layout: A4, no menus, buttons, filters or tabs, the address
  of the view as text, and up to 4 projects on one page.
- **FR-008**: The status run MUST write one SVG badge for each project that is not archived, next to
  the page, at a fixed address for each project id. The badge text MUST be the project name and one
  state: "online" (green) or "offline" (red) for a project with a site; else "works" (green),
  "problem" (red) or "not checked" (grey) from the project state, with the fault rule of FR-003.
- **FR-009**: The badge MUST be readable without colour (the text says the state), and MUST tell
  caches to keep it for a maximum of 1 hour where the host permits this.
- **FR-010**: The text of the view MUST be in Dutch at language level B1. Dates MUST use Dutch
  month names ("1 februari 2027"). The badges MUST use English. The English sentences in this spec
  (FR-003, FR-005, edge cases) give the meaning; the plan gives the exact Dutch text.
- **FR-011**: The view and the badges MUST obey spec 001 FR-018 and the clarification of spec 019:
  organisation names are permitted, names of people are not.
- **FR-012**: The view and the badges MUST NOT make an issue or change a state, a dot or a badge of
  the status page.
- **FR-013**: The header links of the status page MUST have one link for each stakeholder view
  ("View for <stakeholder>"), in the HTML (it shows without scripts).

### Key Entities

- **Stakeholder view**: one stakeholder name (from the catalog); its projects; the top line
  (nothing / needs attention, with the reason); the time of the data.
- **Project block**: project name; site address and state; uptime percentage and its period; the
  next renewal (name, date, time to it); or the plain project state when there is no site.
- **Badge**: project id (the address), project name, one state, one colour.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A board member who does not know GitHub can tell in less than 1 minute if something
  needs the board, from the view alone.
- **SC-002**: The view of a stakeholder with up to 4 projects prints on one A4 page.
- **SC-003**: With the data of 2026-11-17, the HOB view says that nothing needs the board, shows
  hob.nl and pretband.nl online at 100 % since 5 November, and the domain renewals of 1 February
  2027 and 1 May 2027.
- **SC-004**: On 2027-01-25 (7 days before the pretband.nl renewal), the HOB view still says that
  nothing needs the board, and shows "De beheerder verlengt de domeinnaam vóór 1 februari 2027
  (over 7 dagen)."
- **SC-005**: The page for the 20-site worst case stays below 30 KB gzip (spec 011); the views and
  badges are separate files or count within that budget.
- **SC-006**: The feature costs €0 each month and needs no new token or external service.

## Assumptions

- The view is a presentation of the public status page, not a protection: everything in it is
  already public. Hiding the technical facts is for clarity, not for security.
- The Maintainer renews the domains; the board gets a payment request after a renewal for some
  domains. The view does not mention cost. The certificate is
  renewed automatically by the host and is not a fact for the board (an expiring certificate is a
  site problem that the Maintainer repairs).
- "Online" uses the site check of spec 005; the uptime uses the history of spec 010.
- Badges are static files on GitHub Pages, written in each hourly run. GitHub shows README images
  through its image cache, so a state change can show later than on the page.
- Spec 021 (history charts) moves after this spec in PLAN.md; it does not block it.

## Principles Affected

| Principle | How this feature affects it |
|---|---|
| II. Catalog is the only project list | Stakeholders, projects, sites and renewals come from the catalog. |
| III. No secrets or private data | Only names, addresses, dates, percentages and states. |
| VII. Read-only views for stakeholders | The main reason: a view for the board without an account and without developer facts. |
| VIII. Keep the work small | Static files from the hourly run; no service, no token, no badge service. |
| X. ASD-STE100 | Spec text uses STE. Deviation: the text of the view is Dutch at level B1 (FR-010), because ASD-STE100 has no Dutch version and the board reads Dutch. |
