# Tasks: Website Quality Checks

**Input**: Design documents from `/specs/023-site-quality/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/quality-file.md,
contracts/issue.md, contracts/page.md, contracts/ci-input.md, quickstart.md

**Tests**: included (plan.md "Testing", quickstart.md §1, §5, §6).

**Format**: `[ID] [P?] [Story] Description`. All paths are from the repo root.

---

## Phase 1: Setup

- [X] T001 On the branch `023-site-quality`, run `cd status && bun run css && bun test` and record the baseline number of tests in this task (503 expected after PR #54). Done: 503 tests pass.
- [X] T002 In `status/src/types.ts`, add the types of data-model.md: `QualityLevel = "good" | "warn" | "poor" | "not-checked"`; `SpeedResult` (`level`, `score: number | null` "0 to 100", `field: { source: "url" | "origin"; lcpMs?: number; inpMs?: number; cls?: number; slow: string[] } | null` "null = Lab test only", `report: string`); `AccessibilityResult` (`level`, `score`, `failed: number | null`, `report`); `LinkResult` (`level`, `pages: number` "≤ 50", `broken: { url: string; page: string; status: number | "error" }[]`, `blocked: number`); `HeaderResult` (`level`, `present: string[]`, `missing: string[]`, `report`); each result has an optional `note?: "no key" | "site down" | "service error"` and an optional `from?: string` (page view only, data-model.md "Page view of a site"); `QualityCheck` (`projectId`, `domain`, `checkedAt`, `speed`, `accessibility`, `links`, `headers`); `QualityDay` (`version: 1`, `date`, `checks`). Add `quality?: QualityCheck` to `ProjectStatus` and `qualityDate?: string | null` to `StatusPage`.
- [X] T003 [P] In `status/tests/helpers.ts`, add `qualityCheck(overrides?: Partial<QualityCheck>): QualityCheck` with all 4 results `good` for `harmonieorkestbrummen.nl` (speed 94, accessibility 96 with 0 failed, links 12 pages 0 broken 0 blocked, headers 4 of 4), and `notChecked(note)` that returns a `QualityCheck` with all 4 results `not-checked` and that note.
- [X] T004 [P] Make the PSI fixtures in `status/tests/fixtures/`: `psi-lab-only.json` (performance score 0.71, accessibility 0.96 with one audit `weight: 10, score: 0` and one `weight: 0, score: 0`, no `loadingExperience.metrics`, no `originLoadingExperience`), `psi-field-slow.json` (performance 0.92, `loadingExperience.metrics` with `LARGEST_CONTENTFUL_PAINT_MS` `{ percentile: 4300, category: "SLOW" }`, `INTERACTION_TO_NEXT_PAINT` `{ percentile: 180, category: "FAST" }`, `CUMULATIVE_LAYOUT_SHIFT_SCORE` `{ percentile: 5, category: "FAST" }` (CLS × 100 in the API)), `psi-origin-only.json` (URL metrics empty, `originLoadingExperience.metrics` with all 3 `FAST`). Only the fields that research.md §3 reads.

---

## Phase 2: Foundational

**Purpose**: the 4 checks, the levels and the day file. US1, US2 and US3 read the day file.

- [X] T005 [P] Make `status/tests/quality-level.test.ts` for FR-003 and research.md §3: `scoreLevel(90)` → good, `89` → warn, `50` → warn, `49` → poor, `null` → not-checked; `speedLevel(92, { slow: ["LARGEST_CONTENTFUL_PAINT_MS"] })` → poor; `linkLevel({ broken: [], blocked: 2 })` → warn, `({ broken: [x], blocked: 0 })` → poor, `({ broken: [], blocked: 0 })` → good; `headerLevel(4)` → good, `3` → warn, `1` → warn, `0` → poor.
- [X] T006 Make `status/src/quality/level.ts` with `scoreLevel`, `speedLevel`, `linkLevel`, `headerLevel` so that T005 passes.
- [X] T007 [P] Make `status/tests/quality-psi.test.ts`: with a fake `fetch` that returns each fixture of T004, `checkPsi(domain, key, fetch)` gives — `psi-lab-only`: speed score 71 level warn, `field: null`, accessibility 96 good with `failed: 1` (only audits with weight > 0 and score 0); `psi-field-slow`: speed 92 but level poor, `field.source: "url"`, `lcpMs: 4300`, `inpMs: 180`, `cls: 0.05`, `slow: ["LARGEST_CONTENTFUL_PAINT_MS"]`; `psi-origin-only`: `field.source: "origin"`. The request URL has `strategy=mobile`, `category=performance`, `category=accessibility`, `key=<key>`, and the encoded `https://<domain>/`. No key → both results `not-checked` with `note: "no key"` and no request. HTTP 429 or 500 → both `not-checked` with `note: "service error"` (one retry after 5 s on 5xx; inject the delay). Terms (research.md §2): `JSON.stringify` of the results of each fixture contains no audit title, description or other text of the response (put a marker text in the fixture audits and check that it is absent); an error response body is not in the result either. The report link is `https://pagespeed.web.dev/analysis?url=https://<domain>/&form_factor=mobile`.
- [X] T008 Make `status/src/quality/psi.ts` with `checkPsi` so that T007 passes. Timeout 120 s. Log nothing from the response body.
- [X] T009 [P] Make `status/tests/quality-headers.test.ts`: `checkHeaders(headers: Headers, domain)` with all 4 → good, `present` in the order `strict-transport-security`, `content-security-policy`, `x-content-type-options`, `referrer-policy`; header names in other case still count; `content-security-policy-report-only` alone does not count as CSP; `x-content-type-options: sniff` does not count (only `nosniff`); none → poor with all 4 in `missing`. Report link `https://developer.mozilla.org/en-US/observatory/analyze?host=<domain>`.
- [X] T010 Make `status/src/quality/headers.ts` with `checkHeaders` so that T009 passes.
- [X] T011 [P] Make `status/tests/quality-links.test.ts` with a fake `fetch` (a map of URL to status, headers and HTML) and a fake clock/delay, for FR-005 and research.md §4:
  - `parseRobots(text)` keeps only the `Disallow` lines of the group `User-agent: *`; an empty `Disallow:` disallows nothing; `allowed("/admin/x", rules)` with `Disallow: /admin` → false.
  - The walk starts at `https://<domain>/`, follows `a[href]` of the same host only, skips `mailto:`, `tel:`, `javascript:` and `#`-only links, reads only `text/html` responses, reads each page once, and stops at 50 pages (a fixture site with 60 linked pages → `pages: 50`).
  - Requests to the site are at least 1000 ms apart (check the delays that the fake clock records).
  - A link to another host gets `HEAD`; on 405 or 501, one `GET`; each address is requested once in a run, also when 5 pages link to it; at most 4 requests to other hosts at the same time.
  - Broken: 404 and 500 on the same host or another host, and a network error, after one retry 5 s later (`status: "error"` for the network error). 403, 429 and 999 on another host → `blocked`, not broken. 403 and 429 on the checked site itself → broken (research.md §4). A redirect to a page with 200 → not broken.
  - FR-014: a page that answers 404 with a body that contains a marker text → `JSON.stringify` of the `LinkResult` has the address and the status, but not the marker text.
  - A page disallowed by `robots.txt` is not read; a link to it is still checked with `HEAD`.
  - The home page response headers are returned for T010 (one request, not two).
  - The site is down (the home page fails twice) → `links` and `headers` `not-checked` with `note: "site down"`.
