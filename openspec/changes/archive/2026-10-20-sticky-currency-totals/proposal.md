# Proposal: Sticky Currency Totals

## Intent

Keep each currency's existing subtotal visible during long denomination entry without changing count meaning or storage.

## Scope

### In Scope
- Place a total-only summary beside each currency fieldset heading (symbol, subtotal, code).
- Make it in-flow sticky within its currency section at the compact breakpoint.
- Safeguard focused quantity inputs with scroll margins, reflow-safe sizing, and 200% zoom coverage.
- Test isolation, layout hooks, focus visibility, clear/save/snapshot preservation, and compact/desktop runtime behavior.

### Out of Scope
- Combined/cross-currency totals, count metadata, persistence/domain/storage/route changes, or fixed overlays.
- Focus management, live-region announcements, controls, or changes to direct rows, local clear, save, or snapshots.
- Changes to any existing OpenSpec change artifacts.

## Capabilities

### New Capabilities
- `sticky-currency-totals`: Independent total-only fieldset summaries that are in-flow sticky on compact screens.

### Modified Capabilities
- None; this preserves `local-counting` requirements and its data contract.

## Approach

Refactor only count markup/styles in `app/src/routes/app-routes.tsx` and `app/src/styles.css`. Reuse `calculateCountSnapshots`; add no state or aggregate. Use a media query and fieldset-scoped `position: sticky`, preserving document/tab order with scroll-margin and responsive wrapping/min-width safeguards.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `app/src/routes/app-routes.tsx` | Modified | Fieldset heading/total composition only. |
| `app/src/styles.css` | Modified | Compact sticky and focus/reflow safeguards. |
| `app/src/routes/app-routes.test.tsx` | Modified | Isolation, preservation, accessibility assertions. |
| `app/e2e/*` | Modified/New | Narrow viewport, zoom, focus runtime checks. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Focused input is obscured | Medium | Fieldset-scoped sticky; test Tab, reflow, zoom, scroll margins. |
| Summary resembles an aggregate | Low | One labeled total per fieldset; assert no aggregate UI. |
| Review budget exceeds 400 lines | Low | Limit to markup, CSS, focused tests. |

## Rollback Plan

Revert the isolated markup/style/test work unit. Direct rows, draft clear, save, and snapshots stay intact because state, domain, repository, and routes are untouched.

## Dependencies

- Existing React/Vitest/Playwright tooling; no new packages or runtime services.

## Success Criteria

- [ ] Each active currency shows only its own subtotal near its heading; no aggregate appears.
- [ ] Compact sticky summaries do not cover focused inputs at reflow or 200% zoom.
- [ ] Direct rows, clear-unsaved-count, save, and snapshots retain behavior.
- [ ] Focused unit/type and applicable Playwright checks pass; authored work stays below 400 lines.
