# Data Model: Campaigns

## Campaign (file `campaigns/<id>.yaml`)

| Field | Type | Rule |
|---|---|---|
| `id` | string | Same as the file name; `a-z`, `0-9`, `-`; 3 to 40 characters. |
| `title` | string | Required; 1 to 80 characters; the PR title. |
| `reason` | string | Required; the first part of the PR body. |
| `started` | `YYYY-MM-DD` | Required. |
| `repos` | `all` or list of catalog ids | `all`: each catalog project with a repo that is not archived. Ids must exist and have a repo. |
| `changes` | list of Change | At least 1. |

## Change

| Kind | Fields | Rule |
|---|---|---|
| `write` | `path`, `content` | `path` relative, no `..`, no leading `/`. |
| `replace` | `path`, `old`, `new` | `old` not empty; `old` ≠ `new`. |

## Repo result (command)

`opened` (PR number) · `updated` (PR number) · `not-needed` · `merged` (PR number, no new change)
· `closed` (PR number, not reopened) · `failed` (reason) · `no-access`.

## Campaign state (status run, one for each target repo)

`merged` · `open` · `failed-ci` · `closed` (a PR closed without a merge, also when the change is
still needed) · `not-needed` · `to-do` (needed and no PR, or needed again after a merge).

## Campaign summary (page)

Counts of the states, `done` = no `open`, `failed-ci` or `to-do`; `doneAt` = the latest
merge/close time; shown while `done` is false or `now - doneAt < 7 days`.
