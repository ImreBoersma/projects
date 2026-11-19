# Research: Website Quality Checks

## §1 Lab test: PageSpeed Insights API with a key

**Decision**: one call to the PageSpeed Insights API v5 (`runPagespeed`) for each site and day,
with `strategy=mobile`, `category=performance` and `category=accessibility`, and the key
`PSI_API_KEY`. The one response gives the speed score, the accessibility score and its failed
audits, and the field data of real users (`loadingExperience`, else
`originLoadingExperience`).

**Rationale**: one request gives 3 of the 4 results. No browser in the runner, no new dependency.
The PSI documentation gives no quota number; the Maintainer reads the quota of the key in the
Google Cloud console after making it (T043). The run makes at most 20 calls each day.

**Checked on 2026-11-18**: a call without a key returns HTTP 429 with
`quota_limit_value: "0"` for `defaultPerDayPerProject`. So the key is necessary, not optional.

**Field data will stop**: the PSI get-started page (read 2026-11-18) says that Google plans to
stop the real-user data of the Chrome UX Report in this API, and points to the CrUX API. When it
stops, `field` is null and the page shows "Lab test only" (no code change). A later change can add
the CrUX API with the same key, if a site has field data then.

**Alternatives considered**:

- Lighthouse in the GitHub runner (`lighthouse` package and Chrome): no key, but a large
  dependency, about 1 minute for each site, scores that change with the load of the runner, and
  no field data.
- Unlighthouse: the same as Lighthouse, for many pages. Too much for home-page checks.
- Chrome UX Report API for field data: a second key and a second call, for data that the PSI
  response already has.

## §2 The API key

**Decision**: the Maintainer makes the key in a new Google Cloud project without billing (for
example `status-checks`), restricts it to the PageSpeed Insights API, and sets no expiry. The
secret `PSI_API_KEY` goes in `projects.yaml` `secrets` with `where: ImreBoersma/projects`,
`kind: actions-secret`, `expires: never` (spec 013).

**Rationale**: a project without billing cannot make a bill (Principle VIII). The existing project
`imre-boersma` is on Blaze (PLAN.md 014), so a key there is not a bill risk for PSI, but it is in
a project that can bill. A restricted key that leaks gives only free PSI calls.

**Without the key** (not set, or HTTP 4xx): the speed and accessibility results are "not
checked"; links and headers still run.

