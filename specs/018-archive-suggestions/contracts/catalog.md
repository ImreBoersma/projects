# Contract: the field `keep` in `projects.yaml`

Optional, on a project:

```yaml
  - id: pretband
    # ...
    keep:
      until: 2027-06-01
      reason: Site of the 2026 event; stays online, no changes planned.
```

Rules; each failure stops the run with `Catalog error in entry <n>, field keep: <rule>` before
any output (spec 001 FR-015):

- `keep` is a map with exactly `until` and `reason`.
- `until`: a real date as YYYY-MM-DD.
- `reason`: 1 to 80 characters after trim.

A date in the past is valid: the field then has no effect (spec edge case), so an old `keep` does
not stop the run.
