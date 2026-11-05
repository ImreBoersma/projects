# Quickstart: validate renewals and certificate expiry

## 1. Unit tests

```sh
cd status && bun test && bun run lint && bunx tsc --noEmit -p .
```

Expected: all tests pass, also the day counts at 14/15 and 30/31 days, the merge of a catalog and
a registry "Domain", and the catalog errors of [contracts/catalog.md](./contracts/catalog.md).

## 2. Local page on the real domains

```sh
cd status
STATUS_READ_TOKEN=$(gh auth token) GITHUB_TOKEN=$(gh auth token) bun run start --out <scratchpad>/site
```

Expected: the column "Expiry" shows `Certificate: <n> days` for the 4 sites (about 44 days for
`pretband.nl` on 2026-11-05); `Domain: not known` for the 3 `.nl` domains; no expiry problem.

## 3. Renewal due (US2)

In a catalog copy, add to one entry:

```yaml
    renewal:
      - name: Hosting
        date: <today + 20 days>
```

Run §2 with `--catalog <copy>`. Expected: the problem "Renewal of Hosting is due in 20 days." Run
the issues mode with `--dry-run`. Expected: one `Open:` line for it.

## 4. Certificate limit (US1)

Not testable on a real site without an old certificate. The unit tests cover it with an injected
certificate reader.

## 5. After the merge

Add the real renewal dates to `projects.yaml` (at least `Domain` for the 3 `.nl` domains). See
the format in [contracts/catalog.md](./contracts/catalog.md).
