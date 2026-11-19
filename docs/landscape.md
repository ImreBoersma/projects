# Landscape: tools that do the same work

Reference material for new specs. Each section names the tools that solve the same problem as a
part of this repo, and the features of those tools that this repo does not have. The last section
gives the gaps that agree with the constitution, in the recommended order.

Written on 2026-11-18 from general knowledge of the tools, not from a new check of their
documentation. Before a spec uses a feature of a tool as a source, read the current documentation
of that tool.

## What this repo does now

Catalog (`projects.yaml`), status page with uptime, CI, deploy, Renovate and expiry (001, 005,
007, 009, 012, 013), history and repair time (010), conformance rules R1 to R9 (008), new-project
template (011), campaigns (015), version drift (016), delivery numbers (017), archive suggestions
(018), filters, app and ⌘K (019, 020), stakeholder pages and badges (022). History charts (021)
are planned.

## 1. Software catalog and developer portal

Tools: Backstage, Port, Cortex, OpsLevel, Roadie, Atlassian Compass.

| Feature of those tools | This repo |
|---|---|
| Scorecards with levels (for example bronze, silver, gold) and a score for each project | Conformance is pass or fail for each rule; no level |
| Relations between projects (site uses API, repo uses shared workflow) as a graph | No relations in the catalog |
| Docs of each project in one place (Backstage TechDocs) | No |
| Self-service actions from a form (make a repo, add a secret, start a campaign) | Only "New project" builds a command |
| Settings as code that the tool applies (probot/settings, GitHub rulesets) | 008 reports; it does not repair |

## 2. Status and uptime pages

Tools: Upptime (GitHub Actions and Pages, the closest match), Uptime Kuma, OpenStatus, Better Stack,
Instatus, Atlassian Statuspage.

| Feature of those tools | This repo |
|---|---|
| Response time of each check, with a graph | Only up or down |
| Content check: the page must contain a text (catches a WordPress error page with status 200) | Status code only |
| Notes from the maintainer: an incident text, planned maintenance | No |
| Subscribe: email, RSS or Atom feed of incidents for stakeholders | No |
| Push alerts (email, ntfy, Telegram) | GitHub issues only |
| Checks from more than one region | One GitHub runner |

## 3. Changes in many repos

Tools: Sourcegraph Batch Changes, multi-gitter, Turbolift, all-repos, Renovate custom managers.

| Feature of those tools | This repo |
|---|---|
| A change made by a script or a codemod, not a fixed file | 015: fixed file or text replace only |
| Search the code of all repos before a change | No |
| Merge all campaign PRs when CI passes | Merge by hand |

## 4. Dependencies, versions and vulnerabilities

Tools: Renovate Dependency Dashboard, Dependabot, OSV-Scanner, Snyk, Socket, endoflife.date.

| Feature of those tools | This repo |
|---|---|
| End-of-life dates of runtimes and frameworks (Node, PHP, WordPress, Next.js) from endoflife.date | 016 compares repos with each other, not with the EOL date |
| Open security alerts of all repos in one table | 008 checks that alerts are on, not how many are open |
| Software bill of materials (SBOM) and licences | No |

## 5. Repo health and security

Tools: OpenSSF Scorecard, GitHub security overview, Allstar.

| Feature of those tools | This repo |
|---|---|
| A security score for each repo (branch protection, pinned actions, token permissions) | Some of it in R1 to R9 |
| Pinned actions by commit SHA | Not checked |

## 6. Delivery numbers (DORA)

Tools: Apache DevLake, Four Keys, Sleuth, LinearB, Swarmia.

| Feature of those tools | This repo |
|---|---|
| Change failure rate: deploys that a fix or a revert follows | No (deploys, PR time and repair time are done) |
| Lead time from commit to production | PR open to merge only |

## 7. Website quality

Tools: Lighthouse CI, Unlighthouse, PageSpeed Insights API, Chrome UX Report (CrUX) API, pa11y,
axe, lychee (links), Mozilla HTTP Observatory, Modern Web Guidance `legacy-scan`.

| Feature of those tools | This repo |
|---|---|
| Performance and Core Web Vitals of each site | No |
| Accessibility scan of each site | No |
| Broken links | No |
| Security headers (CSP, HSTS) | No |
| Legacy web code in each repo | No (one manual run on 2026-11-17, PR #54) |

## 8. Domains, DNS and email

Tools: MXToolbox, DMARC report services (for example Postmark DMARC), DNS change monitors.

| Feature of those tools | This repo |
|---|---|
| SPF, DKIM and DMARC records of each domain | No |
| An alert when a DNS record changes (A, MX, NS) | No |
| Domain expiry | Done (009, by catalog date for `.nl`) |

## 9. WordPress fleet management

Tools: MainWP, ManageWP, WP Umbrella.

| Feature of those tools | This repo |
|---|---|
| WordPress core and plugin versions, and plugins with known vulnerabilities | No (hob.nl deploys through 006) |
| Backup age: the date of the last good backup | No |

## 10. Stakeholder communication

Tools: GoatCounter, Plausible, Umami (visitor numbers); release-please, changelog generators.

| Feature of those tools | This repo |
|---|---|
| Visitor numbers of a site | No |
| "What changed this month" from merged PRs | No; the roadmap shows plans, not results |

## Gaps that agree with the constitution

Principle VIII (€0, no service that runs all the time) and Principle VII (read-only views) remove
most portal and incident features. Recommended order:

1. **Website quality checks** (section 7): spec 023. The orchestra sites are the main product, and nothing
   checks their quality now. PageSpeed Insights, CrUX and axe run free in GitHub Actions. Put
   `legacy-scan` in the shared CI as a report.
2. **End-of-life warnings** (section 4). One call to endoflife.date for each runtime. It covers
   PHP and WordPress of hob.nl, which 016 does not read.
3. **Content check in the uptime check** (section 2). A small change to 005 that finds a broken
   WordPress page.
4. **"What changed" for stakeholders** (section 10). The merged PRs of each month in Dutch B1 on
   the page of 022. Text from private repos stays out (spec 001).
5. **Email and DNS records** (section 8). Orchestra domains send email; a bad DMARC record puts
   mail in spam.
6. **Backup age** (section 9). Only for sites with a database.
7. **Push alerts** (section 2). Only when GitHub issue emails are too slow.

Not recommended now: scorecard levels (R1 to R9 are enough for 11 repos), a docs portal, incident
notes, multi-region checks, SBOM, script campaigns (do it when a fixed-file campaign fails), cost
tools (014 is shelved).
