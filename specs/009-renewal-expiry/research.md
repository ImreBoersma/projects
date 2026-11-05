# Research: Renewals and Certificate Expiry

Checked in Bun on 2026-11-05: `pretband.nl` certificate until 2026-12-19 (Let's Encrypt);
`scales-imreboersma.web.app` until 2027-01-25; the IANA RDAP bootstrap gives `https://rdap.sidn.nl/`
for `.nl` and `https://pubapi.registry.google/rdap/` for `.app`; `web.app` has an `expiration`
event; `scales-imreboersma.web.app` gives HTTP 400; `pretband.nl` has no `expiration` event.

## 1. Certificate date (FR-002)

**Decision**: `tls.connect({ host, port: 443, servername: host })` of `node:tls`, then
`getPeerCertificate().valid_to`. Timeout 10 seconds. Each error or timeout gives "not known".
Do not check the certificate chain here: the uptime check of spec 005 already fails for a
certificate that is not valid.

**Alternatives**: a TLS check service. Rejected: an external service for a value that Bun can
read in a few lines.

## 2. Registry date (FR-003)

**Decision**: get `https://data.iana.org/rdap/dns.json` one time for each run, find the RDAP server
of the top-level domain, and request `domain/<domain>` for the exact catalog domain. Use the
`eventDate` of the event `expiration`. No server, an error, a status that is not 200, or no
`expiration` event gives "not known".

**Rationale**: the exact domain makes the "owned domain" rule simple. A platform subdomain
(`scales-imreboersma.web.app`) gives 400 and so "not known"; the date of `web.app` (owned by
Google) is never used.

## 3. Catalog format (FR-001)

**Decision**: the existing field `renewal` becomes a list:

```yaml
    renewal:
      - name: Domain
        date: 2027-03-01
      - name: Hosting
        date: 2027-01-15
```

Each `name` is a non-empty string of at most 40 characters, unique in the project (case is
ignored). Each `date` is `YYYY-MM-DD`. An empty `renewal:` is accepted (no renewals).

**Rationale**: Principle II already names "renewal dates" as a catalog field, and the field exists
empty in all entries. The `yaml` package keeps `2027-03-01` as a string (YAML 1.2 core schema), so
the format check is a simple regex plus a real-date check.

## 4. Merge of catalog and registry (US3 AC3)

**Decision**: the registry date of a domain is a renewal with the name `Domain`. When the catalog
also has a renewal with the name `Domain` (case is ignored), the earlier date is used.

## 5. Days and limits (FR-005, FR-006)

**Decision**: days = whole days from the start of today (UTC) to the date (UTC), rounded down; a
date in the past gives a negative number. `cert-expiring` at 14 days or less. `renewal-due` at 30
days or less. The page shows the certificate and the renewal with the fewest days.

## 6. Problem keys and text

**Decision**:

| Problem | Key | Text |
|---|---|---|
| `cert-expiring` | `<id>/cert-expiring` | `The TLS certificate expires in <n> days.` or `The TLS certificate expired <n> days ago.` |
| `renewal-due` | `<id>/renewal-due/<slug>` | `Renewal of <name> is due in <n> days.` or `Renewal of <name> was due <n> days ago.` |

`<slug>` is the name in lower case with each run of other characters than `a-z0-9` replaced by
`-`. The marker regex of spec 001 (`\S+`) accepts the longer key.

`Problem` gets an optional `text` that the page and the issue title use instead of
`PROBLEM_TEXT[reason]`. The issue title keeps the number of days of the day when it opened; the
page shows the current number.

## 7. Issue rules

**Decision**: a `cert-expiring` issue stays open when the certificate of that project is "not
known" in this run (as `site-down` in spec 005). A `renewal-due` issue follows the catalog and the
registry: it closes when the date is more than 30 days away, for example after the Maintainer
enters the next date. A registry "Domain" renewal that becomes "not known" keeps its issue open.

## 8. Where on the page

**Decision**: a new column "Expiry", after "Site". Cell lines: `Certificate: <n> days` (or
`Certificate: not known`, or nothing without a domain), and `<name>: <n> days` for the renewal with
the fewest days. Spec 012 can change the layout later.
