# Quickstart: validate the filters, sorting and detail views

## 1. Unit tests and the CSS build

```sh
cd status && bun install && bun run css && bun test && bun run lint && bunx tsc --noEmit -p .
```

Expected: the CSS file exists, has no `@import` and no URL to load, and is < 80 KB; the contrast
test passes; the client functions pass for each filter, sort and address case of
contracts/address.md; the summary fact of research.md §5.

## 2. Local page

```sh
STATUS_READ_TOKEN=$(gh auth token) bun run start --out <scratchpad>/site
```

Open the page from a local server and check:

- the list is 1 screen high on 1100 × 800 (SC-001);
- `?stakeholder=Harmonieorkest+Brummen` shows 3 of 11;
- `?state=problems`, `?sort=expiry`, `?tab=tokens` work, and the address changes with the controls;
- a click on a row opens its pop-up; Escape closes it; the focus is on the row again;
- `#p-hob-nl` opens that pop-up directly;
- keyboard only (Tab, Enter, Space, Escape) reaches all controls;
- light and dark: readable; 360 px: 0 px horizontal scroll, filters folded;
- scripts off: all projects and all tabs show; a row still opens its pop-up (`:target`);
- the page is < 150 KB.

## 3. Live page

After the merge: the same checks on https://imreboersma.github.io/projects/.
