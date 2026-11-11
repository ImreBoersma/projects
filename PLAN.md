# Plan: personal projects control repo

This repo is the one place to manage all personal projects. GitHub is the base for tasks, status,
automation and sharing. The constitution (`.specify/memory/constitution.md`) gives the rules.
This plan gives the order of the work.

Stakeholders (orchestra board members, HOB) get read-only views: the status page and a public
roadmap.

## Done

- Spec Kit and the constitution (v2.1.0).
- Repo [ImreBoersma/projects](https://github.com/ImreBoersma/projects) is public.
- Local clean-up: folder layout `Personal/own/`, `Personal/forks/`, `Personal/clients/`, old
  folders and `node_modules` removed, bun for new work.
- `projects.yaml` with all fields of Principle II.
- Spec 001: the project status page on GitHub Pages, with one issue for each problem.
- Spec 002: shared CI and deploy workflows. All 5 Node repos use the shared CI. GitHub Pages,
  Firebase and Vercel deploys run through shared workflows on push to `main`.
- Spec 004: project board [Projects](https://github.com/users/ImreBoersma/projects/4). New issues
  of the public repos go to the board through the shared workflow. The sync in the status page run
  adds the issues of private repos, `pretband-backend` and problem issues. Public roadmap for
  stakeholders: <https://github.com/users/ImreBoersma/projects/4/views/3>.
- Spec 005: the status page checks each catalog `domain` each hour and opens an issue when a site
  is down. The page runs each hour and warns when its data is more than 3 hours old.
- Spec 007: each cell of the status page links to its source; a summary line; cards on a phone;
  links to the roadmap and the board.
- Spec 008: each status run checks the own catalog repos against the shared setup (rules R1 to R9,
  repair steps in `docs/conformance.md`). Token `CONFORMANCE_READ_TOKEN` (fine-grained, read
  only).
- Spec 011: `bun run new-project` makes a repo from `template/` (one CI variant for each host),
  sets the settings of spec 008, opens the catalog PR and prints the secrets table; ⌘K "New
  project" on the status page builds the command. The page size budget is < 30 KB gzip.
- Spec 009: the status page shows the days until each TLS certificate expires and the next
  renewal of the catalog field `renewal`. Issues 14 days (certificate) and 30 days (renewal) before
  the date. The `.nl` registry gives no expiry date: add the domain dates to the catalog.
- Spec 006: the custom code of harmonieorkestbrummen.nl (the `hob-*` must-use plugins) is in
  `harmonieorkest-brummen/hob-nl`. A push to `main` deploys it through `deploy-ssh.yml`, with a PHP
  check, a site check and a restore of the last working version.
- Spec 010: each status run stores its result on the branch `data`
  (`history/YYYY-MM-DD.ndjson`). The page shows since when each problem is open, the uptime of 30
  days with a bar, and the average time to repair. History from 2026-11-05.
- Spec 012: the status page shows the total state as one badge, in the tab title and in the
  favicon; state badges with a colour and a text (amber: certificate 15 to 28 days, renewal 31 to
  60 days); projects with problems first; relative times; all links open a new tab. No UI library.
- Spec 013: the catalog lists each secret of the projects and this repo (`secrets`: name, place,
  date, `never` or `none`; no values, no host accounts). The status tokens give their own date.
  An issue 30 days before a date; "No expiry" warning for a secret that can expire but has no
  date; a note for a workflow secret that is not listed. All tokens expire on 2027-11-05/06.
- Spec 015: campaigns (`campaigns/<id>.yaml`, `bun run campaign <id>`): one fixed file change as a
  PR in many repos, with a dry run and a guard for hand fixes; progress in the section
  "Campaigns" of the status page. `bun run secret-set <NAME>` sets one secret in all its repos.
- Spec 019: the status page uses DaisyUI (built into the page, no external files): one row for
  each project with a pop-up for the details (`#p-<id>` is a link to it), filters, sort and tabs
  in the page address (`?stakeholder=Harmonieorkest+Brummen` is the HOB view). Works without
  scripts. Organisation names may show on the page; names of people may not.
- Spec 020: the status page is an installable app (manifest, service worker, offline last state)
  with `status.json` next to it; "since your last visit" (this device, else the last 24 hours),
  shortcuts to the GitHub pages that act, and a command box (⌘K). The icon badge is a reminder,
  not an alarm (it updates only when the app is open).
- Spec 016: the tab "Versions" of the status page shows the versions of Node, Bun, Next.js,
  React, TypeScript, Biome and `@types/node` in each repo with a `package.json`. A version that is
  one or more major versions behind the newest repo is marked (no issue). A campaign of spec 015
  repairs the drift.
- Token renewal: `STATUS_READ_TOKEN_HOB` (fine-grained, owner `harmonieorkest-brummen`, read only)
  expires on 2027-11-06. Make a new token with the same settings before that date and set the
  secret again (spec 006).
- Tokens: `BOARD_TOKEN` and `BOARD_SYNC_TOKEN` have no expiry date. Make new classic PATs with the
  same scopes only when a token is revoked or leaks (spec 004, research.md §3).

## Features

Each feature is one Spec Kit spec. Do them in this order. Specs 002, 003, 004 and 006 are mostly
configuration. Principle IX does not require a spec for them, but a spec gives acceptance tests.

| Spec | Feature | Needs |
|---|---|---|
| 002 | Shared CI and deploy workflows (done) | — |
| 003 | Shared Renovate preset | 002 (automerge needs CI) |
| 004 | Project board and public roadmap (done) | 002 (the shared workflow adds issues) |
| 005 | Uptime checks on the status page (done) | 001 |
| 006 | hob.nl in git with a deploy workflow (done) | 002 |
| 007 | Status page links and layout (done) | 001, 005 |
| 008 | Repo conformance check (done) | 002, 003, 004 |
| 009 | Renewals and certificate expiry (done) | 005 |
| 010 | Status history on a data branch (done) | 007 |
| 011 | New-project template and onboarding (done) | 008 |
| 012 | Status page visual polish (done) | 007 |
| 013 | Expiry of tokens and secrets (done) | 009 |
| 014 | Free-tier usage warnings (shelved) | 005 |
| 015 | Changes in all repos at once (campaigns) (done) | 008 |
| 016 | Version drift between projects (done) | 008 |
| 017 | Delivery numbers for each project | 010 |
| 018 | Archive suggestions for old projects | 010 |
| 019 | Status page filters, sorting and detail views (done) | 012, 013, 015 |
| 020 | Status app basics: data file, "since your last visit", installable app, shortcut links, ⌘K (done) | 019 |
| 021 | History charts | 010, 019, 020 |
| 022 | Stakeholder view and status badges | 019, 020 |

### 002. Shared CI and deploy workflows

- `ci-node.yml`: install, Biome lint, build, test.
- One deploy workflow for each host, also for Vercel. All deploys run in GitHub Actions. Each deploy job sets `environment: production`, so that the
  status page shows the last deploy.
- The workflow in each project repo calls the shared workflows. It is approximately 10 lines.
- Move the status page deploy to the shared workflow when a second Pages project exists
  (Principle V exception of spec 001).

### 003. Shared Renovate preset

- Preset `renovate/default.json`: automerge patch updates when CI passes, one group for minor
  updates, a weekly schedule.
- Each project repo gets a `renovate.json` that extends
  `github>ImreBoersma/projects//renovate/default`.
- Remove Dependabot from all repos.
- This removes the Principle IV exception of spec 001.

### 004. Project board and public roadmap

- One user-level GitHub Project. The issues stay in each repo.
- Fields: Project, Priority, Status, Stakeholder.
- A public Roadmap view for stakeholders. It shows only items with Roadmap = Yes.
- The shared workflow adds new issues to the board. The built-in auto-add has a repo limit.
- Find out if a user project can contain issues from `harmonieorkest-brummen/pretband-backend`.
  If not, make a small project for that organisation.

### 005. Uptime checks on the status page

- Check each production `domain` in `projects.yaml` each hour. Show the result on the status
  page and open an issue when a site is down.
- Do not use the HomeLab blackbox-exporter for this. Principle VI: the HomeLab monitoring
  monitors only the HomeLab.

### 006. hob.nl in git with a deploy workflow

- Make a git repo from the files on the hosting (`git init`). Put it in `harmonieorkest-brummen`.
- Put `wp-content/themes` and the custom plugins in the repo.
- Do not put `wp-config.php` or the WordPress core in git (Principle III).
- Deploy with SSH and rsync from a workflow on push to `main`.

### 007. Status page links and layout

- Each cell links to its source: repo, checks of the last commit, deployments, Renovate PRs, the
  problem issue, the site.
- A summary line, a card layout on a phone, and links to the roadmap and the board.

### 008. Repo conformance check

- Check each own catalog repo each day against the shared setup: CI and board callers on `@main`,
  caller permissions, Renovate preset, no Dependabot updates, issues on, security alerts,
  default branch `main`, secret and variable names.
- A repo that fails a rule is a problem, with one issue for each repo. Exceptions are in the
  catalog. Spec: `specs/008-repo-conformance/`.

### 009. Renewals and certificate expiry

- Read the `renewal` field of the catalog. Also read the expiry date of the TLS certificate and of
  the domain registration (RDAP) of each `domain`.
- Show the days that remain on the status page. Open an issue 30 days before each date.
- Reason: an expired domain or hosting contract stops a client site for days. The uptime check
  finds it only after the stop.

### 010. Status history on a data branch

- Each update adds its result as one line to one JSON-lines file for each day (for example
  `history/2026-11-05.ndjson`) on a separate branch `data` of `projects`. The branch holds only data;
  `main` and its history do not change.
- Show the uptime percentage and a bar of 30 days for each site, how long a problem is open
  ("CI failing for 3 days", "Down since 14:00"), and the average time to repair.
- Keep 90 days on the page; git keeps all older days.
- Reason for the branch, not a database: the history stays when a deploy writes a bad page, it is
  free and in GitHub (Principle I), no service runs all the time (Principle VIII), and no new
  token is necessary.
- This changes the decision of spec 005 that there is no uptime percentage. A missing run is a gap
  in the data, not "down".

### 011. New-project template and onboarding

- A template folder `template/` in `projects` with the CI caller (one variant for each host), the
  board caller, `renovate.json` and the Biome config.
- A command that makes the repo from the template, sets the settings of spec 008, opens the
  catalog PR, and shows the table of secrets and variables to set.
- The ⌘K box of the status page builds the command ("New project"); the page runs nothing.
- The page size budget is on the gzip size: < 30 KB for the 20-site worst case.
- Reason: a new project now needs changes in 4 to 5 repos. Spec 008 finds the deviations; this
  spec prevents them.

### 012. Status page visual polish

- A clear visual hierarchy: a header with the state of all projects as one coloured badge
  (all correct, problems, check not available) above the summary line.
- State badges in the cells (Up, Down, Passed, Failed, Succeeded) with a colour and a text, not
  only a colour (accessibility).
- Rows grouped: projects with problems first, in a separate section, then the other projects.
- Relative times next to dates ("3 days ago"), with the exact date in a tooltip.
- A small favicon and a page title with the number of problems, so that a browser tab shows the
  state.
- Each link opens in a new tab (`target="_blank"` with `rel="noopener noreferrer"`), also the
  header links to the roadmap and the board. Each such link shows that it opens a new tab: a small
  mark, and the text "opens in a new tab" for screen readers (WCAG).
- The same static page: no external fonts, scripts or styles (spec 007 FR-011), light and dark
  colour schemes, the card layout of spec 007 on a phone.

### 013. Expiry of tokens and secrets

- Each token, secret or password with an expiry date goes in the catalog with its name, the place
  where it is set (repo, kind), and the date. No values.
- The renewal rules of spec 009 apply: an issue 30 days before the date, a badge on the status
  page.
- Reason: `pretband-backend` showed "Data not available" for weeks because a token was missing.
  `STATUS_READ_TOKEN_HOB` expires on 2027-11-06.

### 014. Free-tier usage warnings

- Each status run reads the usage of the free tiers: GitHub Actions minutes of private repos,
  Vercel Hobby (bandwidth, build minutes), Firebase Spark quotas.
- At 80% of a limit: a problem with an issue. On the page: the usage of each service.
- Reason: Principle VIII (€0 each month). Now the first sign of a limit is a failed deploy or a
  bill.
- Open question for the spec: which usage APIs work with a read-only token on the free plans.
- **Shelved on 2026-11-10** after the API check:
  - GitHub: the billing usage API needs a classic token with the `user` scope (it can change the
    profile); fine-grained tokens do not work. An estimate from job times works with the current
    access: about 250 minutes each month of 2000 (12%), almost all from HomeLab.
  - Vercel: no usage API, and a token cannot be read-only. At a Hobby limit, Vercel stops the
    feature for up to 30 days; it does not bill. The usage emails are on by default.
  - Firebase (scales-exercises, project `imre-boersma`): the usage is in Cloud Monitoring, but it
    needs a new service account (one more secret). The project is on Blaze (pay as you go), so
    usage above the free quota makes a bill. The app uses only Hosting and Firestore Lite. Until
    2026-11-10 there was no bill; the Maintainer accepts this risk (2026-11-10).
  - So: only Firebase can make a bill, and the one value that we can read is far from its limit.
- Checked on 2026-11-10: the Vercel usage emails are on. Optional: a budget alert in Google Cloud
  Billing for `imre-boersma` (an alert only; it does not stop the spend).
- Start the spec again when a private repo uses more than 1000 minutes in a month, or when a
  project moves to a paid plan, or when Firebase makes a bill.

### 015. Changes in all repos at once (campaigns)

- One command opens the same change as a PR in each catalog repo (for example "Node 22 to 24",
  a new shared workflow version), with one label for the campaign.
- The status page shows each open campaign: the number of PRs merged, open and failed.
- Reason: changes for all repos (presets, shared CI, conformance repairs) are now done by hand,
  one repo at a time.

### 016. Version drift between projects

- Each status run reads the versions of Node, Bun, Next.js, React, TypeScript and Biome in each
  repo (`package.json`, `.nvmrc`, `packageManager`).
- The page shows one table of versions; a repo that is one major version or more behind the
  newest repo is marked.
- Reason: Renovate keeps each repo current in its own range, but it does not show when the
  projects drift apart. Works well with spec 015 (a campaign repairs the drift).

### 017. Delivery numbers for each project

- From GitHub data and the history of spec 010: deploys each month, time from PR open to merge,
  age of Renovate PRs when merged, time to repair (already in spec 010).
- Shown for 90 days, for each project and in total. No problems or issues from these numbers.
- Reason: feedback on where the maintenance time goes. Lowest priority of 013 to 018.

### 018. Archive suggestions for old projects

- A project with no commit, no deploy and no open work for 12 months gets a suggestion on the
  page: "Archive?" with a link to a checklist.
- The checklist: archive the repo, keep or stop the domain and the hosting, set the catalog
  status to `archived`, remove it from the board.
- Reason: fewer projects means less maintenance (Principle VIII).

### 020. Status app basics

- **Data file**: each status run publishes `status.json` next to the page: the view model of
  `status/src/view.ts` for each project, the total state and the time of the update. The content
  rules of spec 001 (no text from private repos, no names of people) apply to it as to the page.
  It is the base for 021, 022 and a later app.
- **Since your last visit**: the browser keeps the time of the last visit (local storage, only in
  that browser). The page marks the problems and warnings that are new since then, and the ones
  that stopped: "2 new, 1 fixed since yesterday 18:00".
- **Installable app**: a web app manifest and a small service worker, so that the page installs
  on a phone or a computer, opens full screen and shows the last known state offline. The app
  icon shows the number of problems as a badge where the system supports it.
- **Shortcut links**: in each pop-up, links to the GitHub pages that do the work after their own
  login: re-run the last CI run, the Renovate dashboard, the deployments, and "start the status
  run now" (workflow dispatch page). The page itself gets no write access.
- **⌘K**: a command box (⌘K or Ctrl+K) to jump to a project, a tab or a filter with the keyboard.
- Reason: the daily use of the page. Without a server (Principle VIII).

### 021. History charts

- The History tab reads the day files of the branch `data` (spec 010) in the browser, or a
  summary that the status run writes, and draws: the uptime of each site for 30 and 90 days, the
  number of problems over time, and the repair time for each month.
- Charts without an external library when possible (inline SVG); else one small library built
  into the page (spec 007 FR-011: no external files).
- Reason: the history grows each hour since 2026-11-05; now it shows only "since" and 30 marks.

### 022. Stakeholder view and status badges

- **Stakeholder view**: with `?stakeholder=<organisation>` the page can show a plain-language
  view without the technical facts (CI, Renovate, commits): "The website was online for 30 days.
  The domain renewal is in 5 months. Nothing needs your attention." A print layout for a monthly
  page in a board meeting.
- **Status badges**: the status run writes one small SVG for each project ("hob.nl ● online"),
  for the README of each repo and the footer of a site. No external badge service.
- Both follow the content rules of spec 001 (organisation names allowed, names of people not).
- Reason: constitution Principle VII (read-only views for stakeholders).

## Ongoing (no spec)

- Review of all specs (2026-11-11): 36 Convergence tasks in the `tasks.md` of 16 specs (the
  last phase of each). Do them by spec with `/speckit-implement`; the most important are 008
  T024 (a missing token closes conformance issues), 010 T024 (a run without data resets
  "Started"), 020 T027 (contrast of the "New" badge) and 003 T025 (cron-job.org trigger for the
  HomeLab Renovate window).
- Static Vite apps (Beter-dan-de-MIDI, Reperatie-Formulier, scales-exercises): move them to one
  static host only when you change them for a different reason (Principle V).
- Next.js apps (boek-de-bus, personal-website) and pretband-backend stay on Vercel.
- Orchestra and client sites stay off the HomeLab and Coolify (Principle VI).

## Open decisions

- **Static host**: Cloudflare Pages or Vercel. Before you put HOB or orchestra work on Vercel,
  read the commercial-use terms of Vercel Hobby (Principle VIII). No spec needs this decision now.
  Decide when you move the first static app.
- **Status page as an app**: first step decided on 2026-11-06 (spec 019): DaisyUI styles built
  into the static page, with a small script for filters, sort, tabs and pop-ups; no framework, no
  server. The next step (Next.js) only when a write action or server data is necessary.
- **Status page as an app (earlier note)**: the status page is expected to become an app (filters, views for one
  stakeholder, data that changes in the browser). Until then it stays a static page with no UI
  library (spec 012 research.md §1). Start the app when one of these is necessary: a view for one
  stakeholder, filters or search, or a write action. Then use the stack of the other projects
  (for example Next.js with shadcn/ui), use the view model of `status/src/view.ts` again, and
  publish the data as JSON from the status run. The content rules of spec 001 FR-018 stay.
