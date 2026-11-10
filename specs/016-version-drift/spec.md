# Feature Specification: Version Drift Between Projects

**Feature Branch**: `016-version-drift`

**Created**: 2026-11-10

**Status**: Draft

**Input**: PLAN.md 016: "Each status run reads the versions of Node, Bun, Next.js, React,
TypeScript and Biome in each repo (`package.json`, `.nvmrc`, `packageManager`). The page shows one
table of versions; a repo that is one major version or more behind the newest repo is marked.
Reason: Renovate keeps each repo current in its own range, but it does not show when the projects
drift apart. Works well with spec 015 (a campaign repairs the drift)."

## Clarifications

### Session 2026-11-10

- Q: Which tools does the table track? → A: Node, Bun, Next.js, React, TypeScript, Biome and
  `@types/node` (7 columns).
- Q: Does a repo that is behind also show a note in the detail view of its project? → A: No. The
  drift shows only in the tab "Versions" (the table and the number on the tab label).
- Change during the plan (spec 001 FR-018): a version text that is not a number range shows only
  when it matches the safe text rule; else "Other" (Edge Cases).

## Current state (2026-11-10)

Read from the catalog repos on 2026-11-10, to show the problem:

| Repo | Next.js | React | TypeScript | Biome | `@types/node` |
|---|---|---|---|---|---|
| `harmonieorkest-brummen/pretband-backend` | — | — | ^6.0.2 | — | ^26.6.5 |
| `ImreBoersma/Beter-dan-de-MIDI` | — | — | ^6.0.3 | ^2.6.2 | ^26.6.5 |
| `ImreBoersma/boek-de-bus` | 16.4.1 | 19.2.4 | **^5** | 2.2.0 | **^20** |
| `ImreBoersma/personal-website` | ^16.4.2 | ^19.3.1 | ^6.0.3 | ^2.5.15 | ^26.6.5 |
| `ImreBoersma/Reperatie-Formulier` | — | ^19.3.1 | — | ^2.6.3 | — |
| `ImreBoersma/scales-exercises` | — | ^19.3.1 | ^7.0.2 | ^2.6.3 | ^26.6.5 |

TypeScript is on three major versions (5, 6, 7); `@types/node` on two (20, 26). No repo sets its own Node version: all use the
default of the shared CI workflow (24). No repo sets a Bun version: the shared CI uses the newest
Bun. `harmonieorkest-brummen/hob-nl` and `ImreBoersma/HomeLab` have no `package.json`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See all versions in one table (Priority: P1)

The Maintainer opens the status page and selects the tab "Versions". One table shows a row for
each catalog repo with a `package.json`, and a column for each tool: Node, Bun, Next.js, React,
TypeScript, Biome, `@types/node`. Each cell shows the version that the repo asks for. A repo that does not use a
tool shows "—".

**Why this priority**: today the Maintainer must open 6 `package.json` files to see that
boek-de-bus is on TypeScript 5 and scales-exercises on TypeScript 7. One table shows it in a few
seconds.

**Independent Test**: render the page with three fixture repos with different versions. Make sure
that the tab "Versions" shows one row for each repo, the versions in the correct columns, and "—"
for a tool that a repo does not use.

**Acceptance Scenarios**:

1. **Given** a repo with `"typescript": "^6.0.3"` in its dev dependencies, **When** the page
   opens, **Then** the TypeScript cell of that repo shows `^6.0.3`.
2. **Given** a repo without Next.js, **When** the page opens, **Then** its Next.js cell shows "—".
3. **Given** a repo that does not set a Node version, **When** the page opens, **Then** its Node
   cell shows the default of the shared CI workflow with the note "default" (for example
   "24 (default)").
4. **Given** a catalog repo without a `package.json`, **When** the page opens, **Then** the repo
   is not in the table.

---

### User Story 2 - See which repo is behind (Priority: P1)

In the table, a cell is marked as a warning (amber) when its major version is one or more lower
than the highest major version of that tool in all the repos. The tab label shows the number of
marked repos. The Maintainer sees in one look which repo to update.

**Why this priority**: the table is long; the mark is the information that the Maintainer must
act on. Renovate does not show it, because each repo stays current in its own range.

**Independent Test**: render the page with fixture repos on TypeScript 5, 6 and 7. Make sure that
the cells with 5 and 6 are marked, the cell with 7 is not marked, and the tab label shows 2.

**Acceptance Scenarios**:

1. **Given** TypeScript `^5` in one repo and `^7.0.2` in another, **When** the page opens,
   **Then** the cell `^5` is marked, with the text for screen readers "2 major versions behind 7".
2. **Given** Biome `2.2.0` and `^2.6.3`, **When** the page opens, **Then** no Biome cell is marked
   (the same major version).
3. **Given** only one repo uses Next.js, **When** the page opens, **Then** its Next.js cell is
   not marked.
4. **Given** a marked cell, **When** the page opens, **Then** the dot of the project and the total
   state of the page do not change, and no issue opens.

---

### Edge Cases

- A version that is not a number range (`latest`, `*`, `workspace:*`, a git URL, a file path):
  the cell is not compared. It shows the text only when the text has only letters, digits, spaces
  and `. ^ ~ < > = | * + -` (at most 40 characters, for example `latest`); else it shows
  "Other". A git URL or a path of a private repo does not go on the public page (spec 001
  FR-018).
- A range with two bounds (`>=18 <21`) or with `||`: the lowest version of the range is compared.
- A version with a `v` (`v20` in `.nvmrc`) or with an alias (`lts/*`, `node`): `v20` is 20; an
  alias shows as text and is not compared.
