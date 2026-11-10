# Quickstart: Version Drift Between Projects

## Tests

```sh
cd status
bun test            # parse, drift, read (fake fetch), render, size, style
bun run typecheck && bun run lint
```

Expected: the range cases of research §4 (`^5` → 5, `>=18 <21` → 18, `^20 || ^22` → 20,
`<21` → null, `latest` → null), the safe text rule (`github:org/repo` → "Other"), the drift
marks of SC-002 with the fixture of the 2026-11-10 table, and the size below 30 KB gzip.

## Local run with real data

```sh
cd status
CONFORMANCE_READ_TOKEN=… STATUS_READ_TOKEN_HOB=… STATUS_READ_TOKEN=… bun run start -- --out /tmp/site
```

Set the token values from the password manager in the shell; do not paste them in a file.
Expected log lines: `Versions <repo>: read` for each repo with a `package.json`, and
`Versions: <n> repos behind`. Open `/tmp/site/index.html?tab=versions`:

- boek-de-bus: TypeScript `^5` and `@types/node` `^20` marked.
- pretband-backend, Beter-dan-de-MIDI, personal-website: TypeScript `^6.x` marked.
- No mark for React, Next.js, Biome; Node "24 (default)" in each row.
- hob-nl and HomeLab are not in the table.
- The tab label shows 4.

## Checks in the browser

- Light and dark theme: the marked cells are readable; the mark symbol shows.
- 375 px wide: the table scrolls in its own box; the page does not scroll sideways.
- Without the script: the Versions panel shows below the other panels.
- ⌘K → "versions" → "Tab: Versions" opens the tab.

## After the merge

The first hourly run shows the tab on https://imreboersma.github.io/projects/?tab=versions.
Check every workflow run on the merge commit.
