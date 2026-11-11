# Contract: the page structure (spec 019)

Replaces the layout of the spec 012 contract; its content rules stay (relative times, new-tab
links, total state, title, favicon, no secret values).

```text
<header>     Project status                         Roadmap ↗  Project board ↗
<total>      [icon] 2 problems  — summary line — Updated 5 minutes ago · History from …
             (stale warning when old)
<tabs>       Projects 2 | Campaigns 1 | Shared tokens | History
<controls>   [Search name] [State ▾] [Stakeholder ▾] [Has a site ▾] [Sort ▾]   3 of 11
<list>       ● hob.nl                  CI failed                         ›
             ● Personal website        Certificate in 28 days            ›
             ● Boek de bus             All correct                       ›
<modal #p-hob-nl>  hob.nl ↗                                              ✕
             problems with issue links and "since"
             Site / Code / Expiry lines (spec 012 facts)
```

- Each row: `<li><a class="list-row" href="#p-<id>" data-…>` with the dot (text for screen
  readers), the name, the summary fact (badge colour for bad/warn/unknown, plain for good) and a
  "›" mark (`aria-hidden`).
- Each modal: `<div id="p-<id>" class="modal" role="dialog" aria-modal="true" aria-labelledby="t-<id>">`
  with a `modal-box`, the title (`h2#t-<id>`, a new-tab link to the repo or site), the problems,
  the fact groups, and a close link `<a href="#" aria-label="Close">✕</a>`. With the script, the
  class `modal-open` opens a modal and `:target` does not (research.md §8); without the script,
  `:target` opens it.
- Controls: real `<input>` and `<select>` elements with `<label>` (visible or screen-reader text);
  below 640 px they fold under a "Filters" button (`<details>`). They show only when the script runs
  (`html:not(.js) .controls { display: none }`), because without the script they do nothing.
- Empty result: "No project matches the filter." with a "Clear the filter" button.
- Tabs: `<nav class="tabs tabs-border" role="tablist">` with `<a role="tab" href="?tab=…">`;
  each panel `<section id="tab-…" role="tabpanel">` with its own `<h2>`. Without the script all
  panels show.
- CSS: one inline `<style>` (the built DaisyUI CSS). Script: one inline `<script>` (spec 012
  times and stale check, plus the functions of `client.ts`). No `src`, no `href` to another site
  except the links.
