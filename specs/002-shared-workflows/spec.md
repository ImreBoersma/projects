# Feature Specification: Shared CI and Deploy Workflows

**Feature Branch**: `002-shared-workflows` (not created; no git hook is installed)

**Created**: 2026-10-30

**Status**: Draft

**Input**: PLAN.md, feature 002: "`ci-node.yml`: install, Biome lint, build, test. One deploy
workflow for each host. Each deploy job sets `environment: production`, so that the status page
shows the last deploy. The workflow in each project repo calls the shared workflows. It is
approximately 10 lines."

## Clarifications

### Session 2026-10-30

- Q: Vercel projects deploy through the Vercel Git integration now. Must they also deploy through a shared workflow? → A: Yes. All deploys run in GitHub Actions. The hosts do not change. The Vercel Git integration does not deploy to production.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - CI in each project through one shared workflow (Priority: P1)

The Maintainer pushes a commit or opens a PR in a project repo. The repo calls the shared CI
workflow in `projects`. The shared workflow installs the dependencies, runs the lint check, builds
the project and runs the tests. The Maintainer changes the CI steps one time, in `projects`.

**Why this priority**: the status page and the Renovate automerge (spec 003) need a CI result in
each repo. Now each repo has a different CI file, and boek-de-bus has no CI.

**Independent Test**: replace the CI file of one project repo with a caller of the shared workflow.
Push a commit with a lint error. Make sure that CI fails. Repair the error. Make sure that CI passes
and that the status page shows "Passed".

**Acceptance Scenarios**:

1. **Given** a project repo with a caller workflow, **When** the Maintainer pushes to `main` or
   opens a PR, **Then** the shared CI runs install, lint, build and test.
2. **Given** a lint error, a build error or a failed test, **When** CI runs, **Then** CI fails.
3. **Given** a project that has no test script or no build script, **When** CI runs, **Then** CI
   does not do that step and does not fail for this reason.
4. **Given** a project that uses npm, yarn or bun, **When** CI runs, **Then** CI uses the package
   manager of the project.

---

### User Story 2 - Deploy each project through a shared deploy workflow (Priority: P1)

The Maintainer pushes to `main`. When CI passes, the repo calls the shared deploy workflow for its
host. The deploy makes a GitHub deployment record on the production environment, so that the status
page shows the last deploy.

**Why this priority**: Principle V says that each project MUST deploy through the shared workflow.
Now Beter-dan-de-MIDI and scales-exercises show no current deploy on the status page.

**Independent Test**: change scales-exercises to the shared Firebase deploy. Push to `main`. Make
sure that the site changes and that the status page shows the date and "Succeeded".

**Acceptance Scenarios**:

1. **Given** a push to `main` with a CI pass, **When** the deploy runs, **Then** the site of the
   project changes and a production deployment record exists.
2. **Given** a push to `main` with a CI fail, **When** CI completes, **Then** no deploy starts.
3. **Given** a failed deploy, **When** the status page updates, **Then** it shows "Failed" for the
   last deploy.
4. **Given** a PR, **When** CI runs, **Then** no production deploy starts.

---

### User Story 3 - Change the behaviour one time (Priority: P2)

The Maintainer changes a shared workflow in `projects`. All project repos use the change at their
next run. The Maintainer does not change the project repos.

**Why this priority**: this is the reason for shared workflows (Principle IV). It follows from
US1 and US2.

**Independent Test**: add a step to the shared CI workflow. Push a commit to two project repos.
Make sure that both runs do the new step.

**Acceptance Scenarios**:

1. **Given** a change to a shared workflow on `main` of `projects`, **When** a project repo runs
   CI, **Then** the run uses the changed workflow.
2. **Given** the workflow file of a project repo, **When** the Maintainer reads it, **Then** it
   contains only calls to shared workflows and is approximately 10 lines.

---

### Edge Cases

- A project has no host in the catalog (for example Reperatie-Formulier). The repo gets CI only.
  It gets a deploy when the host is known.
- A deploy secret is missing in a project repo. The deploy fails with a message that names the
  secret.
- A change to a shared workflow breaks CI. The constitution requires a test on a minimum of one
  real repo before the change goes to `main`.
