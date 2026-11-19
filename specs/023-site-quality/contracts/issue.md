# Contract: Quality Issue

One issue for each site, in `ImreBoersma/projects`, label `status-problem` (so board sync of spec
004 adds it). The hourly reconcile does not touch it, because its marker is not a
`status-problem` marker.

**Title**: `<project name>: Site quality is poor`

**Body**:

```markdown
<!-- site-quality: <project id> -->
The daily quality check found these poor results on <date> for https://<domain>/.

- Speed: <score> on a phone. Report: <report link>
- Accessibility: <score>, <n> rules fail. Report: <report link>
- Broken links: <n>.
  - <url> on <page> (<status>)
  - (at most 20; "and <n> more")
- Security headers: none of the 4 are sent. Report: <report link>

Only the poor results are in this list. The status page shows all results.
The daily check closes this issue when no result of the site is poor.
```

Only the lines of the poor kinds are in the body, in this order.

**Update**: when the list of poor kinds or the broken links change, the run replaces the body
(PATCH). No comment for an update.

**Close comment**: `The quality check on <date> found no poor result. The check closes this
issue.`
