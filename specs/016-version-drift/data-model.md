# Data Model: Version Drift Between Projects

## Tool

One of 7 fixed keys, in this column order:

| Key | Label | Where it comes from |
|---|---|---|
| `node` | Node | research §3 |
| `bun` | Bun | `packageManager` `bun@<v>`, else `engines.bun`, else "newest (CI)" when `bun.lock` or `bun.lockb` exists |
| `next` | Next.js | `dependencies.next`, else `devDependencies.next` |
| `react` | React | `react` |
| `typescript` | TypeScript | `typescript` |
| `biome` | Biome | `@biomejs/biome` |
| `types-node` | `@types/node` | `@types/node` |

## ToolVersion

| Field | Type | Rule |
|---|---|---|
| `text` | string | the value as written, or "Other" (safe text rule, research §5), or "newest (CI)", or "—" |
| `source` | string | `dependencies`, `devDependencies`, `ci.yml`, `.nvmrc`, `.node-version`, `engines`, `packageManager`, `default`, `bun.lock` |
| `major` | number or null | lowest major of the range (research §4); null = not compared |
| `behind` | number or null | set by the drift step: highest major of the tool − `major`, when ≥ 1 |
| `highest` | number or null | the highest major of the tool, when `behind` is set |

A missing tool has no ToolVersion (the cell shows "—").

## VersionRow

| Field | Type | Rule |
|---|---|---|
| `projectId` | string | catalog id of an active project |
| `repo` | string | `owner/name` |
| `state` | `"ok"` or `"not-available"` | `not-available`: a request failed (not 404) or `package.json` is not valid JSON |
| `tools` | partial map Tool → ToolVersion | empty when `not-available` |

A repo where `package.json` gives 404 has no VersionRow (FR-001).

## Drift step (pure function)

Input: all VersionRows with `state: "ok"`. For each tool: `highest` = the maximum `major`; only
when two or more rows have a non-null `major` for that tool. Each ToolVersion with
`highest − major ≥ 1` gets `behind` and `highest`. A row is "marked" when one or more of its
tools has `behind`. The tab count is the number of marked rows.

## StatusPage

New optional field `versions?: VersionRow[]` (after the drift step). Tests and the issues mode
leave it out; the panel then shows "No version data."
