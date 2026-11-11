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

**Decision**: the two DaisyUI themes get their values from `TOKENS` of `status/src/style.ts`.
In DaisyUI, `--color-error` is the strong colour and `--color-error-content` the text on it; the
soft badge (`badge-soft`) uses `--color-error` as its text and a mix of it with `base-100` as its
background. So (analysis C1): `base-100` = `bg`, `base-200` = `line`, `base-content` = `fg`,
`primary` = `link`, `error` = `badFg`, `warning` = `warnFg`, `success` = `goodFg`, `neutral` =
`unknownFg`, and each `-content` = `bg`. `scripts/build-css.ts` writes these values into the theme
blocks before it runs the CLI.

**Contrast check**: the `TOKENS` test of `style.test.ts` stays, but it does not cover the colours
that DaisyUI mixes. The browser check (T023) reads the computed text and background colour of each
badge kind and of the controls in both schemes and calculates the ratio (≥ 4.5).

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

## 8. Validation results

| # | Check | Date | Result |
|---|---|---|---|
| T021 | Tests, lint, types | 2026-11-06 | 268 tests pass (baseline 259); Biome (with Tailwind syntax on, `build/` left out) and `tsc` clean. |
| 1 | List height at a laptop window (SC-001) | 2026-11-06 | First 950 px; with `py-2` on the rows 774 px (< 800). |
| 2 | 360 px | 2026-11-06 | Scroll width 360 = client width; the filters fold under "Filters". |
| 3 | Contrast of the drawn colours (analysis C1) | 2026-11-06 | Light: error badge 6.12, warning 6.78, neutral 7.12, select 15.26; dark: 9.73, 10.67, 9.73, 14.87. All ≥ 4.5. |
| 4 | Keyboard | 2026-11-06 | Tab reaches the tabs, the controls and the rows; Enter on a row opens its modal; Tab stays in the modal; Escape closes it, the hash goes away and the focus is on the row again. A modal opened by a link (`#p-hob-nl`) closes the same way. |
| 5 | Without the script | 2026-11-06 | No controls, no tab bar, all 4 panels, 11 rows; a row opens its modal by `:target`. |
| 6 | Filters and address | 2026-11-06 | `q=bus` → 1 of 11; `stakeholder=Harmonieorkest Brummen` → 3 of 11; sort `commit` → oldest first; `?tab=tokens` → only that panel. |
| 7 | Sizes | 2026-11-06 | CSS 56.4 KB (DaisyUI `include:` only the used components; was 75 KB); page 100 KB with live data. |
| Found | In the implementation | 2026-11-06 | (1) Closing a modal that a link opened left it open (`:target` stays); with the script the class `modal-open` opens it and CSS hides `:target` (research.md §2). (2) Tailwind's base removes the link underline: external links get the DaisyUI class `link` (spec 007 FR-012). (3) The uptime bar was in each modal and in History: now only in History (page size). (4) Side note: spec 001 forbade stakeholder names; the Maintainer allowed organisation names (spec 001 contract changed). |
| Found in CI | 2026-11-06 | The size test used the built CSS, which CI does not build before the tests (fallback 60 KB → 153 KB). Now two fixed budgets: CSS < 60 KB (css.test.ts) and HTML < 90 KB for 20 sites with problems and dates (render.test.ts). Only "down" and "no data" uptime marks have a tooltip (the bar aria-label has the totals): worst case 93 → 80 KB of HTML. |
| Live (T027) | 2026-11-06 | Merge e497333: build, history, issues and deploy passed. Live page 101 KB: 11 rows, 11 modals, 4 tabs, "All correct". The local run showed the certificate of imreboersma.nl at 27 days; the live run and `openssl` give 2027-02-03 (89 days): the local network reached another server. |

## 9. Theme "bumblebee" (2026-11-06)

**Decision**: the Maintainer's theme replaces the two themes from the spec 012 colours: white base,
yellow primary, 2rem radius, noise. Three changes, for FR-010:

- `color-scheme: light` (the pasted theme said `dark`; on a white base the browser then draws its
  own controls, such as the select menus, dark).
- Solid badges and a solid total block (content colour on the strong colour). As soft badges, the
  strong colour is the text: warning 1.7:1, success 1.9:1, error 2.8:1 on white.
- `--color-error-content` `oklch(28% 0.141 25.723)` in place of 39%: 4.95:1 on the error colour
  (39% gives 3.5:1).

`prefersdark: true` keeps the same light theme in a dark system: there is no dark scheme now.

**Change 2026-11-10 (Maintainer request)**: a second theme `bumblebee-dark` (`THEME_DARK` in
`status/src/style.ts`): the same colours on a dark base (base 22%, text 93%), `color-scheme:
dark`, `prefersdark: true`; the light theme is the default. No switch: the browser setting
chooses. A theme colour `--color-error-text` (54% light, 70% dark) is the colour of red text on the
base (the error colour gives 2.9:1 on white). `style.test.ts` checks the pairs of both themes.
`style.test.ts` checks the theme pairs (oklch to sRGB, ≥ 4.5); the browser gave error 4.94,
warning 5.24, neutral 8.24, total block 16.6. CSS 55.8 KB.

