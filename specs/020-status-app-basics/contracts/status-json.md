# Contract: `status.json`

Address: `https://imreboersma.github.io/projects/status.json`, written by each page run next to
`index.html`. Content rules of spec 001 (no text from private repos, no names of people, no
secret values). Only the values below; field order free.

```json
{
  "version": 1,
  "generatedAt": "2026-11-06T09:00:43Z",
  "total": { "kind": "correct", "problems": 0, "text": "All correct" },
  "changes": {
    "since": "2026-11-05T09:00:40Z",
    "started": [{ "key": "hob-nl/ci-failed", "project": "hob.nl", "text": "The last CI run failed." }],
    "stopped": []
  },
  "projects": [
    {
      "id": "hob-nl",
      "name": "hob.nl",
      "status": "active",
      "stakeholder": "Harmonieorkest Brummen",
      "state": "bad",
      "summary": { "text": "The last CI run failed.", "kind": "bad" },
      "problems": [{ "key": "hob-nl/ci-failed", "text": "The last CI run failed.", "issue": "https://github.com/ImreBoersma/projects/issues/12", "since": "2026-11-06T07:00:00Z" }],
      "site": { "domain": "harmonieorkestbrummen.nl", "state": "up", "checkedAt": "2026-11-06T09:00:40Z", "uptime30": 100 },
      "nextExpiry": "2026-12-10",
      "link": "https://imreboersma.github.io/projects/#p-hob-nl"
    }
  ]
}
```

- `version` changes only when a field changes meaning or goes away.
- `stakeholder` is an organisation or `null`; `site` is `null` without a domain; `uptime30` is a
  number with 1 decimal or `null`; `nextExpiry` is `YYYY-MM-DD` or `null`; `issue` and `since`
  are `null` when not known.
- Size: less than 50 KB for 20 projects (SC-005).
