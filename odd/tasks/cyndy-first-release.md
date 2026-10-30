# CYNDY first release
Objective: prepare the first release while preserving existing local work and user-owned decisions.
Branch: feat/cyndy-first-release-app (child of feat/cyndy-first-release); delivery: feature-branch-chain; checks: Vitest, build, Playwright.

## Specs
S1. "hasta aqui considero que estamos listos para el primer reele."
S2. "planifica el camino a seguir para poner en produccion la app y dejarlo todo listo y limpio."
S3. "perfecto. implementemos el plan"

## Tasks
- [x] T1 [S1-S3] Verify candidate and safe upgrade with isolated synthetic data; route: inline; evidence: old note and new title preserved after service-worker upgrade and offline reopen; commit: not applicable.
- [x] T2 [S1-S3] Prepare release documentation, version proposal, rollback and security evidence; route: inline; evidence: README, checklist and release-operation; propose existing 0.1.0; commit: b210830.
- [x] T3 [S1-S3] Review candidate, run final checks and prepare reviewable commits preserving unrelated changes; route: inline; delivery: tracker b210830 and child 1810801; independent verification passed; commit: 1810801.
- [~] T4 [S1-S3] Prepare authorized push and PRs; production merge requires separate authorization; route: inline; issue #52 approved; Android update accepted; commit: pending.
- [ ] T5 [S1-S3] Verify deployment and propose safe cleanup; route: inline; commit: pending.

## Log
L1. "perfecto. implementemos el plan"
L2. Existing unrelated modification `.atl/skill-registry.md` must be preserved and excluded. Production and cleanup remain separate user decisions per the approved plan. Existing local candidate predates this feature document.
L3. Isolated Chromium upgrade test passed with a legacy synthetic note and new titled record surviving reload and offline reopening; initial attempt timed out because the test reloaded before controllerchange, corrected by waiting for that event. Physical-device upgrade remains unverified.
L4. Isolated Chromium rollback and re-upgrade preserved both records, the legacy note and the new title. GitHub reports public repository, no open PRs, and successful latest main CodeQL. Release numbering and token rotation confirmation remain user decisions.
L5. Final checks: 88 automated tests, production build, 10 browser tests and git diff --check passed. Candidate exceeds approximately 400 authored changed lines including documentation. No publication authorized yet.
L6. User selected: "Cadena con rama de seguimiento (recomendada)". Tracker documentation commit b210830 (native assessment passive); child application commit 1810801 (native medium, escalated high for data compatibility, 401 changed lines). Independent verifier passed 88 unit tests, build, 10 E2E tests and legacy-note offline probe. Remote PRs and publication still require separate authorization.
L7. "mantener el 0.1.0"
L8. "hecho, token revocado"
L9. User confirmed Android synthetic test: "listo, se actualizo" and "si" to old note and new titled count remaining visible after offline reload. Incognito test was separate from production.
L10. User authorized pushing branches and opening PRs: "vamos con todo !!!! xd". Issue-first policy requires an approved issue; previous issues did not cover this release. Merge remains separately gated.
L11. "Autorizo crear el issue y aplicar status:approved"; issue #52 created and verified with that label. Local branches renamed to feat/cyndy-first-release and feat/cyndy-first-release-app to satisfy the PR branch convention.
