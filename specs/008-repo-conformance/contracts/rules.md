# Contract: rules R1 to R9

Each rule is a pure function on `RepoFacts` (data-model.md). The reads are in research.md §1.
`docs/conformance.md` has the same ids, names and order, with the repair steps.

| Id | Name | Applies to | Fails when |
|---|---|---|---|
| R1 | CI caller | repos with `package.json` in the root | no workflow uses `ImreBoersma/projects/.github/workflows/ci-node.yml@main` |
| R2 | Board caller | public repos | no workflow uses `ImreBoersma/projects/.github/workflows/add-to-board.yml@main` |
| R3 | Caller permissions | each workflow that uses a workflow of `ImreBoersma/projects` | top-level `permissions` is missing, is `{}`, or has no `contents: read` |
| R4 | Renovate preset | all | no `renovate.json` or `.github/renovate.json`, or its `extends` does not contain `github>ImreBoersma/projects//renovate/default` exactly |
| R5 | No Dependabot updates | all | `.github/dependabot.yml` or `.github/dependabot.yaml` exists |
| R6 | Issues on | all | issues are off |
| R7 | Security alerts | all | vulnerability alerts are off, or Dependabot security updates are on |
| R8 | Default branch | all | the default branch is not `main` |
| R9 | Secrets and variables | each caller workflow | it uses `secrets.NAME` (not `GITHUB_TOKEN`) that is not a repo secret, or `vars.NAME` that is not a repo variable |

A rule that does not apply gives `not-applicable`. An exception in the catalog also gives
`not-applicable`. A read error gives `not-available` (research.md §5).

`@main` is exact: a caller on a test branch (for example `@004-project-board`) fails R1 or R2.
