# Quickstart: validate the hob.nl deploy

## 1. Workflow checks

```sh
actionlint .github/workflows/deploy-ssh.yml
```

## 2. Test on the branch (constitution)

1. Push `deploy-ssh.yml` on the branch `006-hob-nl-deploy` of `projects`.
2. In `hob-nl`, add the caller of [contracts/caller.md](./contracts/caller.md) with
   `deploy-ssh.yml@006-hob-nl-deploy`, and push it to `main`.
3. Expected: the deploy passes. The dry-run log shows no change for the 3 `hob-*` items (the files
   in git are the same as on the server) and no line for a GoDaddy file.
4. Check on the server with SSH that `gd-system-plugin.php`, `object-cache-pro.php` and `vendor/`
   have the same dates as before.

## 3. A real change (US2)

1. In `hob-nl`, change one comment line in `mu-plugins/hob-admin.php`. Push to `main`.
2. Expected: the dry-run log shows one changed file; the site works; the file on the server has
   the change.
3. Remove the comment again and push. Expected: the file is back.

## 4. A removed file (US2 AC2)

Optional, with a test file: add `mu-plugins/hob-test.txt`, push, and make sure that it is on the
server; remove it in git, push, and make sure that it is gone from the server. GoDaddy files stay.

## 5. A syntax error (research.md §5)

The deploy runs only from `main` (contracts/deploy-ssh.md step 1), so test on `main`:

1. Push a commit with a PHP syntax error in a `hob-*` file.
2. Expected: `php -l` fails, there is no rsync step in the log, and the server does not change.
3. Push the revert commit at once. Expected: its deploy passes.

## 6. Status page (US3)

Set `repo: harmonieorkest-brummen/hob-nl` for `hob-nl` in `projects.yaml`. Make sure that
`STATUS_READ_TOKEN_HOB` can read the repo. Expected: the row of hob.nl shows the last commit and the
last deploy.

## 7. Restore after a broken deploy (FR-013)

Test the restore without a risk for visitors: the error only happens with a test query string.

1. In one commit on `main` of `hob-nl`, add to a `hob-*` PHP file:
   `if (isset($_GET['hob-deploy-test'])) { hob_missing_function(); }`. The syntax is valid, so
   `php -l` passes.
2. In the same commit, add `https://harmonieorkestbrummen.nl/?hob-deploy-test=1` to `health-urls`
   of the caller. Push.
3. Expected: the check fails on the test URL, the files of the previous commit go back, the job
   fails, and the site works (also with the test query string).
4. Push the revert commit at once. Expected: its deploy passes.

## 8. SFTP sync (FR-012)

On the computer of the Maintainer, make sure that `.vscode/sftp.json` has
`wp-content/mu-plugins/hob-*` in its ignore list.

