# Data Model: Stakeholder View and Status Badges

All values come from the `StatusPage` of the page run (spec 001, 005, 009, 010). Nothing is
stored; nothing is read from GitHub for this feature.

## StakeholderView

| Field | Type | Rule |
|---|---|---|
| `name` | string | The catalog value `stakeholder`. |
| `slug` | string | research.md §2; unique over all stakeholders, else the run stops. |
| `generatedAt` | Date | `StatusPage.generatedAt`. |
| `attention` | `AttentionItem[]` | Empty → "nothing needs the board". Only sites offline since 2 hours or longer, in name order. |
| `projects` | `ProjectBlock[]` | The projects of this stakeholder that are not archived, in name order (A to Z, as spec 019). |

One view for each distinct `stakeholder` value of the rows. Rows without a stakeholder are in no
view.

## AttentionItem

| Field | Type | Rule |
|---|---|---|
| `kind` | `"offline"` | research.md §5. |
| `project` | string | Project name. |
| `address` | string | The site address, for the sentence of the top line. |
| `since` | string | The "offline since" time (ISO). |

## ProjectBlock

| Field | Type | Rule |
|---|---|---|
| `name` | string | `project.name`. |
| `site` | `SiteFact` \| null | Null when the project has no `domain`. |
| `uptime` | `{ percent: number; since: string \| null }` \| null | `since` is null when the history has 30 days or more; null when there is no percentage. |
| `renewal` | `{ name: string; date: string; days: number }` \| null | The first renewal by date from `expiry.renewals` with `days >= 0`. Never an attention item (the Maintainer renews). |
| `state` | `"works"` \| `"problem"` \| `"not-checked"` | Used only when `site` is null. `problem` only for a fault: `ci-failed` or `deploy-failed` (research.md §4). |

## SiteFact

| Field | Type | Rule |
|---|---|---|
| `address` | string | `project.domain`. |
| `state` | `"online"` \| `"offline"` \| `"not-checked"` | From `uptime.state`: `up`, `down`, `not-available`. |
| `since` | string \| null | ISO time; for `offline` from `history.since["<id>/site-down"]`, else the check time `uptime.at`. For `not-checked`: the check time `uptime.at`. Null for `online`. |

## Badge

| Field | Type | Rule |
|---|---|---|
| `id` | string | `project.id`; file `badge/<id>.svg`. |
| `label` | string | `project.name`. |
| `state` | `"online"` \| `"offline"` \| `"works"` \| `"problem"` \| `"not checked"` | With a domain: from `uptime.state` (`up` → online, `down` → offline, `not-available` → not checked). Without a domain: from the project (research.md §4). |
| `colour` | hex | research.md §8. |

One badge for each row (archived projects are not in the rows, `catalog.ts`).

## State rules

- `offline` since 2 hours or longer (`generatedAt` minus `since` ≥ 2 h) is the only input that
  makes an `AttentionItem`. A shorter outage shows only in the `SiteFact`.
- A project with a site and other problems (for example CI) shows its site facts only; the
  problems are not in the view (FR-004, FR-005).
- Fault reasons (`FAULT_REASONS`): `ci-failed`, `deploy-failed`. Only these make `problem` for a
  project without a site, in the view and on the badge.
