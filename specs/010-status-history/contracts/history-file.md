# Contract: day file on the branch `data`

Path: `history/YYYY-MM-DD.ndjson` (date of the result in UTC). One JSON object on each line, one
line for each status run, in the order of the runs. The branch `data` is an orphan branch: it has
no common history with `main`, and it is never merged.

Example line (one line in the file; here on more lines for reading):

```json
{"time":"2026-11-05T15:00:44Z",
 "projects":{
   "hob-nl":{"site":"up","problems":[]},
   "boek-de-bus":{"site":"no-domain","problems":["boek-de-bus/ci-failed"]},
   "pretband":{"site":"up","problems":["pretband/renewal-due/domain"]}}}
```

Rules:

- Only the fields of [data-model.md](../data-model.md). No other text.
- A line that is not valid JSON, or that has no valid `time`, is skipped with a log line.
- A run appends exactly one line. A line is never changed or removed by the update.
- `README.md` at the root of `data` says what the branch is and that it is not merged.

Commit message of each append: `chore: add the status result of <time>`.
