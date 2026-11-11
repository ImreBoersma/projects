# Contract: page and issue for `not-conformant`

## Problem text

| reason | Text |
|---|---|
| `not-conformant` | The repo does not follow the shared setup. |

On the page, under the problem text, a short list of the failed rules: `R4 Renovate preset, R6
Issues on`. Each rule id links to `https://github.com/ImreBoersma/projects/blob/main/docs/conformance.md#<anchor>`.
The problem text links to the issue (spec 007).

When one or more rules of a repo are `not-available`, the group "Code" of the project shows the
plain text `Setup check not available: R7, R9` (rule ids only; first a grey note in the Problems
cell, moved by spec 019). The note is not a problem: the row is not
marked, the sort order does not change, and no issue opens. The log line says
`Conformance <repo>: check not available: R7, R9`.

## Issue

Title: `<project name>: The repo does not follow the shared setup.`

Body (after the marker of spec 001):

```text
The status update found this problem on <date>.

These rules fail:

- R4 Renovate preset: <link to docs/conformance.md#r4-renovate-preset>
- R6 Issues on: <link>

Do the repair steps of each rule. The status page shows the current list.
The next update closes this issue when all rules pass.
```

## Forbidden content

No file content, no setting values, no secret values and no secret names on the page or in the
issue. The rule names and ids are fixed text.
