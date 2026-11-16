# Archive a project

The status page shows the badge "Archive?" for a project with no commit, PR or issue by a
person for 12 months, and no open PR or issue by a person (spec 018). Work by bots (Renovate,
Dependabot) and campaign PRs (spec 015) does not count. The detail view of the project gives the
date of the last work and a link to this page.

A project that must stay as it is (for example the site of a past event that stays online) can
stop the suggestion until a date. Add `keep` to its entry in `projects.yaml`:

```yaml
    keep:
      until: 2027-06-01
      reason: Site of the 2026 event; stays online, no changes planned.
```

After that date, the suggestion comes back if the project still has no work. Then decide again.

## Checklist

Do the steps in this order. Steps 3 and 5 go in one PR in `projects`.

1. **Archive the repo.** On GitHub: the repo → Settings → Danger Zone → Archive this repository.
   Or: `gh repo archive <owner>/<repo>`. Check: the repo shows "This repository has been
   archived". Renovate, CI and the board workflows stop for the repo.
2. **Decide for the domain and the hosting.** For each, keep it or stop it:
   - Domain: keep it (it still points to a site) or stop the renewal at the registrar. Remove the
     `renewal` item of a stopped domain.
   - Hosting (Vercel, Firebase, GoDaddy): keep the site online or delete the hosting project.
   - Write each choice in the PR of step 3. Check: no renewal or bill comes for what you stopped.
3. **Set the catalog status.** In `projects.yaml`, set `status: archived` for the project. Check:
   after the next status run, the project is not on the status page.
4. **Remove the project from the board.** Close or move the open issues of the project, and
   remove its items from the board. Then run the board sync (`board-sync.yml`, or
   `cd status && bun run board:sync --dry-run` first). The sync removes the project from the
   "Project" field when no item uses it (spec 004). Check: the board has no item and no option
   for the project.
5. **Remove the secrets from the catalog.** In `projects.yaml`, remove the entries of the project
   from the `secrets` list. Check: the status run gives no catalog error.
6. **Revoke the tokens that only this project used.** The `secrets` entries of step 5 name them
   (for example a `VERCEL_TOKEN` or a deploy key). Revoke each token at its service (GitHub,
   Vercel, Firebase). Do not revoke a token that other projects also use, such as `BOARD_TOKEN`.
   Check: the token list of the service does not show the token.
