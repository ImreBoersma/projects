# Data Model: Status App Basics

## Recent changes (made by the update)

| Field | Type |
|---|---|
| `since` | ISO time of the old result (about 24 hours ago, or the first result) |
| `started` | list of `{ key, project, text }` |
| `stopped` | list of `{ key, project, text }` (projects still in the catalog) |

## Visit (local storage `project-status:visits`, this device only)

```json
{ "last": { "time": "2026-11-06T18:00:00Z", "keys": ["hob-nl/ci-failed"] },
  "current": { "time": "2026-11-07T08:10:00Z", "keys": [] } }
```

Rules: a load more than 10 minutes after `current.time` moves `current` to `last`. Keys:
problem keys and `<id>/warning` for rows with state `warn`.

## Compare result (browser)

| Field | Value |
|---|---|
| `base` | `visit` or `24h` |
| `since` | the time of `last`, or `since` of the recent changes |
| `newKeys` | now, not at the base |
| `fixedKeys` | at the base, not now (at most 20 shown) |

## Command item

`{ label, kind: "project" | "tab" | "filter", target }`; `target` is `#p-<id>`, `tab=<name>` or
`state=<value>`.
