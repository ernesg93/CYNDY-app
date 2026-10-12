# Proposal: Rebuild CYNDY as an Offline Mobile Counter

## Intent

Rebuild CYNDY in a locally controlled codebase as an Android-first, offline-first money-counting tool. It must support fast, free-form counts whenever needed—not register closing, shift handoff, or reconciliation—without authentication or cloud availability.

## Scope

### In Scope
- Mobile-first PWA shell, installability, and offline application access.
- Local settings, denomination configuration, free-form count entry, totals, and durable local history.
- A dashboard that starts a count or resumes useful local context without shifts, drawers, expected totals, or close-out language.
- Count detail and receipt/PDF output that describe only the recorded count, denominations, total, timestamp, and optional note.
- A full local-data reset protected by double confirmation.

### Out of Scope
- Local export/import, data portability, recovery UX, cloud authentication, sync, migration from Supabase, multi-user collaboration, or backup. Cloud sync/backup are later evolutions.
- Cash-register balancing, expected-versus-actual comparisons, shift management, reconciliation, or handoff workflows.
- Direct Bluetooth/ESC-POS printing and native Android packaging; browser/PDF output remains the v1 boundary.

## Capabilities

### New Capabilities
- `offline-mobile-shell`: installable, offline-capable mobile application shell.
- `local-counting`: configurable denomination counting and free-form saved count records.
- `local-count-history`: local history, detail retrieval, and double-confirmed full-data reset.
- `count-receipts`: count-focused browser/PDF receipts with no reconciliation semantics.

### Modified Capabilities
- None.

## Approach

Build a clean-room React/TypeScript PWA with IndexedDB as the authoritative device-local v1 store. Model each count as an independent snapshot of its entries, total, timestamp, and optional note; derive dashboard and history views from those records. Establish behavior fixtures/specifications from the observed product and a reproducible source/build baseline for the new local codebase; no inaccessible Lovable source export is required.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `app/` (new local codebase) | New | Mobile UI, count domain, storage, PWA, reset guard, and receipts. |
| `openspec/specs/` | New | Capability specifications for v1 behavior. |
| `openspec/changes/rebuild-cyndy-mobile-offline/` | Modified | Design, tasks, and verification artifacts. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Device-local data loss | Med | Document the v1 boundary; defer backup/sync; test persistence and reset confirmation. |
| Accidental full-data reset | Low | Require two explicit confirmations before clearing local data. |
| Offline cache defects | Med | Test cold-start and offline install paths on Android. |
| Workflow drift toward reconciliation | Med | Specify neutral language and prohibit comparison/closure features. |

## Rollback Plan

Keep the existing deployed CYNDY untouched. Revert the new local release to the prior tested build; v1 records remain device-local.

## Dependencies

- Complete behavior fixtures/specifications of the observed product and establish a reproducible source/build baseline for the new local codebase before implementation.

## Success Criteria

- [ ] A user can install, open offline, configure denominations, save, and reopen independent device-local counts on Android.
- [ ] Dashboard, history, and receipts never require or imply a shift, close-out, expected total, or reconciliation.
- [ ] Every saved record and receipt consistently shows its entries, computed total, timestamp, and optional note.
- [ ] Full local-data reset clears data only after double confirmation; v1 provides no export/import, portability, or recovery UX.
