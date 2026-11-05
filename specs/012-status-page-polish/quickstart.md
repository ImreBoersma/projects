# Quickstart: validate the status page polish

## 1. Unit tests

```sh
cd status && bun test && bun run lint && bunx tsc --noEmit -p .
```

Expected: all tests pass, also:

- `view.test.ts`: total state for 0 problems, 2 problems, and 0 problems with "Data not
  available"; sections in catalog order; each badge kind of data-model.md, with the limits 14/28
  and 30/60; `relTime` for 0 s, 25 min, 5 h, 3 days, in 40 days.
- `style.test.ts`: each token pair ≥ 4.5:1 in light and dark.
- `render.test.ts`: each `<a>` has `target="_blank"`, `rel="noopener noreferrer"` and the text
  "(opens in a new tab)"; the title starts with `(2)` for 2 problems; the script has no `src`.

## 2. Local page

```sh
cd status
STATUS_READ_TOKEN=$(gh auth token) bun run start --out <scratchpad>/site
```

Open `<scratchpad>/site/index.html` and check:

- the tab title and the favicon match the total state;
- the sections and their order;
- at 360 px wide: cards, 0 px horizontal scroll;
- in the dark scheme: all badges readable;
- with scripts off: the page shows the relative times of the update; all links work;
- with scripts on, after 2 minutes: "1 minute ago" became "3 minutes ago" (or more);
- a click on a link opens a new tab; the status page stays;
- the page is less than 100 KB.

## 3. Live page

After the merge, the next status run deploys the page. Expected: the same as step 2 on
https://imreboersma.github.io/projects/.
