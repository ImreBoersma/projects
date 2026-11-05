# Data Model: Repo Conformance Check

No stored data. Each status run makes these values again.

## Project (changed)

| Field | Type | Rule |
|---|---|---|
| `exceptions` | map of rule id to reason, or empty | keys only `R1` to `R9`; each reason a non-empty string (research.md §6) |

## RepoFacts (new)

What `read.ts` gives to the rules for one repo. A value that could not be read is `"not-available"`.

| Field | Type |
|---|---|
| `private` | boolean |
| `hasIssues` | boolean |
| `defaultBranch` | string |
| `hasPackageJson` | boolean |
| `workflows` | list of `{ path, text }` of `.github/workflows/*.yml` and `*.yaml` |
| `renovate` | parsed JSON of the Renovate config, or `null` when there is no file |
| `dependabot` | boolean (a Dependabot config exists) |
| `vulnerabilityAlerts` | boolean |
| `securityFixes` | boolean |
| `secretNames` | list of strings |
| `variableNames` | list of strings |

## Rule (new)

| Field | Value |
|---|---|
| `id` | `R1` to `R9` |
| `name` | short STE name, for example "Issues on" |
| `anchor` | heading anchor in `docs/conformance.md` |
| `check` | pure function `RepoFacts → "pass" | "fail" | "not-applicable" | "not-available"` |

## Result (new)

For one repo: one `RuleResult` for each rule: `{ rule, state }`, with
`state` = `pass`, `fail`, `not-applicable` (from the rule or an exception) or `not-available`.

## Problem (changed)

New reason `not-conformant`, key `<project id>/not-conformant`, and an optional
`detail: string[]` with the names of the failed rules, in rule order.

| Rule | Source |
|---|---|
| A repo with 1 or more `fail` results gets the problem | FR-004 |
| `not-available` and `not-applicable` results make no problem | FR-007, FR-003 |
| Repos of other owners, archived projects and projects without a repo are not checked | FR-001 |
