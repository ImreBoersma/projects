# Contract: caller in `harmonieorkest-brummen/hob-nl`

File: `.github/workflows/deploy.yml`. Only the call to the shared workflow (Principle IV), with
the caller rules of spec 002 (`permissions: { contents: read }`, `@main`).

```yaml
name: Deploy
on:
  push: { branches: [main] }
  workflow_dispatch:
permissions: { contents: read }
jobs:
  deploy:
    uses: ImreBoersma/projects/.github/workflows/deploy-ssh.yml@main
    with:
      source: mu-plugins
      target: html/wp-content/mu-plugins
      pattern: hob-*
      health-urls: https://harmonieorkestbrummen.nl/ https://harmonieorkestbrummen.nl/wp-admin/
      known-hosts: ${{ vars.HOB_SSH_KNOWN_HOSTS }}
    secrets:
      ssh-host: ${{ secrets.HOB_SSH_HOST }}
      ssh-user: ${{ secrets.HOB_SSH_USER }}
      ssh-password: ${{ secrets.HOB_SSH_PASSWORD }}
```

`ImreBoersma/projects` is public, so a private repo of another owner can call its workflow.

## Secrets of `hob-nl`

| Name | Kind | Value | Where |
|---|---|---|---|
| `HOB_SSH_HOST` | Actions secret | `512403.eu13.ssh.myftpupload.com` | `harmonieorkest-brummen/hob-nl` (set 2026-11-05) |
| `HOB_SSH_USER` | Actions secret | the site user `client_…` | same (set) |
| `HOB_SSH_PASSWORD` | Actions secret | the SSH password of the site user | same (set) |
| `HOB_SSH_PRIVATE_KEY` | Actions secret | not used (GoDaddy refused the key) | removed 2026-11-05 |
| `HOB_SSH_KNOWN_HOSTS` | Actions **variable** (public) | `512403.eu13.ssh.myftpupload.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAILwQwncFCRpxxYViJR+ogl8E73kt/A2c+4QA7q9Qd5r4` | same |

The caller has 18 lines without blank lines. Principle IV asks for approximately 10 lines and
spec 002 accepted 16. A caller in a repo of another owner cannot use `secrets: inherit`, so it
names each of the 3 secrets.