- [X] T012 Make `status/src/quality/links.ts` with `parseRobots`, `allowed` and `checkLinks(domain, fetch, delay)` → `{ links: LinkResult; homeHeaders: Headers | null }`, using Bun `HTMLRewriter` for `a[href]`, so that T011 passes. User agent `ImreBoersma-projects-quality-check`; timeout 15 s for each request.
- [X] T013 [P] Make `status/tests/quality-store.test.ts` for contracts/quality-file.md and research.md §7: `writeDay(dir, day)` writes `quality/<date>.json` (pretty JSON, ends with a new line); `readDays(dir, now)` returns `{ newest, previous, days }` (the newest valid file, the valid file before it, and all valid files of the last 30 days, newest first); a file that is not valid JSON or has `version` ≠ 1 is skipped (the one before it is used); a result with an unknown `level` reads as `not-checked`; a missing folder → `{ newest: null, previous: null, days: [] }`. `pageView(days, projectId)`: a kind that is `not-checked` in the newest file takes the newest earlier result of that kind that is not `not-checked`, with `from: "<date of that file>"`; a kind that is checked in the newest file has no `from`; a kind with no checked result in 30 days stays `not-checked` with its `note`; a file older than 30 days is not used; a project not in the newest file → null.
- [X] T014 Make `status/src/quality/store.ts` with `writeDay`, `readDays` and `pageView` so that T013 passes. `from` is never written to a day file.
- [X] T015 Make `status/src/quality/main.ts`, the entry of the daily run, with `parseArgs` options `--catalog` (default `../projects.yaml`), `--out` (folder for the day file), `--data` (the `quality/` folder of the branch `data`, for the 2-checks rule), `--only <project id>`, `--dry-run`. It reads the catalog, takes each project with a `domain` that is not archived, runs `checkLinks` (then `checkHeaders` on its home headers) and `checkPsi` with `process.env.PSI_API_KEY` for each site one after the other, and writes one `QualityDay` with `date` = the UTC date of the run. When the link walk says "site down", speed and accessibility are also `not-checked` with `note: "site down"` and no PSI call. The log has one line for each site: `Quality <domain>: speed <level> <score>, accessibility <level> <score>, links <level> (<pages> pages, <n> broken), headers <level> (<n> of 4)`; no error text and no body text (FR-014). In `status/package.json`, add the script `"quality": "bun run src/quality/main.ts"`.
- [X] T016 In `projects.yaml` `secrets`, add `PSI_API_KEY` with `kind: actions-secret`, `where: ImreBoersma/projects`, `expires: never` and no `project` (shared), per research.md §2 and spec 013, so that the secrets compare of the status run does not report it as missing.
- [X] T017 Make `.github/workflows/site-quality.yml`: `on: schedule: cron "43 4 * * *"` and `workflow_dispatch`; `concurrency: site-quality`. Job `check` (`permissions: contents: write, issues: write`, `timeout-minutes: 45`, plan.md "Performance Goals"): checkout; setup-bun; `bun install --frozen-lockfile` in `status/`; get the branch `data` into `../_data` as the `Get the stored results` step of `status-page.yml` (missing branch is normal); `bun run quality --out ../_quality --data ../_data/quality` with `PSI_API_KEY: ${{ secrets.PSI_API_KEY }}` and `GITHUB_TOKEN`; then write `../_quality/<date>.json` to `quality/<date>.json` on the branch `data` with the same retry as the `history` job of `status-page.yml` (checkout `data`, copy, commit `chore: add the quality result of <date>`, push; on failure fetch, reset, copy again, push once more). Keep the `history` job of `status-page.yml` as it is (no refactor).

