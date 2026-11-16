# Research: Archive Suggestions for Old Projects

## 1. Source and token

**Decision**: one GraphQL query for each token (`tokenFor(owner)`: `STATUS_READ_TOKEN`,
`STATUS_READ_TOKEN_HOB`), with one alias for each repo, in page mode only, as `readDelivery` of
spec 017. The tokens have "Contents" and "Pull requests: read", but not "Issues" (status/README.md).

**Decision (permission)**: the Maintainer adds "Issues: Read-only" to `STATUS_READ_TOKEN` and
`STATUS_READ_TOKEN_HOB` (the organisation `harmonieorkest-brummen` approves the changed token
again). Until then, the issue part of the query gives an error for the repo; the reader marks the
issue data as missing, and a project with missing data gets no suggestion (FR-006). So the change
can merge before the permission is set.

**Rationale**: no new token (SC-005), one more read permission on the tokens that exist; one
request for all repos of an owner.

**Alternatives**: the history of spec 010 (rejected: it starts on 2026-11-05, 12 months are not
there until 2027-11); REST `commits` (rejected: one request for each repo and page, and the
responses contain the commit messages).

## 2. The query

```graphql
createdAt
defaultBranchRef { target { ... on Commit {
  history(first: 100) {
    pageInfo { hasNextPage endCursor }
    nodes {
      committedDate
      author { user { login } }
      associatedPullRequests(first: 1) {
        nodes { author { __typename } labels(first: 10) { nodes { name } } }
      }
    }
  }
} } }
pullRequests(first: 20, orderBy: { field: CREATED_AT, direction: DESC }) {
  nodes { createdAt state author { __typename } labels(first: 10) { nodes { name } } }
}
issues(first: 20, orderBy: { field: CREATED_AT, direction: DESC }) {
  nodes { createdAt state author { __typename } }
}
```

- No title, body or commit message (FR-009).
- Open PRs and issues come from the same lists (`state: OPEN`). A repo with more than 20 PRs or
  issues in the list and no work by a person in them is "not sure": no suggestion (FR-006). Today
  the largest list is 5 open bot PRs (pretband-backend).
- Next commit pages: only while no commit by a person is found, with `after: <endCursor>`, at most
  5 pages (500 commits). Measured 2026-11-16: each repo has a commit by a person in its first page.

## 3. Which commit is work by a person (FR-002)

**Checked on 2026-11-16** with `gh api graphql`:

- A squash merge of a Dependabot PR in pretband-backend has a commit author whose `user` is the
  type `User`. So the commit author alone is not a correct test.
- A commit by Renovate in Beter-dan-de-MIDI has `author.user.login` `renovate[bot]` and a PR
  whose author is `Bot`.
- A direct push of the Maintainer (2026-11-03 in Beter-dan-de-MIDI) has no PR.

**Decision**:

1. A commit with a PR: work by a person when the PR author is `User` and the PR has no label
   `campaign`.
2. A commit without a PR: work by a person when `author.user` exists and its login does not end
   with `[bot]`. A commit without a linked user (unknown e-mail) does not count.

The login is used only in this test; it is not kept, logged or shown.

## 4. Last work and the rule

**Decision**: last work = the latest of: the first commit by a person (§3); the newest PR by a
person without the label `campaign`; the newest issue by a person. With none, the last work is:

- the repo creation date, when the whole history was read (the repo is new or small);
- else the date of the oldest commit read, with the flag `orEarlier` (the text says "or
  earlier"). This only happens after 500 bot commits.

Suggestion when last work < run time − 12 calendar months (UTC) and no open PR or issue by a person
(open campaign PRs do not count). A repo, the data of which is not available, gets no state.

## 5. The field `keep`

**Decision**: `keep: { until: YYYY-MM-DD, reason: text }` on a project in `projects.yaml`
(contracts/catalog.md). Until and on the date the project gets the state `kept` (no badge; the
detail view shows "Kept until <date>: <reason>."); the day after, the rule of §4 applies again.
The reason is public catalog text, written by the Maintainer, so the page can show it.

**Alternatives**: a list of project ids in a separate file (rejected: the catalog is the only
project list, Principle II).

## 6. The badge and the link

**Decision**: the row is one link to the detail view (spec 019), so a second link in it is not
valid HTML. The row gets the badge "Archive?" as text; the detail view has the line with the date
and the link "Archive checklist" to
`https://github.com/ImreBoersma/projects/blob/main/docs/archive.md`, as the link to
`docs/conformance.md` of spec 008. This is the meaning of "the badge links to the checklist"
(FR-004): one click opens the detail, which has the link.

## 7. The checklist location

**Decision**: `docs/archive.md` next to `docs/conformance.md`. It is a Markdown checklist; GitHub
shows it. Steps: FR-007 in this order, each with the command or the GitHub page.

**Alternatives**: a page section on the status page (rejected: the page is generated each hour,
and the steps need no data).
