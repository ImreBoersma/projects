# Feature Specification: Renewals and Certificate Expiry

**Feature Branch**: `009-renewal-expiry` (not created; no git hook is installed)

**Created**: 2026-11-05

**Status**: Draft

**Input**: "Renewals and certificate expiry: read the `renewal` field of the catalog, the expiry date
of the TLS certificate and of the domain registration of each `domain`. Show the days that remain
on the status page. Open an issue before each date. Reason: an expired domain or hosting contract
stops a client site for days, and the uptime check finds it only after the stop."

## Clarifications

### Session 2026-11-05

- Q: When one project has several renewals due at once, does each renewal get its own issue, or
  does the project get one issue that lists them all? → A: One issue for each renewal (key
  `<project id>/renewal-due/<renewal name>`), so that each issue closes when its renewal is done.
- Q: Do renewal names and dates show on the public status page, or only in issues and the board?
  → A: On the public page: the name and the days that remain (for example "Domain: 120 days"),
  never cost or contract numbers.

### Session 2026-11-11 (review)

- Q: Which domains are not checked at the registry? → A: Each host name that the registry does
  not know (HTTP 400 or 404): a subdomain of a platform and also any other subdomain, for example
  `www.` of an owned domain. Only the certificate of these hosts is checked.
- Q: Which issues does a value that cannot be read keep open? → A: The run keeps a list of keys
  (`keepKeys`): `<id>/cert-expiring` when the certificate is "not known", and
  `<id>/renewal-due/domain` when the registry date is "not known" and the catalog has no "Domain"
  renewal (research.md §7). A known gap for the second case is a Convergence task.
- Q: What does the log line show? → A: `Certificate <domain>: <n> days; registry: <value>`, or
  `not known` for the certificate.
- Q: Which form of the renewal name is in the problem key? → A: The slug of the name (research.md
  §6). The rule that two names must not give the same slug is a Convergence task.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Know before a certificate expires (Priority: P1)

The status page shows for each site the number of days until its TLS certificate expires. When a
certificate has 14 days or less, the project has a problem and an issue opens.

