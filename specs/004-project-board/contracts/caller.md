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

Repos: Beter-dan-de-MIDI, boek-de-bus, personal-website, Reperatie-Formulier, scales-exercises,
HomeLab, projects. Each repo needs the secret `BOARD_TOKEN`. `pretband-backend` gets no caller
(research.md §1).

Caution: a HomeLab merge to `main` deploys on the Pi. The Maintainer merges the HomeLab PR.
