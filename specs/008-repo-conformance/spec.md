# Feature Specification: Repo Conformance Check

**Feature Branch**: `008-repo-conformance` (not created; no git hook is installed)

**Created**: 2026-11-05

**Status**: Draft

**Input**: "Repo conformance check: check that each catalog repo follows the shared setup (callers
on `@main`, `renovate.json` extends the preset, no `dependabot.yml`, issues on, vulnerability
alerts on and Dependabot security updates off, default branch `main`, the secret names exist), and
show a deviation as a problem on the status page."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See which repo does not follow the shared setup (Priority: P1)

The Maintainer opens the status page. A repo that does not follow the shared setup shows the
problem "The repo does not follow the shared setup.", with the names of the rules that fail. The
Maintainer does not check each repo by hand.

**Why this priority**: in one week, the Maintainer repaired these deviations by hand: issues were
off, so Renovate made no Dependency Dashboard; old Dependabot PRs stayed open; one repo had a
different default branch; Vercel ids were secrets and not variables; a caller had
`permissions: {}` and did not start. No check found them.

**Independent Test**: turn off issues in one test repo of the catalog. Run the check. Make sure
that the status page shows the problem for that repo, with the rule "Issues are on".

**Acceptance Scenarios**:

1. **Given** a catalog repo that follows all rules, **When** the check runs, **Then** the repo has no
   conformance problem.
2. **Given** a catalog repo that fails one or more rules, **When** the check runs, **Then** the
   status page shows the problem and the names of the rules that fail.
3. **Given** a rule that the Maintainer marked as not applicable for a repo, **When** the check
   runs, **Then** that rule does not fail for that repo.

---

### User Story 2 - Get an issue for a deviation (Priority: P2)

When a repo starts to fail a rule, the update opens one issue for that repo, with the list of rules
that fail. When the repo follows all rules again, the update closes the issue. This uses the issue
rules of spec 001.

**Why this priority**: a deviation is not urgent, but the Maintainer must not forget it.

**Independent Test**: make a repo fail a rule. Run the update two times. Make sure that one issue
opens and no second issue. Repair the repo. Make sure that the issue closes.

**Acceptance Scenarios**:

1. **Given** a repo that starts to fail a rule, **When** the update runs, **Then** one issue opens for
   that repo, with the names of the rules that fail.
2. **Given** an open conformance issue, **When** the repo still fails, **Then** no second issue
   opens.
3. **Given** an open conformance issue, **When** the repo follows all rules, **Then** the issue
   closes.

---

### User Story 3 - Know what each rule means and how to repair it (Priority: P3)

Each rule has a short name and a repair instruction in one place. The issue text links to it.

**Why this priority**: the Maintainer repairs a deviation months after the rule was made, and must
not search the specs for the reason and the steps.

**Independent Test**: open a conformance issue. Follow the link. Make sure that each failed rule has
a repair instruction.

**Acceptance Scenarios**:

1. **Given** a conformance issue, **When** the Maintainer opens it, **Then** each failed rule links to
   its repair instruction.

---

### Edge Cases

- A repo of another owner (for example `harmonieorkest-brummen/pretband-backend`) is in the catalog.
  The check does not apply the rules to it, because this repo does not change the settings of
  other owners (constitution).
- A rule does not apply to a repo, for example the Node CI caller in HomeLab, which has its own
  workflows. The Maintainer marks the rule as not applicable for that repo in the catalog, with a
  reason.
- The check cannot read a setting of a repo, for example because the token has no access. The
  page shows the note "Setup check not available" with the ids of those rules. The note is not a
  problem and does not open an issue.
- A project is `archived` or has no repo. The check ignores it.
- A new rule is added. All repos are checked against it at the next run.
- A repo is private. The page and the issue show only rule names, never file content or setting
  values.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The check MUST read the repos only from the catalog: each project with a repo of the
  owner `ImreBoersma` and a status `active` or `maintenance` (Principle II).
- **FR-002**: The check MUST apply these rules to each repo:
  - **R1 CI caller**: a repo with a Node project has a CI workflow that calls the shared CI
    workflow of `projects` at `@main`.
  - **R2 Board caller**: a public repo has the board caller of spec 004 at `@main`.
  - **R3 Caller permissions**: each caller workflow sets `permissions` with `contents: read`, and
    never `permissions: {}` (spec 002).
  - **R4 Renovate**: the repo has a Renovate config that extends the shared preset (spec 003).
  - **R5 No Dependabot updates**: the repo has no Dependabot config for version updates.
  - **R6 Issues on**: issues are on.
  - **R7 Security alerts**: vulnerability alerts are on, and Dependabot security updates are off
    (spec 003).
  - **R8 Default branch**: the default branch is `main`.
  - **R9 Secrets and variables**: each secret and each variable that a caller workflow uses
    exists in the repo, with the correct kind (secret or variable).
- **FR-003**: The Maintainer MUST be able to mark a rule as not applicable for one repo in the
  catalog, with a reason.
- **FR-004**: A repo that fails one or more rules MUST be a problem with the reason
  `not-conformant`, with the problem rules, sort order and issue rules of spec 001.
- **FR-005**: The page and the issue MUST show the names of the rules that fail.
- **FR-006**: The page and the issue MUST NOT show file content, secret values or setting values
  (spec 001 FR-018).
- **FR-007**: When the check cannot read a rule, the result of that rule MUST be "Check not
  available", and it MUST NOT make a problem.
- **FR-008**: The check MUST run a minimum of one time each day.
- **FR-009**: Each rule MUST have a repair instruction in one document, and the issue MUST link to
  the instruction of each failed rule.
- **FR-010**: The check MUST only read. It MUST NOT change a repo or a setting.

### Key Entities

- **Rule**: an id (R1 to R9), a short name, the repos it applies to, and a repair instruction.
- **Exception**: a rule id, a repo and a reason, in the catalog.
- **Result**: for one repo and one rule: pass, fail, not applicable, or check not available.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the own active and maintenance repos in the catalog are checked against all
  rules each day.
- **SC-002**: A deviation shows on the status page within 1 day after it starts.
- **SC-003**: The 5 deviations that the Maintainer repaired by hand in the first week of November
  2026 are each found by a rule when they are made again in a test.
- **SC-004**: A repo that follows all rules gets 0 conformance problems.
- **SC-005**: The feature costs €0 each month to operate.

## Assumptions

- The check runs in the status page update, or in a daily run of the same workflow.
- Reading some settings (vulnerability alerts, Dependabot security updates, the names of secrets
  and variables) needs a token with read access to repo settings. The Maintainer gives the
  existing read token that access, or makes a separate read token.
- Secret values can not be read. The check reads only names.
- "Node project" means a repo with a `package.json` in its root. HomeLab has none, so R1 does not
  apply to it without an exception.
- The repair instructions are one Markdown document in `projects`.
- Checks of other owners' repos and of hosting settings (Vercel, Firebase) are not in the scope of
  this feature.

## Principles Affected

| Principle | How this feature affects it |
|---|---|
| II. Catalog as the only project list | The repos and the exceptions come from the catalog. |
| III. No secrets or private data | Only rule names and secret names are read; no values are shown. |
| IV. Shared configuration | The check finds repos that do not use the shared workflows and preset. |
| VIII. Keep the work small | The Maintainer does not check repos by hand. |
| X. ASD-STE100 | Rule names, problem text, issue text and repair instructions use STE. |
