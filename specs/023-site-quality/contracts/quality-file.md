# Contract: Quality Day File

Path: `quality/YYYY-MM-DD.json` on the branch `data`. Writer: `site-quality.yml`. Readers: the
status run (newest file, and the file before it for the 2-checks rule), spec 021 later.

```json
{
  "version": 1,
  "date": "2026-11-19",
  "checks": [
    {
      "projectId": "hob-nl",
      "domain": "harmonieorkestbrummen.nl",
      "checkedAt": "2026-11-19T04:44:10Z",
      "speed": {
        "level": "warn",
        "score": 71,
        "field": null,
        "report": "https://pagespeed.web.dev/analysis?url=https://harmonieorkestbrummen.nl/&form_factor=mobile"
      },
      "accessibility": { "level": "good", "score": 96, "failed": 1, "report": "https://pagespeed.web.dev/analysis?url=https://harmonieorkestbrummen.nl/&form_factor=mobile" },
      "links": {
        "level": "poor",
        "pages": 38,
        "broken": [{ "url": "https://harmonieorkestbrummen.nl/old-page/", "page": "https://harmonieorkestbrummen.nl/agenda/", "status": 404 }],
        "blocked": 2
      },
      "headers": {
        "level": "warn",
        "present": ["strict-transport-security", "x-content-type-options"],
        "missing": ["content-security-policy", "referrer-policy"],
        "report": "https://developer.mozilla.org/en-US/observatory/analyze?host=harmonieorkestbrummen.nl"
      }
    }
  ]
}
```

Rules:

- A reader skips a file that is not valid JSON or has a `version` other than 1, and uses the file
  before it. A check with an unknown `level` is "not checked".
- The status run reads the files of the last 30 days, for the fallback of a "not checked" result
  (research.md §7).
- Only own derived facts: no part of the PSI response, no audit text (research.md §2, terms).
- `checks` has one entry for each site of the run. A site that is in the catalog but not in the
  newest file shows "Not checked yet".
- No text from the body of a site, no error text, no names of people (FR-014). Addresses and
  numbers only.
- Each run replaces the file of its day (`date` = the UTC date of the run).
