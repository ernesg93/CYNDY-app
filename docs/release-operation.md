# CYNDY release operation

CYNDY is a static, Android-first PWA. A release changes the application shell, not the device-local IndexedDB records. Use synthetic data for verification.

## Version automation (prepared, not activated)

Cloudflare continues to deploy each merge to `main`; a GitHub Release is a separate version record, not a deployment gate. Release Please is disabled unless the repository variable `RELEASE_PLEASE_ENABLED` is explicitly set to `true`. Never enable it until the bootstrap proposal and first release process have been reviewed and authorized.

The proposed initial release is `0.1.0`, with `69391483460502edc68c2b5747b8f474ab65ac68` as the verified starting point for changelog history. No CYNDY release or tag exists yet. The owner chose to tag the merged release PR commit rather than this baseline commit; review the exact commit and generated PR before deciding whether to publish. The empty manifest and initial `release-as` were tested only in a synthetic repository; do not treat them as a published CYNDY version. The forced `release-as` must be removed after the initial release is resolved so later versions are not pinned to `0.1.0`. Before 1.0, breaking changes are configured to bump the minor version; ordinary features also bump minor, and fixes bump patch.

To prepare activation, the repository owner must create and install a GitHub App scoped to this repository, granting Contents, Issues, and Pull requests read and write as documented by Release Please. Set repository variable `RELEASE_PLEASE_CLIENT_ID` to the App's Client ID and repository secret `RELEASE_PLEASE_APP_PRIVATE_KEY` to its private key; never commit or share the key. The workflow mints an installation token and never falls back to `GITHUB_TOKEN`, because that token does not trigger the usual PR workflows. App creation, secret installation, activation, PR merge, tags and releases each require the appropriate owner authorization. Check that the generated PR receives the required CI and CodeQL checks before merging; do not weaken branch protection. Review changes to GitHub Actions settings separately if required.

The workflow sets `skip-github-release: true` independently of activation: it cannot create a GitHub Release or tag through Release Please while this setting remains in place. Merging a proposed release PR does not authorize publication. In the isolated test, merging with publication disabled left an untagged release PR and prevented subsequent release proposals until publication was enabled. This is not a complete unattended release cycle: a separately authorized change and verification are required before enabling publication. Keep `release-as` until the first release is resolved and verify the removal sequence before changing either setting.

In the isolated fixture, the initial PR was not created until a qualifying commit changed `app/` after the bootstrap SHA; the proposed version was `0.1.0`. After publishing that fixture release and removing `release-as`, a fix proposed `0.1.1`, a feature proposed `0.2.0`, and a breaking change proposed `0.3.0`; the synthetic lockfile was updated for `0.1.1`. These observations do not establish the exact initial PR, checks, or tag for CYNDY's actual history. Review those before activation and publication. No npm package publication is configured.

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
