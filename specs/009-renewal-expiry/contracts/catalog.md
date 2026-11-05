# Contract: catalog field `renewal`

Changes the catalog contract of spec 001 (`specs/001-project-status-page/contracts/catalog.md`).
The field `renewal` exists in each entry and was empty. It becomes a list.

| Field | Required | Rule |
|---|---|---|
| `renewal` | no | empty, or a list of items with `name` and `date` |
| `renewal[].name` | yes | non-empty, at most 40 characters, unique in the project (case is ignored); no cost, no contract numbers (Principle VII) |
| `renewal[].date` | yes | `YYYY-MM-DD`, a real date |

Example:

```yaml
  - id: pretband
    name: Pretband
    domain: pretband.nl
    renewal:
      - name: Domain
        date: 2027-03-01
      - name: Hosting
        date: 2027-01-15
```

The name `Domain` has a special meaning: the update compares it with the registry date of the
domain and uses the earlier date (research.md §4).

Error texts, as the other catalog errors of spec 001:

- `Catalog error in entry <i>, field \`renewal\`: must be a list of items with name and date.`
- `Catalog error in entry <i>, field \`renewal\`: item <n> needs a name of at most 40 characters.`
- `Catalog error in entry <i>, field \`renewal\`: item <n> needs a date as YYYY-MM-DD.`
- `Catalog error in entry <i>, field \`renewal\`: the name <name> is used two times.`

After the renewal, enter the next date. The issue then closes at the next update.
