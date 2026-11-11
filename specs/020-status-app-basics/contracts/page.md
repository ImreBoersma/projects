# Contract: page parts of spec 020

Adds to the page of spec 019 (its rules stay).

- **Changes line** (script only), above the controls in the Projects tab:
  `Since your visit <relative time>: <n> new, <m> fixed` / `No change since your visit <relative time>` /
  `In the last 24 hours: <n> new, <m> fixed`. The exact time in a tooltip.
- **New mark**: a small badge "New" after the name in each row whose keys are new; with screen
  reader text.
- **Fixed list**: `<details>` "Fixed: <m>" under the line, at most 20 items `<project>: <text>`.
- **Inline data**: each row `data-keys="<key> <key>"`; one
  `<script type="application/json" id="changes">` with the recent changes (data-model.md).
- **Shortcuts** in each pop-up of a project with a repo, after the facts: one line "Act on
  GitHub:" with the 4 links of research.md §6 (new tab, spec 012). Header: "Run the status update
  now" (new tab).
- **Command box**: ⌘K / Ctrl+K; a modal `#command` with a labelled input "Go to" and a result list
  (`role="listbox"`, `aria-activedescendant`); a hint "⌘K" next to the search field.
- Without the script: no changes line, no New marks, no command box; the shortcuts show (they are
  links).
