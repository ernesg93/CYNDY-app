# Proposal: Improve Denomination Counting
## Intent

Make `/count/new` faster while preserving CYNDY's integer, offline, multi-currency snapshot model.

## Scope

### In Scope
- **Slice 1 — fast count:** `denomination × native numeric quantity = live row subtotal`; prominent independent total per currency.
- **Clear count:** reset only unsaved quantities, note, and feedback; no storage call or saved-record/settings effect.
- Keep native numeric inputs (`min=0`, integer validation, numeric input mode); no steppers.
- **Slice 2 — Settings:** separate denomination configuration route, linked from count/navigation; validate and persist there.
- Cover clear isolation, settings validation, accessibility, and non-aggregation.

### Out of Scope
- Conversion, aggregate totals, reconciliation, export, cloud sync, or saved-record semantic changes.
- Inline denomination editing, steppers/keypad, schema migration, or Task 5.3 changes.

## Capabilities

### New Capabilities
- `denomination-settings`: Separate accessible route for valid denomination configuration.

### Modified Capabilities
- `local-counting`: Specify direct-row live subtotals, prominent per-currency totals, and an unsaved-local-draft clear action.

## Approach

Reuse `calculateCountSnapshots` for render/save; call `saveCount` only on save. Clear `CountPage` draft state locally and reuse configuration through settings. Ship stacked-to-main: (1) count UI/tests, (2) settings/tests. Each target is ≤400 authored lines.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `app/src/routes/app-routes.tsx` | Modified | Count rows, local clear, settings route/navigation. |
| `app/src/routes/app-routes.test.tsx` | Modified | UI, isolation, accessibility, settings tests. |
| `app/src/domain/count.ts` | Reused | Integer snapshots/subtotals. |
| `app/src/storage/indexed-db-repository.ts` | Reused | Configuration/count persistence only. |

## Accessibility and Constraints

- Keep fieldsets/legends, labels, visible focus, logical tabs, 24px+ controls, and zoom-safe totals.
- Use concise `role=status`; do not announce every subtotal. Errors use text plus `aria-invalid`/descriptions.
- Quantities remain non-negative safe integers; currencies independent; saved snapshots immutable.

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Clear mutates persisted data | Low | Local state-only handler; assert no repository calls. |
| UI suggests a grand total | Medium | Sectioned totals; no aggregate or conversion language. |
| Settings refactor regresses onboarding | Medium | Reuse validation and retain route-guard tests. |

## Rollback Plan

Revert either slice; no migration is introduced and saved records remain unchanged.

## Dependencies

- `rebuild-cyndy-mobile-offline` baseline; leave Task 5.3 untouched and reconcile source specs before implementation.
- Existing React/Vitest/Playwright harness and persistence contracts.

## Success Criteria

- [ ] Each denomination has a native numeric quantity input and live row subtotal; each currency displays only its own total.
- [ ] Clear count empties unsaved quantities, note, and feedback without storage calls or persisted-data changes.
- [ ] Settings are separate, valid, accessible, and used by later counts.
- [ ] Each slice is ≤400 authored changed lines with automated and manual keyboard/screen-reader checks.
