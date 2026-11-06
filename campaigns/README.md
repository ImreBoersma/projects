# Campaigns

One file for each change that goes to many repos at once (spec 015). Format:
[specs/015-repo-campaigns/contracts/campaign-file.md](../specs/015-repo-campaigns/contracts/campaign-file.md).

Run in `status/`: `bun run campaign <id> --dry-run`, then `bun run campaign <id>`.

Do not use a campaign for dependency versions (Renovate does them) or for secret values.
