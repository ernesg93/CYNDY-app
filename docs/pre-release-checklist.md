# Public Release Checklist

Complete these user-owned settings before the first public release. The repository contains configuration for automation, but local bootstrap does not create external accounts, repositories, deployments, or protection rules.

## GitHub repository

- [x] Confirm GitHub detects GPL-3.0 in the public repository. Confirmed 2026-11-18.
- [x] Enable private vulnerability reporting. Confirmed 2026-11-18.
- [x] Enable secret scanning and push protection. Confirmed 2026-11-18.
- [x] Enable Dependabot alerts, security updates, and version updates. Confirmed 2026-11-18; no open alerts were returned at that time.
- [x] Confirm CodeQL remains enabled and succeeds for the release candidate. CodeQL passed on `main` at `6939148` on 2026-11-18.
- [x] Protect `main`: require a pull request, conversation resolution, and passing required checks. Confirmed 2026-11-18: the required checks are `Unit, build and browser tests` and `CodeQL`; branches must be up to date, and zero approvals are required.
- [x] Prevent force pushes and branch deletion on `main`. Confirmed 2026-11-18.
- [ ] Review tracked files and commit history for secrets, real user data, private exports, and sensitive media. On 2026-11-19, Gitleaks 8.30.1 scanned commits reachable from local refs with no findings; this pattern-based scan does not prove the absence of secrets or cover the other sensitive content categories.

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

- [x] Record the required status-check names: `Unit, build and browser tests` and `CodeQL` (confirmed 2026-11-18).
- [x] Verify Android installation, warm-load offline behavior, and safe cold-first browser behavior.
  - Automated Chromium evidence passed on 2026-10-15: the initial page became service-worker-controlled, a newly opened page loaded offline after the initial page closed, and a cold first visit failed safely without an in-app offline promise. The owner confirmed installation, offline reopening and saved-count access on Android on 2026-11-18.
- [x] Document rollback to a prior static build; device-local records are outside deployment rollback. See [release operation](release-operation.md).
- [ ] Verify rollback on Android and the actual release deployment using synthetic records. An isolated Chromium test passed upgrade, offline reopening, rollback, and re-upgrade with a legacy note and a new title on 2026-10-30. The user also confirmed upgrade and offline reopening with both records on Android in an isolated incognito session.
