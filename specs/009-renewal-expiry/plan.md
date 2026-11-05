# Implementation Plan: Renewals and Certificate Expiry

**Branch**: `009-renewal-expiry` | **Date**: 2026-11-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-renewal-expiry/spec.md`

## Summary

The status page generator gets an expiry module. Each run reads the TLS certificate of each
catalog `domain` (`node:tls` in Bun), the registry expiry date of each domain through RDAP where
the registry publishes it, and the renewals of the new catalog list `renewal`. The page gets a
column "Expiry" with "Certificate: <n> days" and the next renewal, for example "Domain: 120 days".
A certificate with 14 days or less is a problem `cert-expiring`; a renewal with 30 days or less
is a problem `renewal-due`, one for each renewal, with the renewal name in the key.

## Technical Context

**Language/Version**: TypeScript on Bun, in the existing `status/` package.

**Primary Dependencies**: none new. `node:tls` (Bun), `fetch` for RDAP.

**Storage**: none.

**Testing**: `bun test` with injected readers (certificate, RDAP) for the day counts, the limits,
the merge of catalog and registry dates, and the page and issue text. A local run on the real
domains.

**Target Platform**: GitHub Actions, `status-page.yml`, each hour (spec 005, external trigger).

**Project Type**: new module in an existing generator.

**Performance Goals**: 4 TLS connections and up to 5 HTTPS calls for each job, at the same time,
each with a timeout of 10 seconds.

**Constraints**: €0 each month. No cost or contract numbers on the page (FR-009). Values that
cannot be read make no problem (FR-008).

**Scale/Scope**: 4 domains, 3 of them `.nl` (no registry date). Renewals: none yet; the Maintainer
adds them after the merge.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Result | Note |
|---|---|---|
| I. GitHub for all project work | Pass | Actions, Pages, Issues. RDAP and TLS are reads of public data, not tools for project work. |
| II. Catalog is the only project list | Pass | Renewals are in `projects.yaml`, in the field `renewal` that Principle II already names. |
| III. No secrets or private data | Pass | No token needed. Renewal names only, no cost. |
| VI. Sites off the HomeLab | Pass | The checks run on GitHub runners. |
| VII. Read-only views for stakeholders | Pass | Names and days on the public page, decided in the clarification. |
| VIII. Keep the work small | Pass | One module in the existing hourly run. |
| IX. Spec Kit only for application code | Pass | Generator code. |
| X. ASD-STE100 | Pass | Page, problem and issue text use STE. |

Re-check after Phase 1: no violations.

## Project Structure

### Documentation (this feature)

```text
specs/009-renewal-expiry/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── catalog.md       # the list `renewal`
│   └── page.md          # column "Expiry", problem and issue text
└── tasks.md             # made by /speckit-tasks
```

### Source Code

```text
projects/ (this repo)
├── status/src/expiry/read.ts       # new: certificate date (node:tls) and registry date (RDAP)
├── status/src/expiry/expiry.ts     # new: pure: days, merge, limits, problems
├── status/src/types.ts             # changed: Project.renewals, ProjectStatus.expiry, Reasons, Problem.text
├── status/src/catalog.ts           # changed: validate the list `renewal`
├── status/src/problems.ts          # changed: problem texts
├── status/src/issues.ts            # changed: keep rule for cert-expiring; title with Problem.text
├── status/src/render.ts            # changed: column "Expiry"
├── status/src/main.ts              # changed: run the check in both modes
├── specs/001-project-status-page/contracts/catalog.md  # changed: pointer to this contract
└── status/tests/                   # expiry tests
```

**Structure Decision**: as spec 008: the reads (`read.ts`) are separate from the rules
(`expiry.ts`), so that the rules are pure functions with tests.

## Complexity Tracking

No violations.
