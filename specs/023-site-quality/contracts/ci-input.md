# Contract: Shared CI Input `legacy-scan`

`ci-node.yml`, `workflow_call` input:

```yaml
legacy-scan:
  description: Scan the repo for legacy web code (Modern Web Guidance) and write a job summary. Never fails the job.
  type: boolean
  default: false
```

Caller (a project repo):

```yaml
jobs:
  ci:
    uses: ImreBoersma/projects/.github/workflows/ci-node.yml@main
    with:
      legacy-scan: true
```

Step behaviour:

- Runs after the tests, only when the input is `true`.
- `continue-on-error: true`, `timeout-minutes: 5`, env `DISABLE_TELEMETRY=1`.
- Command: `npx -y modern-web-guidance@1.0.1 legacy-scan . --json`.
- Summary with findings:

  ```markdown
  ### Legacy web code: 3 findings

  | File | Line | Guide | Change |
  |---|---|---|---|
  | src/a.ts | 12 | js | Use values.toSorted(...) instead of copying before .sort(). |

  The scan checks about 20 % of the Modern Web Guidance catalogue.
  ```

- Summary with 0 findings: `### Legacy web code: no findings`.
- Scanner error: `### Legacy web code: scan not available`. The job passes.
- Conformance (spec 008): the input is optional, so no new rule.
