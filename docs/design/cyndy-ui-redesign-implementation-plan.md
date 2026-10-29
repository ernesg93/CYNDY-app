# CYNDY redesign implementation plan

This plan translates the four approved Android-first design artifacts into small, reviewable application slices. It preserves CYNDY as a self-contained module: no simulated parent host, no cloud features, and no new print workflow.

## Quick path

1. Implement the shared shell and navigation contract.
2. Translate Dashboard, Count, History, then Settings/reset without changing their data semantics.
3. Run the final offline and print regression gate.

## Decisions carried forward

| Topic | Decision |
| --- | --- |
| Mobile navigation | Bottom navigation remains Count, History, and Settings. The existing Dashboard/Home route remains a visible **icon-only** module action in the header, with an accessible name; it is not hidden or replaced by an imagined host. |
| Theme and language | Add the approved icon-only theme control and local ES/EN selector. Derive the initial locale from the browser with Spanish fallback; persist both locally. |
| Module boundary | CYNDY owns these controls and routes. A future host owns global identity and module switching. |
| Printing | Do not add print controls for unsaved counts or list cards. Preserve the existing saved-record receipt printing route and its stylesheet. |

## Slices

### 1. Shared shell, tokens, and navigation

**Files:** `app/src/routes/app-routes.tsx`, `app/src/styles.css`, `app/index.html`, `app/public/manifest.webmanifest`, `app/src/routes/app-routes.test.tsx`, `app/src/pwa/pwa.test.ts`.

- Apply Android-first 320/360 px layout tokens, safe-area bottom spacing, visible focus, and 44 px touch targets.
- Add the accessible icon-only theme control and local ES/EN control without altering the service-worker lifecycle.
- Keep the skip link, `<main>` focus on navigation, direct routes, browser back/forward, Dashboard/Home action, and bottom navigation mappings.

**Checks:** shell landmark/skip-link/focus regression; navigation route mapping; responsive no-horizontal-overflow coverage; manifest and offline-announcement regression.

### 2. Dashboard welcome and local statistics

**Files:** `app/src/routes/app-routes.tsx`, `app/src/styles.css`, `app/src/routes/history-routes.test.tsx`.

- Translate the approved welcome surface using only current local facts: start-count action, latest saved count, saved-record total, and per-currency record counts.
- Preserve the current latest-record selection, newest-first ordering, separate currencies, loading/error states, and protected reset flow. Do not add charts, trends, converted aggregates, cloud, user accounts, export, search, or filters.

**Checks:** latest-count link and snapshot summary; saved-count/per-currency record statistics; empty state; records-read failure; reset behavior remains unchanged.

### 3. Count workflow

**Files:** `app/src/routes/app-routes.tsx`, `app/src/styles.css`, `app/src/routes/app-routes.test.tsx`, `app/e2e/routes.spec.ts`.

- Translate each row to the fixed denomination × quantity = subtotal grammar with comparable boxes, fixed operator columns, right-aligned tabular numerals, dense spacing, and numeric-only denomination/subtotal displays.
- Keep native numeric inputs, labels, fieldsets/legends, linked validation errors, per-currency independent passive sticky totals, unsaved drafts, and Save/Clear behavior.

**Checks:** semantic labels and errors; calculation and independent-currency regressions; stable geometry with different digit widths; mobile/200% zoom focus and overflow checks.

### 4. History list and empty state

**Files:** `app/src/routes/app-routes.tsx`, `app/src/styles.css`, `app/src/routes/history-routes.test.tsx`, optionally `app/e2e/routes.spec.ts`.

- Render the approved local-record cards and empty state using semantic list, time, and per-currency summary markup.
- Preserve newest-first local records, immutable saved snapshots, loading/error states, detail-link encoding, and the empty-state path to a new count.

**Checks:** record order, time and currency summaries, empty-state action, detail links, and storage-read failure.

### 5. Settings, repair flow, and reset confirmation

**Files:** `app/src/routes/app-routes.tsx`, `app/src/styles.css`, `app/src/routes/app-routes.test.tsx`, `app/src/routes/history-routes.test.tsx`.

- Apply the approved repair-form error treatment and reset-dialog visual hierarchy.
- Preserve stored-configuration repair, duplicate validation, focus on the first invalid field, locally persisted settings for future counts only, draft retention, both reset stages, safe cancel focus, failure recovery, and deletion scope.

**Checks:** repair/persistence/draft coverage; field error association; first-invalid focus; dialog cancel focus restoration; reset success and failure.

### 6. PWA and print regression gate

**Files:** primarily `app/src/pwa/pwa.test.ts`, `app/e2e/offline.spec.ts`, `app/src/receipts/receipt.test.tsx`; adjust global style or metadata only when needed by earlier slices.

- Confirm cached navigation continues using the non-redirected offline shell and no new runtime caching behavior appears.
- Confirm existing saved-record printing remains usable and global tokens do not leak into print styling.

**Checks:** PWA unit tests, deferred-where-unavailable offline browser evidence, receipt print test, and print CSS source smoke check.

## Explicit exclusions

- No parent-program UI or module switcher.
- No cloud, authentication, export, search, filters, UUID display, or synchronization.
- No print workflow for unsaved counts and no new list-level print affordance.
- No alteration to IndexedDB data format, snapshot semantics, currency conversion, or combined totals.

## Pending design addition

The Dashboard is a real current route and data surface, not an unknown future-host screen. It needs a dedicated Android-first visual slice before implementation planning can be approved. It should present only existing local facts: a welcome, start-count action, the latest saved count, saved-count total, and per-currency record counts.

## Review gate

Application changes start only after the user approves the revised plan and the new Dashboard visual slice. Each slice then remains independently reviewable and must retain its existing behavioral, accessibility, offline, and print tests.
