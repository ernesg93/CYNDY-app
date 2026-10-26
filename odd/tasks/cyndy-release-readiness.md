# CYNDY Release Readiness

Scope: verify and resolve release-readiness items that can be completed locally without external account changes or a physical device. Preserve all pre-existing working-tree changes.

## Specs

S1. "planifica una puesta en punto del proyecto, resolviendo los puntos pendientes"

S2. "realiza tu los puntos que esten a tu alcance."

## Tasks

- [ ] T1 [S1, S2] Establish a reproducible local baseline: inspect project guidance, install locked dependencies, and run the documented automated checks. **Status: blocked by explicit user decision** — dependencies are installed and unit/type/build checks pass; Playwright Chromium is absent and E2E was deferred. Commit: not applicable — pre-existing working tree must remain uncommitted.
- [-] T2 [S1, S2] Reproduce and correct any deterministic local failures, with focused tests and regression checks. **Dropped:** no deterministic local failure was observed. Commit: not applicable unless a new isolated change can be separated safely.
- [x] T3 [S1, S2] Produce release-readiness evidence for the checks that can run locally; document remaining user-owned GitHub/host and device/screen-reader validations with an executable protocol. Evidence: `odd/cyndy-release-readiness/evidence.md`. Commit: not applicable — evidence documents must not overwrite pre-existing work without proof.
- [x] T4 [S1, S2] Run static repository-hygiene checks that do not need installed npm dependencies: Git whitespace/errors, tracked sensitive-file patterns, lockfile JSON parsing, and workflow/configuration review. Evidence: `odd/cyndy-release-readiness/evidence.md`. Finding: broad pre-existing CRLF/trailing-whitespace failure; do not normalize incidentally. Commit: not applicable — read-only audit.
- [x] T5 [S1, S2] Analyze and integrate the one missing `origin/main` commit only when Git proves the pre-existing working tree is preserved; do not use stash, reset, or forced operations. Evidence: fast-forwarded `fc42b19` to `dc00504` only after Git proved both commits have the same tree. Commit: inherited upstream merge only.
- [x] T6 [S1, S2] Define and apply a reviewable CRLF normalization policy after upstream integration, with `.gitattributes`, a narrow diff, and source/test verification when dependencies become available. Evidence: `.gitattributes`; both staged and unstaged `git diff --check` pass. Commit: separate hygiene work unit.
- [x] T7 [S2] Stop tracking the generated `.atl/skill-registry.md` cache while preserving the local file under the existing `.atl/` ignore rule. Evidence: `git rm --cached` staged the repository removal; `.gitignore` retains the local cache. Commit: separate repository-hygiene work unit.
- [x] T8 [S2] Review, commit in isolated work units, and push the approved repository changes; exclude the incidental `npm ci` lockfile rewrite. Evidence: `20accba`, `6e29749`, and `1dfc79d` were pushed to `origin/stabilize/cyndy-baseline`; tracking divergence is `0 0`. Commit: final tracking update pending.

## Log

L1. "planifica una puesta en punto del proyecto, resolviendo los puntos pendientes"

L2. "realiza tu los puntos que esten a tu alcance."

L3. User selected: "Ambos, en orden seguro" — integrate `origin/main` first, then isolate CRLF normalization.

L4. "si" — user approved removing the generated `.atl/skill-registry.md` from Git tracking while retaining its local cache.

L5. User-provided baseline evidence: `npm ci` succeeded; 67 unit tests passed; typecheck and production build passed; all six E2E cases are blocked before execution because Playwright Chromium is not installed.

L6. User selected: "Dejar E2E pendiente".

L7. "bien, comit y push" — user approved the recommended exclusion of the incidental lockfile rewrite, conventional commits, and push of the reviewed work.

L8. Push was attempted once and failed before publication: GitHub HTTPS credentials are unavailable (`could not read Username`).

L9. GitHub CLI authentication was completed interactively; the authorized retry created `origin/stabilize/cyndy-baseline` and published the three reviewed commits.