# Feature Specification: Website Quality Checks

**Feature Branch**: `023-site-quality`

**Created**: 2026-11-18

**Status**: Draft

**Input**: docs/landscape.md gap 1: "Website quality checks for each catalog site. The status run
checks the quality of each production `domain` in projects.yaml: performance and Core Web Vitals
(PageSpeed Insights API and Chrome UX Report field data where available), accessibility (axe or
Lighthouse accessibility), broken links, and security headers (HSTS, CSP, X-Content-Type-Options,
Referrer-Policy). Results show on the status page (a new 'Quality' tab or column, with links to the
full reports) and in status.json. A site that falls below a threshold is a warning, not a problem,
so it does not open an issue on each run; decide in the spec which results open one issue. The
shared CI (spec 002) gets an optional Modern Web Guidance `legacy-scan` step that reports legacy
web code as a job summary and does not fail the build. Constraints: €0 each month, no service that
runs all the time (Principle VIII), runs in GitHub Actions, page size budget < 30 KB gzip stays, no
developer facts on the stakeholder pages of spec 022 (at most one plain Dutch B1 line, for example
about speed), no names of people. Checks must not run so often that they hit the free API limits;
daily or weekly is enough, not each hour."

## Current state (2026-11-18)

Four active catalog projects have a `domain`. The status run checks each one each hour, but only
for up or down (spec 005): one request to the home page, and only the status code counts.

| Project | Site | Kind of site | Stakeholder |
|---|---|---|---|
| hob-nl | harmonieorkestbrummen.nl | WordPress on shared hosting | Harmonieorkest Brummen |
| pretband | pretband.nl | Static site | Harmonieorkest Brummen |
| personal-website | imreboersma.nl | Next.js on Vercel | none |
| scales-exercises | scales-imreboersma.web.app | Single-page app on Firebase | none |

