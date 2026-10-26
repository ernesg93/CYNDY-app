# CYNDY Release-Readiness Evidence

This record distinguishes observed local evidence from work that requires external access or a physical device. It does not alter the existing release checklist, which is already part of the pre-existing working tree.

## Repository synchronization

- Remote: `origin` (`https://github.com/ernesg93/CYNDY-app.git`).
- Fetch result: succeeded with `git fetch origin --prune`.
- Current branch: `stabilize/cyndy-baseline` at `fc42b19`.
- Remote default branch: `origin/main` at `dc00504`.
- Divergence (`origin/main...HEAD`): `1 0`; this branch is one commit behind `origin/main` and has no branch-only commits.
- `stabilize/cyndy-baseline` has no configured upstream.
- No merge, rebase, reset, or pull was performed because the working tree contains extensive pre-existing changes.

## Local automated baseline

Attempted, in documented order:

```sh
cd app
npm ci
npm test -- --run
npm run typecheck
npm run build
npm run test:e2e
```

Observed user-run result after npm registry access recovered:

- `npm ci` installed 105 packages and audited 106 packages with zero reported vulnerabilities.
- Unit tests: 7 test files and 67 tests passed.
- `npm run typecheck` passed.
- `npm run build` passed and produced the static `dist` artifact.
- `npm run test:e2e` is deferred by explicit user decision because Playwright Chromium is not installed; all six cases stopped before execution at browser launch.

No deterministic code failure has been established. E2E remains an environment-dependent release-evidence gap.

## Static repository-hygiene audit

Observed without installed npm dependencies:

- `app/package.json` and `app/package-lock.json` parse as valid JSON.
- CodeQL is configured for push and pull requests to `main`, with JavaScript/TypeScript analysis and read-only contents permissions.
- Dependabot is configured weekly for GitHub Actions and `/app` npm dependencies.
- `.gitignore` excludes `.env` variants, private-key extensions, credential/secret JSON patterns, dependency/build output, and private reference exports; the only tracked sensitive-looking filename is the intentional `.env.example`.
- The current working-tree change set fails `git diff --check` across many pre-existing modified files. The evidence is consistent with CRLF line endings being treated as trailing whitespace because no `.gitattributes` line-ending policy is present. The largest affected files are `app/package-lock.json` (2,352 lines), `app/src/routes/app-routes.tsx` (696), and `app/src/routes/app-routes.test.tsx` (495).

The user explicitly authorized a separate remediation after safe upstream integration. The repository now has `.gitattributes` with `* text=auto eol=lf`; 57 affected text files were normalized without content changes, and both staged and unstaged `git diff --check` pass. After normalization, the staged logical diff is limited to the pre-existing archived sticky-totals OpenSpec material plus `.gitattributes`; source, test, package, workflow, and asset CRLF-only churn no longer appears as a logical change.

## Remaining external and manual validation protocol

### Android install and offline smoke

1. On Android, open the production HTTPS URL while connected.
2. Wait for the service worker to control the page, then install the PWA.
3. Close every app/browser page, enable airplane mode, and relaunch the installed app.
4. Create a count, save it, open history and detail, and confirm the record persists locally.
5. On a browser profile with no prior visit, open the app while offline and confirm it fails safely without claiming offline readiness.
6. Record device model, Android version, browser version, each result, and screenshots containing only synthetic data.

### Screen-reader validation

1. Use NVDA or VoiceOver at narrow viewport width and 200% zoom.
2. Navigate by keyboard through settings and count inputs.
3. Confirm field labels, invalid-state descriptions, live error/status messages, visible focus, and unobscured focused inputs.
4. Confirm per-currency totals are announced only as intended and no cross-currency aggregate is exposed.
5. Record assistive technology, browser, viewport, result, and defects.

### Portable-host and rollback evidence

1. Build `app/dist` after the local baseline passes.
2. Serve the identical artifact from a second HTTPS static host with SPA fallback to `index.html`; do not add host-specific runtime code.
3. Verify root, `/history`, and an unknown route; repeat warm offline behavior after initial online load.
4. Document deployment of the previous static artifact as rollback, noting that device-local IndexedDB records are out of scope.

### GitHub release controls

A repository administrator must explicitly configure and evidence private vulnerability reporting, secret scanning/push protection, Dependabot, successful CodeQL, protected `main`, required checks, and force-push/deletion prevention. These controls are outside repository-file authority and were not changed.
