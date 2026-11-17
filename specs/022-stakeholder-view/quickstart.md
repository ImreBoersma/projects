# Quickstart: Stakeholder View and Status Badges

## 1. Tests

```bash
cd status
bun test
```

Expected: the tests of research.md §9 pass, among them:

- the HOB fixture with today 2026-11-17 gives "Er is niets waar het bestuur iets mee moet." and
  the renewals of 1 februari 2027 and 1 mei 2027 (SC-003);
- the same fixture with today 2027-01-25 still says that nothing needs the board, with "over 7
  dagen" for pretband.nl (SC-004);
- the HTML has none of the forbidden words (FR-004) and no name of a person;
- each badge state of contracts/badge.md has its text and colour; the contrast is 4.5:1 or more;
- a project without a site and only a `renovate-stale` problem shows "Dit onderdeel werkt." and
  the badge "works"; with `ci-failed` it shows the problem line and "problem";
- a site offline since 30 minutes is in its block only; since 3 hours it is also in the top line;
- 45 days gives "over 1 maand", 76 days "over 2 maanden";
- `index.html` has the link "View for Harmonieorkest Brummen" to `s/harmonieorkest-brummen.html`;
- the stakeholder page with 20 projects is < 15 KB gzip; the status page stays < 30 KB gzip.

## 2. Local build

```bash
cd status
bun run start -- --out build/site
```

(with the tokens of a normal page run in the environment). Expected:

- `build/site/s/harmonieorkest-brummen.html` with 3 project blocks (hob.nl, Pretband, Pretband
  backend);
- `build/site/badge/<id>.svg` for each of the 11 projects;
- `build/site/404.html`.

Open the stakeholder page in a browser. Make sure that it shows no CI, Renovate, commit or GitHub
fact. Turn off scripts: the page still shows all facts.

## 3. Print

Open the stakeholder page, print preview, A4. Expected: one page, "Stand van ...", the address of
the page at the bottom, no buttons (SC-002). Check in light and dark scheme: the print is black on
white in both.

## 4. After the deploy

- Open `https://imreboersma.github.io/projects/s/harmonieorkest-brummen.html` in a private window
  (no GitHub login).
- Open `https://imreboersma.github.io/projects/s/does-not-exist.html`: the 404 page with a link to
  the status page.
- Put the badge of contracts/badge.md in the README of `harmonieorkest-brummen/hob-nl`. Make sure
  that it shows "hob.nl ● online" on GitHub.
- Send the stakeholder link to the board (the Maintainer does this; not part of the run).
