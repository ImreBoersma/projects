# Quickstart: Delivery Numbers for Each Project

## Tests

```sh
cd status
bun test && bun run typecheck && bun run lint
```

Expected: the median (odd and even counts), the time text (`< 1 h`, `33 h`, `11 d`, `—`), the
window and its months (4, and 5 for a window from 2027-01-31), the bot test (`__typename: "Bot"`, a deleted author), the pages of the
read with a fake fetch (stop at the window start, at most 5 pages), the table HTML, and the size
below 30 KB gzip with 20 rows.

## Local run with real data

```sh
cd status
STATUS_READ_TOKEN=… STATUS_READ_TOKEN_HOB=… bun run start -- --out <scratchpad>/site
```

Expected log lines: `Delivery <repo>: <n> PRs, <m> deploys` for each repo, no PR text. Open
`<scratchpad>/site/index.html?tab=history`:

- scales-exercises: about 58 merged PRs, 47 updates (the numbers change each day).
- pretband-backend: the highest update time (about 11 d).
- hob-nl: 0 merged PRs, deploys in November only.
- HomeLab and Reperatie-Formulier: Deploys "—".
- The total row is below the rows.

Check light and dark, and 375 px (in a frame: headless Chrome has a minimum width of 500 px).

## After the merge

Check every workflow run on the merge commit, then the History tab of
https://imreboersma.github.io/projects/?tab=history.
