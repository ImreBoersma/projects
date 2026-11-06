# Contract: the page address (spec 019)

`https://imreboersma.github.io/projects/?<query>#p-<id>`

| Key | Meaning |
|---|---|
| `q` | name search |
| `state` | `problems` \| `warnings` \| `not-available` \| `correct` |
| `stakeholder` | a catalog value, for example `Harmonieorkest+Brummen` |
| `site` | `yes` \| `no` |
| `sort` | `state` \| `name` \| `commit` \| `expiry` |
| `tab` | `projects` \| `campaigns` \| `tokens` \| `history` |
| `#p-<id>` | the open pop-up of that catalog project |

- Keys with the default value are not written.
- Filters and sort: `history.replaceState` (no history entry for each change).
- The pop-up: the hash, so Back closes it.
- Unknown key values: ignored; the page shows "Some filters in the link are not known." once.
- An unknown project id in the hash: no pop-up.
- Examples: the HOB view `?stakeholder=Harmonieorkest+Brummen`; the problems of today
  `?state=problems`; one project `#p-hob-nl`.
