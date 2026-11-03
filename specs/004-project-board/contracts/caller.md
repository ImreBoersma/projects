# Contract: board caller in a project repo

File: `.github/workflows/board.yml`. It contains only the call to the shared workflow
(Principle IV). The rules of the spec 002 caller contract apply: `permissions: { contents: read }`,
never `permissions: {}`, and `@main`.

```yaml
name: Board
on:
  issues:
    types: [opened, transferred]
permissions: { contents: read }
jobs:
  board:
    uses: ImreBoersma/projects/.github/workflows/add-to-board.yml@main
    secrets:
      board-token: ${{ secrets.BOARD_TOKEN }}
```

In `projects`, the caller uses `./.github/workflows/add-to-board.yml`.

Repos: Beter-dan-de-MIDI, boek-de-bus, personal-website, scales-exercises, projects. These are the
public own catalog repos. Each repo needs the secret `BOARD_TOKEN` (scope `project` only,
research.md §3).

No caller in: HomeLab and Reperatie-Formulier (private: the sync adds their issues), and
`pretband-backend` (other owner: built-in auto-add, research.md §1). When a repo changes from private
to public, add the caller.
