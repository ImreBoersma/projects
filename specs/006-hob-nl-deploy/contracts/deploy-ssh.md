# Contract: shared workflow `deploy-ssh.yml`

File: `.github/workflows/deploy-ssh.yml` in `ImreBoersma/projects`. Trigger: `workflow_call`.

## Interface

| Kind | Name | Required | Default | Note |
|---|---|---|---|---|
| input | `known-hosts` | yes | | the host key line (public; research.md §6) |
| input | `source` | no | `.` | folder in the caller repo |
| input | `target` | yes | | folder on the server, relative to the home folder of the user |
| input | `pattern` | yes | | the top-level name pattern to copy, for example `hob-*` |
| input | `php-lint` | no | `true` | run `php -l` on each `.php` file of `source` first (FR-014) |
| input | `health-urls` | no | empty | URLs to check after the copy, separated by spaces; empty = no check (FR-013) |
| secret | `ssh-host` | yes | | |
| secret | `ssh-user` | yes | | |
| secret | `ssh-password` | yes | | used with `sshpass -e`; never in a command line or the log |

## Behaviour

1. The job runs only on the default branch, as the other shared deploys:
   `if: github.event_name != 'pull_request' && github.ref == format('refs/heads/{0}', github.event.repository.default_branch)`.
   A push to `main` and a `workflow_dispatch` of `main` deploy; a dispatch of another branch does
   nothing. `environment: production`; concurrency group `deploy-${{ github.repository }}`, no
   cancel.
2. Permissions: `contents: read`.
3. Checkout the caller repo.
4. When `php-lint` is `true`: `php -l` on each `*.php` under `source`. One error stops the job.
5. Write `known-hosts` to a file; `StrictHostKeyChecking=yes`.
6. rsync with `--dry-run` and `--itemize-changes`, with the filter
   `--include='/<pattern>' --include='/<pattern>/***' --exclude='*'` and `--delete`. The log shows
   the planned changes.
7. The same rsync without `--dry-run`.
8. When `health-urls` is set: request each URL (timeout 20 seconds, follow redirects, 2 tries 10
   seconds apart). A URL fails on HTTP 5xx, no answer, or a body that contains
   `There has been a critical error on this website`.
9. When a URL fails: check out the previous commit (`github.event.before` on a push, else
   `HEAD~1`), run step 7 with its files, request the URLs again, log the result, and stop the job
   with an error, so that the deployment record shows "failure".
10. Each other error stops the job, so the deployment record shows "failure".

The checkout uses `fetch-depth: 2` (or the full history for a push of more than one commit), so
that the previous commit is available for step 9.

The workflow uses `rsync -rl --checksum` and never `--delete-excluded`, `-a`, `-t` or `--force`: files outside `pattern` on the
server stay as they are.
