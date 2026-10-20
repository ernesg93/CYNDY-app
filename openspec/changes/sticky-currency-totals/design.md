# Design: Sticky Currency Totals

## Technical Approach

Refactor `CountPage` presentation only. It already calls `calculateCountSnapshots(configurations, quantities)` once and maps `snapshots[currencyIndex]` while rendering each currency `<fieldset>`. Move the existing per-currency subtotal from after the denomination rows into a compact heading row beside the fieldset `<legend>`; it will render `symbol`, `subtotal`, and `code` only. No state, calculation, persistence, route, or action changes are required.

At the compact breakpoint, the summary stays in that fieldset's normal flow and becomes `position: sticky` with a small block-start inset. At wider widths it remains an ordinary heading-adjacent element. CSS keeps the summary readable by permitting the heading row to wrap and preventing intrinsic-content overflow. Quantity-input scroll margins reserve clearance from the sticky summary without JavaScript scrolling.

## Existing Implementation Map

| Concern | Existing location | Current behavior | Design use |
|---|---|---|---|
| Count UI and draft lifecycle | `app/src/routes/app-routes.tsx` — `CountPage` | Builds `quantities`, calls `calculateCountSnapshots`, renders fieldsets, direct rows, note, save, and local clear | Change only the fieldset header/total markup around lines 580–613. |
| Per-currency source | `CountPage` — `snapshots[currencyIndex]` | Each snapshot has `entries` and `subtotal`; rows already show `entry.total` | Reuse `snapshots[currencyIndex].subtotal` directly. |
| Existing total | `CountPage` — `.currency-total` | A `<p>` follows each fieldset's rows: `CODE total: <strong>SYMBOLsubtotal CODE</strong>` | Replace with a heading-adjacent passive summary; do not duplicate it. |
| Current count layout/focus | `app/src/styles.css` — `.denomination-row`, `.currency-total`, `:focus-visible` | Three-column row, 44px inputs, 3px visible outline, generic 1rem scroll margin | Add scoped summary/header classes and focused quantity clearance. |
| Component coverage | `app/src/routes/app-routes.test.tsx` — `new count route` | Two-currency subtotal/save test; invalid-quantity and clear tests | Extend these tests; preserve save and clear assertions. |
| Runtime coverage | `app/e2e/routes.spec.ts`; `playwright.config.ts` | Chromium e2e starts production preview at `127.0.0.1:4173`; no count-layout scenario exists | Add one focused count-layout spec in `routes.spec.ts`. |

## Architecture Decisions

| Decision | Choice | Alternative rejected | Rationale |
|---|---|---|---|
| Scope | One passive summary inside every currency fieldset | Page-level aggregate or a fixed overlay | Maintains currency isolation, fieldset bounds, document order, and the spec's no-aggregate rule. |
| Data | Read `snapshots[currencyIndex].subtotal` | New subtotal state, conversion, or recomputation | Preserves the existing calculation and saved-snapshot contract. |
| Sticky mechanics | CSS `position: sticky` on the summary within its fieldset, compact media query only | JS scroll listener or `position: fixed` | Native sticky is bounded by the fieldset and adds no focus/scroll side effects. |
| Accessibility | Plain text/`<strong>`; no role, tabIndex, live region, or control | `role=status`, button, or focus management | The total is context, not an action or urgent update; it must not alter keyboard traversal. |

## Data Flow

```text
draft quantity input
  -> CountPage onChange / countDraft
  -> toQuantities(configurations, draft, false)
  -> calculateCountSnapshots(configurations, quantities)
  -> snapshots[currencyIndex].subtotal
  -> fieldset-scoped summary text

Save keeps the same strict conversion and snapshot calculation.
Clear resets only CountDraftState; the same derived summaries return to zero.
```

## Implementation Approach

