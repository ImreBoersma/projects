# Data Model: Shared Renovate Preset

No stored data. The entities are configuration files and the PRs that Renovate opens.

## Preset

`renovate/default.json` in `projects`. Rules: [contracts/preset.md](./contracts/preset.md).

## Repo configuration

| Field | Rule |
|---|---|
| file | `renovate.json`, or `.github/renovate.json` in HomeLab |
| `extends` | MUST contain `github>ImreBoersma/projects//renovate/default` (FR-008, FR-009) |
| own rules | Only rules for that repo. They come after the preset and win. |

## Update PR

| Type | Group | Automerge | Schedule | Release age |
|---|---|---|---|---|
| patch | "patch updates", one PR | yes, when all checks pass | Saturday and Sunday (since 2026-11-09) | 3 days |
| minor | "minor updates", one PR | no | Saturday and Sunday (since 2026-11-09) | 3 days |
| major | one PR for each package | no | Saturday and Sunday (since 2026-11-09) | 3 days |
| security | one PR for each fix, label `security` | no | at once | none |

Author: `renovate[bot]` (hosted app) or `imreboersma-homelab-renovate[bot]` (HomeLab). The status
page counts both (research.md §9).

## State of an automerge PR

```text
opened --checks pass--> merged by Renovate
opened --a check fails--> stays open (Maintainer) --> marked on the status page after 14 days
opened --no checks--> stays open (FR-006)
```
