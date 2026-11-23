# CYNDY

CYNDY is a clean-room, Android-first money counter designed to work offline after its first successful load. The application is being rebuilt as a static progressive web app with device-local data only.

## Project status

CYNDY is an Android-first, offline-capable MVP with device-local currency settings, counting, history, receipts, and progressive web app support. The first successful load requires an internet connection.

## Start a count

On a fresh installation, USD and CUP are ready to use. Select one or more currencies on the dashboard, then start a count; you can also change the selection while counting. A temporarily deselected currency keeps its draft quantities but is not included when the count is saved. Use Settings to add other currencies and denominations.

A count can have an optional title. Saved counts appear in History, where you can inspect or delete them and print or save a receipt. Older records may contain notes: those notes remain in local storage but are not displayed in the current count-details screen. Resetting local data removes saved counts and restores the default currencies.

## Product boundaries

- Counts are independent records, not register closures or shift handoffs.
- V1 has no authentication, cloud sync, backup, export/import, conversion, or reconciliation. Clearing site data or losing the device can permanently remove local counts and settings.
- Real user data, production exports, credentials, and secrets are prohibited from the repository.
- Test fixtures must be synthetic.

## Local development

The application lives in `app/`. CI runs on Node.js 24. The current lockfile includes dependencies requiring Node.js 22.22.2 or later within Node 22, 24.15.0 or later within Node 24, or Node 26 or later. The application package declares the broader engine range `^22.12.0 || ^24.0.0 || >=26.0.0`; earlier versions within those ranges do not satisfy every locked dependency.

```sh
cd app
npm ci
npm test -- --run --no-file-parallelism
npm run build
npm run test:e2e -- 'e2e/(?!live-pages\.spec\.ts)'
npm run dev
```

The build requires no environment variables or server runtime. Vite writes the portable static artifact to `app/dist`.

The commands above run the full CI unit suite and the CI selection of local Chromium E2E tests. Playwright builds and serves `dist` before the browser tests. Install the local browser once with `npx playwright install chromium` (CI uses `npx playwright install --with-deps chromium`).

From `app/`, run `npm run test:e2e` to include all E2E tests, including the live Pages check, or `npm run test:e2e -- e2e/live-pages.spec.ts` to select that check. The live check depends on the deployed site and network, not the pull request's build; CI excludes it.

## Deployment

The app is available at `https://cyndy-app.pages.dev`. Cloudflare Web Analytics is enabled and can receive page navigation and performance information when online; offline use is not a complete analytics source. Cloudflare Pages builds from `main` with `app` as the root directory, `npm run build` as the build command, and `dist` as the output directory. The deployment requires no environment variables, Pages Functions, Workers, bindings, deployment tokens, or vendor storage. Any replacement host only needs HTTPS, static-file serving, and an SPA fallback to `index.html`.

Deployment and public-repository settings are user-owned actions. See [the pre-release checklist](docs/pre-release-checklist.md) before publication.

## Contributing and security

Read [CONTRIBUTING.md](CONTRIBUTING.md) before proposing a change. Report vulnerabilities privately according to [SECURITY.md](SECURITY.md); do not open a public issue for sensitive reports.

## License

CYNDY is licensed under the [GNU General Public License v3.0 only](LICENSE).
