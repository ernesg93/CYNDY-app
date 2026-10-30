# CYNDY

CYNDY is a clean-room, Android-first money counter designed to work offline after its first successful load. The application is being rebuilt as a static progressive web app with device-local data only.

## Project status

CYNDY is an Android-first, offline-capable MVP with device-local currency settings, counting, history, receipts, and progressive web app support. The first successful load requires an internet connection.

## Product boundaries

- Counts are independent records, not register closures or shift handoffs.
- V1 has no authentication, cloud sync, backup, export/import, conversion, or reconciliation. Clearing site data or losing the device can permanently remove local counts and settings.
- Real user data, production exports, credentials, and secrets are prohibited from the repository.
- Test fixtures must be synthetic.

## Local development

The application lives in `app/` and supports Node.js 22.12 LTS, 24, and later even-numbered releases.

```sh
cd app
npm ci
npm test -- --run src/domain
npm run build
npm run test:e2e
npm run dev
```

The build requires no environment variables or server runtime. Vite writes the portable static artifact to `app/dist`.

`npm run test:e2e` builds and serves `dist`, then runs Chromium checks for warm and cold offline behavior, unknown routes, and the live Pages deployment. Install the local browser once with `npx playwright install chromium`.

## Deployment

The app is available at `https://cyndy-app.pages.dev`. Cloudflare Web Analytics is enabled and can receive page navigation and performance information when online; offline use is not a complete analytics source. Cloudflare Pages builds from `main` with `app` as the root directory, `npm run build` as the build command, and `dist` as the output directory. The deployment requires no environment variables, Pages Functions, Workers, bindings, deployment tokens, or vendor storage. Any replacement host only needs HTTPS, static-file serving, and an SPA fallback to `index.html`.

Deployment and public-repository settings are user-owned actions. See [the pre-release checklist](docs/pre-release-checklist.md) before publication.

## Contributing and security

Read [CONTRIBUTING.md](CONTRIBUTING.md) before proposing a change. Report vulnerabilities privately according to [SECURITY.md](SECURITY.md); do not open a public issue for sensitive reports.

## License

CYNDY is licensed under the [GNU General Public License v3.0 only](LICENSE).