- Two pushes to `main` occur quickly. The second deploy waits for the first deploy, so that the
  older version does not replace the newer version.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The `projects` repo MUST contain one shared CI workflow for Node projects.
- **FR-002**: The shared CI workflow MUST install the dependencies, run the Biome lint check, build
  the project and run the tests, in this order.
- **FR-003**: The shared CI workflow MUST use the package manager of the project (npm, yarn or
  bun). It MUST NOT change the package manager.
- **FR-004**: The shared CI workflow MUST NOT do the build or the test step when the project does
  not define that step.
- **FR-005**: The `projects` repo MUST contain one shared deploy workflow for each host that a
  project uses: GitHub Pages (Beter-dan-de-MIDI), Firebase Hosting (scales-exercises) and Vercel
  (boek-de-bus, personal-website).
- **FR-006**: Each shared deploy job MUST use `environment: production`, or `github-pages` for a
  GitHub Pages deploy, so that GitHub makes a deployment record (constitution, Development
  Workflow).
- **FR-007**: A deploy MUST start only on a push to `main` and only after CI passes. Each repo in
  the scope of FR-011 MUST use `main` as its default branch.
- **FR-008**: Two deploys of the same project MUST NOT run at the same time.
- **FR-009**: The workflow file in each project repo MUST only call shared workflows. It MUST be
  approximately 10 lines long.
- **FR-010**: Secrets MUST be Actions secrets of the project repo. They MUST NOT be in a workflow
  file (Principle III).
- **FR-011**: Each own project repo in the catalog with a Node project MUST use the shared CI
  workflow: Beter-dan-de-MIDI, boek-de-bus, personal-website, Reperatie-Formulier,
  scales-exercises.
- **FR-012**: The old CI and deploy workflow files in these repos MUST be removed when the shared
  workflows replace them.
- **FR-013**: The Vercel Git integration MUST NOT deploy to production. Only the shared workflow
  deploys the Vercel projects (boek-de-bus, personal-website).

### Key Entities

- **Shared workflow**: a reusable workflow in `projects/.github/workflows/`. Types: CI for Node, and
  deploy for one host.
- **Caller workflow**: the workflow file in a project repo. It calls the shared workflows with
  inputs, for example the build directory.
- **Deployment record**: the GitHub record of one deploy on the environment `production` or
  `github-pages`. The status page reads it.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 5 of the 5 own Node project repos run CI through the shared workflow.
- **SC-002**: Each project with a known host shows a last deploy on the status page, not "Unknown".
- **SC-003**: Each caller workflow is a maximum of 15 lines, without blank lines.
- **SC-004**: A change to CI needs a change in 1 file, not in each project repo.
- **SC-005**: The feature costs €0 each month to operate.

## Assumptions

- The shared workflows are in the public `projects` repo, so that private and public repos can call
  them.
- The hosts do not change in this feature (Principle V). The Vite apps move to one static host only
  when the Maintainer changes them for a different reason.
- This feature does not change the package manager of a repo. A move to bun occurs only when the
  Maintainer changes the repo for a different reason (constitution, Additional Constraints).
- HomeLab is not a Node project and deploys on the HomeLab. It is not in the scope of this feature.
- `harmonieorkest-brummen/pretband-backend` is a repo of a different owner. This feature does not
  change it. The Maintainer can propose the caller workflow in a PR later.
- Preview deploys are not production deploys. The Vercel Git integration can continue to make
  previews for branches that are not `main`.
- hob.nl gets its deploy workflow in spec 006.
- Beter-dan-de-MIDI is the second GitHub Pages project. Thus the status page in `projects` also
  deploys through the shared Pages workflow, and the Principle V exception of spec 001 stops.
- Beter-dan-de-MIDI uses the default branch `pwa` now. This feature changes it to `main`.

## Principles Affected

| Principle | How this feature affects it |
|---|---|
| III. No secrets or private data | Deploy tokens are Actions secrets in each project repo. |
| IV. Shared configuration | Adds the shared workflows. Caller workflows are approximately 10 lines. |
| V. One pipeline | Each project deploys through a shared workflow on push to `main`. |
| VIII. Keep the work small | No new host. No new tool. |
| X. ASD-STE100 | Workflow names, step names and messages use STE. |
