# Data Model: Project Board and Public Roadmap

The data is in the GitHub Project. The catalog is the source for the Project and Stakeholder
options.

## Board

| Field | Type | Values | Source |
|---|---|---|---|
| Project | single select | `name` of each catalog entry that is not archived, plus archived entries with open items (FR-004) | sync (research.md §4) |
| Priority | single select | P1, P2, P3 | Maintainer |
| Status | built-in single select | Todo, In progress, Done | Maintainer; Done from the built-in close workflow |
| Stakeholder | single select | each non-empty `stakeholder` of the catalog | sync; the Maintainer sets the value on an item |
| Roadmap | single select | Yes, No | add job and sync set No on new items; Maintainer sets Yes; sync sets No (research.md §5) |

Visibility: Public. Name: "Projects".

## Item

One issue of a repo. The board keeps a reference, not a copy (FR-002).

| Rule | Source |
|---|---|
| Project is set when the item comes from a catalog repo or from a `status-problem` issue | FR-005, FR-006 |
| Roadmap = Yes only for an issue of a public repo without the label `status-problem` | FR-009 |
| An issue of a repo that is not in the catalog, or of an archived entry, is not added | US2 AC3, edge case |

## Catalog lookup

| Input | Result |
|---|---|
| repo `owner/name` of a catalog entry, status `active` or `maintenance` | that entry |
| repo of an archived entry, or not in the catalog | none: do not add |
| `ImreBoersma/projects` and body starts with `<!-- status-problem: <id>/<reason> -->` | entry with that `id` |

Repo names compare without case, because GitHub repo names are not case sensitive.

## Item states

```text
issue opened --add job--> on board, Project set, Roadmap No, Status Todo (empty)
Maintainer sets Roadmap Yes --> on the Roadmap view (public repo only)
item from a private repo, or label status-problem --sync--> Roadmap No
issue closed --built-in workflow--> Status Done
```
