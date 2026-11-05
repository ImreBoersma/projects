---

description: "Task list for renewals and certificate expiry"
---

# Tasks: Renewals and Certificate Expiry

**Input**: Design documents from `/specs/009-renewal-expiry/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: `bun test` in `status/` for each module, because this is application code (Principle
IX). The readers (certificate, RDAP) are injected, so the tests make no network calls. The steps of
quickstart.md validate the real run.

**Organization**: types, catalog list and the pure expiry functions are foundational. US1 adds the
certificate, US2 the catalog renewals and their issues, US3 the registry date.

**Paths**: all paths are in this repo (`ImreBoersma/projects`). Make the changes on a branch and
merge them in one PR.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependencies)
- **[Story]**: the user story of the task (US1, US2, US3)

---

## Phase 1: Setup

- [X] T001 Create the branch `009-renewal-expiry` from `main`. All code changes stay on this branch until T022.

---

## Phase 2: Foundational

**Purpose**: types, the catalog list and the shared pure functions.

- [X] T002 In `status/src/types.ts`: add `renewals?: { name: string; date: string }[]` to `Project`; add `"cert-expiring" | "renewal-due"` to `Reason`; add `text?: string` to `Problem`; add `Expiry` of `specs/009-renewal-expiry/data-model.md` (`certificate: { date: string; days: number } | "not-known" | null`, `renewals: { name; date; days; source: "catalog" | "registry" }[]`, `registryNotKnown: boolean`) and `expiry: Expiry` on `ProjectStatus`. In `status/src/github.ts` `emptyStatus()` and `status/tests/helpers.ts`, set `expiry: { certificate: null, renewals: [], registryNotKnown: false }`. In `status/src/problems.ts`, add fixed texts for the two reasons ("The TLS certificate expires soon.", "A renewal is due."); they are used only when `text` is missing. Run `bunx tsc --noEmit -p .` and `bun test`.
- [X] T003 [P] In `status/tests/catalog.test.ts`, add tests for the list `renewal` of `specs/009-renewal-expiry/contracts/catalog.md`: a valid list is returned as `renewals`; an empty `renewal:` gives no renewals; a value that is not a list, a missing or 41-character name, a date `2027-13-01` or `2027-02-30` or `1-3-2027`, and the name `Domain` two times (also `domain` and `Domain`) each throw the error text of the contract. Then implement it in `status/src/catalog.ts` ("`name` non-empty, at most 40 characters, unique in the project without case; `date` `YYYY-MM-DD` and a real date"). Make the tests pass. Make sure that the real `projects.yaml` still loads: its `renewal:` fields are empty.
- [X] T004 [P] Create `status/tests/expiry.test.ts` and `status/src/expiry/expiry.ts` with the pure functions `daysUntil(date: string, now: Date): number` (whole days from the start of today UTC to the date UTC, rounded down, negative in the past, research.md §5) and `slug(name: string): string` (lower case; each run of characters other than `a-z0-9` becomes `-`; no `-` at the start or end). Tests: today gives 0, tomorrow 1, yesterday -1, a time late in the day does not change the result, `slug("Hosting (yearly)")` gives `hosting-yearly`.

**Checkpoint**: the catalog accepts renewals; days and slugs are tested.

---

## Phase 3: User Story 1 - Know before a certificate expires (Priority: P1) 🎯 MVP

**Goal**: certificate days on the page; a problem at 14 days or less.

**Independent Test**: an injected certificate reader with 10 days gives the problem and one planned issue.

- [X] T005 [P] [US1] In `status/tests/expiry.test.ts`, add tests for `certificateProblem(projectId, certificate)` of `status/src/expiry/expiry.ts`: 15 days gives `null`; 14 days gives `{ reason: "cert-expiring", key: "<id>/cert-expiring", text: "The TLS certificate expires in 14 days." }`; 1 day gives "in 1 day."; -3 gives "The TLS certificate expired 3 days ago."; `"not-known"` and `null` give `null`. Then implement it. Make the tests pass.
- [X] T006 [US1] Create `status/src/expiry/read.ts` with `readCertificate(host: string, now: Date, connect = tls.connect): Promise<{ date: string; days: number } | "not-known">` (research.md §1: `servername` = host, port 443, `rejectUnauthorized: false` so that an expired certificate can be read, timeout 10 seconds; `getPeerCertificate().valid_to` as `YYYY-MM-DD`; each error or timeout gives `"not-known"`; always end the socket). Add tests in `status/tests/expiry-read.test.ts` with a fake `connect` that gives a certificate, an expired certificate (negative days), an error, and no answer (timeout); also check that `connect` gets `rejectUnauthorized: false`.
- [X] T007 [US1] In `status/tests/render.test.ts`, add tests for the column "Expiry" of `specs/009-renewal-expiry/contracts/page.md`: the header has `<th>Expiry</th>` after "Site"; `Certificate: 44 days`; `Certificate: not known`; no certificate line without a domain; `Certificate: 1 day` (singular, also for renewals: `Hosting: 1 day`, `Hosting: 1 day ago`); the cell has `data-label="Expiry"`; a problem with `text` shows that text instead of the fixed text. Then change `status/src/render.ts`. Make the tests pass. Fix the older render tests that list the columns.
- [X] T008 [US1] In `status/src/main.ts`, both modes: for each project with a `domain`, call `readCertificate()` at the same time as the uptime check, set `s.expiry.certificate`, and add the problem of `certificateProblem()`. Log one line for each domain: `Certificate <domain>: <n> days` or `Certificate <domain>: not known`. Run `bun test`, `bun run lint` and `bunx tsc --noEmit -p .`.
- [X] T009 [US1] In `status/tests/issues.test.ts`, add tests and then change `planIssueActions()` in `status/src/issues.ts` (research.md §7): a `<id>/cert-expiring` issue stays open when the certificate of that project is `"not-known"` in this run; it closes when the certificate has more than 14 days. Use `problem.text` (when set) in the issue title. Add the steps of contracts/page.md "Issue" for `cert-expiring` to the issue body. Pass the set of projects with an unknown certificate from `main.ts`. Done: `planIssueActions()` gets the set `keepKeys` (`<id>/cert-expiring` when the certificate is not known, `<id>/renewal-due/domain` when the registry date is not known and the catalog has no "Domain"); `Problem` got the optional field `source`, so that the issue steps of a registry renewal differ.
- [X] T010 [US1] Run quickstart.md §2 locally on the real domains. Make sure that the 4 sites show `Certificate: <n> days` and that there is no certificate problem. Done 2026-11-05: see research.md §9.

**Checkpoint**: certificates are on the page and give issues before they expire.

---

## Phase 4: User Story 2 - Know before a domain or contract must be renewed (Priority: P1)

**Goal**: catalog renewals on the page; a problem and an issue for each renewal at 30 days or less.

**Independent Test**: quickstart.md §3: a renewal in 20 days gives "Renewal of Hosting is due in 20 days." and one planned issue.

- [X] T011 [P] [US2] In `status/tests/expiry.test.ts`, add tests for `renewalProblems(projectId, renewals)`: 31 days gives no problem; 30 days gives `{ reason: "renewal-due", key: "<id>/renewal-due/hosting", text: "Renewal of Hosting is due in 30 days." }`; -2 gives "Renewal of Hosting was due 2 days ago."; two renewals due give two problems with different keys (spec clarification, FR-006). Then implement it with `daysUntil()` and `slug()`.
- [X] T012 [US2] In `status/tests/render.test.ts`, add tests: the cell shows the renewal with the fewest days (`Domain: 120 days`), and `Hosting: 2 days ago` for a past date; nothing for a project without renewals and without a domain. Then change `status/src/render.ts`. Make the tests pass.
- [X] T013 [US2] In `status/src/main.ts`, both modes: build `s.expiry.renewals` from `project.renewals` (source `catalog`, with `days`), and add the problems of `renewalProblems()`. Add the `renewal-due` steps of contracts/page.md "Issue" to the issue body (catalog steps for a catalog renewal, registry steps for a renewal with `source: "registry"`) in `status/src/issues.ts`, with a test in `status/tests/issues.test.ts` that the key `one/renewal-due/hosting` is read back by `parseMarker()`.
- [X] T014 [US2] Validate quickstart.md §3 with a catalog copy in the scratchpad and the issues mode with `--dry-run` only. Do not change `projects.yaml`. Done 2026-11-05: see research.md §9.

**Checkpoint**: renewals give one issue each, 30 days before the date.

---

## Phase 5: User Story 3 - Get the domain expiry date from the registry (Priority: P3)

**Goal**: the registry date where the registry publishes it; "not known" for `.nl`.

**Independent Test**: an injected RDAP reader with a date for the domain shows `Domain: <n> days` without a catalog date.

- [X] T015 [P] [US3] In `status/tests/expiry.test.ts`, add tests for `mergeRenewals(catalog, registryDate)`: a registry date gives a renewal `{ name: "Domain", source: "registry" }`; a catalog `domain` (any case) and a registry date give one "Domain" with the earlier date; without a registry date the catalog list does not change. Then implement it.
- [X] T016 [US3] In `status/src/expiry/read.ts`, add `readRegistryDate(domain: string, bootstrap, fetch = globalThis.fetch): Promise<string | "not-known">` and `readBootstrap(fetch)` of research.md §2: one request to `https://data.iana.org/rdap/dns.json` for each run; `domain/<exact domain>` at the server of the top-level domain; the `eventDate` of the event `expiration` as `YYYY-MM-DD`. The result has three cases: a date; `"not-known"` (HTTP 200 without an `expiration` event, for example `.nl`, or an error); `"not-registered"` (HTTP 400 or 404 for the exact name, for example a platform subdomain such as `scales-imreboersma.web.app`). Add tests in `status/tests/expiry-read.test.ts` with a fake fetch: a `.app` domain with an expiration; a `.nl` domain without the event gives `"not-known"`; a subdomain with HTTP 400 gives `"not-registered"`; no server for the top-level domain gives `"not-known"`.
- [X] T017 [US3] In `status/src/main.ts`, both modes: read the bootstrap one time, then the registry date of each `domain` at the same time as the certificate; merge it with `mergeRenewals()`; set `s.expiry.registryNotKnown` when the result is `"not-known"` and the catalog has no "Domain". A `"not-registered"` domain shows no domain line (spec edge case "platform subdomain"). Show `Domain: not known` in the cell for that case (contracts/page.md), with a test in `status/tests/render.test.ts`. A registry "Domain" issue stays open when the registry date is "not known" in this run (research.md §7); add the test in `status/tests/issues.test.ts`.