**Why this priority**: the hosts renew the certificates automatically (Let's Encrypt), usually 30
days before the end. A certificate with 14 days or less shows that the automatic renewal failed.
When it expires, visitors get a browser warning, and the uptime check reports "Down" (spec 005)
only after that.

**Independent Test**: make the check use a test value of 10 days for one site. Make sure that the
page shows the problem and that one issue opens.

**Acceptance Scenarios**:

1. **Given** a site with a certificate that expires in 60 days, **When** the update runs, **Then** the
   page shows "60 days" for the certificate and no problem.
2. **Given** a site with a certificate that expires in 10 days, **When** the update runs, **Then** the
   project has the problem "The TLS certificate expires in 10 days." and an issue opens.
3. **Given** a site whose certificate cannot be read, **When** the update runs, **Then** the page shows
   "Not known" and there is no certificate problem. The uptime check of spec 005 reports the site.

---

### User Story 2 - Know before a domain or contract must be renewed (Priority: P1)

The Maintainer records the renewal dates of a project in the catalog: for example the domain
registration and the hosting contract. The status page shows the days until the next date. 30
days before a date, the project has a problem and an issue opens.

**Why this priority**: a domain registration or a hosting contract does not renew without
payment or action. When it ends, the site stops for days, and the uptime check finds it only
after the stop. The registry of `.nl` domains does not publish the expiry date, so the catalog is
the only source for 3 of the 4 domains now.

**Independent Test**: add a renewal with a date in 20 days to a test catalog entry. Run the
update. Make sure that the page shows the problem with the name of the renewal.

**Acceptance Scenarios**:

1. **Given** a catalog renewal with a date in 90 days, **When** the update runs, **Then** the page
   shows the name and "90 days" and no problem.
2. **Given** a catalog renewal with a date in 20 days, **When** the update runs, **Then** the project
   has the problem "Renewal of <name> is due in 20 days." and an issue opens.
3. **Given** a catalog renewal with a date in the past, **When** the update runs, **Then** the problem
   says "Renewal of <name> was due <n> days ago."
4. **Given** the Maintainer changes the date to the next period after the renewal, **When** the
   update runs, **Then** the problem stops and the issue closes.

---

### User Story 3 - Get the domain expiry date without manual work, where the registry gives it (Priority: P3)

For a domain whose registry publishes the expiry date, the update reads the date. The Maintainer
does not need to add it to the catalog.

**Why this priority**: it removes manual work only for some domains (not for `.nl`). A catalog
date is always possible.

**Independent Test**: for a domain of a registry that publishes the date (for example a `.com` or
`.app` domain), make sure that the page shows the days until expiry without a catalog date.

**Acceptance Scenarios**:

1. **Given** a domain whose registry publishes the expiry date, **When** the update runs, **Then**
   the page shows the days until that date, with the 30-day rule of US2.
2. **Given** a domain whose registry does not publish the date and no catalog date, **When** the
   update runs, **Then** the page shows "Not known" for the domain, and no problem.
3. **Given** a catalog date and a registry date for the same domain, **When** the update runs,
   **Then** the earlier date is used.

---

### Edge Cases

- A site is on a subdomain (of a platform, for example `scales-imreboersma.web.app`, or of an
  owned domain, for example `www.`). The registry does not know the host name, so the domain
  registration is not checked; the certificate is.
- A project has a renewal but no domain (for example a hosting contract of a project without a
  site). The renewal is checked.
- An archived project has renewals. They are not checked.
- A renewal date is not a valid date. The catalog validation stops the update, as the other
  catalog errors of spec 001.
- The certificate check cannot connect. The result is "Not known" and no problem. The uptime
  check of spec 005 reports a site that is down.
- A renewal name contains cost or private notes. The catalog rules forbid it (Principle VII); the
  page shows the name.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The catalog MUST accept, for each project, a list of renewals. Each renewal has a
  name (for example "Domain" or "Hosting") and a date.
- **FR-002**: The update MUST read the expiry date of the TLS certificate of each `domain` of each
  project that is not archived.
- **FR-003**: The update SHOULD read the expiry date of the domain registration of each `domain`
  from its registry, when the registry publishes it, and only for a domain that the Maintainer
  owns.
- **FR-004**: The public status page MUST show, for each project, the days until the certificate
  expires, and the name and the days until the next renewal (catalog or registry), for example
  "Domain: 120 days".
- **FR-005**: A certificate with 14 days or less MUST be a problem `cert-expiring`.
- **FR-006**: A renewal or a domain expiry with 30 days or less, or in the past, MUST be a problem
  `renewal-due`, one problem for each renewal. The problem key contains the slug of the renewal name
  (`<project id>/renewal-due/<slug of the renewal name>`, research.md §6), so that two renewals of
  one project get two issues. Two names with the same slug MUST NOT be in one project.
- **FR-007**: The problems MUST use the problem rules, sort order and issue rules of spec 001: one
  issue for each problem, closed when the problem stops.
- **FR-008**: A value that cannot be read MUST show "Not known" and MUST NOT make a problem.
- **FR-009**: The page and the issues MUST NOT show cost, contract numbers or private notes
  (Principle VII).
- **FR-010**: The check MUST run a minimum of one time each day.

### Key Entities

- **Renewal**: a name and a date, in the catalog, for one project. The name is unique within the
  project, because it is part of the issue key.
- **Certificate expiry**: one date for each `domain`, read from the site.
- **Domain expiry**: one date for each owned `domain`, from the registry, when published.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the sites in the catalog show the days until their certificate expires.
- **SC-002**: A certificate with 14 days or less has an issue within 1 day.
- **SC-003**: A renewal date has an issue 30 days before the date, within 1 day.
- **SC-004**: 0 problems for certificates and renewals with more than the limit (14 or 30 days).
- **SC-005**: The feature costs €0 each month to operate.

## Assumptions

- The status page runs each hour (spec 005, external trigger), so the check also runs each hour.
- Registries of `.nl` domains do not publish the expiry date. Checked on 2026-11-05 for
  `pretband.nl`: the registry gives only the registration and change dates. For `.nl` domains the
  Maintainer adds the date as a catalog renewal.
- The certificates are from Let's Encrypt (checked for `pretband.nl`: valid for 90 days,
  renewed automatically). 14 days leaves time to act after a failed automatic renewal.
- Renewal names are public, because the catalog is in a public repo. They contain no cost.
- Reminders by email or calendar are not in the scope. The issue is the reminder.

## Principles Affected

| Principle | How this feature affects it |
|---|---|
| II. Catalog as the only project list | Renewal dates are in the catalog, as Principle II asks ("renewal dates"). |
| III. No secrets or private data | Renewal names and dates only. |
| VII. Read-only views for stakeholders | Stakeholders see the days until expiry on the public page; no cost or contract numbers (FR-009). |
| VIII. Keep the work small | Issues come before the stop, not after. |
| X. ASD-STE100 | Page text and issue text use STE. |
