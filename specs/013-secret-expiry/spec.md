# Feature Specification: Expiry of Tokens and Secrets

**Feature Branch**: `013-secret-expiry` (not created; no git hook is installed)

**Created**: 2026-11-06

**Status**: Draft

**Input**: PLAN.md 013: "Each token, secret or password with an expiry date goes in the catalog
with its name, the place where it is set (repo, kind), and the date. No values. The renewal rules
of spec 009 apply: an issue 30 days before the date, a badge on the status page."

## Clarifications

### Session 2026-11-06

- Change after the first implementation (review note): host accounts (for example a WordPress
  login at GoDaddy) are not listed. The repo is public, and unlike the secret names, a list of
  logins is not public now. The password manager keeps that list. The catalog check refuses the
  kind `account`.

- Q: Does the catalog list only the secrets with an expiry, or each secret that the projects use?
  → A: Each secret, with a date or "no expiry". Only a secret with a date can make a problem or
  show on the page. The full list tells the Maintainer what to change after a leak.
- Q: Does the update compare the secrets in the workflow files with the catalog list? → A: Yes,
  each run. A secret that a workflow uses but that is not in the catalog shows as a setup note on
  that project, without an issue.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Get an issue before a token expires (Priority: P1)

The Maintainer records a token with its expiry date in the catalog, for example
`STATUS_READ_TOKEN_HOB`, set as an Actions secret in `ImreBoersma/projects`, expires 2027-11-06.
30 days before that date, the update opens an issue: "The secret STATUS_READ_TOKEN_HOB expires in
30 days." The issue says where the secret is set. When the Maintainer makes a new token and
changes the date in the catalog, the issue closes.

**Why this priority**: an expired token stops a check without a clear error. `pretband-backend`
showed "Data not available" for weeks because its token was missing. With a date, the problem
comes before the failure.

**Independent Test**: add a catalog entry with a date 20 days in the future. Run the update. Make
sure that one issue opens with the name and the place of the token, and that the page shows it.
Change the date to 200 days in the future and run again: the issue closes.

**Acceptance Scenarios**:

1. **Given** a token that expires in 30 days or less, **When** the update runs, **Then** a problem
   `secret-expiring` with an issue exists for that token.
2. **Given** a token that expired, **When** the update runs, **Then** the problem says that it
   expired, and how many days ago.
3. **Given** the Maintainer changed the date to more than 30 days in the future, **When** the
   update runs, **Then** the problem stops and the issue closes.
4. **Given** two tokens that expire in the same week, **When** the update runs, **Then** each token
   has its own issue.

---

### User Story 2 - Read the expiry of the status tokens automatically (Priority: P1)

The tokens that the status update uses itself (for example `STATUS_READ_TOKEN`,
`STATUS_READ_TOKEN_HOB`, `CONFORMANCE_READ_TOKEN`) tell their expiry date when they are used.
The update reads that date, so the Maintainer does not need to type it in the catalog.

**Why this priority**: these tokens are the most important: when one expires, the status page
itself stops working. A date read from the token cannot be wrong or forgotten.

**Independent Test**: run the update with a token that has an expiry date and no catalog entry.
Make sure that the page shows the date of that token.

**Acceptance Scenarios**:

1. **Given** a status token with an expiry date and no catalog entry, **When** the update runs,
   **Then** the page shows that token with its date.
2. **Given** a status token without an expiry date, **When** the update runs, **Then** the page
   does not show it and there is no problem.
3. **Given** a status token with a read date and a different catalog date, **When** the update
   runs, **Then** the earlier date is used.

---

### User Story 3 - See all expiry dates in one place (Priority: P2)

The status page shows the tokens and secrets with their next expiry, next to the certificate and
renewal dates of spec 009. A token of one project shows in the Expiry line of that project. A
token of the shared setup (this repo) shows in a separate group "Shared tokens".

**Why this priority**: the Maintainer can plan the renewal of several tokens on one day.

**Independent Test**: render the page with one project token and one shared token. Make sure that
each shows in its place, with the colour rules of spec 012.

**Acceptance Scenarios**:

1. **Given** a token of project `hob-nl`, **When** the page opens, **Then** the Expiry line of
   hob.nl shows "Secret <name> in <n> days".
2. **Given** a shared token, **When** the page opens, **Then** it shows in the group "Shared
   tokens" below the projects.
3. **Given** a token in 45 days, **When** the page opens, **Then** it shows as a warning (amber);
   in 20 days as a problem (red); in 200 days as plain text.

### Edge Cases

- A token expires while the update runs with it: the read fails as now ("Data not available");
  the catalog date still makes the problem.
- A catalog entry with "no expiry" (for example the board tokens): in the catalog list only; not
  shown, no problem.
- A catalog entry for a project that is not in the catalog: an error in the catalog check, as for
  other catalog errors.
- Two entries with the same name in the same place: an error in the catalog check (the name is part
  of the issue key).
