# Quickstart: validate the status page links and layout

## 1. Unit tests

```sh
cd status && bun test && bun run lint && bunx tsc --noEmit -p .
```

Expected: all tests pass, also `links.test.ts` (each URL rule of
[data-model.md](./data-model.md)) and the privacy test of `render.test.ts`.

## 2. Local page

```sh
cd status
STATUS_READ_TOKEN=$(gh auth token) GITHUB_TOKEN=$(gh auth token) bun run start --out <scratchpad>/site
```

Open `<scratchpad>/site/index.html` in a browser.

Expected:

- The header has "Roadmap" and "Project board" links, and a summary line (US2, US4).
- Each project with a repo links to the repo. Each CI, deploy and Renovate cell with a value links
  to its GitHub page (US1).
- Each site cell links to its domain.

## 3. Problem link

Use a catalog copy with a domain that does not respond (spec 005 quickstart §2) and an open
`status-problem` issue for it, or wait for a real problem. Expected: the problem text links to the
issue after the issues job has opened it.

## 4. Phone width (US3)

In the browser developer tools, set the width to 360 pixels. Expected: each project is a card,
each line has a column name, and there is no horizontal scroll (SC-003). At 1100 pixels the table
shows.

## 5. Keyboard

Press Tab through the page. Expected: each link shows a visible outline (FR-012).

## 6. After the merge

Open the live page and repeat §2 and §4 on a phone.
