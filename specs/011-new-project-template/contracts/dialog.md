# Contract: the "New project" dialog

## ⌘K item

`searchCommands` of spec 020 gets one more item kind, `action`, with the label "New project".
It matches the text "new" or "project" like the other items, after the projects, tabs and
filters.

## Dialog (`#new-project`, a DaisyUI modal; hidden without scripts)

| Element | Rule |
|---|---|
| Title | "New project" |
| Fields | Id, Name, Repo, Visibility (select: Public, Private), Stack, Host (select: the catalog hosts of the host map, and "Other (no deploy)") — each with a `<label>` |
| Message | below a field: "This id is in the catalog." / "This name is in the catalog." / "ImreBoersma/<repo> is in the catalog." / "Use a-z, 0-9 and -." (`aria-live="polite"`) |
| Command | `<pre><code>` with the text of `newProjectCommand(fields)`; empty until id, name and repo are valid |
| Copy | button "Copy command"; after the copy the button text is "Copied" for 2 s |
| Note | "Run it in a terminal in the projects repo. Add --dry-run to see the steps first." |

Escape closes the dialog and gives the focus back, as the other modals. The first field gets the
focus on open.

## Inline data

The key `catalog` in the inline data block `#changes` of spec 020 (the page keeps one data block):
`{ ids, names, repos }`, names and repos in lower case, with the `<`-escape of spec 020. Repos are the `ImreBoersma/…` repos of the catalog only.

## No request

The dialog uses only the inline data and `navigator.clipboard.writeText`. A test checks that
`client.ts` has no `fetch(` or `XMLHttpRequest` (spec 020 FR-010).