**Checkpoint**: `bun test tests/quality-*.test.ts` passes; `PSI_API_KEY=… bun run quality --only pretband --out ../_quality --dry-run` writes one valid day file (quickstart.md §2).

---

## Phase 3: User Story 1 - The Maintainer sees the quality of each site in one table (Priority: P1) 🎯 MVP

**Goal**: the tab "Quality", the pop-up block, the row warning and `status.json`.

**Independent Test**: build the page with fixture day files for 4 sites; the tab shows 4 results, a date and report links for each site, without scripts.

- [X] T018 [P] [US1] In `status/tests/view.test.ts`, add: `rowKind` of a row with no problems and `quality.links.level: "poor"` → `warn`; with all quality `good` → `good`; with all `not-checked` → `good`; `totalState` of rows whose only issue is a poor quality result has 0 problems and the kind of "all correct" (FR-006).
- [X] T019 [US1] In `status/src/view.ts`, make `rowKind` return `warn` when a quality result of the row is `warn` or `poor`, so that T018 passes. Do not change `totalState`, `summaryFact` or `rowKeys` of problems.
- [X] T020 [P] [US1] In `status/tests/render.test.ts`, add tests for contracts/page.md "Tab Quality": the tab `quality` is after `versions` with address `?tab=quality`; the heading says `Checked on <date>` with `page.qualityDate`, or `Not checked yet` when it is null; one row for each row with a `domain` and `quality`, a row with a domain and no `quality` shows `Not checked yet`; cells `Good 94`, `Warning 71` + `Lab test only`, `Poor: 1 broken` + the list, `Warning: 2 of 4` + the missing names; badges with text (`Good`, `Warning`, `Poor`, `Not checked`) and the badge classes of spec 012; with field data the speed cell has `Real users: LCP 4.3 s, INP 180 ms, CLS 0.05`; 12 broken links show 10 and `and 2 more` as plain text when `qualityIssues` (a `Map<string, number>` of project id to issue number, empty in US1) has no number for the project, and as a link to that issue when it has one; a result with `from: "2026-11-17"` shows `from 17 Nov` in its cell; a `not-checked` result without `from` shows `Not checked` and its note (`Site down`, `No key`, `Service error`); report links have `target="_blank"`, `rel="noopener noreferrer"` and the new-tab mark of spec 012; the tab count badge is the number of sites with a poor result; the project pop-up has a block "Quality" with the same 4 cells; all of it is in the HTML without scripts.
- [X] T021 [US1] In `status/src/render.ts`, add the tab `["quality", "Quality"]` after `versions`, a `qualitySection(rows, qualityDate, qualityIssues)` and the pop-up block, so that T020 passes. Add `qualityIssues?: Map<string, number>` to `StatusPage` (US1 passes an empty map; T033 fills it). Keep the cell HTML short (FR-013).
- [X] T022 [P] [US1] In `status/tests/data.test.ts`, add: a project with a site and `quality` gets `site.quality` as contracts/page.md "status.json" (`links.broken` is a count, not the list; no `note`); without `quality` → `site.quality: null`; `version` stays 1.
- [X] T023 [US1] In `status/src/data.ts`, add `site.quality` so that T022 passes.
- [X] T024 [US1] In `status/src/main.ts`, in page mode, read the day files with `readDays(join(dirname(args.history), "quality"), now)` when `--history` is set (so `status-page.yml` does not change), set `s.quality = pageView(days, s.project.id)` for each row, and set `page.qualityDate = newest?.date ?? null`. Log `Quality: day file <date>` or `Quality: no day file`.
- [X] T025 [US1] In `status/tests/size.test.ts`, give each of the 20 worst-case rows a `quality` with 10 broken links and field data (the largest cells), and keep the limit < 30 KB gzip (SC-006); log the new size. Done: 27,656 B gzip (31,371 B before the pop-up stopped listing the broken links; contracts/page.md).

