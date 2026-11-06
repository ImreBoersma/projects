# Contract: the `secrets` list in `projects.yaml`

A top-level key next to `projects`. Optional; an empty or missing list is valid.

```yaml
# Do not put contact details or secret values in this file. Secret names, places and dates are
# allowed (spec 013).
projects:
  - id: hob-nl
    # ...
secrets:
  - name: STATUS_READ_TOKEN_HOB
    kind: actions-secret
    where: ImreBoersma/projects
    expires: 2027-11-06
  - name: BOARD_TOKEN
    kind: actions-secret
    where: ImreBoersma/projects
    expires: never
  - name: SSH_PASSWORD
    kind: actions-secret
    where: harmonieorkest-brummen/hob-nl
    expires: never
    project: hob-nl
```

Rules (data-model.md "SecretEntry"); each failure stops the run with
`Catalog error in secrets item <n>, field <field>: <rule>` before any output (spec 001 FR-015):

- `name`: required, 1 to 60 characters of `A-Z a-z 0-9 _ -` and space.
- `kind`: one of `actions-secret`, `environment-secret`, `actions-variable`. The kind `account`
  is refused: host logins are not listed in this public file (spec clarification); they stay in
  the password manager.
- `where`: `owner/repo`.
- `expires`: `YYYY-MM-DD` (a real date), `never` (an expiry is possible but not set: the page
  warns, FR-010) or `none` (the value cannot expire: no warning).
- `project`: empty or a catalog id.
- `name` + `where` unique (case-insensitive).
- No other fields. A field named `value`, `secret`, `password` or `token` is an error with the
  text "Do not put secret values in the catalog."
