# Research: Project Board and Public Roadmap

Sources: docs.github.com (Projects, filtering, automation, visibility), `actions/add-to-project`,
the GraphQL schema, `gh project` manual. Checked on 2026-11-03.

## 1. Issues of other owners on a user board (FR-010)

**Decision**: put `harmonieorkest-brummen/pretband-backend` on the user board. Use the built-in
"Auto-add to project" workflow of the board for that repo.

**Rationale**: a user project can contain issues from each repo that the owner can read. The docs
give no limit for items of a different owner. Each viewer needs read access to the repo to see the
item. The free plan gives 1 auto-add workflow, for 1 repo. The constitution does not permit
changes to settings of `harmonieorkest-brummen` repos, so a caller in that repo is not possible.
The built-in auto-add is a setting of the board, not of the repo.

**Not confirmed**: the docs do not say directly that cross-owner items are permitted, and the org
can block classic PATs. quickstart.md §5 tests this. If it fails, make a small board in the
organisation (spec edge case) and record the result here.

**Alternatives**: a board in the organisation for all projects. Rejected: most repos are of
`ImreBoersma`.

## 2. How a new issue goes to the board (FR-005, SC-001)

**Decision**: a reusable workflow `add-to-board.yml`. Each public own catalog repo calls it on
`issues: [opened, transferred]`. The job reads the catalog of `projects`, finds the entry, adds
the issue with `actions/add-to-project@v2`, and sets Project and Roadmap = No.

**Rationale**: the `issues` event runs in seconds, so SC-001 (5 minutes) is easy. The built-in
auto-add is limited to 1 repo on the free plan. FR-005 asks for the shared workflow of spec 002.

**Alternatives**:
- Only a scheduled sweep in `projects`. One secret and no callers, but scheduled runs come late
  by 5 to 30 minutes, so the 5-minute target fails. Rejected for public repos. For private repos
  the sync is the path (§3). The sync also adds items that the add job missed.
- Built-in auto-add for all repos. Rejected: 1 repo on the free plan, and it sets no fields.

## 3. Token (FR-011)

**Decision**: two classic PATs, each with expiry 1 year.

| Secret | Scopes | Where | Used by |
|---|---|---|---|
| `BOARD_TOKEN` | `project` | `projects` and the 4 public project repos | the add job |
| `BOARD_SYNC_TOKEN` | `project`, `repo` | `projects` only | the sync |

The private repos (HomeLab, Reperatie-Formulier) get no caller. The sync adds their open issues
two times each day (§4, §7). FR-005 and SC-001 were changed for this on 2026-11-03.

**Rationale**: `GITHUB_TOKEN` has no access to user projects. Fine-grained PATs do not support
user-owned projects. GitHub App tokens are documented only for organisation projects. So the only
token type is a classic PAT. A classic PAT reads public issues without a repo scope, so `project`
is sufficient for the add job. Issues of private repos need `repo`, and `repo` gives write access to
all repos of the owner. With the split, a leak from a project repo exposes only the board. The
token with `repo` is in 1 repo, and only workflows on `main` of `projects` use it.

**Not confirmed**: that `project` alone can add an issue of a public repo. quickstart.md §3 tests
it. If it fails, add the scope `public_repo` to `BOARD_TOKEN`. That scope gives write access to
public repos, so record the result here.

**Alternatives**:
- One token with `project` and `repo` in all 7 repos. Rejected: a leak from any repo exposes
  all repos, also HomeLab, which deploys as root.
- Keep the private repos off the board. Rejected: the board then misses the work of 2 projects.

When a token expires, the add job or the sync fails, and GitHub sends a notification (spec edge
case). Rotate both tokens on the same day.

## 4. Field options follow the catalog (FR-004)

**Decision**: a sync script (`board:sync`) in `projects`. It runs in the issues job of each status
page run (§7), on a push that changes `projects.yaml`, and on dispatch. It:

1. Adds a Project option for each catalog entry that is not archived, and a Stakeholder option for
   each non-empty `stakeholder` value.
2. Removes an option only when no open item uses it. An archived project keeps its option until
   its last open item closes (spec edge case "archived").
3. Sets Project on items without a value, from the repo of the item (catalog lookup). This covers
   `pretband-backend` items from the built-in auto-add.
4. Adds open issues of catalog repos that are not on the board. This is also the one-time backfill
   (spec assumption).

**Rationale**: `updateProjectV2Field` replaces the full option list. Each option that keeps its
`id` keeps its item values. The script always sends the existing ids.

**Not confirmed**: that values stay when the ids are sent. quickstart.md §4 tests it on a copy of
the field before the first real sync.

## 5. Roadmap filter (FR-007, FR-008, FR-009)

**Decision**: the project is public. The Roadmap view has the filter
`roadmap:Yes -label:status-problem is:issue`. The sync also sets Roadmap = No on each item from a
private repo and on each `status-problem` item.

**Rationale**: visibility is for each project, not for each view, so the full project is public.
A viewer without access sees a private-repo item as a locked, redacted row. That row shows no
title, but SC-004 wants 0 private items, so the sync removes them. There is no filter for repo
visibility, and a `-repo:` list in the filter is a project list outside the catalog (Principle II).

**Not confirmed**: that a person without a login can open `/users/ImreBoersma/projects/N/views/M`.
quickstart.md §6 tests it in a private browser window.

## 6. Status Done when an issue closes (US1 AC3)

**Decision**: use the built-in workflows "Item closed" and "Pull request merged". Both set Status
to Done. Make sure that they are on after the board is made.

## 7. `status-problem` issues (FR-006)

**Decision**: the issues job of `status-page.yml` runs `board:sync` after it opens or closes
issues. The sync adds each open `status-problem` issue of `projects` and reads the marker
`<!-- status-problem: <id>/<reason> -->` of the body. The `id` gives the catalog entry and the
Project value. `projects` is not in the catalog, so its other issues stay off the board (US2 AC3).

**Rationale**: the issues job opens issues with `GITHUB_TOKEN`. GitHub does not start workflows for
events that `GITHUB_TOKEN` makes, so the `issues` caller of `projects` does not run for them.

**Alternatives**: open the problem issues with a PAT, so that the caller runs. Rejected: the sync
runs in the same job and adds them already. The add job also reads the marker, for a problem issue
that a person opens by hand.

**Open point**: the Maintainer can add `projects` to the catalog if its own issues must be on the
board. That is a catalog change, not a change to this plan.

## 8. Views

**Decision**: views are made by hand in the web UI. The API has no mutation to make views.
contracts/board.md lists the views and filters, so that the board can be made again.
