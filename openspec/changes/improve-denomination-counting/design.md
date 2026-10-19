# Design: Improve Denomination Counting
Two reversible, stacked-to-main slices: speed up the existing count draft, then expose persisted configuration at `/settings`. Both retain integer-only independent-currency snapshots; Task 5.3 remains untouched.

## Technical Approach

`ApplicationRoutes` loads configuration once. `CountPage` owns only `draft`, `note`, and `message`; it already derives `snapshots` through `calculateCountSnapshots`. Slice 1 renders each existing snapshot entry as a denomination/quantity/subtotal row and clears those three local states without a repository dependency. Slice 2 adds `/settings`, maps loaded configurations to `ConfigurationFormValues`, and reuses `submitConfigurations` plus `saveCurrencyConfigurations`.

```
IndexedDB settings -> ApplicationRoutes.configurations -> CountPage draft -> calculateCountSnapshots -> render/saveCount
                                                 \-> Settings form -> submitConfigurations -> IndexedDB settings
IndexedDB counts <- saveCount(structured-cloned snapshots)          (never reads count draft)
```

## Architecture Decisions

| Decision | Choice and rationale |
|---|---|
| Count calculation | Reuse `calculateCountSnapshots` for live rows and save; it already supplies entry totals and safe independent currencies. |
| Clear boundary | `CountPage` calls `setDraft({})`, `setNote("")`, and `setMessage(undefined)` only; its `saveCount` dependency cannot touch settings/history. |
| Settings lifecycle | Add `settings` to route/navigation and compose `SettingsPage` from `ConfigurationForm`/`submitConfigurations`; retain two-currency and duplicate-code rules. |
| Invalid configuration | Keep `/settings` reachable to repair it; only `/` and `/count/new` redirect to onboarding. |
| Accessibility feedback | Retain native labelled controls, fieldsets, visible focus, and 44px controls. Do not announce row changes; Clear retains button focus and removes feedback; save uses concise status, while failures keep text and programmatic error linkage. |

## Ordered Review Slices

1. **Count rows and local clear** — modify routes, route tests, and CSS only; ≤400 authored lines. Hide spinners but retain native numeric constraints, render entry subtotals, and add `type=button` Clear count. Revert safely: no persisted bytes change.
2. **Settings route and configuration lifecycle** — modify routes/tests and CSS only if layout needs it; ≤400 authored lines. Add route/navigation/form initialization/save feedback and retain guards. Reverting leaves the existing configuration key and count snapshots readable.

## File Changes

| File | Action | Description |
|---|---|---|
| `app/src/routes/app-routes.tsx` | Modify | Settings route/navigation/form mapping; count rows and local clear. |
| `app/src/routes/app-routes.test.tsx` | Modify | Route, isolation, validation, semantics, and snapshot tests. |
| `app/src/styles.css` | Modify | Suppress numeric steppers and keep row/totals mobile and 200%-zoom readable. |
| `app/src/domain/count.ts` | Reuse | Existing snapshot entry/subtotal and safe-integer contract. |
| `app/src/domain/validation.ts` | Reuse | Existing required, positive, non-empty, non-duplicate denomination validation. |
| `app/src/storage/indexed-db-repository.ts` | Reuse | Existing cloned settings/count persistence; no schema/version change. |

## Interfaces / State Boundaries

No persistence interface or schema. Settings maps `CurrencyConfiguration` to existing form values and reuses `submitConfigurations`; a save replaces only `currency-configurations`. `saveCount` already clones snapshots, so later denomination edits cannot change saved facts.

## Testing Strategy

| Layer | Coverage |
|---|---|
| Route/component | Slice 1: rows/subtotals, no aggregate, integer rejection, and zero storage calls on Clear. Slice 2: settings save/rejection/error linkage, later-count effect, repair path, and guards. |
| Repository/domain | Retain safe-integer and immutable-snapshot tests; no migration test because version/stores/shapes stay fixed. |
| Manual accessibility | Keyboard on narrow views; NVDA/VoiceOver labels/live feedback; 200% zoom, visible unobscured focus, and 24px+ targets. |

## Threat Matrix

Routing is applicable; all listed shell/process/VCS boundaries are **N/A** because no files or external process execute. Route RED tests cover `/settings`, invalid redirects for `/`/`/count/new`, and not-found behavior; safe behavior is local rendering/redirect only.

## Migration, Reconciliation, and Rollout

No IndexedDB migration: version, stores, setting key, and `CountRecord` shape stay unchanged. Before tasks/apply, reconcile the absent `openspec/specs/` baseline: compare each delta with current routes/domain/storage/tests and approved `rebuild-cyndy-mobile-offline` artifacts; record discrepancies in tasks/verify, then establish canonical specs only during archive. Never infer baseline behavior from the empty published repository.

## Open Questions

- [ ] None blocking; Task 5.3's Android device validation and E2E work are explicitly excluded.