**Checkpoint**: quickstart.md §3 and §5.

---

## Phase 4: User Story 2 - One issue when a site stays poor (Priority: P2)

**Goal**: one `status-problem` issue for each site after 2 poor checks in a row; update and close.

**Independent Test**: fixture day files poor, poor, good → open after day 2, close after day 3.

- [X] T026 [P] [US2] Make `status/tests/quality-issues.test.ts` for data-model.md "QualityIssue state" and contracts/issue.md: `planQualityIssues(today, previous, openIssues, projects, date)` →
  - links poor today and in `previous` → `open` one issue, title `<project name>: Site quality is poor`, body starts with `<!-- site-quality: <id> -->` and has only the line of the poor kind;
  - poor today, not poor in `previous` (or no `previous`) → nothing;
  - links poor yesterday and speed poor today → nothing (no kind poor in both);
  - open issue, today speed and links poor (yesterday only links) → `update` with both lines; same list and same broken links → no update;
  - open issue, no kind poor today and one kind checked → `close` with the comment of contracts/issue.md;
  - open issue, all 4 kinds `not-checked` today → nothing;
  - 25 broken links → 20 lines and `and 5 more`;
  - a project not in today's file with an open issue → nothing.
- [X] T027 [US2] Make `status/src/quality/issues.ts` with `QUALITY_MARKER = /^<!-- site-quality: (\S+) -->/`, `parseQualityMarker(body)`, `qualityIssueBody(...)` and `planQualityIssues(...)` so that T026 passes. Use `LABEL`, `listOpenIssues`, `openIssue` and `closeIssue` of `status/src/issues.ts`.
- [X] T028 [P] [US2] In `status/tests/issues.test.ts`, add a test for `updateIssue(repo, token, number, body)` (PATCH `/repos/<repo>/issues/<number>` with `{ body }`), and a test that `planIssueActions` does not close an open issue whose body starts with a `site-quality` marker.
- [X] T029 [US2] In `status/src/issues.ts`, add `updateIssue`, so that T028 passes. Do not change `MARKER` or `parseMarker`.
- [X] T030 [US2] In `status/src/quality/main.ts`, after the day file: read `previous` from `--data` (`readDays`; the file of today, if it exists from an earlier run of today, is not `previous`), list the open issues with `listOpenIssues`, run `planQualityIssues`, and with `--dry-run` only log `Open:`, `Update:` and `Close:` lines; else `ensureLabel`, then open, update and close. An issue error is logged and gives exit code 1 after the day file is written. The push step of T017 has `if: always() && hashFiles('_quality/*.json') != ''`, so a failed issue step still stores the day file; say this in a comment in the workflow.
- [X] T031 [P] [US2] In `status/tests/board.test.ts`, add: `findEntry(projects, "ImreBoersma/projects", "<!-- site-quality: hob-nl -->\n…")` returns the project `hob-nl`.
- [X] T032 [US2] In `status/src/board/project.ts` `findEntry`, read the project id from `parseMarker(body) ?? parseQualityMarker(body)`, so that T031 passes.
- [X] T033 [US2] In `status/src/main.ts`, page mode: also map the open `site-quality` issues to their project id (from the same `listOpenIssues` call in `issueNumbers`, with `parseQualityMarker`), and set `page.qualityIssues`, so that the `and N more` text of T021 becomes a link.

