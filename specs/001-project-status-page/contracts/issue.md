# Contract: problem issue

Repo: `ImreBoersma/projects`. Label: `status-problem`.

## Title

`<project name>: <problem text>` (problem text from [page.md](./page.md)).

Example: `Beter dan de MIDI: The last CI run failed.`

## Body

```markdown
<!-- status-problem: beter-dan-de-midi/ci-failed -->
The status update found this problem on 2026-10-28.

Do these steps:

1. Open the repo of the project.
2. Find the cause.
3. Repair the cause.

The next update closes this issue when the problem stops.
```

- The marker on line 1 is the identity. The script never reads the title.
- The body MUST NOT contain text from the project repo (FR-009e).

## Close

Comment: `The status update on <YYYY-MM-DD> did not find this problem. The update closes this
issue.` Then close with reason `completed`.
