# Research: Status Page Visual Polish

## 1. UI library

**Decision**: no UI library and no CSS framework. Hand-written CSS with a fixed set of tokens:
colours (light and dark), a 4-step spacing scale (4, 8, 12, 16 px), one corner radius, two font
weights, the system font stack.

**Rationale**: the page is one HTML string of 16 KB, made by a TypeScript function, with no
frontend build. The new parts are 4 badge kinds, 3 section titles, 3 favicons and 1 script:
approximately 80 lines of CSS. A component library (for example shadcn/ui) needs React, a bundler
and Tailwind; that adds a build that can fail, Renovate updates each week, and a larger page, for
no new function. FR-010 forbids files from other sites, so a library must be put in the page
anyway.

**Alternatives**: shadcn/ui on React. Rejected: see above. A classless stylesheet (Pico.css,
approximately 10 KB, inline). Rejected: it changes tables and links in ways that conflict with the
card layout of spec 007 and the dark scheme; only the badges and sections are new.

**When to look again**: when the page becomes an app (filters, views for one stakeholder, forms,
data that changes in the browser). See §2 and `PLAN.md`.

## 2. A later status app

**Decision**: do not build an app now. Prepare for it at no cost: the view model (`view.ts`) is
pure and has no HTML, so an app can use the same rules for the total state, the sections and the
badge kinds.

**Rationale**: the Maintainer expects that the page becomes an app. The expensive part to change
later is the logic, not the HTML. With the logic in pure functions with tests, an app (for example
Next.js with shadcn/ui, the stack of the other projects) can import or copy it.

**Alternatives**: also publish `status.json` with the view model. Deferred: no consumer yet; add
it when the app starts. The content rules of spec 001 FR-018 apply to it too.

## 3. Relative times and the script

**Decision**: one self-contained function `relTime(isoTime, nowMs)` in `view.ts`. The server uses
it to write the text in the page. The inline script contains the same function, put in with
`relTime.toString()`, and updates each `<time data-rel>` each 60 seconds. The stale check of spec
001 moves into the same script.

**Rationale**: one function, one test, so the server text and the browser text cannot differ.
Verified 2026-11-05: Bun 1.4.4 gives JavaScript without types from `Function.prototype.toString()`
of a TypeScript function. The function must not use imports or values outside its body.

**Rules** (FR-006): less than 1 hour: minutes ("25 minutes ago", "1 minute ago", "now" below 1
minute); less than 48 hours: hours; else days. Future: "in 40 days". Expiry and renewal dates are
dates without time; they use whole days (`daysUntil` of spec 009), so "today", "in 1 day".

**Alternatives**: two functions (TypeScript and a JavaScript string). Rejected: they can drift.

## 4. Sections

**Decision**: each section is an `<h2>` and its own table, in the order "Projects with problems",
"Check not available", "Other projects". A section without rows does not show.

**Rationale**: a heading per section works for screen readers and in the card layout without new
CSS. One table with section rows (`<th colspan>`) breaks the card layout of spec 007.

**"Check not available"** (spec FR-005): 0 problems, and one or more of these:
`availability` is `unavailable`; the uptime state is `not-available`; `conformanceNotAvailable` is
not empty. A certificate or a domain date that is "not known" does not count: for a platform
subdomain this is the normal state (spec 009).

## 5. Badges and contrast

**Decision**: a badge is a `<span class="badge good|warn|bad|unknown">` with the text. Text colour
and background are tokens. `style.test.ts` calculates the WCAG contrast ratio of each pair
(text on badge background, text on page background, link on page background) in both schemes
and fails below 4.5.

Start values (to be confirmed by the test):

| Kind | Light text / background | Dark text / background |
|---|---|---|
| good | `#0d652d` / `#e6f4ea` | `#a8dab5` / `#0f2e1a` |
| warn | `#7a4a00` / `#fef7e0` | `#fdd663` / `#3a2c00` |
| bad | `#a50e0e` / `#fce8e6` | `#f6aea9` / `#3c1412` |
| unknown | `#3c4043` / `#eceff1` | `#c4c7c5` / `#2d2f31` |

## 6. Links in a new tab

