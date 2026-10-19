# Tasks: Improve Denomination Counting
Baseline reconciliation: canonical `openspec/specs/` is absent. Treat current app behavior plus approved `rebuild-cyndy-mobile-offline/specs/local-counting/spec.md` as the baseline: guarded `/` and `/count/new`, independent currency snapshots, and immutable saved history. Deltas add direct-row presentation/local clear and `/settings`; Task 5.3 remains separate. Archive, not apply, establishes canonical specs.

Apply reconciliation at `origin/main` (`fb610e2`): `resolveRoute` retains the guards and not-found behavior; `CountPage` already used native numeric inputs and `calculateCountSnapshots` for save/live currency subtotals but lacked entry subtotals and local Clear; `saveCount` still clones snapshots into unchanged IndexedDB stores. `submitConfigurations`, history semantics, schema, and Task 5.3 remain untouched.

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 520–760 authored lines total; 230–380 per unit |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 count rows/local clear → PR 2 settings lifecycle |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Direct rows, live per-currency subtotals, local Clear | PR 1 → main | `cd app && npm test -- --run src/routes/app-routes.test.tsx` | `cd app && npm run dev`; two currencies, enter/clear by keyboard | `app-routes.tsx`, route tests, count CSS; no persistence bytes |
| 2 | `/settings` configuration lifecycle | PR 2 → main | `cd app && npm test -- --run src/routes/app-routes.test.tsx` | `cd app && npm run dev`; edit settings, save, start later count | settings route/form/nav/tests/CSS; existing key and snapshots remain readable |

## Phase 1: Reconciliation and RED Evidence

- [ ] 1.1 Record this baseline in the PR/issue: `resolveRoute`, `CountPage`, `calculateCountSnapshots`, `submitConfigurations`, and IndexedDB cloning are reused; no schema, history, aggregate, conversion, or Task 5.3 change.
- [x] 1.2 **RED (Unit 1):** in `app/src/routes/app-routes.test.tsx`, assert denomination/quantity/live entry subtotal rows, independent prominent subtotals, no aggregate, integer-save rejection, and zero repository calls plus cleared note/message/rows on Clear.
- [ ] 1.3 **RED (Unit 2):** replace the `/settings` not-found expectation with route/nav, valid save, invalid retained/error-linked fields, guard/repair path, draft isolation, and prior-snapshot immutability tests.
- [ ] 1.4 **RED routing threat:** assert `/settings` renders locally, invalid `/` and `/count/new` redirect to onboarding, and malformed/unknown routes remain not-found; shell/process/VCS threat rows are N/A.

## Phase 2: Work Unit 1 — Count Rows and Local Clear

- [x] 2.1 **GREEN:** modify `CountPage` in `app/src/routes/app-routes.tsx` to render `snapshot.entries` as denomination × native `min=0`, `step=1`, numeric-input-mode quantity → live subtotal; keep `calculateCountSnapshots` as the only calculation/save source.
- [x] 2.2 **GREEN:** add `type="button"` Clear count to reset only `draft`, `note`, and `message`; retain focus, make no repository call, and do not alter `saveCount`, configurations, snapshots, or history.
- [x] 2.3 Update `app/src/styles.css` to suppress number steppers while preserving native constraints, ≥24px targets, visible unobscured focus, and 200%-zoom-readable row/independent-total layout.
- [ ] 2.4 Verify RED→GREEN; run `cd app && npm test -- --run`, `cd app && npm run typecheck`, then narrow-viewport keyboard, NVDA/VoiceOver label/status, and 200% zoom checks. Do not announce individual subtotal changes. Automated checks and Playwright accessibility-tree validation pass; direct NVDA/VoiceOver validation remains.

## Phase 3: Work Unit 2 — Settings Lifecycle

- [ ] 3.1 **GREEN:** extend `RouteResult`/`resolveRoute`, `ApplicationRoutes`, and `AppShell` in `app/src/routes/app-routes.tsx` with accessible `/settings` navigation; permit Settings as the repair route while retaining onboarding guards only for `/` and `/count/new`.
- [ ] 3.2 **GREEN:** compose `SettingsPage` from `ConfigurationFormValues`, `ConfigurationForm`, and `submitConfigurations`; load current configurations, preserve invalid entries, validate required identity/unique code/positive whole, non-duplicate, non-empty denominations, and save only `currency-configurations`.
- [ ] 3.3 Keep `CountPage` draft/note/message isolated from Settings; prove later counts use new configuration while `saveCount` snapshots/history remain immutable; no IndexedDB version/store/shape migration.
- [ ] 3.4 Verify RED→GREEN; run `cd app && npm test -- --run`, `cd app && npm run typecheck`, and `cd app && npm run test:e2e`; manually keyboard-correct an error at narrow width, check errors use text + `aria-invalid`/descriptions, focus is visible, and 200% zoom remains usable.

## Phase 4: Delivery and Rollback Evidence

- [ ] 4.1 Open/update the approved issue and PR 1 with baseline reconciliation, explicit non-goals, RED/GREEN command results, runtime/a11y evidence, ≤400 authored-line stat, and rollback limited to Unit 1 files.
- [ ] 4.2 After PR 1 merges to `main`, open PR 2 from `main` with its independent evidence, ≤400 authored-line stat, and rollback limited to settings/nav files; do not modify active rebuild task checkboxes or Task 5.3.
