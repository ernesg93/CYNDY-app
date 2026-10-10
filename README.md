# CYNDY

CYNDY is a clean-room, Android-first money counter designed to work offline after its first successful load. The application is being rebuilt as a static progressive web app with device-local data only.

## Project status

Repository governance is established. Application source code is intentionally not part of this bootstrap work unit.

## Product boundaries

- Counts are independent records, not register closures or shift handoffs.
- V1 has no authentication, cloud sync, backup, export/import, conversion, or reconciliation.
- Real user data, production exports, credentials, and secrets are prohibited from the repository.
- Test fixtures must be synthetic.

## Planned local development

The application will live in `app/`. Commands will be documented when the static React/TypeScript foundation is added in the next work unit.

## Planned deployment

The portable artifact will be `app/dist`. Cloudflare Pages will build from `main` with `app` as the root directory, `npm run build` as the build command, and `dist` as the output directory. The app must require no environment variables, Pages Functions, Workers, bindings, deployment tokens, or vendor storage. Any replacement host only needs HTTPS, static-file serving, and an SPA fallback to `index.html`.

Deployment and public-repository settings are user-owned actions. See [the pre-release checklist](docs/pre-release-checklist.md) before publication.

## Contributing and security

Read [CONTRIBUTING.md](CONTRIBUTING.md) before proposing a change. Report vulnerabilities privately according to [SECURITY.md](SECURITY.md); do not open a public issue for sensitive reports.

## License

CYNDY is licensed under the [GNU General Public License v3.0 only](LICENSE).
