# Contract: page and issues for expiry

## Column "Expiry"

After the column "Site". Each line is a separate line in the cell.

| Case | Line |
|---|---|
| a domain, certificate read | `Certificate: <n> days` |
| a domain, certificate not read | `Certificate: not known` |
| no domain | no certificate line |
| 1 or more renewals | `<name>: <n> days` for the renewal with the fewest days; `<name>: <n> days ago` for a date in the past |
| a registered domain without registry date and without a catalog "Domain" (for example `.nl`) | `Domain: not known` |
| a domain that is not registered (a platform subdomain, RDAP 400 or 404) | no domain line |
| nothing to show | empty cell |

Use "day" for 1 in each line: `Certificate: 1 day`, `Hosting: 1 day ago`.

The column has `data-label="Expiry"` for the card layout of spec 007.

## Problem text

| reason | Text |
|---|---|
| `cert-expiring` | `The TLS certificate expires in <n> days.` / `The TLS certificate expired <n> days ago.` |
| `renewal-due` | `Renewal of <name> is due in <n> days.` / `Renewal of <name> was due <n> days ago.` |

Use "day" for 1. The problem links to its issue (spec 007).

## Issue

Title: `<project name>: <problem text>`, with the days of the day when the issue opens.

Body: the format of spec 001, with these steps:

- `cert-expiring`: "1. Open the host of the site. 2. Find why the automatic renewal of the
  certificate failed. 3. Renew the certificate."
- `renewal-due` from the catalog: "1. Renew <name>. 2. Enter the next date in `projects.yaml`,
  field `renewal`."
- `renewal-due` from the registry ("Domain" without a catalog date): "1. Renew the domain at the
  registrar. 2. The next update reads the new date from the registry."

## Forbidden content

No cost, no contract numbers, no data from the certificate other than the end date.
