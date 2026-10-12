# Count Receipts Specification

## Purpose

Produce a portable record of a saved count through browser print and PDF workflows.

## Requirements

### Requirement: Count-Focused Receipt Output

The system MUST generate a receipt with a saved count's entry snapshot, per-currency subtotals, timestamp, and optional note. It MUST NOT include conversion, cross-currency aggregate, expected value, variance, shift, or reconciliation language.

#### Scenario: Generate a receipt

- GIVEN a saved count with entries and an optional note
- WHEN the user requests its receipt
- THEN the output reflects the saved snapshot and note

### Requirement: Browser PDF and Print Delivery

The system MUST support browser print and browser PDF save/share. Receipt generation SHOULD allow future destinations, but v1 MUST NOT directly implement Bluetooth or ESC-POS printing.

#### Scenario: Save or share as PDF

- GIVEN a receipt is open in a supported browser
- WHEN the user invokes print or save/share as PDF
- THEN the browser provides its native delivery workflow

#### Scenario: Unsupported printer integration

- GIVEN the user views receipt delivery choices in v1
- WHEN the user looks for Bluetooth or ESC-POS printing
- THEN no direct device-printer integration is offered
