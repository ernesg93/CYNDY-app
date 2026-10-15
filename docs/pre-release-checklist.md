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

- [x] Connect the GitHub repository through Pages Git integration; do not create a deployment token.
- [x] Select `main` as the production branch.
- [x] Set the root directory to `app`, build command to `npm run build`, and output directory to `dist`.
- [x] Configure no environment variables, bindings, Pages Functions, Workers, or vendor storage.
- [x] Confirm the generated `*.pages.dev` URL uses HTTPS.
- [x] Confirm unknown client routes fall back to `index.html` without a proprietary runtime.
- [ ] Confirm the produced `app/dist` can be served unchanged by another HTTPS static host with equivalent SPA fallback.

Validated on 2026-10-15: `https://cyndy-app.pages.dev` deploys from GitHub `main` with root `app`, build command `npm run build`, and output `dist`. The Pages project has no environment variables, Functions, Workers, bindings, deployment tokens, or vendor storage. Direct HTTPS requests to `/history` and an unknown client route returned `200` and rendered the expected SPA views.

## Release evidence

- [ ] Record the required status-check names after workflows exist.
- [ ] Verify Android installation, warm-load offline behavior, and safe cold-first browser behavior.
  - Automated Chromium evidence passed on 2026-10-15: the initial page became service-worker-controlled, a newly opened page loaded offline after the initial page closed, and a cold first visit failed safely without an in-app offline promise. Android installation and offline launch still require real-device validation.
- [ ] Document rollback to a prior static build; device-local records are outside deployment rollback.
