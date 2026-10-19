# Apply Progress: Improve Denomination Counting

**Mode**: Standard globally; RED/GREEN required and followed for both work units.
**Current branch**: `feat/improve-denomination-counting-wu2` from refreshed `origin/main` `bd97843` after Work Unit 1 merged.

## Completed
- [x] Work Unit 1: direct denomination rows, independent totals, integer validation, local Clear, and responsive/focus styles.
- [x] 1.1 Baseline/non-goals recorded in approved issue #29.
- [x] 1.3 and 1.4 RED Settings lifecycle and routing-threat coverage.
- [x] 3.1 Accessible `/settings` route and primary navigation entry; invalid configuration remains repairable there while `/` and `/count/new` retain onboarding guards.
- [x] 3.2 Settings maps stored configuration into the reused form/validation/storage path and retains invalid values with linked errors.
- [x] 3.3 Settings persistence is isolated from count drafts/history; later counts use edits and prior snapshots remain immutable.
- [x] 3.4 Focused/full tests, typecheck, build, E2E, keyboard/focus, narrow viewport, and 200% zoom checks pass.

## RED/GREEN Evidence
| Phase | Command | Result |
|---|---|---|
| RED | `npm test -- --run src/routes/app-routes.test.tsx` | Expected failure: 6 failed, 19 passed; Settings route/navigation/page absent. |
| GREEN | `npm test -- --run src/routes/app-routes.test.tsx` | 1 file, 25 tests passed. |
| Full | `npm test -- --run` | 7 files, 64 tests passed. |
| Typecheck | `npm run typecheck` | Passed. |
| Build | `npm run build` | Passed; Vite production build completed. |
| E2E | `npm run test:e2e` | 4 Playwright tests passed. |
| Hygiene | `git diff --check` | Passed across implementation and hybrid artifacts. |

## Work Unit Evidence
| Evidence | Result |
|---|---|
| Focused test command and exact result | `npm test -- --run src/routes/app-routes.test.tsx` → 25/25 passed. |
| Runtime harness | Vite + Playwright MCP: at 320×720, `/settings` exposed semantic navigation/landmarks and 44px controls; duplicate denominations produced linked text error and focused the invalid field; keyboard correction + Enter focused `Settings saved.`; `/count/new` then exposed only the edited `$10`/`$20` denominations. CSS 200% zoom at 1280px had no horizontal overflow (1265/1265). |
| Rollback boundary | Revert Settings additions in `app/src/routes/app-routes.tsx`, focused tests in `app/src/routes/app-routes.test.tsx`, and this unit's progress/task marks. Existing configuration keys and saved count snapshots remain readable; no schema/history rollback. |

## Delivery
- Work Unit 2 candidate diff: 162 insertions + 13 deletions = 175 authored changed lines.
- Approved issue: #29 (`status:approved`).
- Work Unit 1 remains independently merged; Task 5.3 and reset/delete behavior are untouched.
- Commit `ed2addd` was pushed and PR #30 opened against `main` with exactly one `type:feature` label; required checks are pending.