- Two sources for one tool in one repo (for example `.nvmrc` 22 and `engines.node` `>=20`): the
  source with the highest priority is used (FR-003), and the cell names the source in its title.
- A `package.json` that is not valid JSON: the row shows "Not available" in one cell over the
  tool columns, and the
  repo is not compared. The run writes a log line.
- A repo that the read token cannot read: the row shows "Not available"; no problem, no issue.
- An archived project: not in the table.
- A tool in the dependencies and in the dev dependencies of one repo: the dependencies are used.
- A repo with workspaces (more than one `package.json`): only the `package.json` at the root is
  read.
- A repo that sets `node-version` in its call of the shared CI workflow: that value is used for
  Node, with the source `ci.yml`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Each status run MUST read, for each repo of a catalog project that is not archived, the
  `package.json` at the root, `.nvmrc`, `.node-version` and the CI caller
  `.github/workflows/ci.yml`. A repo without a `package.json` MUST NOT be in the table.
- **FR-002**: For Next.js (`next`), React (`react`), TypeScript (`typescript`), Biome
  (`@biomejs/biome`) and the Node types (`@types/node`), the version MUST be the range in `dependencies`, else in
  `devDependencies`, of the `package.json`.
- **FR-003**: For Node, the version MUST come from the first of these sources that has a value:
  the `node-version` input of the CI caller, `.nvmrc`, `.node-version`, `engines.node`. When no
  source has a value, the cell MUST show the default `node-version` of the shared workflow
  `ci-node.yml`, read from this repo, with the note "default".
- **FR-004**: For Bun, the version MUST come from `packageManager` (`bun@<version>`), else
  `engines.bun`. A repo with a `bun.lock` file and no version MUST show "newest (CI)". A repo
  without Bun MUST show "—". The text "newest (CI)" MUST NOT be compared.
- **FR-005**: For each tool, the major version of each cell MUST be the major version of the
  lowest version that the range allows. A cell MUST be marked when its major version is 1 or more
  lower than the highest major version of that tool in the table. A tool that only one repo uses
  MUST NOT make a mark.
- **FR-006**: The page MUST show the table in a tab "Versions", next to the other tabs of spec
  019. The tab label MUST show the number of repos with one or more marked cells, as the
  Projects tab shows its number of problems.
- **FR-007**: A marked cell MUST use the warning colour of spec 012 (amber) and MUST have a text
  for screen readers: "<n> major versions behind <highest>" (1: "1 major version behind").
  The colour MUST NOT be the only sign: the cell MUST also show a mark symbol.
- **FR-008**: A marked cell MUST NOT make a problem or an issue, and MUST NOT change the dot of a
  project, the detail view of a project or the total state of the page. The drift shows only in
  the tab "Versions".
- **FR-009**: A repo that the run cannot read MUST show "Not available" in its row, and MUST NOT
  stop the run or the other rows.
- **FR-010**: The table MUST be in the HTML of the page, so that it shows without the script
  (all panels show, spec 019 FR-008). The ⌘K box of spec 020 MUST have the item "Tab: Versions".
  The data file `status.json` does not change.
- **FR-011**: The table MUST NOT contain the content of any other file of the repo, only the
  version texts (with the text rule of the edge cases) and their source names (Principle III,
  spec 001 FR-018).

### Key Entities

- **Tool version**: a repo, a tool (Node, Bun, Next.js, React, TypeScript, Biome,
  `@types/node`), the version
  text as written, the source (for example `package.json devDependencies`, `.nvmrc`, `CI`,
  `default`), and the major version, or no major version when the text is not a number range.
- **Drift mark**: a tool version whose major version is 1 or more lower than the highest major
  version of the same tool; it has the difference and the highest major version.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The Maintainer finds the repos that are behind for each of the 7 tools in less than
  30 seconds, on one page, without opening a repo.
- **SC-002**: With the data of 2026-11-10, the table marks boek-de-bus (TypeScript 5 and
  `@types/node` 20) and the three repos on TypeScript 6, and no other cell.
- **SC-003**: A version change in a repo shows on the page within 1 hour (the next status run).
- **SC-004**: The page with the table for the 20-site worst case stays below 30 KB gzip (the
  budget of spec 011).
- **SC-005**: The feature costs €0 each month to operate and needs no new token.

## Assumptions

- The status run can read the files of each catalog repo with the read tokens that it has now
  (spec 008 reads the workflow files of the `ImreBoersma` repos; spec 001 reads the other repos).
  When a token has no access to the file contents, FR-009 applies.
- The range in `package.json` is a good sign of the version in use: a major update by Renovate
  (spec 003) always changes the range. Lock files are not read.
- "Newest" means the newest version in the repos, not the newest release of the tool. Renovate
  (spec 003) shows newer releases in each repo.
- The page does not repair the drift. The Maintainer starts a campaign of spec 015 for that.
- Other tools (for example Vite, Tailwind CSS) are out of scope. They can be added
  to the list later.
- The text on the page uses ASD-STE100.

## Principles Affected

| Principle | How this feature affects it |
|---|---|
| II. Catalog is the only project list | The table has the repos of the catalog projects that are not archived. |
| III. No secrets or private data | Only version texts and source names; no other file content. |
| IV. Use shared configuration | The Node default comes from the shared CI workflow, so the page shows the value that CI uses. |
| VIII. Keep the work small | Reads files with the existing tokens; one tab; no issue, no new service. |
| X. ASD-STE100 | Page text uses STE. |
