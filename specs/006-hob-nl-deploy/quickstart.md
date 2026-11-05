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

On a branch of `hob-nl`, start the deploy with `workflow_dispatch` and a PHP syntax error in a
`hob-*` file. Expected: `php -l` fails and nothing is copied. Do not merge the branch.

## 6. Status page (US3)

Set `repo: harmonieorkest-brummen/hob-nl` for `hob-nl` in `projects.yaml`. Make sure that
`STATUS_READ_TOKEN_HOB` can read the repo. Expected: the row of hob.nl shows the last commit and the
last deploy.
