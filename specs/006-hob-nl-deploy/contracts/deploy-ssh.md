# Contract: shared workflow `deploy-ssh.yml`

File: `.github/workflows/deploy-ssh.yml` in `ImreBoersma/projects`. Trigger: `workflow_call`.

## Interface

| Kind | Name | Required | Default | Note |
|---|---|---|---|---|
| input | `known-hosts` | yes | | the host key line (public; research.md §6) |
| input | `source` | no | `.` | folder in the caller repo |
| input | `target` | yes | | folder on the server, relative to the home folder of the user |
| input | `pattern` | yes | | the top-level name pattern to copy, for example `hob-*` |
| input | `php-lint` | no | `true` | run `php -l` on each `.php` file of `source` first |
| secret | `ssh-host` | yes | | |
| secret | `ssh-user` | yes | | |
| secret | `ssh-password` | yes | | used with `sshpass -e`; never in a command line or the log |

## Behaviour

1. The job runs only for a push to the default branch or a `workflow_dispatch`
   (`github.event_name != 'pull_request'`), with `environment: production` and the concurrency
   group `deploy-${{ github.repository }}`, no cancel.
2. Permissions: `contents: read`.
3. Checkout the caller repo.
4. When `php-lint` is `true`: `php -l` on each `*.php` under `source`. One error stops the job.
5. Write `known-hosts` to a file; `StrictHostKeyChecking=yes`.
6. rsync with `--dry-run` and `--itemize-changes`, with the filter
   `--include='/<pattern>' --include='/<pattern>/***' --exclude='*'` and `--delete`. The log shows
   the planned changes.
7. The same rsync without `--dry-run`.
8. Each error stops the job, so the deployment record shows "failure".

The workflow never uses `--delete-excluded`, `-a`, or `--force`: files outside `pattern` on the
server stay as they are.
