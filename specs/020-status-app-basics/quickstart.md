# Quickstart: validate the status app basics

## 1. Unit tests

```sh
cd status && bun run css && bun test && bun run lint && bunx tsc --noEmit -p .
```

Expected, also: `recentChanges` with a history fixture (started, stopped, a removed project, a
short history); `compareVisit` (first visit → 24h; reload within 10 minutes keeps the old base;
later visit moves the base; storage error → 24h); `statusJson` (same facts as the rows, no
forbidden fixture values, < 50 KB for 20 projects); `searchCommands`; shortcut URLs; manifest and
service worker text.

## 2. Local page

```sh
STATUS_READ_TOKEN=$(gh auth token) bun run start --history <data worktree>/history --out <scratchpad>/site
```

Serve `<scratchpad>/site` on localhost and check in Chrome:

- first load: "In the last 24 hours: …"; reload after changing the stored visit time to 1 hour ago
  and removing a key: that row has "New";
- `status.json` opens and has 11 projects;
- Chrome offers "Install"; the installed window opens; with DevTools "Offline" the page still
  shows, with the stale warning when older than 3 hours;
- the app badge shows the problem count (with a fixture problem);
- a pop-up has the 4 shortcuts; ⌘K, "hob", Enter opens hob.nl;
- the page is < 150 KB.

## 3. Live

After the merge: `https://imreboersma.github.io/projects/status.json` answers; install from the
live page; open it the next day and read the changes line.
