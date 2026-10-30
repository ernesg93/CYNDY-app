# CYNDY release operation

CYNDY is a static, Android-first PWA. A release changes the application shell, not the device-local IndexedDB records. Use synthetic data for verification.

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

An isolated Chromium test of the candidate upgrade, rollback and re-upgrade preserved an older synthetic note and a newly titled count, including offline reopening. The previous version displayed both records; the title was visible again after re-upgrade. Physical Android update and rollback compatibility remain to be checked for the actual release. The existing version is `0.1.0`; release numbering requires an explicit decision.