**Checkpoint**: quickstart.md §6.

---

## Phase 5: User Story 3 - The board sees one plain line about speed (Priority: P3)

**Goal**: one Dutch B1 sentence about speed on the stakeholder page.

**Independent Test**: build the HOB stakeholder page with a good and a poor speed result.

- [X] T034 [P] [US3] In `status/tests/stakeholder-view.test.ts` and `status/tests/stakeholder-render.test.ts`, add: `ProjectBlock.speed` is `"fast"` for speed `good`, `"slow"` for `poor`, null for `warn`, `not-checked` or no `quality`; the page has `De website laadt snel op een telefoon.` or `De website laadt langzaam op een telefoon. De beheerder weet het.` after the uptime sentence, and nothing for null; a poor speed result does not change `attention` or the top line; extend the forbidden-word test with `accessibility`, `toegankelijkheid`, `Content-Security-Policy`, `Strict-Transport-Security`, `pagespeed`, `observatory` and a score pattern (`/\b\d{1,3}\/100\b/`).
- [X] T035 [US3] In `status/src/stakeholder/text.ts`, add `fast` and `slow` of research.md §10; in `status/src/stakeholder/view.ts`, add `speed: "fast" | "slow" | null` to `ProjectBlock`; in `status/src/stakeholder/render.ts`, render the sentence after the uptime sentence; so that T034 passes.

**Checkpoint**: quickstart.md §4.

---

## Phase 6: User Story 4 - CI reports legacy web code (Priority: P3)

**Goal**: the optional legacy-scan step of the shared CI.

**Independent Test**: call the shared CI with `legacy-scan: true` in a test branch; the job summary lists the findings and the job passes.