- A token that the update cannot read the expiry of (classic token without expiry, or no header):
  not shown unless it has a catalog date.
- A date more than 10 years in the future: shown as a date, no problem (no special rule).
- A workflow file that cannot be read: no setup note for that repo. For a repo of the
  conformance check (spec 008), its "Setup check not available" note shows; for another repo (for
  example `harmonieorkest-brummen/hob-nl`), the run writes a log line only.
- A shared (reusable) workflow of this repo uses secrets that the calling repo gives to it: these
  names are not compared for this repo.
- A secret of an archived project: in the catalog list only; not shown, not checked, no issue.
- A secret in the catalog that no workflow uses any more: no note.
- An entry with the kind `account`: a catalog error that tells the Maintainer to keep host
  accounts in the password manager.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The catalog MUST accept a list of secrets: each secret that the projects use, also a
  secret that does not expire. Each entry has a name, the place where it is set (repo and kind:
  Actions secret, Actions variable, environment secret; not a host account), an expiry date or "no
  expiry", and, if necessary, the id of the project that it belongs to. An entry without a project is a
  shared entry. An entry with "no expiry" MUST NOT make a problem and MUST NOT show on the page.
- **FR-002**: The catalog, the page, the issues, the log and the history MUST NOT contain secret
  values, parts of values or hashes of values (Principle III). Only the name, the place and the
  date.
- **FR-003**: For each token that the update uses, the update MUST read the expiry date that the
  token gives when it is used, if it gives one. When there is also a catalog date for that token,
  the earlier date MUST be used.
- **FR-004**: A secret that expires in 30 days or less, or that expired, MUST be a problem
  `secret-expiring`, one problem for each secret, with the key
  `<project id or "shared">/secret-expiring/<name>`.
- **FR-005**: The problems MUST use the problem and issue rules of spec 001: one issue for each
  problem, closed when the problem stops. The issue text MUST name the secret and its place, and
  MUST say what to do (make a new one, set it, change the date in the catalog).
- **FR-006**: The page MUST show each secret with a date: in the Expiry line of its project, or in
  a group "Shared tokens" for a shared secret. The colour rules of spec 012 FR-004 MUST apply with
  the limit of 30 days (warning from 31 to 60 days).
- **FR-007**: The catalog check MUST reject an entry with an unknown project id (archived projects
  are known ids), a date that is not a date, a name that is used two times in the same place, a
  field that the list does not have, or a field with the name `value`, `secret`, `password` or
  `token`.
- **FR-008**: The check MUST run with each status update (each hour).
- **FR-009**: Each run MUST compare the secret names that the workflow files of each catalog repo
  and of this repo use with the catalog list. A name that is used but not listed MUST show as a
  setup note on that project ("Secret not in the catalog: <name>"), or in the group "Shared
  tokens" for this repo. It MUST NOT make a problem or an issue. The secret `GITHUB_TOKEN` (made by
  GitHub for each run) is not compared.

### Key Entities

- **Secret entry**: name, place (repo and kind), expiry date or "no expiry", optional project id.
  The name and the place together are unique. All entries together are the list of secrets of
  all projects.
- **Read expiry**: the expiry date that a token gives when the update uses it. Not stored.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Each token with a known expiry date has an issue at least 30 days before the date,
  within 1 hour after the 30-day limit.
- **SC-002**: The status tokens need 0 manual date entries, when they have an expiry date.
- **SC-003**: 0 secret values on the page, in the catalog and in the issues (checked by a test with
  fixture values).
- **SC-004**: The Maintainer sees all expiry dates (certificates, renewals, secrets) on 1 page.
- **SC-005**: The feature costs €0 each month to operate.
- **SC-006**: After the first catalog update, 100% of the secrets in the workflow files of the
  catalog repos and this repo are in the catalog list, and each later gap shows on the page within
  1 hour (FR-009). Host accounts are out of scope: they stay in the password manager.

## Assumptions

- The names of secrets are not secret: they are already in the public workflow files of this repo.
  The page and the issues can show them.
- Fine-grained GitHub tokens give their expiry date when they are used. Classic tokens without an
  expiry give none; the board tokens have no expiry (decision of 2026-11-05) and do not show.
- Tokens of other services (Vercel, Firebase, GoDaddy) do not give a date to this update; the
  Maintainer adds their date to the catalog.
- The limit of 30 days is the same as for renewals (spec 009): a new token needs a few minutes,
  but the Maintainer can be away.
- The problem text and the page text use ASD-STE100.

## Principles Affected

| Principle | How this feature affects it |
|---|---|
| II. Catalog is the only project list | The secret entries go in the catalog, linked to a project id. |
| III. No secrets or private data | Only names, places and dates; a test checks that no values reach the page. |
| VIII. Keep the work small | Uses the renewal rules of spec 009 and the colours of spec 012; no new service. |
| X. ASD-STE100 | Problem and page text use STE. |
