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
| 006 | hob.nl in git with a deploy workflow | 002 |
| 007 | Status page links and layout (done) | 001, 005 |
| 008 | Repo conformance check (done) | 002, 003, 004 |
| 009 | Renewals and certificate expiry | 005 |
| 010 | Status history without a database | 007 |
| 011 | New-project template and onboarding | 008 |
| 012 | Status page visual polish | 007 |

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

### 010. Status history without a database

- Each update reads the last `status.json` from the published page, adds its result, keeps 90
  days, and publishes it again. No commits to the repo.
- Show the uptime percentage and a bar of 30 days for each site, and how long a problem is open.
- This changes the decision of spec 005 that there is no uptime percentage.

### 011. New-project template and onboarding

- A template repo with the CI caller, the board caller, `renovate.json` and the Biome config.
- A command that makes the repo from the template, sets the settings of spec 008, opens the
  catalog PR, and shows the table of secrets and variables to set.
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
- The same static page: no external fonts, scripts or styles (spec 007 FR-011), light and dark
  colour schemes, the card layout of spec 007 on a phone.

## Ongoing (no spec)

- Static Vite apps (Beter-dan-de-MIDI, Reperatie-Formulier, scales-exercises): move them to one
  static host only when you change them for a different reason (Principle V).
- Next.js apps (boek-de-bus, personal-website) and pretband-backend stay on Vercel.
- Orchestra and client sites stay off the HomeLab and Coolify (Principle VI).

## Open decisions

- **Static host**: Cloudflare Pages or Vercel. Before you put HOB or orchestra work on Vercel,
  read the commercial-use terms of Vercel Hobby (Principle VIII). No spec needs this decision now.
  Decide when you move the first static app.
