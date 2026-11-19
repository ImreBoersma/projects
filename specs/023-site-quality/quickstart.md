# Quickstart: Website Quality Checks

## Before the first run

1. Make a Google Cloud project without billing (for example `status-checks`). Turn on the
   PageSpeed Insights API. Make an API key, restrict it to that API, and set no expiry.
2. Set the secret in this repo:

   | Name | Where | Kind | Value |
   |---|---|---|---|
   | `PSI_API_KEY` | `ImreBoersma/projects` | Actions secret | the key of step 1 |

3. Add it to `projects.yaml` `secrets` with `expires: never` (spec 013).
4. In the Google Cloud console, open the quotas of the PageSpeed Insights API for that project
   and record the queries each day in T043. The run needs at most 20 each day.

## Validate

All commands in `status/`.

1. Tests: `bun test` passes, with the new tests `tests/quality-*.test.ts`.
2. Local check of one site without issues and without a push:

   ```bash
   PSI_API_KEY=… bun run quality --only pretband --out ../_quality --dry-run
   ```

   Expected: one file `../_quality/<today>.json` as
   [contracts/quality-file.md](./contracts/quality-file.md); the log shows 4 levels and the
   number of pages, and no error text from the site.
3. Page with that file: put it in `../_data/quality/` and run
   `bun run start --history ../_data/history`. Open `../_site/index.html?tab=quality`: the row of
   pretband.nl shows 4 badges, a date and report links ([contracts/page.md](./contracts/page.md)).
   Turn off scripts: the tab still shows.
4. Stakeholder page: open `../_site/s/harmonieorkest-brummen.html`; the pretband.nl block has the
   speed sentence (good or poor) or none (warning).
5. Size: the page test reports < 30 KB gzip for 20 sites.
6. 2-checks rule: `bun test tests/quality-issues.test.ts` with the fixtures poor, poor, good: open
   on day 2, close on day 3; poor, warn: no issue.
7. Workflow: run `site-quality.yml` by hand (workflow dispatch). Expected: the file on the branch
   `data`; the next hourly status run shows the date of today on the tab.
8. CI input: in a test branch of one project repo, set `legacy-scan: true`. Expected: a job
   summary with the findings, and the job passes ([contracts/ci-input.md](./contracts/ci-input.md)).
