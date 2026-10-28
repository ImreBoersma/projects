# Contract: `projects.yaml` (fields this feature reads)

```yaml
projects:
  - id: beter-dan-de-midi          # required, unique, a-z0-9-
    name: Beter dan de MIDI        # required
    repo: ImreBoersma/Beter-dan-de-MIDI   # optional, owner/name
    status: active                 # required: active | maintenance | archived
    # other fields (stack, host, domain, stakeholder, renewal) are ignored by this feature
  - id: hob-nl
    name: hob.nl
    repo:                          # empty: page shows "no repo"
    status: active
```

- The top-level key is `projects`, a list.
- Unknown fields are permitted, so that other tools can add fields.
- A validation error stops the run before the deploy (FR-015). The error message gives the entry
  index and the field.
- Token selection: owner `ImreBoersma` → `STATUS_READ_TOKEN`. Owner `harmonieorkest-brummen` →
  `STATUS_READ_TOKEN_HOB`. Other owner, or the secret is not set → `unavailable`.
