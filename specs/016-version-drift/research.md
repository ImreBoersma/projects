# Research: Version Drift Between Projects

## 1. Access to the files

**Decision**: read the files with the tokens that the status run has now:
`CONFORMANCE_READ_TOKEN` for the `ImreBoersma/…` repos, and `tokenFor(owner)` (for example
`STATUS_READ_TOKEN_HOB`) for the repos of other owners.

**Rationale**: spec 008 already reads the workflow files of the `ImreBoersma` repos with
`CONFORMANCE_READ_TOKEN`, also of the private repos. Spec 013 already reads the workflow files of
`harmonieorkest-brummen/…` with `STATUS_READ_TOKEN_HOB` (`readWorkflowTexts`). So both tokens have
"Contents: read". SC-005 (no new token) is true.

**Alternatives**: one new token for all repos (rejected: one more secret to rotate, spec 013);
the GraphQL query of spec 001 with `object(expression: "HEAD:package.json")` (rejected: that query
is for the status facts and requests no file text on purpose, FR-018).

## 2. The files and the number of requests

**Decision**: for each repo of an active catalog project, in page mode only:
`package.json`, `.nvmrc`, `.node-version` and `bun.lock` (raw contents API, 404 = no file). The
text of `.github/workflows/ci.yml` comes from the workflow texts that the run has already read
(conformance for own repos, the secrets compare for other repos); no new request.

**Rationale**: 4 GET requests for each repo; with 8 repos, 32 requests each hour. The limit of a
token is 5000 each hour. The issues mode does not need the table, so it does not read the files.

**Alternatives**: the Git tree API to find the files first (rejected: one more request and no
gain for 4 fixed paths); `bun.lockb` (old binary format): also counted as Bun, one more request
only when `bun.lock` is not there.

## 3. The Node version

**Decision**: the first value of: `node-version` in the `with:` of the job that calls
`ci-node.yml` in `ci.yml`; `.nvmrc`; `.node-version`; `engines.node`. Else the `default` of the
input `node-version` of `.github/workflows/ci-node.yml` in this repo, with the source "default".

**Rationale**: the CI value is the value that CI uses; `.nvmrc` and `.node-version` are the
values for the local machine; `engines` is a statement for the users of a package. The shared
default is read from the file, so the page cannot show an old value when the default changes
(Principle IV). The YAML parser of the status package (`yaml`, already a dependency) reads both
files.

**Alternatives**: a fixed value "24" in the code (rejected: two places for one value).

## 4. The lowest version of a range

**Decision**: a small parser in the status package:

- Split at `||`; for each part, take the first comparator; remove `^ ~ >= > = v` and spaces; the
  rest must start with a number (`20`, `20.1`, `20.x`, `20.1.3-rc.1`).
- A part that starts with `<` or `<=` only has no lowest version.
- The lowest major of all parts is the major of the cell; no part with a number → not compared.
- `>18` gives 18 (not 19): the major of the bound is close enough to show drift.

**Rationale**: `Bun.semver` has `satisfies` and `order`, but no "lowest version" (`minVersion`
of the npm `semver` package). A new dependency for 15 lines is against Principle VIII.

**Alternatives**: the npm package `semver` (rejected: a new dependency); read the lock files for
the exact version (rejected: three lock formats; the range is enough for a major version, spec
Assumptions).

## 5. The safe text rule (spec 001 FR-018)

**Decision**: a cell shows its text only when it matches `^[A-Za-z0-9 .^~<>=|*+-]{1,40}$`; else
"Other". A cell that the parser cannot read but that matches (for example `latest`, `*`) shows
the text without a mark.

**Rationale**: Reperatie-Formulier is a private repo. A git URL (`github:org/repo#branch`) or a
`file:` path in its `package.json` is text from a private repo; the rule excludes `/`, `:`, `#`
and `@`, so these never show.

## 6. Where the table goes on the page

**Decision**: a fifth tab "Versions" after "Shared tokens" and before "History", a `<table>` with
a header row, one row for each repo, the repo name as a link to the repo (the link rules of spec
012), and the cells. The tab badge is `badge-warning` with the number of repos with one or more
marks. The client `pick("tab", …)` list and the ⌘K items get `versions`.

**Rationale**: the other cross-project views (Campaigns, Shared tokens) are tabs; the four
existing tabs fit on a phone with one more short label (checked at 375 px in the quickstart).

**Alternatives**: a section below the projects list (rejected: the list is the main view; a tab
is the existing pattern).

## 7. The mark

**Decision**: a marked cell gets the class `.drift`: a background mix of the warning colour
(contracts/page.md) and the symbol "▼" before the text, `title` and a hidden text for
screen readers: "2 major versions behind 7". The colour is not the only sign (WCAG 1.4.1).

**Rationale**: the amber warning colour of spec 012 on the base fails 4.5:1 for text in the light
theme (1.76:1, measured for spec 019), so the cell text stays in the base text colour and the
amber is a background mix with a contrast test, as the badges.

## 8. Size

**Decision**: the table adds about 20 rows × 8 short cells; the size test of spec 011 gets
versions in `worstCaseRows()` and keeps the budget of 30 KB gzip (now 20.3 KB).

## 9. Validation (2026-11-10)

- Tests: 408 pass (364 before), typecheck and lint pass. Page of the 20-site worst case with the
  versions table: 169.1 KB raw, 21.2 KB gzip (budget 30 KB).
- Local run with real data (`bun run start`, read-only GET requests): 6 rows (boek-de-bus,
  Beter-dan-de-MIDI, personal-website, scales-exercises, Reperatie-Formulier, pretband-backend);
  hob-nl and HomeLab have no `package.json` and are not in the table. Log: "Versions: 4 repos
  behind". Marks: TypeScript `^6.x` in 3 repos, TypeScript `^5` and `@types/node` `^20` in
  boek-de-bus. Node "24 (default)" in each row. SC-002 is true.
- Browser (Chrome): light and dark theme readable; at 1280 px the table fits after the cell
  padding changed from 8px to 6px; at 375 px (in a frame: headless Chrome has a minimum width of
  500 px) the page does not scroll sideways and the table scrolls in its own box.
- Changes during the implementation: the reader takes all workflow texts of a repo and uses the
  job that calls `ci-node.yml` (the file name does not matter); the source name stays `ci.yml`.
