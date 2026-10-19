# Denomination Settings Specification
## Purpose
**Slice 2.** Provide a separate persistent configuration page after Slice 1, without coupling it to an unsaved count draft or weakening onboarding safeguards.
## Requirements
### Requirement: Separate Persistent Settings Route
The system MUST expose an accessible Settings route/page linked from count/navigation. Users MAY edit persisted currency identity and denominations. It MUST validate required identity, unique codes, and positive whole-number, non-duplicate, non-empty denominations. Invalid fields MUST retain entered values and expose textual, programmatic errors. A valid save MUST update only later counts.
#### Scenario: Save valid settings
- GIVEN valid edited configuration
- WHEN Settings is saved
- THEN later counts use it
- AND prior saved count snapshots remain unchanged
#### Scenario: Reject invalid settings
- GIVEN invalid identity, code, or denomination
- WHEN Settings is saved
- THEN nothing persists and invalid fields are identified
### Requirement: Settings Isolation and Onboarding Continuity
Settings MUST NOT read, clear, or persist an unsaved count's quantities, note, or feedback. It MUST NOT mutate history or snapshots. Existing onboarding and route guards MUST continue to block dashboard and `/count/new` without valid configuration.
#### Scenario: Preserve draft and guards
- GIVEN an unsaved count draft or invalid configuration
- WHEN Settings is opened, saved, or rejected
- THEN the draft/history remain unaffected and invalid access redirects to onboarding
### Requirement: Accessible Mobile Settings
Settings MUST provide landmarks, fieldsets/legends, labels, visible focus, logical keyboard order, native controls, 24px-or-larger targets, and a 200%-zoom-safe layout. Feedback MAY use `role=status`; errors MUST include text, `aria-invalid`, and descriptions.
#### Scenario: Correct by keyboard
- GIVEN a settings error on a narrow viewport
- WHEN the user corrects and saves it by keyboard
- THEN focus and error association remain logical and feedback is perceivable
## Acceptance and Verification
| Criterion | Proof |
|---|---|
| Valid settings persist only configuration | Route/repository test; later count changes, prior snapshot does not |
| Invalid input is recoverable | No persistence; retained values and error linkage tests |
| Isolation and onboarding hold | Draft spies and route-guard regressions |
| Mobile accessibility | Semantic tests; manual keyboard, screen reader, 200% zoom |
## Non-Goals
No inline settings, aggregation/conversion, steppers, history mutation, migration, export, sync, reconciliation, or Task 5.3 change.
