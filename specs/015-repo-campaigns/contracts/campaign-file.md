# Contract: a campaign file

Path: `campaigns/<id>.yaml`. Rules: [data-model.md](../data-model.md). A parse error stops the
command before any change, with `Campaign error in <file>, field <field>: <rule>`.

```yaml
id: node-24
title: "chore: use Node 24"
reason: |
  Node 22 leaves active support. The shared CI uses Node 24 from now on.
started: 2026-11-10
repos: all            # or: [boek-de-bus, personal-website]
changes:
  - write:
      path: .nvmrc
      content: "24\n"
  - replace:
      path: .github/workflows/ci.yml
      old: "node-version: 22"
      new: "node-version: 24"
```

Do not use a campaign for dependency versions: Renovate does them (constitution Principle IV).
Do not put secret values in a campaign (Principle III).

## PR

- Branch: `campaign/<id>`, from the head of the default branch.
- Title: `title`.
- Body:

```text
<reason>

This PR is part of the campaign <id>: https://github.com/ImreBoersma/projects/blob/main/campaigns/<id>.yaml
Other PRs of this campaign: <search link of contracts/page.md>
```

- Label `campaign` (research.md §4).
- One commit, message `<title>`, with all changed files.