1. In `CountPage`, give each count fieldset and its heading composition stable, semantic classes (for example `currency-fieldset`, `currency-heading`, and `currency-total`). Keep `<legend>` as the group name and place the single total summary in the same header container. The summary text remains `CODE total: SYMBOLsubtotal CODE`; it must contain no denomination count, aggregate, button, link, ARIA live attributes, or focusable descendant.
2. Preserve every denomination-row input ID, label, `aria-describedby`, validation branch, save handler, and clear handler. Do not extract state or modify `calculateCountSnapshots`, `toQuantities`, the repository, route resolution, history/detail, or receipt rendering.
3. In `styles.css`, style the heading container with a wrapping flex/grid layout, `gap`, `min-width: 0`, and numeric tabular alignment. Ensure the total can wrap rather than clip at narrow widths. Retain the current visible focus outline and contrast tokens.
4. At the existing/new compact media query, apply `position: sticky`, a small `inset-block-start`, opaque page-compatible background, and adequate padding/z-index to the summary. Keep it inside the fieldset; do not add a viewport-fixed ancestor/overlay. At wider widths, omit sticky positioning.
5. At the same compact scope, apply `scroll-margin-block-start` to `.denomination-row input:focus-visible` (or the exact quantity-input selector) at least equal to the summary's maximum reserved height plus the outline offset. Keep the existing generic `:focus-visible` margin as baseline. No `scrollIntoView`, focus call, animation, or live announcement is allowed.

## Interfaces / Contracts

No public TypeScript interface, domain, storage, route, or persisted-record contract changes.

Presentation contract per currency fieldset:

```tsx
<fieldset className="currency-fieldset">
  <div className="currency-heading">
    <legend>{configuration.name} ({configuration.code})</legend>
    <p className="currency-total">{configuration.code} total: <strong>
      {configuration.symbol}{snapshots[currencyIndex].subtotal} {configuration.code}
    </strong></p>
  </div>
  {/* unchanged denomination rows */}
</fieldset>
```

The final markup may use an equally semantic header structure if browser/fieldset layout constraints require it; `<legend>` remains the accessible fieldset name.

## Testing Strategy

| Layer | What to test | Approach |
|---|---|---|
| Component | One total-only summary per `role=group`; independent updates; no aggregate/metadata | Render USD/EUR, change only USD, assert group-scoped totals and stable EUR text; assert no page-level aggregate text. |
| Component a11y | Passive summary and unchanged inputs | Assert no `role=status`/`alert` in groups, no interactive descendants or `tabindex`, and existing labels/descriptions still resolve. |
| Component regression | Clear, valid save, and snapshots | Extend existing two-currency save and clear tests; assert zeroed summaries after clear and unchanged repository snapshots after save. |
| Runtime | Sticky boundary, keyboard clearance, reflow | Add configured `/count/new` setup helper; use compact viewport, enough denominations to scroll, and `page.keyboard.press('Tab')`. Assert focused input bounding box is not fully covered by summary and summary does not remain over the next fieldset. Use `page.setViewportSize` plus 200% CSS-scale/effective narrow-width assertion; confirm no horizontal document overflow. |
| Quality gates | Type/unit/e2e | `npm run typecheck`; `npm test -- --run`; `npm run test:e2e` from `app/`. |

Runtime verification must inspect actual bounding boxes after scrolling: sticky summary stays within its own fieldset, the focused input's visible rectangle is non-zero and not fully intersected by the summary, and the next currency heading is not overlaid. Prefer DOM geometry assertions over screenshots to avoid pixel-diff fragility.

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No migration, feature flag, package, or rollout is required. Keep the authored markup/CSS/tests below the 400 changed-line review budget. Roll back by reverting this isolated presentation/test work unit; calculations, drafts, saves, and records are unchanged.

## No-Change Boundaries

- No aggregate, conversion, exchange rate, metadata, controls, fixed overlay, live region, focus management, or scripted scrolling.
- No modifications to `app/src/domain/**`, `app/src/storage/**`, routing behavior, saved-count details, receipts, or existing OpenSpec artifacts other than this new `design.md`.
- No test-tooling or dependency changes.

## Open Questions

None. The implementation should confirm the exact compact breakpoint and maximum sticky-summary height in the browser runtime test, while keeping both values CSS-owned.
