# Contract: the section "Campaigns" on the status page

After the project sections, before "Shared tokens". Not shown when no campaign is open or done in
the last 7 days.

```text
CAMPAIGNS
● Use Node 24                                         started 4 days ago
  3 merged · 2 open · 1 failed CI · 1 to do · 1 not needed   ↗ PRs
```

- The dot: amber when a PR has failed CI (FR-008), grey while PRs are open or to do, green when
  done. No problem and no issue.
- Each count is shown only when > 0. `failed CI` is an amber badge; the other counts are plain
  text.
- `↗ PRs` links to `https://github.com/pulls?q=is:pr+head:campaign/<id>+user:ImreBoersma+user:harmonieorkest-brummen`.
- Done: `Done <relative time>` in place of the counts, for 7 days after the last merge or close.
