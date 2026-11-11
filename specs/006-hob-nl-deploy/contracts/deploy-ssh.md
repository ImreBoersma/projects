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
   `There has been a critical error on this website`. HTTP 200 to 499 passes (a 4xx is accepted
   on purpose).
9. When the check passes (or there is no check): write the commit id to the marker file
   `~/.deploy-last-good-<repo name>` on the server (in the home folder, outside the site).
10. When a URL fails: put back the files of the commit in the marker file, the last version that
   passed the check. Without a marker, use the previous commit (`github.event.before` on a push,
   else `HEAD~1`). Request the URLs again, log the result, and stop the job with an error, so that
   the deployment record shows "failure".
11. Each other error stops the job, so the deployment record shows "failure".

The checkout uses the full history (`fetch-depth: 0`), so that the commit of the marker is always
available for step 10.

The workflow uses `rsync -rl --checksum` and never `--delete-excluded`, `-a`, `-t` or `--force`: files outside `pattern` on the
server stay as they are.

After a failed deploy, the broken commit is still on `main`. Revert it or repair it in git before
the next push. The next push then deploys a working version again; until then, a new push on top
of the broken commit also fails the check and goes back to the marker version.