- [X] T036 [US4] In `.github/workflows/ci-node.yml`, add the input `legacy-scan` and the step of contracts/ci-input.md after the test step: `if: inputs.legacy-scan`, `continue-on-error: true`, `timeout-minutes: 5`, `env: DISABLE_TELEMETRY: "1"`, `npx -y modern-web-guidance@1.0.1 legacy-scan . --json > "$RUNNER_TEMP/legacy.json"`, then `jq` writes the heading `### Legacy web code: <n> findings`, the table (file, line, guide, message with `|` and new lines escaped) and the note "The scan checks about 20 % of the Modern Web Guidance catalogue." to `$GITHUB_STEP_SUMMARY`; 0 findings → `### Legacy web code: no findings`; a failure of `npx` or `jq` → `### Legacy web code: scan not available` and exit 0.
- [X] T037 [US4] Run `actionlint` on `.github/workflows/ci-node.yml` and `.github/workflows/site-quality.yml` (the `lint-workflows.yml` check of this repo) and repair each finding.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T038 Run `cd status && bun run css && bun run lint && bun run typecheck && bun test`. All pass; record the number of tests (baseline of T001 plus the new tests) and the page size of T025. Done: lint, typecheck and 574 tests pass (503 + 71); page 27,656 B gzip for the 20-site worst case.
- [X] T039 Check quickstart.md §2 to §4 with `PSI_API_KEY` set locally and the live sites; open the page with scripts off. Record the 4 results of each site and the run time in this task (plan.md "Performance Goals": < 10 minutes for 4 sites). Done 2026-11-18 without `PSI_API_KEY` (speed and accessibility "Not checked · No key"; the key comes in T043), 4 sites in 23 s: harmonieorkestbrummen.nl links good (13 pages), headers poor (0 of 4); imreboersma.nl links warning (1 blocked: LinkedIn 999), headers warning (3 of 4); pretband.nl links good (1 page), headers warning (1 of 4); scales-imreboersma.web.app links good (1 page), headers good (4 of 4). Page built from that day file: tab "Quality" with 4 rows and the count 1, 21.6 KB gzip; the stakeholder page has no speed sentence (not checked). The first run found 2 faults, now repaired with tests: a home page that redirects to `www.` was read as another site (0 links read on imreboersma.nl), and LinkedIn answers 999 to automated requests (now "blocked", spec FR-003 and research.md §4 changed).
- [X] T040 [P] In `README.md` of `projects`, add one short paragraph: the daily quality check, the tab "Quality", the secret `PSI_API_KEY` (a table with name, where, kind, value as quickstart.md "Before the first run"), and the CI input `legacy-scan`.
- [X] T041 [P] In `PLAN.md`, add feature 023 to the table "Features" (needs 005, 010, 019, 022) and a section "### 023. Website quality checks" with 4 lines from spec.md; after the merge, move it to "Done".
- [X] T042 [P] In `docs/landscape.md`, mark gap 1 as "spec 023" in the list "Gaps that agree with the constitution".
- [ ] T043 After the merge: the Maintainer makes the key and sets `PSI_API_KEY` (quickstart.md "Before the first run", steps 1 to 4), then runs `site-quality.yml` by hand (quickstart.md §7). Record the result in this task: the daily quota of the key in the Cloud console (research.md §1), the file on the branch `data`, the issues opened (if any), and the tab after the next hourly run.
- [ ] T044 After T043: in one project repo, set `legacy-scan: true` in a test branch (quickstart.md §8); record the summary and remove the test branch.

---

## Dependencies & Execution Order

- Setup: T001; then T002; T003 and T004 after T002, in parallel.
- Foundational: the test tasks T005, T007, T009, T011, T013 can run in parallel after T002; each implementation task after its test (T006 after T005, T008 after T007 and T006, T010 after T009 and T006, T012 after T011 and T006, T014 after T013). T015 after T006 to T014. T016 any time. T017 after T015.
- US1: after Phase 2. T018/T020/T022 in parallel; T019 after T018; T021 after T020 and T019; T023 after T022; T024 after T021 and T023; T025 after T021.
- US2: after Phase 2 and T024 (the page links in T033). T026, T028, T031 in parallel; T027 after T026 and T029; T029 after T028; T030 after T027 and T029; T032 after T031 and T027; T033 after T027 and T021.
- US3: after Phase 2 and T024. T034 then T035.
- US4: independent of all other phases. T036 then T037.
- Polish: T038 after all code tasks; T039 after T038; T040 to T042 any time after T038; T043 after the merge; T044 after T043.

## Parallel Example: after Phase 2

```text
Task: "T018 [US1] view.test.ts rowKind"
Task: "T020 [US1] render.test.ts tab Quality"
Task: "T022 [US1] data.test.ts site.quality"
Task: "T026 [US2] quality-issues.test.ts"
Task: "T036 [US4] ci-node.yml legacy-scan"
```

## Implementation Strategy

1. MVP: Phase 1, Phase 2 and US1 (T001 to T025). The Maintainer sees the quality of each site the
   day after the merge (T043 gives the first day file).
2. US2: the issues, so the Maintainer does not need to open the tab each day.
3. US3 and US4 are small and independent; US4 can go first in a separate PR if a campaign needs it.
4. Polish; T043 and T044 after the merge.
