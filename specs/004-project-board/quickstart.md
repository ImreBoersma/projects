# Quickstart: validate the project board

## Prerequisites

- `gh auth refresh -s project` on the Maintainer machine.
- Classic PAT 1, scope `project`, expiry 1 year: secret `BOARD_TOKEN` in `projects`,
  Beter-dan-de-MIDI, boek-de-bus, personal-website and scales-exercises
  (`gh secret set BOARD_TOKEN -R ImreBoersma/<repo>`).
- Classic PAT 2, scopes `project` and `repo`, expiry 1 year: secret `BOARD_SYNC_TOKEN` in
  `projects` only.

## 1. Make the board

```sh
gh project create --owner ImreBoersma --title Projects
gh project field-create <N> --owner ImreBoersma --name Priority --data-type SINGLE_SELECT --single-select-options P1,P2,P3
gh project field-create <N> --owner ImreBoersma --name Roadmap --data-type SINGLE_SELECT --single-select-options Yes,No
gh project field-create <N> --owner ImreBoersma --name Project --data-type SINGLE_SELECT --single-select-options Placeholder
gh project field-create <N> --owner ImreBoersma --name Stakeholder --data-type SINGLE_SELECT --single-select-options Placeholder
```

Then, in the web UI: set the visibility to Public, make the views and set the built-in workflows of
[contracts/board.md](./contracts/board.md).

## 2. Unit tests

```sh
cd status && bun test && bun run lint
```

Expected: all tests pass.

## 3. Test on one repo before the merge (constitution)

1. On a branch of `projects`, add the shared workflows. In scales-exercises, add the caller with
   `@<branch>`.
2. Open an issue in scales-exercises. Expected: within 1 minute, the issue is on the board with
   Project "Scales exercises" and Roadmap No (FR-005). This also tests that `BOARD_TOKEN` with only
   `project` is sufficient (research.md §3).
3. Close the issue. Expected: Status Done (US1 AC3).

## 4. Sync

1. Run `board-sync.yml` with `dry-run: true`. Expected: the log lists the options to add (all
   catalog names and stakeholders) and removes "Placeholder".
2. Set a value on one test item. Run the sync without dry run. Expected: the options match the
   catalog, and the value on the test item stays (research.md §4).
3. Expected: open issues of catalog repos that were not on the board are now on the board, also
   the issues of HomeLab and Reperatie-Formulier (FR-005, private repos).

## 5. Other owner (FR-010)

Open an issue in `harmonieorkest-brummen/pretband-backend`, or use an open one. Expected: the
built-in auto-add puts it on the board, and the next sync sets Project "Pretband backend". If it
fails, record the error in research.md §1 and use the fallback of the spec.

## 6. Roadmap without a login (US3)

1. Set Roadmap Yes on one item of a public repo and on one item of a private repo.
2. Run the sync. Expected: the private item has Roadmap No.
3. Open the Roadmap view in a private browser window. Expected: the view shows; it shows the
   public item with Title, Project and Status; it shows no private or `status-problem` item.

## 7. Problem issue (FR-006)

Run the status page with a forced problem, or wait for a real one. Expected: the new
`status-problem` issue in `projects` is on the board with the Project of the problem.

## 8. Not in the catalog (US2 AC3)

Open an issue in `projects` without the marker. Expected: the add job passes and writes "Not in
the catalog"; the issue is not on the board.
