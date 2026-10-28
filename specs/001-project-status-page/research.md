# Research: Project Status Page

## 1. How to get the data for all repos

- **Decision**: one GitHub GraphQL query, with one alias for each repo. For each repo, get the
  default branch head commit (`committedDate`, `statusCheckRollup.state`), open PRs (`author.login`,
  `createdAt`, `totalCount`) and the newest production deployment (`createdAt`,
  `latestStatus.state`).
- **Rationale**: one request for approximately 20 repos. The rate-limit cost is approximately 1 to 5
  points of 5,000 each hour. One query is easy to put in a fixture for tests.
- **Alternatives considered**: REST with 4 to 5 calls for each repo (approximately 100 calls, more
  code to page through results). Octokit SDK (a dependency that `fetch` makes unnecessary).

## 2. What "CI status" is (deferred from /speckit-clarify)

- **Decision**: `statusCheckRollup.state` of the head commit of the default branch. `SUCCESS` →
  passed. `FAILURE` or `ERROR` → failed. `PENDING`, `EXPECTED` or no rollup → unknown.
- **Rationale**: the rollup combines all checks and commit statuses on that commit. A repo with
  more than one workflow needs no configuration. The catalog needs no "CI workflow name" field.
- **Alternatives considered**: the last run of a named workflow. This needs one more catalog field
  for each project, and it breaks when a workflow gets a new name.
- **Risk**: host checks (for example a Vercel preview check) are also in the rollup. A failed host
  check marks the project as failed. This is the correct result: the deploy failed.

## 3. What "last deploy" is

- **Decision**: the newest deployment whose environment is `production` or `Production`. Filter in
  the query: `deployments(environments: ["production", "Production"], first: 1, orderBy: {field:
  CREATED_AT, direction: DESC})`. Result: `SUCCESS` → succeeded, `FAILURE` or `ERROR` → failed, other states → in progress. No
  deployment → unknown.
- **Rationale**: Vercel makes `Production` deployments. A GitHub Actions job with
  `environment: production` makes a deployment record automatically, so the shared deploy
  workflows get this at no cost.
- **Why filter in the query**: Vercel makes one Preview deployment for each push to a PR. Without
  the filter, the newest 10 deployments can all be previews, and the result is "unknown".
- **Alternatives considered**: the APIs of each host (rejected in clarification, question 1).
- **Action for PLAN.md step 1**: each shared deploy workflow MUST set `environment: production` on
  its deploy job.
- **Not verified**: if Azure Static Web Apps (Beter-dan-de-MIDI) makes deployment records with the
  current workflow. If not, that project shows "unknown" until it uses a shared deploy workflow.

## 4. Which PRs are Renovate PRs

- **Decision**: a PR whose author login is `renovate` or `renovate[bot]`.
- **Rationale**: GraphQL gives the login of the Renovate app as `renovate`. REST gives
  `renovate[bot]`. Accept both.
- **Alternatives considered**: the `dependencies` label (repos can change it), the `renovate/`
  branch prefix (the page must not use branch names, FR-018).

## 5. Tokens and access

- **Decision**: two tokens.
  - `STATUS_READ_TOKEN`: fine-grained PAT, owner `ImreBoersma`, all repos, read access for
    Metadata, Contents, Pull requests, Commit statuses, Actions and Deployments.
  - `GITHUB_TOKEN` of the workflow: `issues: write`, `pages: write`, `id-token: write` on the
    `projects` repo only.
- **Rationale**: a fine-grained PAT has one owner. It can read only the repos of that owner. A
  read-only token keeps the risk small if somebody gets it.
- **Repos of other owners**: `harmonieorkest-brummen/pretband-backend` needs a second fine-grained
  PAT with that organisation as owner (`STATUS_READ_TOKEN_HOB`), and the organisation must approve
  it. Until then, the page shows "data not available" for that project (edge case in the spec).
  The script selects the token from the owner part of `repo` in the catalog.
- **Alternatives considered**: a classic PAT with `repo` scope (it gives write access to all repos).
  A GitHub App (more setup; useful only when more organisations are added).
- **Not verified**: if a fine-grained PAT can read `statusCheckRollup` through GraphQL with only
  "Commit statuses" read access. If not, add "Checks" read. Test this in quickstart step 2.

## 6. Problem state between runs

- **Decision**: no state file. Each open issue with the label `status-problem` has a hidden marker
  in its body: `<!-- status-problem: <project-id>/<reason> -->`. Each run compares the problems
  that it finds with the markers of the open issues:
  - Problem without an issue → open an issue.
  - Issue without a problem → add a comment and close the issue.
  - Project with "data not available" → do not change its issues.
- **Rationale**: the issues are already the notification. They can also be the state. The start
  date of a problem is the creation date of its issue.
- **Alternatives considered**: a JSON file committed to the repo (commits from a bot each day), the
  Actions cache (it can expire).

## 7. The page and the 48-hour warning

- **Decision**: one `index.html` with inline CSS. A small inline script compares the update time in
  the page with the time now and shows the warning after 48 hours.
- **Rationale**: a static page cannot know how old it is without a script. Without JavaScript, the
  page still shows the update time (FR-013, first part).
- **Alternatives considered**: a second scheduled job that changes the page (more parts for one
  warning).

## 8. Schedule and failure

- **Decision**: triggers `schedule` (each day at 05:00 and 17:00 UTC, so that SC-004 is true when a
  run starts late), `workflow_dispatch` and `push` to
  `main` that changes `projects.yaml` or `status/**`.
- **Catalog error**: the script stops before the deploy step. GitHub Pages keeps the last page. The
  failed run sends the normal GitHub email (FR-015).
- **Concurrency**: `concurrency: status-page` with `cancel-in-progress: false`, so that two runs do
  not open the same issue two times.
- **Risk accepted**: GitHub disables scheduled workflows in a public repo after 60 days without
  repo activity. Then the issues (US4) also stop. Do not rely on issue changes from the run to
  prevent this. The Maintainer commits to `projects.yaml` often (new projects, status changes),
  and one commit enables the schedule again. T030 checks if GitHub sends an email before it
  disables the schedule. If it does not, add a monthly reminder.
- **Page and issues in separate jobs**: job `build` makes the page, job `deploy` publishes it, and
  job `issues` changes the issues. `deploy` and `issues` both need `build`, but not each other. An
  error in an issue call does not stop the page deploy.

## 9. Validation results (T030, 2026-10-28)

- Quickstart steps 1 to 6 pass. Step 3 used the private test repo `ImreBoersma/status-test`:
  issue #1 opened, a second run did not open a duplicate, and the run after the CI repair closed
  it with the comment.
- Job `build` takes 12 seconds. The goal is less than 2 minutes.
- The CI result needs no "Checks" permission. The token needs Contents and Deployments read access
  for private repos; without them GitHub returns the repo as `null`.
- Beter-dan-de-MIDI (Azure Static Web Apps) shows "Unknown" for the last deploy: its workflow
  makes no deployment records.
- Not verified: if GitHub sends an email before it disables a scheduled workflow. Until this is
  known, the 60-day risk in §8 stays open.
