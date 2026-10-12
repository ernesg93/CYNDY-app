# Local Count History Specification

## Purpose

Surface locally saved counts and protect destructive local-data actions.

## Requirements

### Requirement: Dashboard and History Retrieval

The dashboard MUST show the latest count and simple local statistics without cross-currency aggregation. History and detail MUST show each snapshot, timestamp, and note without shift, close-out, expected-total, or reconciliation semantics.

#### Scenario: View the latest count

- GIVEN one or more counts exist locally
- WHEN the user opens the dashboard
- THEN the latest count and simple non-converted statistics are shown

#### Scenario: View historical detail

- GIVEN a saved count exists
- WHEN the user selects it from history
- THEN its immutable entries, per-currency subtotals, timestamp, and current note are shown

### Requirement: Confirm Destructive Actions

The system MUST confirm single-count deletion and require two explicit confirmations to reset all local settings and counts. Cancellation MUST preserve data.

#### Scenario: Cancel deletion

- GIVEN the user chooses to delete a historical count
- WHEN the user cancels confirmation
- THEN the count remains available

#### Scenario: Confirm deletion

- GIVEN the user confirms deletion for one historical count
- WHEN the confirmation completes
- THEN only that count is removed

#### Scenario: Double-confirm reset

- GIVEN local settings or counts exist
- WHEN the user completes both reset confirmations
- THEN all local settings and count data are cleared
