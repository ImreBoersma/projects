// The repo settings of spec 008 R10 to R15, in the form the GitHub API takes them. new-project
// sets them on a new repo; docs/conformance.md has the same values for a repair by hand.

// R10, R12, R13, R14. R11 (auto-merge) only for a public repo: a free plan has no auto-merge
// on a private repo.
export const REPO_SETTINGS = {
  delete_branch_on_merge: true,
  allow_squash_merge: true,
  allow_merge_commit: false,
  allow_rebase_merge: false,
  squash_merge_commit_title: "PR_TITLE",
  squash_merge_commit_message: "COMMIT_MESSAGES",
  allow_update_branch: true,
  has_wiki: false,
} as const;

// R15, public repos only: main changes through a PR whose `check` passed. Repo admins may
// bypass it, so the Maintainer can still push to main.
export function mainRuleset(check: string) {
  return {
    name: "main",
    target: "branch",
    enforcement: "active",
    conditions: { ref_name: { include: ["~DEFAULT_BRANCH"], exclude: [] } },
    bypass_actors: [{ actor_id: 5, actor_type: "RepositoryRole", bypass_mode: "always" }],
    rules: [
      {
        type: "pull_request",
        parameters: {
          required_approving_review_count: 0,
          dismiss_stale_reviews_on_push: false,
          require_code_owner_review: false,
          require_last_push_approval: false,
          required_review_thread_resolution: false,
          allowed_merge_methods: ["squash"],
        },
      },
      {
        type: "required_status_checks",
        parameters: {
          strict_required_status_checks_policy: false,
          required_status_checks: [{ context: check }],
        },
      },
    ],
  };
}
