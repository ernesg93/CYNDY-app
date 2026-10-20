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

- [x] 1.1 In `app/src/routes/app-routes.test.tsx`, add failing `CountPage` assertions for a direct-child fieldset `<legend>` followed by exactly one group-scoped `CODE total: SYMBOLsubtotal CODE`, independent USD/EUR updates, no aggregate/metadata, no `status`/`alert`/`tabindex`/interactive summary descendants, and retained input labels/descriptions.
- [x] 1.2 Extend the existing clear/save/snapshot tests in `app/src/routes/app-routes.test.tsx` to fail until totals reset after local clear and save keeps existing repository snapshot values.
- [x] 1.3 In `app/e2e/routes.spec.ts`, add failing geometry checks on `/count/new`: compact fieldset-bound sticky summary, no next-fieldset overlay, Tab-focused quantity not fully intersected, and no horizontal overflow at effective 200% zoom.

## Phase 2: GREEN Presentation

- [x] 2.1 In `CountPage` (`app/src/routes/app-routes.tsx`), move the sole `.currency-total` to follow the direct-child `<legend>` as a sibling inside semantic `.currency-fieldset` markup; reuse `snapshots[currencyIndex].subtotal` and preserve rows, IDs, validation, clear, save, and snapshot handlers.
- [x] 2.2 In `app/src/styles.css`, add wrapping/min-width-safe heading and total rules; at the compact breakpoint apply fieldset-bounded sticky positioning, opaque background, padding, and bounded z-index, while wider layouts remain non-sticky.
- [x] 2.3 In `app/src/styles.css`, add compact `.denomination-row input:focus-visible` block-start scroll clearance sized for summary height plus outline; add no focus calls, scripted scrolling, animation, overlay, live region, or controls.

## Phase 3: GREEN Verification and Delivery

- [x] 3.1 Make the focused component RED tests pass; record exact command/result: `cd app && npm test -- --run src/routes/app-routes.test.tsx`.
- [x] 3.2 Make Playwright geometry checks pass; record exact command/result: `cd app && npm run test:e2e -- routes.spec.ts`, including compact scrolling, keyboard clearance, reflow, and effective 200% zoom.
- [ ] 3.3 Run and record `cd app && npm run typecheck`, `cd app && npm test -- --run`, and `cd app && npm run test:e2e`; keep authored additions plus deletions at or below 400, otherwise stop and request chain/exception resolution.
- [ ] 3.4 Before commit/PR, create or link one approved feature issue; publish one conventional-commit work unit and PR with focused-test/runtime evidence, rollback boundary, non-goals, and final `git diff --stat` budget receipt.

## Apply Evidence

| Evidence | Result |
|---|---|
| RED component | `cd app && npm test -- --run src/routes/app-routes.test.tsx` — 1 failed / 28; missing `currency-fieldset`. |
| RED runtime | `cd app && npm run test:e2e -- routes.spec.ts` — 1 failed / 2; sticky summary locator absent. |
| GREEN focused | Component: 28/28 passed. Runtime: 2/2 passed. |
| Full verification | Typecheck passed; focused CountPage Vitest 28/28 passed; the two unrelated timing-sensitive suites passed 12/12 in isolation. The latest full Vitest run finished 65/67 because receipt/history async-loading assertions timed out under the full-suite load; the same full suite passed 67/67 in the prior apply run. Playwright passed 5/5 and production build passed. Task 3.3 remains open pending a clean full-suite/CI result. |
| Browser runtime | Playwright MCP at 640×520 with effective 200% zoom confirmed sticky position, no horizontal overflow, natural Tab to `$11 quantity`, focus clearance, and fieldset bounds; at 1024×720 the total was static and passive. |
| Direct manual screen reader | **Not performed.** Automated semantic assertions cover passive text, no live region, no focusability, and preserved labels; they do not replace direct assistive-technology validation. |
| Rollback boundary | Revert `app/src/routes/app-routes.tsx`, `app/src/styles.css`, `app/src/routes/app-routes.test.tsx`, and `app/e2e/routes.spec.ts`; no state, route, domain, storage, or persistence behavior changed. |
| Delivery | Approved issue #33 created; PR publication remains pending until the implementation commit is pushed. |

## Non-Goals

- No aggregate/conversion/count metadata, persistence/domain/storage/route changes, fixed overlay, focus management, live region, controls, dependencies, or tooling changes.
- Do not modify existing OpenSpec artifacts beyond this `tasks.md`.
