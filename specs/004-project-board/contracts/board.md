# Contract: the board

User project "Projects" of `ImreBoersma`. Visibility: Public. Make it one time with `gh` and the
web UI (quickstart.md §1). This file is the record, so that the board can be made again.

## Fields

See data-model.md. The Status field is the built-in field.

## Views

| View | Layout | Filter | Group or sort | Who |
|---|---|---|---|---|
| Board | Board | `is:open` | column by Status | Maintainer |
| By project | Table | `is:open` | group by Project, sort by Priority | Maintainer |
| Roadmap | Table | `roadmap:Yes -label:status-problem is:issue` | group by Project | stakeholders |

The Roadmap view shows only these fields: Title, Project, Status. It does not show Priority,
Stakeholder, assignees or labels (Principle VII).

## Built-in workflows

| Workflow | State | Setting |
|---|---|---|
| Item closed | on | Status = Done |
| Pull request merged | on | Status = Done |
| Auto-add to project | on | repo `harmonieorkest-brummen/pretband-backend`, filter `is:issue` |
| Item added to project | off | the add job sets the fields |

## Links

Board: `https://github.com/users/ImreBoersma/projects/4` (N = 4, made on 2026-11-03).

The roadmap link for stakeholders is `https://github.com/users/ImreBoersma/projects/4/views/3`
(M = 3, made on 2026-11-04). It is also in PLAN.md. The status page can link to it later.

The view "By Project" is named with a capital P on the board. The view "Roadmap" stores the filter
as `roadmap:yes -label:status-problem is:issue` (GitHub writes the value in lower case).
