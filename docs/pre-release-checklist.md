# Public Release Checklist

Complete these user-owned settings before the first public release. The repository contains configuration for automation, but local bootstrap does not create external accounts, repositories, deployments, or protection rules.

## GitHub repository

- [ ] Create the public repository and confirm GitHub detects GPL-3.0.
- [ ] Enable private vulnerability reporting.
- [ ] Enable secret scanning and push protection.
- [ ] Enable Dependabot alerts, security updates, and version updates.
- [ ] Enable CodeQL code scanning and confirm its workflow succeeds.
- [ ] Protect `main`: require a pull request, at least one approval, conversation resolution, and passing required checks.
- [ ] Prevent force pushes and branch deletion on `main`.
- [ ] Review tracked files and commit history for secrets, real user data, private exports, and sensitive media.

## Cloudflare Pages

- [ ] Connect the GitHub repository through Pages Git integration; do not create a deployment token.
- [ ] Select `main` as the production branch.
- [ ] Set the root directory to `app`, build command to `npm run build`, and output directory to `dist`.
- [ ] Configure no environment variables, bindings, Pages Functions, Workers, or vendor storage.
- [ ] Confirm the generated `*.pages.dev` URL uses HTTPS.
- [ ] Confirm unknown client routes fall back to `index.html` without a proprietary runtime.
- [ ] Confirm the produced `app/dist` can be served unchanged by another HTTPS static host with equivalent SPA fallback.

## Release evidence

- [ ] Record the required status-check names after workflows exist.
- [ ] Verify Android installation, warm-load offline behavior, and safe first-load-offline messaging.
- [ ] Document rollback to a prior static build; device-local records are outside deployment rollback.
