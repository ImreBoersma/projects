# Research: Uptime Checks on the Status Page

## 1. Where the check runs

**Decision**: in the status page generator (`status/src/uptime.ts`), in the existing
`status-page.yml` run.

**Rationale**: the page, the problem rules and the issue rules are already in this generator
(FR-006, FR-007). The check needs no token.

**Alternatives**: a separate `uptime.yml` workflow. Rejected: it must write its result to the page,
so it needs a state file in the repo or a second Pages artifact. An external monitor (for example
a free uptime service). Rejected: Principle I (GitHub only) and a second place for alerts.

## 2. Schedule each hour (FR-005, SC-002)

**Decision**: change the cron of `status-page.yml` from `0 5,17 * * *` to `17 * * * *`.

**Rationale**: one run each hour checks the sites. Minute 17 avoids the start of the hour, when
GitHub delays more scheduled runs. A site that stays down gets an issue in the next run, so within
approximately 1 hour plus the delay of the scheduler. That is within 2 hours (SC-002).

**Effects**:
- The page deploys 24 times each day. GitHub Pages has a soft limit of 10 builds each hour, so 1
  each hour is sufficient.
- The GitHub data of spec 001 updates each hour. The GraphQL query costs approximately 1 point of
  5000 each hour.
- The board sync of spec 004 also runs each hour. Issues of private repos then come to the board
  within approximately 1 hour, not 13 hours. SC-001 of spec 004 stays true.
- Actions minutes are free in a public repo.

**Risk**: GitHub disables scheduled workflows of a public repo after 60 days without activity in
the repo. Renovate PRs and merges in `projects` make activity each week (spec 003). If the schedule
stops, the stale-data warning of the page shows after 3 hours (contracts/page.md; spec 001 used 48
hours).

## 3. What is "Up" (FR-003, edge cases)

**Decision**: `GET https://<domain>/` with `redirect: "follow"` and a timeout of 10 seconds for
each attempt. "Up" when the final response has a status 200 to 299 (`response.ok`). Each other
result is "Down": an error status, a timeout, a DNS error, a TLS error, or too many redirects.
Send the header `User-Agent: ImreBoersma-projects-status-check`. Read no response body.

**Rationale**: Bun `fetch` rejects a certificate that is not valid or expired, so a TLS problem is
"Down" (edge case). A maintenance page with status 503 is "Down" (edge case). `GET` and not `HEAD`,
because some hosts give 405 or 404 for `HEAD`. The body is not read, so no site content can go to
the page (FR-011).

## 4. Second attempt (FR-004, US3)

**Decision**: after a failed first attempt, wait 5 seconds and try one more time. "Down" only when
both attempts fail.

**Rationale**: a short network error or a cold start of a host is usually repaired in seconds. 5
seconds keeps the run short.

## 5. All sites down (FR-008)

**Decision**: when the catalog has 2 or more domains and all of them are "Down" in one run, all
results become "Check not available". Then there is no `site-down` problem, and the issue rules
keep each open `site-down` issue. With 1 domain the rule does not apply, because one site that is
down is then the most probable cause.

**Rationale**: when all sites fail at the same time, the most probable cause is the network of the
runner. With 4 domains on 4 hosts, a real outage of all 4 at the same time is not probable.

**Risk**: a real outage of all sites shows "Check not available" and opens no issue. Accept this:
the page still shows the result, and it is not probable.

## 6. Problems for rows without a repo

**Decision**: the `site-down` problem does not depend on the repo data. `pretband` and `hob-nl`
have a domain but no repo. Their rows get the problem and the issue too.

**Rationale**: `evaluateProblems()` returns no problems when the repo data is not available
(spec 001). The uptime problem has a different source, so it must not follow that rule.

## 7. The two jobs of the status run

**Decision**: the job `build` (page) and the job `issues` both run the check, as they both read
the GitHub data now (spec 001, research.md §8).

**Rationale**: the same pattern as the other data. The two checks run some seconds apart, so a
site that changes state in those seconds can show "Up" on the page while the issues job sees
"Down". The next run corrects it.

**Alternatives**: write the results of `build` to a file and give it to `issues` as an artifact.
Rejected for now: more code for a small window. Use it if the difference causes wrong issues.

## 8. Catalog rule for `domain` (FR-009)

**Decision**: `domain` is empty or a host name: lower case letters, digits and hyphens in labels,
labels separated by dots, at least one dot, no scheme, no path, no port. Regex:
`^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$`.

**Rationale**: the check makes the URL from the host name. A value with a scheme or a path makes a
wrong URL. The 4 current values pass the rule.

## 9. Log output

**Decision**: the log shows only `Site <domain>: Up` or `Down` or `Check not available`. It does
not show the error text.

**Rationale**: the logs of a public repo are public. FR-011 is about the page and the issues, but
the same rule keeps the logs short.

## 10. Validation results

| Check | Date | Result |
|---|---|---|
| Local page (T012) | 2026-11-04 | The test domain `does-not-exist.imreboersma.nl` showed "Down" and the problem, first in the table. The 4 real sites showed "Up". `domain: https://pretband.nl` stopped the run with the catalog error. |
| Issues dry run (T015) | 2026-11-04 | Only `Open: Test down: The site does not respond correctly.` |
| Run time (T019) | 2026-11-04 | 2 seconds with 4 sites up; 6 seconds with 1 site down (the second attempt waits 5 seconds). |
| Live page after the merge | 2026-11-05 | Push run 42005338902 passed (build, issues, deploy). The live page has the column "Site", the 4 sites show "Up 09:48", and the warning uses 3 hours. |
| Check from GitHub runners | 2026-11-04 | PR run 41815750803: the 4 sites were "Up". The hosts do not block the data-centre addresses of GitHub or the `User-Agent` of the check. Check this again when a site behind bot protection (for example Cloudflare or a WordPress security plugin) is added. |
