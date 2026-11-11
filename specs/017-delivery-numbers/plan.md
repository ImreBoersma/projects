# Implementation Plan: Delivery Numbers for Each Project

**Branch**: `017-delivery-numbers` | **Date**: 2026-11-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/017-delivery-numbers/spec.md`

## Summary

In page mode, the status run sends one GraphQL query for each read token with the merged PRs
(`createdAt`, `mergedAt`, `updatedAt`, the author type) and the production deployments
(`createdAt`) of each repo, and reads more pages only while they are in the 90-day window
(research §1, §2). Pure functions make one DeliveryRow for each project: counts, the durations of
the updates (bot PRs) and of the other PRs, the deploys and their months. The tab "History"
gets a table "Delivery (90 days)" with the medians and a total row. No problem, no issue.

## Technical Context

**Language/Version**: TypeScript on Bun 1.4, in the existing `status/` package.

**Primary Dependencies**: none new.

**Storage**: none; the numbers are read again in each run.

**Testing**: `bun test`: median, time text, window and months, bot test, the paged read with a
fake fetch, the row and total computation, the table HTML, the gzip budget.

**Target Platform**: GitHub Actions (the hourly status run); the page in Chrome, Edge, Safari.

**Project Type**: extension of the status page generator.

**Performance Goals**: one query for each token (2 today) and a next page only for a repo with
more than 100 PRs or deploys in the window (none today).

**Constraints**: €0; no new token; only counts and times on the page (spec 001 FR-018); the query
asks for no text field; page < 30 KB gzip for 20 sites.

**Scale/Scope**: 8 repos today, 20 in the worst case; up to 500 PRs for each repo.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Result | Note |
|---|---|---|
| I. GitHub for all project work | Pass | The numbers come from GitHub. |
| II. Catalog is the only project list | Pass | The projects of the catalog that are not archived. |
| III. No secrets or private data | Pass | The query asks for no title, branch or login; the page has counts and times only. |
| VII. Read-only views for stakeholders | Pass | Public, read-only, as the uptime. |
| VIII. Keep the work small | Pass | Existing tokens, one query, one table in an existing tab, no issue. |
| IX. Spec Kit only for application code | Pass | The status generator is application code. |
| X. ASD-STE100 | Pass | Page text in STE. |

Re-check after Phase 1: no violations.

## Project Structure

### Documentation (this feature)

```text
specs/017-delivery-numbers/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── page.md         # the Delivery table in the tab "History"
└── tasks.md            # made by /speckit-tasks
```

### Source Code

```text
status/src/delivery/
├── stats.ts          # new: median, timeText, windowMonths(now), deliveryRow(raw, …), deliveryTotal(rows)
└── read.ts           # new: buildDeliveryQuery(repos), readDelivery(projects, env, now, fetch)
status/src/types.ts   # changed: DeliveryRow; StatusPage.delivery
status/src/main.ts    # changed: page mode reads the delivery numbers
status/src/render.ts  # changed: deliverySection() in historyPanel; class versions → data-table
status/src/page.css   # changed: .versions → .data-table
status/tests/         # new: delivery-stats, delivery-read; changed: render, size, helpers
```

**Structure Decision**: a folder `delivery/` as `versions/` of spec 016: pure functions with unit
tests, and one reader with an injected `fetch` that groups the repos by token as `fetchStatuses`.

## Complexity Tracking

No violations.
