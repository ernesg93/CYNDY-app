# Tasks: Sticky Currency Totals

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 260–360 authored lines |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single bounded work unit / PR |
| Delivery strategy | single-pr (user-resolved, within budget) |
| Chain strategy | stacked-to-main |

Decision needed before apply: No — the user assigned the sole bounded work unit with a 400-line ceiling.
Chained PRs recommended: No
Chain strategy: stacked-to-main
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Fieldset-scoped, compact sticky per-currency totals with evidence | `feat(sticky-currency-totals): add fieldset-scoped sticky totals` | `cd app && npm test -- --run src/routes/app-routes.test.tsx` | `cd app && npm run test:e2e -- routes.spec.ts`—compact scroll, keyboard focus geometry, 200% reflow | Revert `app/src/routes/app-routes.tsx`, `app/src/styles.css`, `app/src/routes/app-routes.test.tsx`, `app/e2e/routes.spec.ts`; no state/domain/storage/routes changed |

## Phase 1: RED Evidence

- [ ] 1.1 In `app/src/routes/app-routes.test.tsx`, add failing `CountPage` assertions for exactly one group-scoped `CODE total: SYMBOLsubtotal CODE`, independent USD/EUR updates, no aggregate/metadata, no `status`/`alert`/`tabindex`/interactive summary descendants, and retained input labels/descriptions.
- [ ] 1.2 Extend the existing clear/save/snapshot tests in `app/src/routes/app-routes.test.tsx` to fail until totals reset after local clear and save keeps existing repository snapshot values.
- [ ] 1.3 In `app/e2e/routes.spec.ts`, add failing geometry checks on `/count/new`: compact fieldset-bound sticky summary, no next-fieldset overlay, Tab-focused quantity not fully intersected, and no horizontal overflow at effective 200% zoom.

## Phase 2: GREEN Presentation

- [ ] 2.1 In `CountPage` (`app/src/routes/app-routes.tsx`), move the sole `.currency-total` into semantic `.currency-fieldset`/`.currency-heading` markup beside its `<legend>`; reuse `snapshots[currencyIndex].subtotal` and preserve rows, IDs, validation, clear, save, and snapshot handlers.
- [ ] 2.2 In `app/src/styles.css`, add wrapping/min-width-safe heading and total rules; at the compact breakpoint apply fieldset-bounded sticky positioning, opaque background, padding, and bounded z-index, while wider layouts remain non-sticky.
- [ ] 2.3 In `app/src/styles.css`, add compact `.denomination-row input:focus-visible` block-start scroll clearance sized for summary height plus outline; add no focus calls, scripted scrolling, animation, overlay, live region, or controls.

## Phase 3: GREEN Verification and Delivery

- [ ] 3.1 Make the focused component RED tests pass; record exact command/result: `cd app && npm test -- --run src/routes/app-routes.test.tsx`.
- [ ] 3.2 Make Playwright geometry checks pass; record exact command/result: `cd app && npm run test:e2e -- routes.spec.ts`, including compact scrolling, keyboard clearance, reflow, and effective 200% zoom.
- [ ] 3.3 Run and record `cd app && npm run typecheck`, `cd app && npm test -- --run`, and `cd app && npm run test:e2e`; keep authored additions plus deletions at or below 400, otherwise stop and request chain/exception resolution.
- [ ] 3.4 Before commit/PR, create or link one approved feature issue; publish one conventional-commit work unit and PR with focused-test/runtime evidence, rollback boundary, non-goals, and final `git diff --stat` budget receipt.

## Non-Goals

- No aggregate/conversion/count metadata, persistence/domain/storage/route changes, fixed overlay, focus management, live region, controls, dependencies, or tooling changes.
- Do not modify existing OpenSpec artifacts beyond this `tasks.md`.
