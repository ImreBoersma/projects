# Data Model: Expiry of Tokens and Secrets

## SecretEntry (catalog)

| Field | Type | Rule |
|---|---|---|
| `name` | string | Required. `A-Z`, `a-z`, `0-9`, `_`, `-`, space; 1 to 60 characters. |
| `kind` | enum | `actions-secret`, `environment-secret`, `actions-variable`, `account`. |
| `where` | string | `owner/repo` for the first three kinds; 1 to 40 characters of text for `account`. |
| `expires` | `YYYY-MM-DD` or `never` | Required. A real date. |
| `project` | string | Optional. Must be a catalog project id. Empty: shared. |

Unique: `name` + `where` (case-insensitive). A second entry with the same pair is a catalog error.

## SecretStatus (one run)

| Field | Type | Rule |
|---|---|---|
| `entry` | SecretEntry | From the catalog, or made from a read token (research.md §3). |
| `date` | string or null | Earlier of the catalog date and the read date; null for `never` without a read date. |
| `days` | number | `daysUntil(date)` of spec 009. |
| `source` | `catalog` \| `token` \| `both` | Where the date comes from. |
| `owner` | project id or `shared` | |

Shown and checked only when `date` is not null.

## Problem `secret-expiring`

Key `<owner>/secret-expiring/<slug(name)>`. Exists when `days <= 30`. Text: "The secret <name>
expires in <n> days." or "The secret <name> expired <n> days ago." One word ("secret") for all
kinds, so that the text does not depend on the name.

## Gap (setup note)

`{ owner, repo, name }` for each name used in a workflow of `repo` without an entry. No problem,
no issue.
