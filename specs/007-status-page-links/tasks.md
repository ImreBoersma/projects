---

description: "Task list for the status page links and layout"
---

# Tasks: Status Page Links and Layout

**Input**: Design documents from `/specs/007-status-page-links/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: `bun test` in `status/` for each changed module, because the page generator is
application code (Principle IX). The steps of quickstart.md validate the page in a browser.

**Organization**: the new status fields are foundational. US1 adds the links, US2 the summary, US3
the card layout and US4 the header links.

**Paths**: all paths are in this repo (`ImreBoersma/projects`). Make the changes on a branch and
merge them in one PR.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependencies)
- **[Story]**: the user story of the task (US1, US2, US3, US4)

---

## Phase 1: Setup

- [X] T001 Create the branch `007-status-page-links` from `main`. All code changes stay on this branch until T022.

---

## Phase 2: Foundational

**Purpose**: the data that the links need.

- [X] T002 In `status/src/types.ts`, add to `ProjectStatus`: `commitOid: string | null` and `renovateApp: string | null` (data-model.md: "null when the repo has no commit or no data"; "null when there are 0 Renovate PRs"). Add `issues: Map<string, number>` to `StatusPage` (marker key to issue number). In `status/src/github.ts`, `emptyStatus()` sets both new fields to `null`. In `status/tests/helpers.ts`, set both to `null`. Fix each other place that builds a `ProjectStatus` or a `StatusPage`.
- [X] T003 In `status/tests/github.test.ts` and `status/tests/fixtures/graphql-response.json`, add `"oid": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2"` to the commit of `r0`. Add tests: `buildQuery()` requests `oid`; `mapRepo()` of `r0` gives that `commitOid`; a repo without commits gives `commitOid: null`; a repo with a PR of `renovate[bot]` gives `renovateApp: "renovate"`; a PR of `imreboersma-homelab-renovate` gives `renovateApp: "imreboersma-homelab-renovate"`; 0 Renovate PRs give `null`. Then in `status/src/github.ts`, add `oid` to the `... on Commit` part of `FIELDS` and to `RepoNode`, and set `commitOid` and `renovateApp` (login of the first Renovate PR, with `[bot]` removed) in `mapRepo()`. Make the tests pass. Run `bunx tsc --noEmit -p .`. Done: also `buildQuery()` requests `oid`.

**Checkpoint**: each status has the commit id and the Renovate app.

---

## Phase 3: User Story 1 - Go from a problem to its cause in one click (Priority: P1) 🎯 MVP

**Goal**: each cell with a source is a link.

**Independent Test**: render a row with a failed CI result and a commit id. The CI cell is a link to
`https://github.com/<repo>/commit/<oid>/checks`.

- [X] T004 [P] [US1] Create `status/tests/links.test.ts` with tests for `rowLinks(status, issues)` of `status/src/links.ts`, one for each row of the table "Links of a row" in `specs/007-status-page-links/data-model.md`: project to the repo; project to `https://<domain>/` without a repo; no project link without repo and domain; CI to `/commit/<oid>/checks` only when CI is not "unknown" and `commitOid` is set; deploy to `/deployments` only when the deploy is known; Renovate to `/pulls?q=is%3Apr+is%3Aopen+author%3Aapp%2F<app>` only when the count is more than 0 and `renovateApp` is set; each problem to `https://github.com/ImreBoersma/projects/issues/<number>` only when its key is in the map; site to `https://<domain>/`; with `availability: "unavailable"` the project name still links to the repo, and CI, deploy and Renovate have no link; with `availability: "no-repo"` there is no repo link, and the project name links to the site when there is a domain (FR-001, spec edge cases).
- [X] T005 [US1] Create `status/src/links.ts` with `rowLinks()` of T004. It returns `{ project, ci, deploy, renovate, site: string | null; problems: Map<Reason, string> }`. Use only the catalog repo and domain, `commitOid`, `renovateApp`, issue numbers and fixed GitHub paths (FR-010). Make T004 pass.
- [X] T006 [P] [US1] In `status/tests/render.test.ts`, add tests: a row with links has `<a href="...">` in the project, CI, deploy, Renovate, problem and site cells, with the URL HTML-escaped; cells with "Unknown", "No repo" or "Data not available" have no `<a`; the CSS has `text-decoration: underline` for links and an `a:focus-visible` outline of 2 pixels, and link colour tokens in `:root` and in the dark scheme (FR-012). Extend the privacy test: the fixture values for commit messages, PR titles, branch names and user names do not occur in the output, also not in `href` values.
- [X] T007 [US1] In `status/src/render.ts`, use `rowLinks()` to wrap each cell value in a link when the URL is not `null`. Escape each URL with the existing `html()` function. Add the link style of research.md §8. Pass `page.issues` to `rowLinks()`. Make T006 pass. Done: T007, T011, T013 and T016 were made in one change of `render.ts`, because they change the same function.
- [X] T008 [US1] In `status/src/main.ts`, page mode: read the open `status-problem` issues of `projects` with `listOpenIssues()` and `GITHUB_TOKEN`, and make the map from `parseMarker(body)` to the issue number. When `GITHUB_TOKEN` is not set or the read fails, log `Issue links not available.` and use an empty map; do not stop the run (research.md §4). Pass the map to `renderPage()`.
- [X] T009 [US1] In `.github/workflows/status-page.yml`, job `build`: add `issues: read` to `permissions` and `GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}` to the `env` of `bun run start --mode page`. Run actionlint.

**Checkpoint**: each cell with a source links to it.

---

## Phase 4: User Story 2 - See the total state at the top (Priority: P2)

**Goal**: one summary line above the table.

