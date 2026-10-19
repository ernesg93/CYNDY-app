# Delta for Local Counting

**Slice 1.** This change depends on the current guarded `/count/new` flow, `calculateCountSnapshots`, and immutable IndexedDB count records. Slice 2 Settings MUST NOT be needed to clear or save a draft.

## MODIFIED Requirements

### Requirement: Valid Editable Configuration

The system MUST persist local currency settings with editable name, symbol, and code. Denominations MUST be positive integers. It MUST reject missing identity or an empty denomination set with textual field errors. Count navigation MUST remain blocked until every configured currency is valid. Editing MUST be available only on the separate denomination-settings route, not in a count draft.
(Previously: onboarding was the only configuration editor.)

#### Scenario: Preserve guarded configuration
- GIVEN any configured currency is invalid
- WHEN the user opens the dashboard or `/count/new`
- THEN onboarding is shown with its explanatory status

#### Scenario: Exclude inline configuration
- GIVEN the New count screen
- WHEN a user reviews its controls
- THEN denomination configuration editing is absent

### Requirement: Free-Form Multi-Currency Counts

The system MUST show each configured denomination as a direct row: denomination, native numeric quantity, and live `denomination × quantity` subtotal. Inputs MUST use `min=0`, integer validation, numeric input mode, and MUST NOT provide steppers or a keypad. Each currency MUST display a prominent independent subtotal; the system MUST NOT convert currencies or show a cross-currency aggregate.
(Previously: independent subtotals were required, without direct live rows or input constraints.)

#### Scenario: Count currencies independently
- GIVEN two valid currencies
- WHEN quantities change
- THEN their rows and own subtotals update
- AND no aggregate or conversion appears

#### Scenario: Reject an invalid quantity
- GIVEN a negative, fractional, or unsafe-integer quantity
- WHEN Save count is activated
- THEN textual feedback appears and no record is created

## ADDED Requirements

### Requirement: Clear Unsaved Count Draft

Clear count MUST immediately clear only unsaved quantities, note, and count feedback. It MUST NOT call storage; alter configuration, saved records, or history; or mutate snapshots.

#### Scenario: Clear locally
- GIVEN an unsaved populated draft and feedback
- WHEN Clear count is activated
- THEN inputs and feedback are empty, row totals are zero
- AND repository persistence methods receive zero calls

### Requirement: Accessible Mobile Counting

The screen MUST retain fieldsets/legends, labels, visible focus, logical keyboard order, native controls, 24px-or-larger targets, and 200%-zoom-safe independent totals. Concise feedback MAY use `role=status`; row changes MUST NOT be individually announced. Errors MUST have text, invalid state, and descriptions.

#### Scenario: Count without a pointer
- GIVEN keyboard or assistive technology on a narrow viewport
- WHEN a user enters and clears a count
- THEN controls, focus, labels, and totals remain operable and readable

## Acceptance and Verification

| Criterion | Proof |
|---|---|
| Live rows; no aggregation | Two-currency route test |
| Clear is draft-only | Repository spies; unchanged settings/snapshots |
| Snapshot integrity | Existing save/history tests remain green |
| Accessibility | Semantic tests; manual keyboard, screen reader, 200% zoom |

## Non-Goals

No conversion/aggregation, steppers, keypad, inline settings, history mutation, schema or saved-record semantic change, reconciliation, export, sync, or Task 5.3 change.
