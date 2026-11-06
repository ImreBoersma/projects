# Research: Expiry of Tokens and Secrets

## 1. Read the expiry of a GitHub token (US2, FR-003)

**Decision**: for each status token in the environment (`STATUS_READ_TOKEN`,
`STATUS_READ_TOKEN_HOB`, `CONFORMANCE_READ_TOKEN`), send one `GET https://api.github.com/rate_limit`
and read the response header `GitHub-Authentication-Token-Expiration` (format
`YYYY-MM-DD HH:MM:SS UTC`). Use only the date part. No header: the token has no expiry, or it is
a classic token without one; then only a catalog date can apply.

**Rationale**: GitHub sends this header on each API response for a token with an expiry
(fine-grained tokens, and classic tokens with an expiry). `/rate_limit` does not count against the
rate limit and needs no permission. One small request for each token keeps the read separate from
the GraphQL and conformance code.

**Alternatives**: read the header from the existing GraphQL and conformance requests. Rejected:
it couples three modules to this feature for a saving of 3 requests. Ask the Maintainer to type
the dates. Rejected: SC-002 (0 manual dates).

**To verify in the implementation**: the header on `/rate_limit` with the real tokens, in the
first run on `main` (a log line with the date, never the token). The local `gh` token has no
expiry, so it cannot show the header.

## 2. The catalog list (FR-001, FR-007)

**Decision**: a top-level key `secrets` in `projects.yaml`, next to `projects`. Each item:
`name`, `kind`, `where`, `expires` (`YYYY-MM-DD` or `never`), optional `project`.
`kind` is one of `actions-secret`, `environment-secret`, `actions-variable`, `account`. `where`
is `owner/repo` for the first three, and a short host name for `account` (for example
`GoDaddy`). Contract: [contracts/catalog.md](./contracts/catalog.md).

**Rationale**: a secret of this repo belongs to no project, so a list inside each project cannot
hold it. A top-level list keeps one place for the full list (clarification 1).

**Alternatives**: a field `secrets` in each project plus a separate list for the shared ones.
Rejected: two places for one kind of data.

## 3. Status tokens without a catalog entry

**Decision**: a status token with a read date and no catalog entry is shown as a shared secret
with `kind: actions-secret`, `where: ImreBoersma/projects`. The compare (§4) still asks for a
catalog entry for it, so the full list stays complete.

## 4. Compare the workflow files with the list (FR-009)

**Decision**:

- Catalog repos of `ImreBoersma`: use the workflow texts that the conformance check (spec 008)
  already reads, and `parseCaller().secrets` (it already leaves out `GITHUB_TOKEN`).
- Repos of other owners (`harmonieorkest-brummen/hob-nl`): read `.github/workflows/*.yml` with
  the status token of that owner, with the same read function. When that fails (no `Contents:
  read` permission), log it and show no note (spec edge case).
- This repo: read `../.github/workflows/*.yml` from the checkout of the run. Skip the secrets of a
  shared workflow (`on: workflow_call`): the names under `on.workflow_call.secrets` and the
  `secrets.<name>` uses of those names are set in the calling repo, not here. The other uses in
  the file (for example a job of the same file that is not called) are compared as usual.
- A name is listed when an entry has the same `name` and `where` equal to that repo, with kind
  `actions-secret` or `environment-secret`.

**Rationale**: no new request for the own repos; spec 008 already reads them.

**Alternatives**: compare with the names of the secrets that are set in each repo (the API that
R9 of spec 008 uses). Not chosen for the note: a secret can be set but not used. It can be added
later.

## 5. Problems, issues, page

- Reason `secret-expiring`, key `<project id or "shared">/secret-expiring/<slug of the name>`,
  with the `slug` of spec 009. Limit 30 days; warning 31 to 60 days (spec 012 FR-004).
- Shared problems belong to a pseudo owner `shared` ("Shared setup", repo `ImreBoersma/projects`)
  for the issue text and the board sync. They count in the total state, the title and the summary
  of spec 012.
- When the read of a status token fails in this run and the token has no catalog date, its issue
  key goes in `keepKeys` (spec 009 rule): the issue stays open, not closed by mistake.
- The history line of spec 010 gets the shared problems under the id `shared`, so "since" works.

## 6. The catalog header and Principle III

**Decision**: change the header of `projects.yaml` to: "Do not put contact details or secret
values in this file. Secret names, places and dates are allowed (spec 013)."

**Rationale**: the names are already in the public workflow files (spec Assumptions).

## 7. Validation results

| Check | Date | Result |
|---|---|---|
| Unit tests, lint, types (T020) | 2026-11-06 | 226 tests pass (baseline 194); Biome and `tsc` clean. |
| Catalog list (T019) | 2026-11-06 | 18 entries from the workflow files of all catalog repos and this repo, read with `usedSecrets`. pretband-backend has no workflows. Local run with the real catalog: 0 gaps for the own repos and this repo. |
| Local run with test dates (T021) | 2026-11-06 | A shared secret in 20 days: red badge in "Shared tokens", title `(1) Project status`, dry run `Open: Shared setup: The secret STATUS_HEALTHCHECK_URL expires in 20 days.`. A project secret in 45 days: amber badge and amber dot on boek-de-bus. The log has names and days only. The local `gh` token gives no expiry header ("no expiry"), as expected (§1). |
| Found in the implementation | 2026-11-06 | (1) The shared workflows use secret names with `-` (`secrets.ssh-password`); the name pattern of spec 008 stops at `-`, so `usedSecrets` has its own pattern. (2) The issue links of the page were keyed by reason, so two problems of one reason in one project (two renewals, two secrets) linked to one issue; now keyed by the problem key. |