**Independent Test**: render 2 problem rows and 10 rows without a problem; the summary says "2
problems in 2 projects. 10 projects without a problem."

- [X] T010 [US2] In `status/tests/render.test.ts`, add tests for the summary of `specs/007-status-page-links/contracts/page.md`: with problems; with no problems; the singular for 1 problem and 1 project; the site sentence `<u> of <c> sites are up.` counts only `up` and `down`; no site sentence when no site was checked.
- [X] T011 [US2] In `status/src/render.ts`, add the summary paragraph under the update time. Make T010 pass.

**Checkpoint**: the summary shows the total state.

---

## Phase 5: User Story 3 - Use the page on a phone (Priority: P2)

**Goal**: cards at 600 pixels or less, no horizontal scroll.

**Independent Test**: quickstart.md §4 at 360 pixels.

- [X] T012 [US3] In `status/tests/render.test.ts`, add tests: each `<td>` has a `data-label` attribute with its column name; the CSS has `@media (max-width: 600px)` with `td::before { content: attr(data-label)` and a hidden table header.
- [X] T013 [US3] In `status/src/render.ts`, add `data-label` to each cell and the card CSS of research.md §5 and contracts/page.md "Card layout". Do not use `overflow-x: auto` inside the media query. Make T012 pass.
- [X] T014 [US3] Validate quickstart.md §4: render the page locally and open it at 360 and 1100 pixels wide. Make sure that there is no horizontal scroll at 360 pixels and that the table shows at 1100 pixels. Done 2026-11-05: in Chrome, a 360-pixel frame gave cards with labels and 0 pixels of horizontal scroll; at 1100 pixels the table showed.

**Checkpoint**: the page works on a phone.

---

## Phase 6: User Story 4 - Find the roadmap and the board (Priority: P3)

**Goal**: two header links.

**Independent Test**: the rendered page has the links "Roadmap" and "Project board" with the URLs of research.md §7.

- [X] T015 [US4] In `status/tests/render.test.ts`, add a test: the header has `<a href="https://github.com/users/ImreBoersma/projects/4/views/3">Roadmap</a>` and `<a href="https://github.com/users/ImreBoersma/projects/4">Project board</a>`.
- [X] T016 [US4] In `status/src/render.ts`, add the two links under the title as constants. Make T015 pass.

**Checkpoint**: stakeholders find the roadmap from the status page.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T017 [P] In `specs/007-status-page-links/spec.md`, change FR-010 to also allow the commit id and the login of the Renovate app in links (research.md §1, §3). Done during /speckit-analyze on 2026-11-05 (finding I1), before the implementation.
- [X] T018 [P] In `specs/001-project-status-page/contracts/page.md`, add one line under the title: "Spec 007 changes this contract: see `specs/007-status-page-links/contracts/page.md`".
- [X] T019 Run quickstart.md §2 and §5 on the real catalog. Make sure that the page is less than 50 KB and that it loads no file from another site (`grep -E 'src=|href="http' ` shows only GitHub and catalog domain links). Run `bun test`, `bun run lint`, `bunx tsc --noEmit -p .` and actionlint. Done 2026-11-05: the page is 8212 bytes; it links only to GitHub and the 4 catalog domains and loads no other file; 108 tests, lint, tsc and actionlint pass.
- [X] T020 Push the branch and open the PR into `main`. CI must pass. Done 2026-11-05: #11, run 42011036524 passed.
- [X] T021 Ask the Maintainer to merge the PR, because a merge to `main` deploys the page. Done 2026-11-05: the Maintainer merged #11.
- [X] T022 After the merge, validate quickstart.md §6 on the live page, also on a phone. Make sure that the summary line shows without scroll at 360 and at 1100 pixels wide (SC-004). Done 2026-11-05: push run passed (build, issues, deploy); the live page has the summary "No problems. 12 projects. 4 of 4 sites are up.", both header links, 25 links and the card CSS. The summary is the third line under the title, so it shows without scroll at both widths (checked in Chrome at 360 and 1100 pixels before the merge).
- [X] T023 [P] In `PLAN.md`, add spec 007 to the feature table and to the Done list. Done.

---

## Dependencies & Execution Order

- **Setup (T001)** first.
- **Foundational (T002–T003)**: T002 before T003.
- **US1 (T004–T009)**: needs Phase 2. T004 and T006 in parallel; T005 after T004; T007 after T005 and T006; T008 after T002; T009 at any time.
- **US2 (T010–T011)**, **US3 (T012–T014)**, **US4 (T015–T016)**: each needs only Phase 2. They all change `status/src/render.ts`, so do T011, T013 and T016 one after the other. The test tasks T010, T012 and T015 also change `render.test.ts`, so they run one after the other.
- **Polish (T017–T023)**: after all stories. T022 needs the merge (T021).

## Parallel Example: US1

```text
status/tests/links.test.ts    (T004)
status/tests/render.test.ts   (T006)
.github/workflows/status-page.yml (T009)
```

## Implementation Strategy

1. **MVP (US1)**: the links. This is the main value of the feature.
2. **US2 and US3**: the summary and the phone layout.
3. **US4**: the header links.

All four go in one PR, because they all change the same page.

---

## Phase 8: Convergence

From the review of 2026-11-11 (code checked against spec, plan and tasks).

- [X] T024 Build the Renovate PR link of a repo from each Renovate app login in its open PRs, not only the first one (`status/src/github.ts:101`, `status/src/links.ts:35`) per FR-004 (partial)
- [X] T025 Do not write "No problems." in the summary when shared problems exist (`status/src/render.ts` `summary()`), so that the text and the state badge agree per FR-007 (contradicts)
