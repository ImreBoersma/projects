# Contract: Stakeholder Page

File `s/<slug>.html` next to `index.html` (research.md §1). Language `nl`. Static HTML, the CSS
of the status page inline, one small script for the old-data warning (research.md §6).

## Structure

```text
<html lang="nl">
<title>{name}: status van de projecten</title>
<main data-time="{generatedAt ISO}">
  <h1>Projecten van {name}</h1>
  <p>Stand van {datum om tijd}.</p>
  <p data-stale hidden>Deze informatie is van {datum om tijd}. Ze kan verouderd zijn.</p>
  <section>  top line: one alert block (green or amber) </section>
  <article> one block for each project, name order </article>
  <p>Alle technische details staan op de <a>statuspagina</a>.</p>
  <p class="print-only">Deze pagina: {full address}</p>
</main>
```

No `<nav>`, tabs, filters, pop-ups, links to GitHub, or names of people. The only links are the
site addresses and the status page.

## Texts (Dutch, taalniveau B1)

`{datum}` is a Dutch date ("1 februari 2027"); `{tijd}` is "17 november 2026 om 12:00"
(Europe/Amsterdam). `{over}` is research.md §5: "vandaag", "over 1 dag", "over N dagen",
"over 1 maand", "over N maanden".

### Top line

| Case | Text |
|---|---|
| No attention item | Er is niets waar het bestuur iets mee moet. |
| One or more items | Hier moet het bestuur iets mee: (then one line for each item) |
| Item: offline (since 2 hours or longer) | De website {address} is offline sinds {tijd}. De beheerder weet het. |

`{renewal}`: "de domeinnaam" for the catalog name `Domain`; else the catalog name in quotes
("'Hosting'"). The view never mentions payment or cost (Principle VII).

### Project block

Heading: the project name. Then the lines that apply, in this order:

| Fact | Text |
|---|---|
| Site online | De website {address} is online. |
| Site offline | De website {address} is offline sinds {tijd}. De beheerder weet het. |
| Site not checked | De controle van de website {address} is om {tijd} niet gelukt. |
| Uptime, 30 days of history | De afgelopen 30 dagen was de website {p} % van de tijd online. |
| Uptime, shorter history | Sinds {datum} was de website {p} % van de tijd online. |
| No site, works | Dit onderdeel werkt. |
| No site, problem (a fault only: CI failed or deploy failed) | Er is een probleem. De beheerder weet het. |
| No site, not checked | Dit onderdeel is niet gecontroleerd. |
| Renewal (date today or later) | De beheerder verlengt {renewal} vóór {datum} ({over}). |

`{p}` has one decimal when it is not a whole number, with a comma ("99,7 %").

## Print (`@media print`)

- A4, margin 15 mm; white background, black text; colours of the top line become a border.
- `print-only` shows; the status page link shows its address after the text.
- Up to 4 project blocks fit on one page (SC-002); a block does not break over two pages.

## Link from the status page

The header `<nav>` of `index.html` gets, after "Run the status update now", one link for each
stakeholder: text "View for {name}", address `s/{slug}.html` (relative), in name order.

## Not found

`404.html` at the root of the site (GitHub Pages serves it for each missing path): "Deze pagina
bestaat niet. / This page does not exist." and a link to the status page. This covers an old or
wrong stakeholder address (spec edge case).
