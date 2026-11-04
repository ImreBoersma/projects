# Contract: catalog field `domain`

Changes the catalog contract of spec 001 (`specs/001-project-status-page/contracts/catalog.md`).
That contract ignores `domain`. This feature reads it.

| Field | Required | Rule |
|---|---|---|
| `domain` | no | empty, or a host name without scheme, path or port (research.md §8) |

Valid: `imreboersma.nl`, `scales-imreboersma.web.app`, `harmonieorkestbrummen.nl`.

Not valid: `https://pretband.nl`, `pretband.nl/`, `pretband.nl:443`, `Pretband.nl`, `localhost`.

Error text, as the other catalog errors of spec 001:
`Catalog error in entry <i>, field \`domain\`: must be a host name, for example example.org, or empty.`

The check uses `https://<domain>/`. A project with the status `archived` is not checked (FR-002).