Findings: nothing tells the Maintainer that a site is slow on a phone, has an accessibility error,
has a broken link, or has no security headers. A WordPress error page with status 200 is "up". A
manual Modern Web Guidance scan of this repo (PR #54) found 7 legacy patterns; nothing scans the
project repos.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The Maintainer sees the quality of each site in one table (Priority: P1)

The Maintainer opens the tab "Quality" of the status page. One row for each site shows four
results: speed on a phone, accessibility, broken links and security headers. Each result has a
level (good, warning, poor) with a colour and a text, the date of the check, and a link to the full
report.

**Why this priority**: the orchestra sites are the main product, and today nothing checks their
quality. This story gives the information; the other stories act on it.

**Independent Test**: build the page with fixture results for the 4 sites. Open the tab "Quality".
Make sure that each site has the 4 results with a level, a date and a report link, and that the
page works without scripts.

**Acceptance Scenarios**:

1. **Given** a speed score of 94 for harmonieorkestbrummen.nl, **When** the Maintainer opens the
   tab, **Then** the speed cell shows "Good 94" in green, the date of the check, and a link to the
   full report.
2. **Given** an accessibility score of 72, **When** the tab opens, **Then** the cell shows
   "Warning 72" in amber, with the number of failed accessibility rules.
3. **Given** 2 broken links on pages of the site, **When** the tab opens, **Then** the cell shows
   "Poor: 2 broken" in red, and the detail lists up to 10 broken addresses with the page that has
   each one; the issue (US2) has the full list.
4. **Given** a site that sends HSTS and X-Content-Type-Options but no CSP and no Referrer-Policy,
   **When** the tab opens, **Then** the cell shows "Warning: 2 of 4" and the detail names the 2
   missing headers.
5. **Given** a project row on the main tab, **When** a quality result is poor or a warning, **Then**
   the pop-up of the project (spec 019) shows the quality results, and the row shows the quality
   state as a warning, not as a problem.

---

### User Story 2 - One issue when a site stays poor (Priority: P2)

When a quality result of a site is poor in 2 daily checks in a row, the status run opens one issue
for that site. The issue lists each poor result with its report link. The run updates the issue
when the list changes, and closes it when no result of the site is poor.

**Why this priority**: the Maintainer looks at issues, not at the tab each day. Two checks in a row
stop an issue for one slow test run.

**Independent Test**: run the issue logic with fixture results of 3 days: poor, poor, good. Make
sure that one issue opens after day 2 and closes after day 3.

**Acceptance Scenarios**:

1. **Given** a broken link in the check of yesterday and of today, **When** the run is done,
   **Then** one issue is open for the site, with the broken link in its text.
2. **Given** an open quality issue, **When** a second result of the same site becomes poor,
   **Then** the run updates the same issue; it does not open a second issue.
3. **Given** an open quality issue, **When** no result of the site is poor, **Then** the run closes
   the issue with a comment.
4. **Given** a warning (not poor) for 30 days, **When** the run is done, **Then** no issue is open.

---

### User Story 3 - The board sees one plain line about speed (Priority: P3)

The stakeholder page of spec 022 gets one sentence in Dutch B1 for each site, about the speed on a
phone only: "De website laadt snel op een telefoon." or "De website laadt langzaam op een
telefoon. De beheerder weet dit."

**Why this priority**: the board cares about how the site feels to visitors, but cannot act on a
score. One sentence is enough.

**Independent Test**: build the stakeholder page with a good and a poor speed result. Make sure
that each site block has the right sentence, and no score, rule, header or link name.

**Acceptance Scenarios**:

1. **Given** a good speed result, **When** the board member opens the page, **Then** the site block
   says "De website laadt snel op een telefoon."
2. **Given** a poor speed result, **When** the page opens, **Then** the site block says that the
   site loads slowly and that the Maintainer knows, and the top line does not change.
3. **Given** a warning or no speed result, **When** the page opens, **Then** the site block has no
   speed sentence.

---

### User Story 4 - CI reports legacy web code (Priority: P3)

A project repo turns on one input of the shared CI workflow. Each CI run then scans the repo for
legacy web code and writes the findings as a list in the job summary. The build does not fail on a
finding.

**Why this priority**: it finds work for a campaign (spec 015), but it does not repair anything.

**Independent Test**: call the shared CI with the input on, in a test repo with one
`[...arr].sort()`. Make sure that the job summary lists the finding and that the job passes.

**Acceptance Scenarios**:

1. **Given** the input is on and the repo has 3 findings, **When** CI runs, **Then** the job summary
   shows the 3 findings with file, line and guide, and the job passes.
2. **Given** the input is off (the default), **When** CI runs, **Then** no scan runs.
3. **Given** the scanner cannot be downloaded, **When** CI runs, **Then** the summary says "Legacy
   scan not available" and the job passes.

---

### Edge Cases

- A site is down at the time of the quality check: all its results are "Not checked" with the
  time; they do not count as poor, and the results of the last good check stay visible with their
  date.
- A check service is not available or gives an error: that one result is "Not checked"; the other
  results of the site stay. "Not checked" does not count as poor for the 2-checks rule.
- No field data: most small sites have too few visitors for field data of real users. The speed
  result then uses the lab test only, and says "Lab test only".
- A single-page app (scales-imreboersma.web.app) has few links in its HTML: the link check checks
  only the links in the HTML that the site sends; it does not run scripts.
- A site with many pages: the link check reads at most 50 pages of the same site for each check,
  starting at the home page.
- A link to another site that blocks automated requests (status 403, 429 or 999): a warning, not a
  broken link.
- A link that redirects: not broken, when the last address answers with status 200 to 399.
- `robots.txt` disallows a path: the link check does not read pages under that path.
- A new site in the catalog: the next daily check includes it; the tab shows "Not checked yet"
  until then.
- An archived project or a project without a `domain`: no quality check and no row.
- The Maintainer starts the status run by hand: no quality check runs. The Maintainer can start
  the daily quality run by hand; it replaces the result of that day.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A daily run MUST check the quality of each `domain` of an active catalog project
  once each day. The hourly status run MUST NOT check quality; it MUST show the last result with
  its date. (Plan research.md §6: a separate daily workflow, not a guard in the hourly run.)
- **FR-002**: The quality check MUST give four results for each site:
  - **Speed**: the lab performance score (0 to 100) of a phone test, and the field values of real
    users (LCP, INP, CLS) when they are available.
  - **Accessibility**: the lab accessibility score (0 to 100) and the number of failed rules.
  - **Broken links**: the addresses on pages of the site that answer with an error, with the page
    that has each one (FR-005).
  - **Security headers**: which of HSTS, Content-Security-Policy, X-Content-Type-Options and
    Referrer-Policy the home page sends.
- **FR-003**: Each result MUST have one level, with a text and a colour (not only a colour):
  - Speed and accessibility: good at 90 or more, warning from 50 to 89, poor below 50. When field
    data is available and a field value is "poor" by the published Core Web Vitals limits, the
    speed level is poor.
  - Broken links: good with 0 broken links; warning when only links to other sites fail with 403, 429
    or 999 (LinkedIn); poor with 1 or more broken links.
  - Security headers: good with 4 of 4; warning with 1 to 3; poor with 0.
  - "Not checked" when the check did not give a result.
  - In the data, the level "warning" has the name `warn`.
- **FR-004**: The tab "Quality" MUST show one row for each checked site, with the 4 results, the
  date of the check, and a link to the full report of each result where a public report exists.
  The tab MUST work without scripts (spec 019). When a result is "not checked" in the newest
  check, the tab MUST show the newest earlier result of that kind with its own date (edge case
  "site is down").
- **FR-005**: The link check MUST read only pages of the same domain, starting at the home page,
  at most 50 pages for each check, with at most 1 request each second to the site, and MUST obey
  `robots.txt`. It MUST check each link on those pages, also links to other sites, but MUST NOT
  read pages of other sites.
- **FR-006**: A quality result MUST NOT be a problem of the status page (spec 001). A warning or a
  poor result MUST show as a warning on the project row and in the pop-up of spec 019, and MUST NOT
  change the total state, the favicon or the "Needs attention" line of spec 022.
- **FR-007**: When one or more results of a site are poor in the last 2 daily checks, the run MUST
  open one issue for the site, with the label of the status issues. The issue MUST list each poor
  result with its value and report link. The run MUST update that issue when the list changes, and
  close it with a comment when no result of the site is poor. "Not checked" MUST NOT count as poor.
- **FR-008**: The run MUST keep each daily result in the history of spec 010, so that the
  2-checks rule (FR-007) and spec 021 can use it.
- **FR-009**: `status.json` (spec 020) MUST contain the last quality results of each site: the 4
  levels, the values, the date and the report links.
- **FR-010**: The stakeholder page of spec 022 MUST show one Dutch B1 sentence about speed for a
  site with a good or a poor speed result, and nothing for a warning or no result. It MUST NOT
  show scores, rules, header names, links or other quality facts. A poor speed result MUST NOT
  change the top line.
- **FR-011**: The shared CI workflow (spec 002) MUST get one boolean input for a legacy web code
  scan, off by default. When it is on, CI MUST run the Modern Web Guidance `legacy-scan` on the
  repo and write each finding (file, line, guide) to the job summary. A finding or an error of the
  scanner MUST NOT fail the job.
- **FR-012**: The checks MUST use only free services within their free limits, and MUST NOT need a
  service that runs all the time. A key that a check needs MUST be in the catalog `secrets` list
  with its expiry (spec 013).
- **FR-013**: The status page MUST stay below 30 KB gzip for the 20-site worst case (spec 011).
  Long details (the list of broken links) MAY go in a separate file next to the page.
- **FR-014**: Results and issues MUST obey spec 001 FR-018: no names of people, no text from
  private repos. Site addresses, page addresses and numbers are permitted.

### Key Entities

- **Quality check**: one site, one date and time, and 4 results.
- **Quality result**: kind (speed, accessibility, links, headers), level (good, warning, poor, not
  checked), values (score, field values, failed rules, broken links, missing headers), report link.
- **Broken link**: the address, the page that has it, the status or the error kind.
- **Quality issue**: one for each site; the list of poor results; open or closed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For each of the 4 sites, the Maintainer can see the 4 quality results and the date of
  the check in less than 30 seconds from the status page.
- **SC-002**: A broken link that stays on a site for 2 days has an open issue on day 2.
- **SC-003**: A result that is poor in only 1 check opens no issue.
- **SC-004**: The quality checks run at most once each day for each site, also when the status
  run runs each hour, and stay within the free limits of each service.
- **SC-005**: The stakeholder page of Harmonieorkest Brummen has at most 1 new sentence for each
  site and no new technical word.
- **SC-006**: The status page stays below 30 KB gzip for 20 sites.
- **SC-007**: A CI run with the legacy scan on never fails because of the scan.
- **SC-008**: The feature costs €0 each month.

## Assumptions

- The speed and accessibility results come from a lab test of the home page on a simulated phone.
  The free test service needs an API key without cost (research.md §1: without a key the daily
  limit is 0); that key is a new secret in the catalog.
- Field data of real users is available only for sites with enough visitors. For the 4 sites of
  today, the Maintainer expects lab data only. The test service plans to stop giving field data
  (research.md §1); then each site shows "Lab test only".
- The quality check tests only the home page for speed, accessibility and headers. The link check
  is the only check that reads more pages.
- Security headers are a warning at most when 1 to 3 are missing, because the WordPress hosting of
  hob.nl can limit which headers the Maintainer can set.
- The thresholds of FR-003 are the published bands of the lab test and of Core Web Vitals. The
  plan can change them only with a reason in research.md.
- The legacy scan of FR-011 checks about 20 % of the Modern Web Guidance catalogue. A repo turns it
  on with a campaign (spec 015) or by hand.
- The quality check is separate from the uptime check of spec 005: a site can be "up" and have a
  poor quality result. A content check for error pages that return status 200 is not in this spec
  (landscape.md gap 3).

## Principles Affected

| Principle | How this feature affects it |
|---|---|
| I. GitHub for all project work | Results on the status page and in issues; checks in GitHub Actions. |
| II. Catalog is the only project list | The sites come from the catalog `domain`. |
| III. No secrets or private data | A key, if necessary, is a secret, listed in the catalog without its value. |
| IV. Shared configuration | The legacy scan is one input of the shared CI workflow. |
| VII. Give Stakeholders Read-Only Views | One plain sentence about speed; no developer facts. |
| VIII. Keep the work small | A daily check in the existing status run; free services; no new service. |
| X. ASD-STE100 | Spec, issues and page text in STE; the stakeholder sentence in Dutch B1. |
