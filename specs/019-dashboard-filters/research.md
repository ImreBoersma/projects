# Research: Status Page Filters, Sorting and Detail Views

## 1. DaisyUI in a static page without external files

**Decision**: Tailwind 4.3.4 with the CLI (`@tailwindcss/cli`) and DaisyUI 5.7.50 as a plugin, as
dev dependencies of `status/`. The input `status/src/page.css`:

```css
@import "tailwindcss";
@source "./render.ts";
@source "./client.ts";
@plugin "daisyui" { themes: false; }
@plugin "daisyui/theme" { name: "calm"; default: true; ... }
@plugin "daisyui/theme" { name: "calm-dark"; prefersdark: true; ... }
```

`bun run css` writes `status/build/page.css` (minified); `renderPage` reads it and puts it in a
`<style>` element. `bun run start` runs `css` first, so the workflow needs no new step.

**Spike (2026-11-06)**: tabs, select, input, badge, modal and list compile in 0.9 s to 49.8 KB.
The output has no `@import` and no URL to load (the only URLs are an SVG namespace in a data URL
and a licence comment). DaisyUI has `.modal:target`.

**Rationale**: Tailwind keeps only the classes that the sources use, so the page stays small; the
page loads nothing from other sites.

**Alternatives**: the DaisyUI CDN file. Rejected: spec 007 FR-011. Tailwind 3. Rejected: DaisyUI
5 is for Tailwind 4.

## 2. Pop-ups that work without a script, with a link

**Decision**: each project row is `<a href="#p-<id>">`; each project has a DaisyUI modal
`<div id="p-<id>" class="modal" role="dialog" aria-labelledby=...>` that opens by `:target`. The
close button is `<a href="#">`. With the script: open/close also update the focus (into the modal,
back to the row) and Escape closes.

**Rationale**: `:target` needs no script, and the hash is the per-project link of clarification
2. A `<dialog>` element needs a script to open.

## 3. Filters, sort and tabs in the browser

**Decision**: the rows have data attributes (`data-name`, `data-state`, `data-stakeholder`,
`data-site`, `data-commit`, `data-expiry`, `data-order`). `client.ts` has pure functions:
`readView(search, hash)`, `writeView(view)`, `matches(row, view)`, `compare(a, b, sort)`; a small
`start()` binds them to the DOM. The script adds the class `js` to `<html>`; only then the CSS
hides the tabs that are not active and folds the filters on a phone.

**Rationale**: the functions are tested without a browser; the page without a script shows all
content (FR-008).

## 4. Theme colours and contrast

**Decision**: the two DaisyUI themes get their values from `TOKENS` of `status/src/style.ts`
(`base-100` = `bg`, `base-content` = `fg`, `error`/`error-content` = `badBg`/`badFg`,
`warning`/`warning-content` = `warnBg`/`warnFg`, `success` = `goodBg`/`goodFg`, `neutral` =
`unknown...`). `scripts/build-css.ts` writes these values into the theme blocks before it runs
the CLI, so the contrast test of `style.test.ts` still covers the colours on the page.

## 5. The summary fact of a row

**Decision**: `summaryFact(s)` in `view.ts`, the first that applies:

1. The first problem text (problem colour).
2. "Check not available" (grey) for a row of FR-005 of spec 012.
3. The warning with the fewest days: certificate, renewal or secret (warning colour).
4. "No expiry: <names>" (warning colour, spec 013 FR-010).
5. "All correct" (plain text).

## 6. The address

**Decision**: query `?q=&state=&stakeholder=&site=&sort=&tab=` and hash `#p-<id>`
([contracts/address.md](./contracts/address.md)). The script changes the address with
`history.replaceState` for filters and sort (no new history entry for each key press) and with
the hash for the pop-up (Back closes it). Unknown values are ignored, with a short note.

## 7. The tabs

**Decision**: DaisyUI `tabs tabs-border` with `<a href="?tab=...">` links; each panel is a
`<section id="tab-...">`. Without the script, all sections show with their headings. The tab
"History" holds the uptime bars of all sites and the repair time (spec 010); the project modals
keep the uptime of their own site.
