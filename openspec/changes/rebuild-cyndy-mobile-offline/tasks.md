# Tasks: Rebuild CYNDY as an Offline Mobile Counter

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 1,900–2,700 authored lines |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | Repository bootstrap → app foundation → local counting → history/receipts → portable deployment/E2E |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Public repository bootstrap and security posture | PR 1 → main | `git check-ignore -v .env .env.example` | Verify GitHub GPLv3 repo/settings plan | repository policy and `.github` controls |
| 2 | Static app, domain, and IndexedDB foundation | PR 2 → main | `npm test -- --run src/domain src/storage` | `npm run dev` fresh-store onboarding | `app` foundation/domain/storage |
| 3 | Configuration and multi-currency counting | PR 3 → main | `npm test -- --run src/routes/count` | Create/save two-currency count | count/settings routes and components |
| 4 | History, reset safety, and receipts | PR 4 → main | `npm test -- --run src/routes/history src/receipts` | Delete, reset, and browser-print flow | history/detail/receipt modules |
| 5 | Portable static deployment and offline proof | PR 5 → main | `npm run build && npm run test:e2e` | Pages `*.pages.dev` HTTPS/offline/SPA smoke | Pages config, PWA assets, release evidence |

## Phase 1: Repository Bootstrap and Security

- [ ] 1.1 Create the public GitHub repository with `LICENSE` (GPLv3), `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `.gitignore`, and `.env.example`; document that secrets and real data are prohibited.
- [x] 1.2 Add `.github/dependabot.yml` and `.github/workflows/codeql.yml`; record the pre-release settings plan for secret scanning/push protection, Dependabot, code scanning, protected `main`, reviews, and required checks.

## Phase 2: Static Foundation

- [ ] 2.1 Create `app/package.json`, `app/vite.config.ts`, test setup, and static `app/dist` build scripts; prove no environment variables or server runtime are required.
- [ ] 2.2 RED: add `app/src/domain/*.test.ts` for integer subtotals, no cross-currency aggregate, empty configuration, and invalid identity/denominations.
- [ ] 2.3 GREEN: implement `app/src/domain/count.ts` and `validation.ts`; make the RED tests pass.
- [ ] 2.4 RED/GREEN: implement and test `app/src/storage/indexed-db-repository.ts` for valid saves, immutable snapshots, note-only updates, deletion, and atomic reset.

## Phase 3: Accessible Local Counting

- [ ] 3.1 RED: add route/component tests for onboarding, invalid-field recovery, and guarded dashboard/direct `/count/new` navigation with focused explanatory status.
- [ ] 3.2 GREEN: implement `app/src/routes/onboarding`, `settings`, `count`, and accessible shared forms; retain invalid input and persist only valid configurations.
- [ ] 3.3 RED/GREEN: implement a two-currency count save flow with independent subtotals, snapshots, timestamp, and optional note; prove no aggregate or conversion UI.
- [ ] 3.4 Implement shell/navigation, skip link, landmarks, visible focus, labels, live errors, and 24px targets; prove keyboard operation.

## Phase 4: Local Records and Receipt Delivery

- [ ] 4.1 RED/GREEN: implement dashboard, history, and detail from stored snapshots; prove neutral language and no shift, close-out, expected-total, or reconciliation semantics.
- [ ] 4.2 RED/GREEN: add accessible deletion and two-step reset; prove cancellation preserves data and confirmation atomically clears settings and counts.
- [ ] 4.3 RED/GREEN: create `app/src/receipts/*`, `ReceiptDestination`, and browser-print delivery; prove snapshot/note output and no Bluetooth/ESC-POS option.

## Phase 5: Portable Static Deployment and Verification

- [ ] 5.1 Implement `app/public/manifest.webmanifest` and `app/src/pwa/*` host-neutral precache/registration plus first-load-offline messaging; prove IndexedDB is untouched.
- [ ] 5.2 Configure Cloudflare Pages Free from GitHub: `main`, build `app`, output `app/dist`, initial `*.pages.dev` URL, HTTPS, and SPA fallback to `index.html`; use no Workers, Pages Functions, proprietary runtime APIs, bindings, or deployment token.
- [ ] 5.3 Add `app/e2e/*` and release evidence for warm-load offline, first-load-offline notice, safe unknown routes, `*.pages.dev` HTTPS/SPA behavior, and Android install/offline smoke.
- [ ] 5.4 Record rollback by deploying a prior static build and host migration by serving the identical `app/dist` on an equivalent HTTPS/SPA-fallback static host; exclude device-local records and all backup/export/auth/conversion features.
