# Sticky Currency Totals Specification

## Purpose

Keep an individual currency subtotal visible while its denomination rows are being entered, without changing counting semantics, persisted data, or existing actions.

## Requirements

### Requirement: Fieldset-Scoped Total-Only Summary

The system MUST render one compact summary for each active currency fieldset beside its heading. The summary MUST identify that fieldset's currency with its symbol, subtotal, and code, and MUST show only that currency's subtotal. It MUST NOT present a combined, converted, or cross-currency aggregate, denomination-count metadata, or any control.

#### Scenario: Independent currency summaries

- GIVEN two active currency fieldsets with distinct calculated subtotals
- WHEN both fieldsets are rendered
- THEN each heading has exactly one summary with only its own symbol, subtotal, and code
- AND no page-level or cross-currency total is shown

#### Scenario: Subtotal changes in one fieldset

- GIVEN summaries for two active currencies
- WHEN a quantity in one currency is changed
- THEN only that currency's displayed subtotal reflects its current calculated subtotal
- AND the other summary remains scoped to its own subtotal

### Requirement: Compact In-Flow Sticky Behavior

At the compact breakpoint, each summary MUST remain in normal document flow and MUST stick only within its own currency fieldset while that fieldset is scrolled. At wider layouts, the summary MUST remain visible beside the heading without behaving as a viewport-fixed overlay. The layout MUST wrap or size safely without horizontal loss at narrow widths or 200% zoom.

#### Scenario: Compact fieldset scrolling

- GIVEN a compact viewport and a fieldset taller than the viewport
- WHEN the user scrolls through its denomination rows
- THEN that fieldset's summary remains visible within its fieldset bounds
- AND it does not overlap another fieldset as a fixed overlay

#### Scenario: Reflow at 200% zoom

- GIVEN a narrow viewport at 200% browser zoom
- WHEN a fieldset heading and summary reflow
- THEN symbol, subtotal, and code remain readable without horizontal clipping or overlap

### Requirement: Passive Accessible Presentation

The summary MUST be noninteractive: it MUST NOT receive focus, alter tab order, create a keyboard action, move focus, or announce updates through an ARIA live region. It MUST expose its currency subtotal as ordinary readable text, preserve the fieldset's accessible name and labelled quantity inputs, and maintain sufficient text and focus-indicator visibility for surrounding controls.

#### Scenario: Keyboard traversal

- GIVEN keyboard focus begins before a currency fieldset
- WHEN the user tabs through its controls
- THEN focus moves only through the existing interactive controls in document order
- AND the summary is not a tab stop or live announcement

### Requirement: Focus-Safe Scroll Clearance

The system MUST provide scroll clearance for focused quantity inputs such that the fieldset's sticky summary does not fully obscure the focused input at compact widths, including 200% zoom. It MUST NOT programmatically scroll or manage focus.

#### Scenario: Focus below a sticky summary

- GIVEN a compact, scrolled fieldset at 200% zoom
- WHEN keyboard navigation focuses a quantity input near the summary
- THEN the focused input remains visibly identifiable and not fully covered by the summary
- AND focus remains on the input without scripted relocation

### Requirement: Counting Behavior Preservation

The summary MUST derive from the existing per-currency calculated subtotal and MUST NOT add state, conversion, aggregation, storage, route, or domain behavior. Direct denomination rows, clear-unsaved-count, save, and saved snapshots MUST retain their existing behavior and values.

#### Scenario: Clear, save, and snapshot preservation

- GIVEN entered denomination quantities and their per-currency summary
- WHEN the user clears unsaved values, saves, or views a saved snapshot
- THEN each existing action retains its prior result and data contract
- AND the summary reflects only the existing current per-currency subtotal where it is displayed

### Requirement: Runtime Acceptance

The change MUST be accepted only when focused unit/component tests cover summary isolation, total-only content, passive accessibility, and clear/save/snapshot preservation; and applicable Playwright runtime checks cover compact scrolling, keyboard focus clearance, narrow reflow, and 200% zoom. Existing type checking and the configured Vitest and Playwright suites MUST pass.

#### Scenario: Acceptance suite

- GIVEN the implemented change
- WHEN the configured type check, Vitest suite, and applicable Playwright checks run
- THEN all checks pass
- AND no test observes an aggregate, interactive summary, focus obstruction, or changed counting action

## Non-Goals

- Aggregation, conversion, exchange-rate logic, count metadata, persistence, domain, storage, or route changes.
- Fixed/viewport overlays, focus management, live-region announcements, or summary controls.
- Changes to direct rows, local clear, save, snapshots, or unrelated OpenSpec change artifacts.
