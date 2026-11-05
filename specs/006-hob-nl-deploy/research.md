# Research: hob.nl in Git with a Deploy Workflow

## 1. What goes in git (FR-001, FR-002)

**Result 2026-11-05**: the site uses the theme `ketos` and the plugins `kubio-pro`,
`skaut-google-drive-gallery` and `display-a-meta-field-as-block` (third-party code; the pages are
in the database through Kubio). The only custom code is in `wp-content/mu-plugins`:
`hob-admin.php`, `hob-huisstijl.css`, `hob-docs/` (5 PHP files), 131 KB in total. These files have
the site user as owner; the GoDaddy files there have the owner `root`.

**Secret scan before the first commit**: no passwords, keys or tokens. Matches were WordPress
function names (`the_password_form`, `post_password`) and one documented command with a
placeholder (`--user_pass=<nieuw>`). The only e-mail address is the role address `webmaster@`. No
phone numbers, no host names or user names. `.gitignore` has `sftp.json`, because the manual
names that file.

## 2. How the runner gets access

**Decision**: the site user `client_…` on `512403.eu13.ssh.myftpupload.com`, with its SSH
password through `sshpass` (secrets `HOB_SSH_HOST`, `HOB_SSH_USER`, `HOB_SSH_PASSWORD`).

**Tested 2026-11-05** (access test, run 42044793272): login from a GitHub runner works; a test
file in `mu-plugins` can be made and removed; `rsync` is on the server.

**Alternatives**:
- The CI/CD deploy user of GoDaddy (`git_deployer_…` on `xhj.d81.myftpupload.com`). Rejected: port
  22 of that host gave a timeout from the Mac and from a GitHub runner, and GoDaddy says that this
  user does not allow interactive logins; its own action excludes `wp-content/mu-plugins/`.
- An SSH key for the site user. Rejected: GoDaddy refused the key (`Permission denied
  (password,publickey)`), so this plan takes the password. When GoDaddy accepts a key later,
  change to a key.
- The action `godaddy-wordpress/gd-wordpress-deployer`. Rejected: it excludes `mu-plugins`, its
  delete step compares the full WordPress folder with the repo, and it turns off host key checks.

**Risk**: the password gives access to the full site, also `wp-config.php`. It is only an Actions
secret of a private repo. When the password changes, the deploy fails until the secret changes,
and the status page shows the failed deploy.

## 3. What the deploy changes (FR-005)

**Decision**:

```sh
rsync -rlt --delete --checksum --itemize-changes \
  --include='/hob-*' --include='/hob-*/***' --exclude='*' \
  mu-plugins/ "$USER@$HOST:html/wp-content/mu-plugins/"
```

- `--exclude='*'` after the two includes: rsync sends only `hob-*` items.
- rsync never removes an excluded file with `--delete` (no `--delete-excluded`), so the GoDaddy
  files (`gd-system-plugin*`, `object-cache-pro*`, `vendor/`) cannot be removed or changed.
- `-rlt` and not `-a`: no owner, group or permissions are sent; the server keeps them.
- A first run with `--dry-run` writes the list of changes to the log; the real run follows only
  when the dry run passed.

## 4. Deployment record (FR-006)

**Tested 2026-11-05** (run 42045146738): a job with `environment: production` in the private repo
of `harmonieorkest-brummen` (organisation on the free plan) passed, and GitHub made the
environment `production` and a deployment record. The status page (spec 001) reads it as for the
other projects. Protection rules are not available on the free plan; this feature does not need
them.

## 5. PHP syntax check

**Decision**: before the rsync, run `php -l` on each `.php` file of the source. A failed check
stops the deploy.

**Rationale**: a must-use plugin loads on each request; a syntax error stops the full site. The
check costs a few seconds. It is not in the spec; it supports SC-003 ("no manual step") without
risk.

## 6. Host key

**Decision**: the shared workflow gets the host key as an input (`known-hosts`), not a secret,
because it is public. Value for hob.nl:

```text
512403.eu13.ssh.myftpupload.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAILwQwncFCRpxxYViJR+ogl8E73kt/A2c+4QA7q9Qd5r4
```

Fingerprint `SHA256:oxYa4nr7BL5hXCIG5j/OOk54R6yNokpACBoa3tn+Kp4`, the same from the Mac and from
a GitHub runner on 2026-11-05. `StrictHostKeyChecking=yes`. When GoDaddy changes the key, the
deploy fails with a host key error; update the input after a check of the new key.

## 7. Theme editor (FR-008)

**Decision**: check `DISALLOW_FILE_EDIT` in `wp-config.php` with `wp config get` over SSH. If it is
not `true`, the Maintainer sets it (`wp config set DISALLOW_FILE_EDIT true --raw`). This is a
setting on the server, not in git.