**Terms (Principle VIII), read on 2026-11-18**: Google APIs Terms of Service
(<https://developers.google.com/terms>, last changed 2021-11-09) and the PSI v5 pages
(get-started, about, reference). The PSI pages link to no extra terms. Result:

- No rule stops personal, non-profit or organisation use. One person checks the sites that the
  person maintains; no API access goes to a third party (§4(a)(1)).
- §5(e): no permanent copies and no public display of API content without permission. So the day
  file and the page keep only our own derived facts (score as a whole number, level, failed-rule
  count, field percentiles, our link), never the API response, audit texts or screenshots; the
  full report is a link to the PSI site. A test checks that the day file has no API text (T007).
- §4(b)(1): keep the key confidential and out of open-source code. The key is only an Actions
  secret.
- §6(c): no text that says Google supports the orchestra or the status page.
- Terms can change with 30 days of notice. Read them again when the quota or the API changes.

This is the reading of the Maintainer for a €0 personal tool, not legal advice.

## §3 Levels from the PSI response

**Decision**:

- Score = `round(category.score × 100)`.
- Speed and accessibility: good ≥ 90, warning 50 to 89, poor < 50 (the Lighthouse colour bands).
- Field data: use `loadingExperience.metrics` when it has at least one of
  `LARGEST_CONTENTFUL_PAINT_MS`, `INTERACTION_TO_NEXT_PAINT`, `CUMULATIVE_LAYOUT_SHIFT_SCORE`;
  else `originLoadingExperience.metrics`; else "Lab test only". A metric with
  `category: "SLOW"` makes the speed level poor (the published Core Web Vitals limits: LCP > 4 s,
  INP > 500 ms, CLS > 0.25). Keep the percentile values for the page.
- Failed accessibility rules = the audits of the accessibility category with weight > 0 and
  score 0.

## §4 Link check

**Decision**: own code in `status/src/quality/links.ts` with Bun `HTMLRewriter` (built in, no
dependency). From the home page, a breadth-first walk of pages of the same host:

- Read `robots.txt` once; obey `Disallow` lines of the group `User-agent: *` (prefix match).
- At most 50 pages; at most 1 request each second to the site; timeout 15 s for each request;
  user agent `ImreBoersma-projects-quality-check` (as the uptime check).
- Collect `a[href]` (not `mailto:`, `tel:`, `javascript:`, `#` only). Read only `text/html`
  pages.
- Each link to another host: `HEAD`; on 405 or 501, one `GET`. At most 4 requests at the same
  time to other hosts; each address once in a run.
- Broken: status ≥ 400, or a network error, after one retry 5 s later. Only one exception: 403,
  429 and 999 on another host are "blocked" (warning level), because many sites block automated
  requests (LinkedIn answers 999; found in the first live run on 2026-11-18). On the checked site itself, 403 and 429 are broken (the Maintainer controls that
  site). Redirects are followed; the last status counts.

**Alternatives considered**: lychee (a Rust binary in the runner; good, but one more download and
no limit for pages of the same site), linkinator (npm dependency). The walk of 50 pages with a
fixed rate is small enough to own.

## §5 Security headers

**Decision**: the headers of the `GET` of the home page (the first request of §4, after
redirects). Check, without case: `strict-transport-security`, `content-security-policy` (not the
`-report-only` header), `x-content-type-options: nosniff`, `referrer-policy`. Count the present
ones: 4 good, 1 to 3 warning, 0 poor.

**Report link**: `https://developer.mozilla.org/en-US/observatory/analyze?host=<domain>`.

## §6 A separate daily workflow

**Decision**: a new workflow `.github/workflows/site-quality.yml` with `schedule` once each day
(04:43 UTC) and `workflow_dispatch`. It checks the sites, writes the day file to the branch
`data`, and opens, updates or closes the quality issues. The hourly status run only reads the last
day file. Spec FR-001 and its edge case are changed to this.

**Rationale**: a "less than 20 hours old" guard in the hourly run needs the last check time
before each run, and a hand run of the status page would still be able to use the limits. A
separate schedule is simpler, and a failure of a quality check cannot stop the status page.

**Alternatives considered**: the guard in the hourly run (rejected above); a weekly check (too
slow for a broken link; the spec asks for 2 days).

## §7 Storage

**Decision**: one file each day, `quality/YYYY-MM-DD.json`, on the branch `data` (spec 010). A
second run on the same day replaces the file. The push uses the same retry as the `history` job
(fetch, reset, write again, push). The status run reads `../_data/quality/` from the worktree that
it already makes; the newest file is the result, and its date shows on the page.

**Fallback for "not checked"** (spec FR-004, edge case "site is down"): for each site and each of
the 4 kinds, the page uses the result of the newest file; when that result is `not-checked`, it
uses the newest earlier file of the last 30 days in which that kind was checked, and shows that
file's date next to the cell ("from 17 Nov"). The issue rule (§8) uses only the newest and the
previous file, without fallback, so "not checked" never counts as poor.

**Rationale**: no change to the hourly result lines of spec 010 and their validation. Spec 021 can
read the day files later.

## §8 Issues

**Decision**:

- Label `status-problem` (the same label, so board sync of spec 004 adds the issue), marker
  `<!-- site-quality: <project id> -->`. `parseMarker` of `issues.ts` does not match it, so the
  hourly reconcile does not close it.
- `board/project.ts` `findEntry` also reads the `site-quality` marker, so the issue gets the right
  Project field.
- Rule: open when the set of kinds that are poor today and poor in the previous day file is not
  empty. While open, the body lists the kinds that are poor today; when the list changes, PATCH
  the body. Close with a comment when no kind is poor today. When all 4 results are "not checked"
  today, change nothing.
- The quality run uses `GITHUB_TOKEN` with `issues: write`; no new token.

## §9 Page

**Decision**: a tab "Quality" after "Versions", one table row for each checked site, 4 cells with
the badge classes of spec 012 (`good`, `warn`, `bad`, `unknown`). The project pop-up of spec 019
gets the same 4 results. `rowKind` returns `warn` when a quality result is a warning or poor; the
total state does not change (FR-006). At most 10 broken links for each site on the page; "and N
more" links to the issue. Size estimate: 20 sites × about 300 bytes gzip = 6 KB; the page is at
23 KB gzip, so the budget of 30 KB stays if the cell HTML is short. A test checks it (SC-006).

## §10 Stakeholder sentence

**Decision**: in `stakeholder/text.ts`:

- `fast`: "De website laadt snel op een telefoon."
- `slow`: "De website laadt langzaam op een telefoon. De beheerder weet het."

Only for speed good or poor; nothing for a warning or "not checked" (FR-010). "Weet het" as the
existing texts.

## §11 Legacy scan in the shared CI

**Decision**: `ci-node.yml` gets the input `legacy-scan` (boolean, default `false`). A step with
`if: inputs.legacy-scan`, `continue-on-error: true`, `timeout-minutes: 5` and
`DISABLE_TELEMETRY=1` runs `npx -y modern-web-guidance@1.0.1 legacy-scan . --json`, and `jq` writes
a table (file, line, guide, message) to `$GITHUB_STEP_SUMMARY`. A failure writes "Legacy scan not
available".

**Rationale**: a pinned version gives the same rules in each run; Renovate does not update an
`npx` version in YAML, so a campaign updates it. The scan skips docs and tests itself.

**Alternatives considered**: a separate shared workflow (one more caller in each repo; the input is
smaller); the Claude Code plugin (not available in CI).
