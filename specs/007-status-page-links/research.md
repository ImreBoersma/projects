# Research: Status Page Links and Layout

## 1. CI link (FR-002)

**Decision**: link to `https://github.com/<repo>/commit/<oid>/checks`, with `<oid>` the id of the
last commit on the default branch. Request `oid` in the GraphQL query next to `committedDate`.

**Rationale**: this page shows the checks of exactly the commit whose result the page shows, so a
failed CI cell opens the failed run in one step (SC-001). The commit id is a hash, not text from
the repo.

**Alternatives**: `/actions?query=branch:<default branch>`. Rejected: it puts the branch name in
the page, and spec 001 FR-018 forbids branch names. `/actions` without a filter. Rejected: it also
shows runs of other branches.

**Spec note**: FR-002 says "the workflow runs of the default branch". The checks of the last
commit of the default branch are those runs. FR-010 must also list the commit id as allowed link
data.

## 2. Deploy link (FR-003)

**Decision**: `https://github.com/<repo>/deployments`.

**Rationale**: a fixed path. It shows each environment and its log. The log URL of the last
deployment is also available, but the deployments page is sufficient and needs no more data.

## 3. Renovate link (FR-004)

**Decision**: `https://github.com/<repo>/pulls?q=is%3Apr+is%3Aopen+author%3Aapp%2F<app>`, with
`<app>` the login of the Renovate app of the first open Renovate PR without `[bot]` (`renovate`
for the hosted app, `imreboersma-homelab-renovate` for HomeLab).

**Rationale**: each repo uses one Renovate app (spec 003). The status page already reads the PR
authors to count Renovate PRs, so no new query is necessary.

**Alternatives**: two `author:` filters in one query. Rejected: not documented as OR. A link
without a filter. Rejected: it shows all PRs.

**Privacy**: an app login is the name of a GitHub App, not a user name. The HomeLab app name is
already public in the HomeLab Renovate setup of spec 003. FR-010 must list the app login.

## 4. Problem link (FR-005)

**Decision**: in page mode, read the open `status-problem` issues of `projects` with
`listOpenIssues()` (spec 001) and map each marker key to its issue number. Link to
`https://github.com/ImreBoersma/projects/issues/<number>`. Give job `build` the permission
`issues: read` and the environment value `GITHUB_TOKEN`.

**Rationale**: the issues job runs after the page, so a new problem has no issue yet; it gets the
link at the next hourly update (spec edge case). When the issue read fails, the page shows the
problems without links and the run does not fail: the links are not worth a missing page.

## 5. Card layout (FR-008)

**Decision**: CSS only. Under `@media (max-width: 600px)`, the table, rows and cells become blocks;
each row is a card with a border; each cell shows its column name from a `data-label` attribute
with `td::before { content: attr(data-label) }`. Remove `overflow-x: auto` on small screens, so the
page cannot scroll to the side.

**Rationale**: no script, no second copy of the data, and the wide layout stays a real table for
screen readers.

## 6. Summary line (FR-007)

**Decision**: one paragraph above the table, for example "2 problems in 2 projects. 10 projects
without a problem. 4 of 4 sites are up." With no problems: "No problems. 12 projects. 4 of 4 sites
are up." "Check not available" counts as not checked.

## 7. Header links (FR-009)

**Decision**: two links under the title: "Roadmap" to
`https://github.com/users/ImreBoersma/projects/4/views/3` and "Project board" to
`https://github.com/users/ImreBoersma/projects/4`. Constants in `render.ts`.

**Rationale**: two fixed URLs from spec 004. A catalog field is not necessary for one board.

## 8. Link style (FR-012)

**Decision**: links keep the underline; `a:focus-visible` gets a 2-pixel outline. Link colours are
tokens in `:root`, also for the dark scheme. Problem rows keep their background colour; the
problem text is also a link, so the state is not only a colour.
