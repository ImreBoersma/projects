# Contract: page, problem and issue for secrets

## Page

- A project secret with a date: one more item in the **Expiry** line of that project (spec 012
  contract), after the renewal: `Secret <name> <relative time>`, with the badge kinds of spec 012
  FR-004 for a 30-day limit (warn 31 to 60 days). Only the secret with the fewest days shows; the
  other ones count: `Secret <name> in 20 days (+2 more)`.
- Shared secrets: a group `Shared tokens` after the project sections, same list style as a
  project: one item "Shared setup" with an Expiry line of all shared secrets with a date, sorted
  by days, each with its badge kind.
- No expiry (FR-010): `<span class="badge warn">No expiry: <names></span>` as the last item of
  the Expiry line of the project or of "Shared setup". No problem, no issue; the dot and the total
  state do not change.
- Gaps (FR-009): in the **Code** line of the project: `Secret not in the catalog: <name>, <name>`;
  for this repo in the group `Shared tokens`.
- The total state, title and summary of spec 012 count the shared problems.

## Problem and issue

- Title: the problem text (data-model.md).
- Issue body, after the marker of spec 001:

```text
Where: <kind> in <where>
Date: <date> (<source: catalog | token | catalog and token>)

Do these steps:
1. Make a new <secret> at the provider.
2. Set it in <where> (<kind>).
3. Change `expires` of this secret in projects.yaml. For a GitHub token that the status run
   uses, the new date shows in the next run without a catalog change.
```

- Closed by the next run in which `days > 30`.

## Forbidden

No secret values, parts of values or hashes on the page, in the issues, in the log or in the
history. A test renders a page and an issue with fixture values in the environment and makes
sure that they do not occur.
