# Personal Projects Control Repo Constitution

## Core Principles

### I. Use GitHub for All Project Work

Do all task tracking, status reports, automation and sharing on GitHub. Use these GitHub parts:

- Issues in each project repo.
- One user-level GitHub Project.
- GitHub Actions.
- GitHub Pages.

Do not add a different tool for project management, a developer portal or a dashboard service.
To add a different tool, first write the reason why GitHub cannot do the work.

Reason: one person operates approximately 15 small repos. A second platform adds work and gives
no benefit.

### II. Use the Catalog as the Only Project List

`projects.yaml` MUST contain each project. Each entry MUST contain these fields:

- repo
- stack
- host
- domain
- stakeholder
- status (`active`, `maintenance` or `archived`)
- renewal dates

All automation (status page, deploys, monitoring) MUST read the project list from the catalog.
Do not write project lists directly in the automation code. The tools ignore a project that is not
in the catalog.

### III. Keep Secrets and Private Data Out of This Repo

Do not put these items in the repo:

- Credentials and tokens.
- `wp-config.php`.
- Telephone numbers and email addresses of stakeholders.

Record stakeholders only by name or role. Keep secrets in GitHub Actions secrets or in the secret
store of the host. Write all text as if the repo is public.

Reason: the repo can become public. A public repo makes it easier to share the workflows and the
Renovate preset.

### IV. Use Shared Configuration

Use Renovate with the shared preset in `renovate/default.json` for dependency updates. Do not use
Dependabot.

Use the reusable workflows in `.github/workflows/` for CI and deploys. The workflow in each
project repo MUST only call a shared workflow. It MUST be approximately 10 lines long and MUST NOT
contain a copy of shared logic. Make each change in behaviour one time, in this repo.

Reason: Dependabot has no shared configuration. Renovate presets have shared configuration.

### V. Use One Pipeline, Not One Host

Each project MUST deploy through the shared workflow when you push to `main`. Different projects
can use different hosts.

Do not move a deploy that operates correctly only to make the hosts the same. Move a project to a
different host only when you change that project for a different reason.

### VI. Keep Community and Client Sites Off the HomeLab

Do not operate orchestra, HOB or client sites on the HomeLab or on Coolify. Use the HomeLab only
for services that only the HomeLab uses. The HomeLab monitoring monitors only the HomeLab.

Reason: if the HomeLab stops, these sites also stop. In January 2026, Coolify had several
vulnerabilities with a CVSS score of 10.

### VII. Give Stakeholders Read-Only Views

Stakeholders, for example board members, use the public roadmap view and the status page.
A stakeholder MUST NOT need a GitHub account or write access to see the progress.

Do not show internal data in output for stakeholders. Internal data includes cost, credentials
and private notes.

### VIII. Keep the Work Small

One person operates this repo in personal time. Use these rules to keep the work small:

- Use static output (GitHub Pages), not services that operate all the time.
- Use scheduled workflows, not servers.
- Use a free tier only when its terms permit the use. Before you put orchestra or client work on a
  free tier, read the commercial-use terms.
- Do not make abstractions for projects that do not exist.

### IX. Use Spec Kit Only for Application Code

Use the Spec Kit sequence (specify, plan, tasks, implement) for features that contain application
code. An example is the status page generator.

Change configuration files, presets and workflow YAML directly. These changes do not need a spec.

### X. Write in ASD-STE100 Simplified Technical English

Use ASD-STE100 for all text in this repo and in the project repos. This rule applies to:

- Issues and tasks.
- Spec Kit files (spec, plan, tasks).
- Pull request descriptions and commit messages.
- Code comments and documentation.

Obey these main rules:

- Use only approved words with their approved meaning. You can also use technical names and
  technical verbs.
- Write procedural sentences with a maximum of 20 words.
- Write descriptive sentences with a maximum of 25 words.
- Write only one instruction in each sentence. Use the imperative for instructions.
- Use the active voice. Use simple verb tenses.
- Write a maximum of 6 sentences in each paragraph. Write about one topic in each paragraph.
- Put a warning or a caution before the step that it applies to.

Code identifiers, file paths, command output, error messages and product names are technical
names. The vocabulary rules do not apply to them.

Reason: stakeholders and maintainers read the issues and the roadmap. Short and clear text is
easier to read, translate and use.

## Additional Constraints

- Use bun as the package manager for new work. Change existing repos to bun only when you change
  them for a different reason.
- Use Biome for lint checks in CI.
- Repos of other owners (for example `harmonieorkest-brummen`) are in the catalog and in the
  tracking. Do not change their settings from this repo.

## Development Workflow

- Before you merge a change to a shared workflow or to the Renovate preset into `main`, test it.
  Use a minimum of one real repo that uses it.
- Each shared deploy workflow MUST set `environment: production` on its deploy job. GitHub then
  makes a deployment record, and the status page shows the last deploy.
- When a project is archived, set its status to `archived` in `projects.yaml`. Archive it on
  GitHub too. The status checks and Renovate then ignore it.

## Governance

Use `/speckit-constitution` to change this constitution. Increase the version number for each
change:

- MAJOR: you remove a principle or change it to the opposite.
- MINOR: you add a principle or add important new guidance.
- PATCH: you change only the words.

Each spec and each plan MUST identify the principles that it affects. It MUST also give the reason
for each exception.

**Version**: 2.1.0 | **Ratified**: 2026-10-28 | **Last Amended**: 2026-10-28
