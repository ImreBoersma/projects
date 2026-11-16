# Data Model: Archive Suggestions for Old Projects

## Keep (catalog, `Project.keep`)

| Field | Type | Rule |
|---|---|---|
| `until` | string `YYYY-MM-DD` | A real date (the `realDate` test of the catalog). |
| `reason` | string | 1 to 80 characters after trim. |

Both are required when `keep` is set (contracts/catalog.md).

## ArchiveRaw (read result for one repo, not on the page)

| Field | Type | Note |
|---|---|---|
| `createdAt` | string | Repo creation. |
| `lastPersonCommit` | string \| null | `committedDate` of the first commit by a person (research §3). |
| `oldestCommitRead` | string \| null | For `orEarlier`. |
| `historyComplete` | boolean | All commits were read. |
| `lastPersonPr` | string \| null | Newest PR by a person, not `campaign`. |
| `lastPersonIssue` | string \| null | Newest issue by a person. |
| `openPersonWork` | boolean | An open PR (not `campaign`) or issue by a person, from the open lists. |
| `listsComplete` | boolean | The issue fields were read; each newest list had fewer than 20 nodes or a person node; each open list had no next page. |
| `notSureReason` | `"no-issue-data"` \| `"lists"` \| null | Why `listsComplete` is false; only for the log. |

`"not-available"` when the query for the repo failed. When only the issue part failed (no
"Issues" permission), `lastPersonIssue` is null and `listsComplete` is false, so the rule gives
no suggestion.

## ArchiveState (`ProjectStatus.archive`, on the page and in `status.json`)

```ts
type ArchiveState =
  | { state: "suggest"; since: string; orEarlier: boolean } // FR-003
  | { state: "kept"; until: string; reason: string }         // FR-008, until the date
  | undefined;                                               // active, not sure, or no data
```

Transitions: each run computes the state again from the data and the catalog; nothing is stored.
`suggest` → `undefined` after any work by a person, or after `status: archived` (the project then
leaves the page). `kept` → `suggest` the day after `until`, when the rule is still true.
