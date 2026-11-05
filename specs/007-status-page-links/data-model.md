# Data Model: Status Page Links and Layout

No stored data. Each update makes these values again.

## ProjectStatus (changed)

| Field | Type | Source | Rule |
|---|---|---|---|
| `commitOid` | string or null | GraphQL `defaultBranchRef.target.oid` | null when the repo has no commit or no data |
| `renovateApp` | string or null | login of the first open Renovate PR, without `[bot]` | null when there are 0 Renovate PRs |

## Issue map (new)

`Map<string, number>`: marker key `<project id>/<reason>` → number of the open `status-problem`
issue in `projects`. Empty when the read fails (research.md §4).

## Links of a row

| Cell | URL | When |
|---|---|---|
| Project | `https://github.com/<repo>` | repo set |
| Project | `https://<domain>/` | no repo, domain set |
| CI | `https://github.com/<repo>/commit/<commitOid>/checks` | CI not "Unknown" and `commitOid` set |
| Last deploy | `https://github.com/<repo>/deployments` | deploy known |
| Renovate PRs | `https://github.com/<repo>/pulls?q=is%3Apr+is%3Aopen+author%3Aapp%2F<renovateApp>` | count > 0 and `renovateApp` set |
| Problem text | `https://github.com/ImreBoersma/projects/issues/<number>` | key in the issue map |
| Site | `https://<domain>/` | domain set |

No link in rows or cells with "No repo", "Data not available" or "Unknown".

## Summary

| Value | Rule |
|---|---|
| problems | number of problems of all rows |
| projects with a problem | rows with 1 or more problems |
| projects without a problem | the other rows |
| sites up / checked | rows with uptime `up` / rows with uptime `up` or `down` |