**Decision**: the `link()` helper writes `target="_blank" rel="noopener noreferrer"` and after the
text `<span aria-hidden="true" class="nt">↗</span><span class="sr">(opens in a new tab)</span>`.
`.sr` is the usual visually-hidden class. The header links use the same helper.

**Rationale**: one helper, so 100% of links get it (SC-003); a test checks that each `<a>` in the
page has the attributes. The arrow is `aria-hidden`, so a screen reader does not read it twice.

## 7. Favicon and title

**Decision**: an SVG favicon as a `data:` URL in `<link rel="icon">`, one for each total state,
each with a different shape: correct = green circle with a check, problems = red square with "!",
check not available = grey triangle with "?" (the "check not available" icon). The title: `(<n>) Project status` with problems,
else `Project status`.

**Rationale**: in the page, so no file and no request. Different shapes, so the state is clear
without colour (FR-003).

## 9. Design revision (2026-11-05)

**Reason**: the first release was too busy: 9 columns, a coloured badge for each state also when
the state is good, 5 equal "No repo" badges in one row, each date two times, many new-tab marks
with the link colour.

**Decision**, from common status-page practice (GitHub status, Vercel, Atlassian Statuspage) and
calm-design rules:

- Colour only for a state that needs attention. Good states are plain grey text; a green dot in
  front of the project is enough.
- One list item per project: dot, name, problems, then one wrapping line of short facts. A fact
  with no value does not show. This also removes the special card layout for phones.
- One large block at the top with the total state, the summary and "Updated <relative>".
- Relative times only; the exact time is in the tooltip and in screen-reader text.
- A narrow column (760 px), 16 px text with line height 1.6, more space between groups, section
  titles in small muted capitals with a count, thin lines between projects only.
- Warm neutral colours; links in the text colour with a light underline (still underlined,
  spec 007 FR-012); the new-tab mark is muted.
- Second pass (Maintainer: "a lot of information without separation"): the facts are in three
  labelled lines (Site, Code, Expiry) with ` · ` between the items (grouping by proximity and
  labels). Screen-reader text is not selectable, so a copy has no "(opens in a new tab)" and no
  duplicate times.

**Contrast**: `style.test.ts` checks 18 pairs, also the text and muted colours on the tinted
backgrounds of the top block. All are 4.5 or more in both schemes.

## 8. Validation results

| Check | Date | Result |
|---|---|---|
| Unit tests, lint, types (T026) | 2026-11-05 | 198 tests pass (baseline 178); Biome and `tsc` clean. Contrast test: all 11 pairs ≥ 4.5 in both schemes with the start values of §5; dark `muted` `#999` on `problemRow` is 5.37. |
| Local page with live data (T027) | 2026-11-05 | 27 KB. Title `Project status`, grey "check not available" favicon and badge (hob.nl and pretband-backend: the local token cannot read them; CI uses their own tokens). Sections "Check not available" and "Other projects". imreboersma.nl certificate in 28 days shows as an amber badge. |
| 360 px, dark scheme, script (T027) | 2026-11-05 | In a 360 px frame: card layout, scroll width 360 = client width (0 px scroll). Dark tokens: all badges readable. 25 links, 0 without `target="_blank"` and `rel="noopener noreferrer"`. The script changed "(now)" to "(3 minutes ago)" after the time was set 3 minutes back. Without the script the page has the relative times of the update (server text, render tests). Fix found in the check: a linked badge and its new-tab mark wrapped on two lines; `a:has(> .badge) { white-space: nowrap; }`. |
| Live page (T030) | 2026-11-05 | Run 42061350967 (merge 830ab73): build, history and issues succeeded; the first deploy reported a GitHub Pages 500, but the page was published (the re-run of the deploy job failed only on the duplicate `github-pages` artifact). Live: "All correct", one section "Other projects", 29 of 29 links open a new tab, imreboersma.nl certificate amber (in 28 days), 27.9 KB, "History from 2026-11-05 (today)". |
| Design revision, local (§9) | 2026-11-05 | 194 tests pass; 24 KB with live data; light and dark checked in the browser; in a 360 px frame 0 px horizontal scroll. |
| Design revision, live | 2026-11-05 | Run 42110353713 (merge 51a526d): all jobs succeeded. Live page: "All correct", 11 projects with grouped facts (Site, Code, Expiry). |
