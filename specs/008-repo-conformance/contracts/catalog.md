# Contract: catalog field `exceptions`

Changes the catalog contract of spec 001 (`specs/001-project-status-page/contracts/catalog.md`).

| Field | Required | Rule |
|---|---|---|
| `exceptions` | no | a map; each key is `R1` to `R9`; each value is a reason, a non-empty string |

Example:

```yaml
  - id: reperatie-formulier
    name: Reperatie-Formulier
    repo: ImreBoersma/Reperatie-Formulier
    status: active
    exceptions:
      R2: The repo is private. The board sync adds its issues (spec 004).
```

Error texts, as the other catalog errors of spec 001:

- `Catalog error in entry <i>, field \`exceptions\`: <key> is not a rule. Use R1 to R9.`
- `Catalog error in entry <i>, field \`exceptions\`: give a reason for <key>.`

R2 already does not apply to private repos (contracts/rules.md), so this example is only an
example of the format.
