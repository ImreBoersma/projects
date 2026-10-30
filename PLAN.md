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

## Features

Each feature is one Spec Kit spec. Do them in this order. Specs 002, 003, 004 and 006 are mostly
configuration. Principle IX does not require a spec for them, but a spec gives acceptance tests.

| Spec | Feature | Needs |
|---|---|---|
| 002 | Shared CI and deploy workflows | — |
| 003 | Shared Renovate preset | 002 (automerge needs CI) |
| 004 | Project board and public roadmap | 002 (the shared workflow adds issues) |
| 005 | Uptime checks on the status page | 001 |
| 006 | hob.nl in git with a deploy workflow | 002 |

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

## Ongoing (no spec)

- Static Vite apps (Beter-dan-de-MIDI, Reperatie-Formulier, scales-exercises): move them to one
  static host only when you change them for a different reason (Principle V).
- Next.js apps (boek-de-bus, personal-website) and pretband-backend stay on Vercel.
- Orchestra and client sites stay off the HomeLab and Coolify (Principle VI).

## Open decisions

- **Static host**: Cloudflare Pages or Vercel. Before you put HOB or orchestra work on Vercel,
  read the commercial-use terms of Vercel Hobby (Principle VIII). No spec needs this decision now.
  Decide when you move the first static app.