**Checkpoint**: the registry date is used where it exists.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T018 [P] In `specs/001-project-status-page/contracts/catalog.md`, add a line under the title: "Spec 009 changes the field `renewal`: see `specs/009-renewal-expiry/contracts/catalog.md`".
- [X] T019 Run `bun test`, `bun run lint`, `bunx tsc --noEmit -p .` and actionlint. Run quickstart.md §2 once more. Make sure that the run takes less than 15 seconds more than before. Done: 159 tests, lint, tsc pass; the check adds about 4 seconds.
- [ ] T020 Push the branch and open the PR into `main`. CI must pass, and the log of the PR run must show `Certificate <domain>: <n> days` for the 4 domains.
- [ ] T021 Ask the Maintainer to merge the PR, because a merge to `main` deploys the page.
- [ ] T022 After the merge, open the live page and make sure that the column "Expiry" shows the 4 certificates. Give the Maintainer the table of renewal dates to add to `projects.yaml` (at least "Domain" for `pretband.nl`, `harmonieorkestbrummen.nl` and `imreboersma.nl`), in the format of contracts/catalog.md.
- [ ] T023 [P] In `PLAN.md`, mark spec 009 as done in the feature table and the Done list.

---

## Dependencies & Execution Order

- **Setup (T001)** first.
- **Foundational (T002–T004)**: T002 first; T003 and T004 in parallel after it.
- **US1 (T005–T010)**: needs Phase 2. T005 and T006 in parallel (`expiry.ts` and `read.ts`). T007 after T005. T008 needs T005 and T006. T009 needs T008. T010 last.
- **US2 (T011–T014)**: needs Phase 2. T011 can run in parallel with US1, but `expiry.ts` is shared with T005: do them one after the other. T012 after T007 (same file). T013 after T008.
- **US3 (T015–T017)**: needs US2 (the merge works on the renewal list). T015 and T016 in parallel (different files). T017 last.
- **Polish (T018–T023)**: after all stories. T022 needs the merge (T021).

## Parallel Example: Foundational

```text
status/src/catalog.ts + catalog.test.ts      (T003)
status/src/expiry/expiry.ts + expiry.test.ts (T004)
```

## Implementation Strategy

1. **MVP (US1)**: certificates; it needs no catalog data and works at once.
2. **US2**: catalog renewals; it shows value after the Maintainer enters the dates (T022).
3. **US3**: registry dates; small value now, because 3 of 4 domains are `.nl`.

All three go in one PR.
