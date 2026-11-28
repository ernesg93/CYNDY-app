# CYNDY release operation

CYNDY is a static, Android-first PWA. A release changes the application shell, not the device-local IndexedDB records. Use synthetic data for verification.

## Prepared release transition (not yet activated)

The proposed configuration prepares and publishes releases on `release-preparation`; `main` remains Cloudflare production. A prepared GitHub Release is a version record, **not** proof of production deployment. The configuration alone neither creates the branch nor deploys it. Until this change is merged, the existing workflow on `main` remains effective; do not assume this local change disables it.

### Safe migration gate

1. Obtain separate owner authorization before changing repository settings, creating branches, touching PR #83, enabling automation, publishing or promoting. Until then, leave PR #83 and production unchanged. An already-enabled `RELEASE_PLEASE_ENABLED` remains enabled: coordinate a separately authorized pause before installing this configuration or creating the branch, because a push to the new branch can immediately run Release Please.
2. With automation paused, inspect current `main`, PR #83 (base, head, version and state), existing releases, tags, manifest and untagged merged release PRs. Decide explicitly how to handle #83 and reconcile any version/tag or history differences; do not close, retarget, merge or duplicate it by assumption. Confirm the next calculated version and tag are unused and refer to the intended commit; stop on ambiguity or collision. The published tag may point to a preparation-branch commit, not the eventual production merge commit.
3. After approval, establish `release-preparation` from the agreed current history with this configuration, and protect it with appropriate PR and required-check rules. Review how changes and hotfixes flow into it and back from production; prevent divergence and accidental direct production merges. CI and CodeQL run on PRs targeting either branch, while their push triggers remain on `main`; required checks and branch protections are separate repository settings.
4. Only after checking the branch, workflow, pending PRs and next tag, obtain explicit authorization to enable automation. Both push and manual runs require the repository variable `RELEASE_PLEASE_ENABLED` to be `true` and the workflow ref to be `release-preparation`; `target-branch` explicitly directs Release Please there. Manual dispatch on `main` skips the job. The workflow file and branch must exist remotely for a dispatch, and old workflow revisions or other automation are not disabled by this guard.
5. Review the generated PR targeting `release-preparation`, version, notes and checks. Its separately authorized merge can publish a tag and GitHub Release immediately; this is not a draft-only gate. Then, with separate production authorization, promote the exact prepared changes via a reviewed PR to `main`, verify checks and Cloudflare deployment, and record the deployed commit and version. Do not assume a squash or merge commit equals the release tag commit: verify the promoted tree and version, and reconcile later production fixes before the next release.

This is a migration plan, not evidence that the new branch, branch protection, PR lifecycle, version calculation or promotion has been tested remotely. No credential changes are required by this configuration.

## Version automation

Historically, Release Please was active in CYNDY, and version `0.1.0` was published from the merged release PR on 2026-11-24. Check the workflow, PRs and tags before acting; this is a dated observation, not a guarantee of current state. The workflow runs its release job only when repository variable `RELEASE_PLEASE_ENABLED` is explicitly `true`; it is otherwise disabled. Cloudflare continues to deploy each merge to `main`; a GitHub Release is a separate version record, not a deployment gate.

The initial release is `0.1.0`, with `69391483460502edc68c2b5747b8f474ab65ac68` as the starting point for changelog history. Its tag points to release PR merge commit `c4a5ab1b0ad6aed32c87f66b19c93eb95da5b170`. The manifest records the published version, and no permanent `release-as` is configured, allowing Release Please to calculate later versions. Before 1.0, breaking changes are configured to bump the minor version; ordinary features also bump minor, and fixes bump patch.

For setup or recovery, the repository owner must create and install a GitHub App scoped to this repository, granting Contents, Issues, and Pull requests read and write as documented by Release Please. Set repository variable `RELEASE_PLEASE_CLIENT_ID` to the App's Client ID and repository secret `RELEASE_PLEASE_APP_PRIVATE_KEY` to its private key; never commit or share the key. The workflow mints an installation token and never falls back to `GITHUB_TOKEN`, because that token does not trigger the usual PR workflows. App creation, secret installation, activation, PR merge, tags and releases each require the appropriate owner authorization. Check that the generated PR receives the required CI and CodeQL checks before merging; do not weaken branch protection. Review changes to GitHub Actions settings separately if required.

The proposed workflow sets `skip-github-release: false`: once automation is explicitly enabled, merging a preparation-branch release PR is the decision to publish its tag and GitHub Release. Review the proposed version, notes, required checks and target commit before merging; do not merge until ready to publish. A workflow run may also publish a previously merged, untagged release PR, so inspect existing release PRs and tags before activation or manual execution. In the isolated test, an untagged merged release PR blocked subsequent release proposals until publication was enabled. Avoid a permanent `release-as` override unless a separately reviewed release plan requires one. Activation, each release PR merge and manual execution require appropriate owner authorization.

In the isolated fixture, the initial PR was not created until a qualifying commit changed `app/` after the bootstrap SHA; the proposed version was `0.1.0`. After publishing that fixture release and removing `release-as`, a fix proposed `0.1.1`, a feature proposed `0.2.0`, and a breaking change proposed `0.3.0`; the synthetic lockfile was updated for `0.1.1`. CYNDY's initial release PR, checks and tag were verified separately; later version calculations in CYNDY remain unverified. Review the generated proposal before any publication. No npm package publication is configured.

## Before release

1. Run `cd app && npm test -- --run --no-file-parallelism`, `npm run build`, and `npm run test:e2e` with the installed Playwright Chromium path configured.
2. Check an installed Android instance: preserve an earlier count and note, update the app, verify the record, save a titled count, close and reopen in airplane mode.
3. Record the current production deployment and candidate commit before promotion. Confirm release and merge authorization separately.
4. Tell testers that the first load requires internet and that clearing site data or losing the device can permanently delete local settings and counts. V1 has no backup or sync.

## After deployment

1. Confirm Cloudflare Pages reports the intended deployment as successful and check `https://cyndy-app.pages.dev`.
2. On Android, repeat the update and offline checks using synthetic data. Confirm previously stored test records still appear; do not clear site data to force an update.
3. Record the deployment identifier, commit, checks and any outstanding issues. Cloudflare Web Analytics measures online navigation and performance, not all offline use.

## Rollback

1. Identify the previously successful Cloudflare Pages production deployment recorded before release. Follow the Pages dashboard's rollback or redeploy controls for that deployment; verify the exact target before confirming.
2. Check the deployment status, live site, existing synthetic records and offline launch again. Keep the release commit and diagnostic evidence for investigation.
3. A static deployment rollback does **not** restore deleted or cleared IndexedDB data. Before rollback, check that the prior app can read data written by the newer version; if that compatibility is unknown, stop and assess it rather than clearing device storage.

## Scope and remaining evidence

An isolated Chromium test of the candidate upgrade, rollback and re-upgrade preserved an older synthetic note and a newly titled count, including offline reopening. The previous version displayed both records; the title was visible again after re-upgrade. A physical Android incognito test also confirmed an existing note and a new titled count after upgrade and offline reload, as reported by the user. Physical Android rollback and the actual production deployment remain to be checked. The first release retains version `0.1.0`.
