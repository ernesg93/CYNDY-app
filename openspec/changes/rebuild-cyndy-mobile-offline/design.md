# Design: Rebuild CYNDY as an Offline Mobile Counter

## Technical Approach

Build a clean-room React/TypeScript PWA in `app/`. Browser-native IndexedDB is the sole v1 authority; a service worker precaches the static application shell. The repository is public under GPLv3, while the v1 application is published as a host-portable static `dist` build through Cloudflare Pages Free at a `*.pages.dev` subdomain. This satisfies the four specified capabilities without a backend, authentication, sync, conversion, reconciliation, export/import, backup, native packaging, or direct printer integration.

## Architecture Decisions

| Decision | Choice | Alternative considered | Rationale |
|---|---|---|---|
| Local persistence | Typed repository over IndexedDB | LocalStorage or remote API | Durable structured records and atomic reset without a server. |
| Count integrity | Immutable currency/denomination/quantity/subtotal snapshots; only `note` is editable | Rebuilding records from settings | Later configuration changes cannot alter historical facts. |
| Money | Integer denomination, quantity, and per-currency subtotal | Floating point or conversion | Prevents precision loss and preserves the no-cross-currency-total boundary. |
| Initial configuration | Empty store; valid user-created currency required before counting | Seeded example currency | Avoids a regional default and forces deliberate setup. |
| PWA delivery | Manifest and host-neutral service worker precache the built shell | Network-first shell | Supports offline use after a successful load without caching IndexedDB. |
| Source and license | Public GitHub repository under GPLv3 | Private or proprietary repository | Makes the clean-room code inspectable while preserving copyleft terms. |
| V1 hosting | Cloudflare Pages Free, Git-connected, `main` builds `app` to `app/dist`, served at `*.pages.dev` | Workers, Pages Functions, backend, or custom domain | Free static delivery with no required paid domain, runtime, or subscription lock-in. GitHub remains source control; Pages pulls and builds it. |
| Portability | `dist` contains all runtime assets; host configuration only supplies static serving, HTTPS, and SPA fallback | Cloudflare-specific APIs or storage | The exact build can be deployed to another static host later. Pages Functions, Workers, proprietary runtime APIs, and vendor storage are prohibited in v1. |
| Public-repository hygiene | Ignore `.env`/secrets; synthetic fixtures only; enable GitHub security controls before release | Adding controls after publication | Prevents exposure of credentials or real user data in a public repository. |

## Data and Deployment Flow

```
User ─> PWA shell/service worker ─> domain validation ─> IndexedDB
                                      │                    │
Dashboard/history/receipt <──────────┴── snapshot queries ─┘

GitHub public GPLv3 repository ──> Cloudflare Pages build ──> static dist ──> *.pages.dev
```

First use opens onboarding. Valid settings persist before a count route can open. Saving copies display identity and entries into a timestamped `CountRecord`; read models display each currency independently. The service worker and all application assets are generated into `dist`; no request is required to use local data after a warm load. Extensionless client routes require the static host's standard SPA fallback to `index.html`; this is deployment configuration, not an application runtime dependency.

## Routing and Views

Routes remain `/`, `/onboarding`, `/count/new`, `/history`, `/history/:countId`, and `/history/:countId/receipt`. Settings management is deferred beyond onboarding. The count guard redirects invalid or absent configuration to onboarding with focused explanatory status and remains active until every configured currency is valid. Controls remain semantic, keyboard-operable, visibly focused, labeled, and at least 24 CSS pixels. Reset remains a two-step confirmation followed by one IndexedDB transaction; cancellation changes nothing.

## Interfaces / Contracts

`CountRecord` contains `id`, ISO `createdAt`, immutable per-currency entry snapshots and subtotals, plus optional `note`. `CountRepository` supports save, note update, deletion, and atomic `resetAll`. `ReceiptDestination.deliver(receipt)` keeps browser print/PDF as the only v1 destination. Deployment consumes only the generated static `app/dist` directory; it has no required environment variables, server endpoints, or Cloudflare bindings.

## File Changes

| File | Action | Description |
|---|---|---|
| `app/package.json`, `app/vite.config.ts` | Create | Reproducible static build with `dist` output; no server runtime. |
| `app/src/domain/*`, `app/src/storage/*`, `app/src/routes/*`, `app/src/components/*`, `app/src/receipts/*` | Create | Existing planned offline counting, accessible UI, local storage, and browser receipt boundaries. |
| `app/src/pwa/*`, `app/public/manifest.webmanifest` | Create | Host-neutral offline shell and install metadata. |
| `.gitignore` | Create | Ignore `.env`, `.env.*` except approved examples, build output, and local tooling data. |
| `SECURITY.md`, `LICENSE` | Create | Vulnerability reporting policy and GPLv3 license text. |
| `.github/dependabot.yml`, `.github/workflows/codeql.yml` | Create | Dependency-update and code-scanning configuration. |
| GitHub repository settings; Cloudflare Pages project | Configure before release | Enable secret scanning, push protection, Dependabot, code scanning, protected `main`, required review/status checks; connect Pages to GitHub with build command and `app/dist` output. |

Fixtures MUST be synthetic and MUST NOT contain real user data. No secret, including a deployment token, belongs in source or fixtures; Pages Git integration avoids a deployment token in v1.

## Testing Strategy

| Layer | What to test | Approach |
|---|---|---|
| Unit | Integer totals, no cross-currency aggregate, snapshots, validation | Pure domain tests. |
| Integration | IndexedDB persistence, note-only edits, transactional reset | Browser IndexedDB repository tests. |
| E2E | Onboarding, route guard, accessibility, warm-load offline, first-load-offline notice, print invocation | Chromium; Android install/offline smoke before release. |
| Release | `dist` static-only contract, Pages build/deploy, `*.pages.dev` offline smoke, public-repo controls | CI/build inspection plus pre-release checklist. |

## Threat Matrix

N/A — no shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary exists in the application. Unknown client routes render a safe not-found view without storage mutation.

## Migration / Rollout

No application-data migration is required. Before public release, create the public GPLv3 repository, apply the listed GitHub safeguards, connect Cloudflare Pages Free, and verify the generated `*.pages.dev` deployment. No custom domain is purchased or required. Rollback deploys a prior static build; future host migration deploys the same `dist` to another static host with equivalent HTTPS and SPA fallback configuration. Device-local records remain outside any deployment rollback and have no v1 recovery path.

## Open Questions

None.
