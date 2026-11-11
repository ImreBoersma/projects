# Research: Delivery Numbers for Each Project

## 1. Source and token

**Decision**: one GraphQL query for each token (as `fetchStatuses` of spec 001), with one alias
for each repo, after the status query, in page mode only. The token is `tokenFor(owner)`
(`STATUS_READ_TOKEN`, `STATUS_READ_TOKEN_HOB`): they already have "Pull requests: read" and
"Deployments: read" for the status facts.

**Rationale**: one request for all repos of an owner; no new token (SC-005). Checked on
2026-11-10 with `gh api graphql` on HomeLab: the fields below give the data.

**Alternatives**: REST `pulls?state=closed` (rejected: one request for each repo and page, and it
sends the PR titles and bodies, which the run must then drop; GraphQL sends only the fields that
the query asks for, FR-008).

## 2. The query (FR-008: no text fields)

```graphql
pullRequests(states: MERGED, first: 100, orderBy: { field: UPDATED_AT, direction: DESC }) {
  pageInfo { hasNextPage endCursor }
  nodes { createdAt mergedAt updatedAt author { __typename } }
}
deployments(environments: ["production", "Production", "github-pages"], first: 100,
  orderBy: { field: CREATED_AT, direction: DESC }) {
  pageInfo { hasNextPage endCursor }
  nodes { createdAt }
}
```

- Not `login`: `__typename` (`Bot` or `User`) is enough for FR-002, and the page needs no login.
  In GraphQL the login of a bot has no `[bot]` (checked: `imreboersma-homelab-renovate`), so the
  type is the correct test. A deleted author (`author: null`) is an other PR.
- Order by `UPDATED_AT`: a PR merged in the window has `updatedAt ≥ mergedAt ≥` start, so the read
  can stop at the first page whose last node has `updatedAt` before the start.
- Next pages: one query for each repo with `after: <endCursor>` while `hasNextPage` and the last
  node is in the window; at most 5 pages (500 PRs) for each repo, then the run logs
  "Delivery <repo>: more than 500 PRs" and uses what it read.
- The environment filter of the deployments is the same as spec 001 (FR-005); `Preview` is not in
  the list.

**Measured on 2026-11-10**: scales-exercises has the most PRs (58 merged in 90 days); each repo
fits in one page.

## 3. Median and the total row

**Decision**: the median of a list of durations: sort; odd count → the middle value; even count →
the mean of the two middle values. The total row uses all durations of all available rows
(FR-004), not the medians of the rows.

## 4. The window and the months

**Decision**: start = run time − 90 days. Months: each calendar month (UTC) from the month of the
start to the month of the run, oldest first. A deploy counts in the 90-day total and in its month only when
`createdAt ≥ start`; so the first month is partial. A PR counts when `mergedAt ≥ start`.

**Note**: 90 days touch 4 months, or 5 when the start is near the end of a month and February is
in the window (2027-01-31 to 2027-05-01). So the list has 4 or 5 entries; a test covers 5.

## 5. Time text (FR-010)

`< 1 h` below 1 hour; whole hours (rounded down) below 48 hours ("33 h"); whole days (rounded
down) from 48 hours ("11 d"). "—" without data. The same function for the rows and the total.

## 6. Where on the page

**Decision**: in the panel of the tab "History", after the uptime list: a heading
`<h3>Delivery (90 days)</h3>`, one line of explanation, a `<table class="versions">` (the table
style of spec 016: padding, lines, own scroll box) with one row for each project with a repo, in
catalog order, and the total row in `<tfoot>`.

**Rationale**: the History tab already has the 90-day numbers (uptime, time to repair); the table
style exists. Renaming the class `versions` to a shared name (`data-table`) is a small change of
spec 016 CSS; done in this feature so that two tables do not use a name of one feature.

## 7. Validation (2026-11-11)

- Tests: 430 pass (408 before), typecheck and lint pass. Page of the 20-site worst case with the
  versions and the delivery tables: 174.6 KB raw, 22.2 KB gzip (budget 30 KB).
- Local run with real data (read-only GraphQL queries, one for each token): 8 rows. Total 147
  merged PRs, 118 updates, update median 21 h, other PRs < 1 h, 76 production deploys
  (7/18/16/35 for August to November). scales-exercises 58 merged, 47 updates (SC-002);
  pretband-backend has the highest update median, 11 d (SC-002). HomeLab and
  Reperatie-Formulier: Deploys "—". The production deploy counts are lower than the REST count of
  spec.md "Current state", because that count had the Preview deploys.
- Browser (Chrome): light and dark theme readable; at 375 px (in a frame) the table scrolls in
  its own box and the page does not scroll sideways.
- The CSS class `versions` of spec 016 is now `data-table` (both tables).
