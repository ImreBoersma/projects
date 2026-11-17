# Contract: Status Badge

File `badge/<project id>.svg` next to `index.html`, one for each project that is not archived.
Address: `https://imreboersma.github.io/projects/badge/<project id>.svg`.

## Shape

```text
<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="20" role="img" aria-label="{name}: {state}">
  <title>{name}: {state}</title>
  <rect width="{w1}" height="20" fill="#24292f"/>            name part
  <rect x="{w1}" width="{w2}" height="20" fill="{colour}"/>  state part, starts with "● "
  <text ... textLength="{t1}">{name}</text>
  <text ... textLength="{t2}">● {state}</text>
</svg>
```

- Font `Verdana,DejaVu Sans,sans-serif`, 11 px, white text. Part width = 6.5 px × characters + 10
  px padding; `textLength` sets the text to that width.
- Name and state are escaped for XML. No link, no script, no external file.
- Size < 1 KB.

## States

| Project | Input | Text | Colour |
|---|---|---|---|
| With a domain | `uptime.state = up` | online | `#1a7f37` |
| With a domain | `uptime.state = down` | offline | `#cf222e` |
| With a domain | `uptime.state = not-available` | not checked | `#6e7781` |
| Without a domain | no fault, repo read | works | `#1a7f37` |
| Without a domain | a fault: `ci-failed` or `deploy-failed` | problem | `#cf222e` |
| Without a domain | repo not read (`availability = unavailable`) | not checked | `#6e7781` |

Each colour gives 4.5:1 or more with white text (test).

## Use

README of a repo:

```markdown
[![hob.nl status](https://imreboersma.github.io/projects/badge/hob-nl.svg)](https://imreboersma.github.io/projects/s/harmonieorkest-brummen.html)
```

A site footer: an `<img>` with the same address and `alt="{name}: status"`. The badge shows a new
state within about 10 minutes after the deploy (research.md §8).
