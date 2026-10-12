# Local Counting Specification

## Purpose

Configure local currencies and denominations, then save independent cash counts.

## Requirements

### Requirement: Valid Editable Configuration

The system MUST persist local currency settings with editable name, symbol, and code. Denominations MUST be positive integers. It MUST reject missing currency identity or an empty denomination set and identify invalid fields in text.

#### Scenario: Save a valid denomination set

- GIVEN a currency has a name, symbol, code, and positive-integer denominations
- WHEN the user saves configuration
- THEN the revised configuration is available to later counts

#### Scenario: Reject an invalid denomination

- GIVEN the user enters zero, a negative value, or a non-integer denomination
- WHEN the user attempts to save
- THEN configuration is not saved and the invalid input is identified

### Requirement: Free-Form Multi-Currency Counts

The system MUST support free-form counts for several active currencies in one record with independent subtotals. It MUST NOT convert currencies or present a cross-currency aggregate.

#### Scenario: Count two active currencies

- GIVEN two currencies are active
- WHEN the user enters denomination quantities for both
- THEN each currency shows its own computed subtotal and no combined total

### Requirement: Immutable Local Count Snapshots

The system MUST persist each count locally with its entry snapshot, per-currency subtotals, automatic timestamp, and optional note. Entries and subtotals MUST remain unchanged; the note MAY be edited.

#### Scenario: Preserve a saved count

- GIVEN a count has been saved
- WHEN configuration is later changed
- THEN the saved entries, subtotals, and automatic timestamp remain unchanged

#### Scenario: Edit a saved note

- GIVEN a saved count exists
- WHEN the user edits its note
- THEN the note changes without changing its entries or subtotals
