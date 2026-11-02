# Contract: preset and repo configuration

## Preset `renovate/default.json` (in `projects`)

| Setting | Value | Requirement |
|---|---|---|
| `extends` | `config:recommended` | — |
| `timezone` | `Europe/Amsterdam` | FR-002 |
| `schedule` | `* 2-5 * * 6` (Saturday 02:00 to 06:00) | FR-002 |
| `minimumReleaseAge` | `3 days` | FR-007 |
| `internalChecksFilter` | `strict` | FR-007 |
| `platformAutomerge` | `false` | FR-004 (research.md §3) |
| rule: `matchUpdateTypes: ["patch"]` | `groupName: "patch updates"`, `automerge: true` | FR-004 |
| rule: `matchUpdateTypes: ["minor"]` | `groupName: "minor updates"`, `automerge: false` | FR-003, FR-005 |
| rule: `matchPackageNames: ["ImreBoersma/projects"]` | `enabled: false` | research.md §7 |
| `vulnerabilityAlerts` | `labels: ["security"]` | FR-002 (security exception) |

Major updates keep the defaults: one PR for each major, no automerge (FR-005).
The preset MUST NOT set `ignoreTests` (FR-006).

## `renovate.json` in each repo

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["github>ImreBoersma/projects//renovate/default"]
}
```

- Format the file with the Biome settings of the repo (tabs or spaces), so that `biome ci` passes.
- `projects` adds one rule: `matchManagers: ["github-actions"]`, `automerge: false`.
- HomeLab keeps `.github/renovate.json` with its own rules and adds the preset as the first entry in
  `extends`. It adds one rule at the end: `matchUpdateTypes: ["patch", "minor"]`,
  `automerge: false`, so that nothing automerges there (research.md §1).

## Per repo

| Repo | Config file | Renovate | Remove | Settings |
|---|---|---|---|---|
| Beter-dan-de-MIDI | `renovate.json` | hosted app | `.github/dependabot.yml` | Dependabot security updates off |
| boek-de-bus | `renovate.json` | hosted app | — | vulnerability alerts on |
| personal-website | `renovate.json` | hosted app | `.github/dependabot.yml` | Dependabot security updates off |
| Reperatie-Formulier | `renovate.json` | hosted app | `.github/dependabot.yml` | Dependabot security updates off |
| scales-exercises | `renovate.json` | hosted app | `.github/dependabot.yml` | Dependabot security updates off |
| HomeLab | `.github/renovate.json` | self-hosted (unchanged) | — | — |
| projects | `renovate.json` | hosted app | — | vulnerability alerts on |
