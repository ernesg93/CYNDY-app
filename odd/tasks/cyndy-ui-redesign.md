# CYNDY UI redesign

Status: design phase. Branch: `design/cyndy-module-shell`. Scope is visual and interaction design before source implementation.

## Specs

S1. "tenemos una deuda grande con la interfaz."

S2. "para este trabajo me gustaria que nos enfocaramos en el diseno (color, formas, distribucion, ...)."

S3. "hagamoslo paso a paso."

S4. "mantenemos el enfoque Android-first para produccion, donde estere revisando el resultado desde mi telefono."

S5. "tener en cuenta el cabio de color (tema) que haremos con un boton que no tenemos en estos momentos."

S6. "con bilingue me referia a tener otro boton que permita cambiar el idioma"

S7. "CYNDY es el nombre de la contadora" and "esta contadora sera parte (modulo) de un programa".

S8. "Módulo preparado, host futuro"; do not simulate unimplemented parent-program modules.

S9. Use OpenPencil when feasible: `https://openpencil.dev/es/download` and `https://github.com/open-pencil`.

S10. "en el boton de cambio de tema se puede presindir del texto (dejar solo el icono)."

S11. "en un futuro implementaremos la funcion de imprimir conteo ya sea directamente desde uno sin guardar como uno guardado."

S12. "minimizar el espaciado entre filas para que no desperdiciemos espacio vertical."

S13. "en los conteos parciales que teniamos no me gustaba que los espacios se autoajustaran segun el tamano de las cifras."

S14. "el bloque donde se escribe la nota deberia tener un borde mas circular."

S15. "[_D] x [__C] = [___S]" where "D" is denomination, "C" is quantity, and "S" is subtotal; denomination, quantity, and subtotal must have comparable containers while `x` and `=` align in their own visual columns.

S16. "los mumeros alienados a la derecha en sus respectivos contenedores y que no se muestre los simbolos de las monedas tanto en denominacion como en subtotal (solo numeros)"

S17. "quedamos que serian solo el icono en el encabezado, sin nombre."

S18. "si, prepara el prototipo"

S19. "centraras en todas las partes lo correspondiente al favicon + CYNDY (nombre de la app)."

## Tasks

- [x] T1 [S1-S9] Produce and validate the mobile-first CYNDY module-shell design brief, host-boundary contract, and OpenPencil working approach. Evidence: `docs/design/cyndy-module-shell-brief.md`; OpenPencil CLI v0.16.0 headless artifact workflow verified. Commit: pending.
- [x] T2 [S1-S6, S10] Create the Android-first shell prototype for CYNDY: module header, icon-only theme and language controls, and internal navigation. Evidence: `design/cyndy-module-shell/index.html`, `cyndy-module-shell.fig`, and `cyndy-module-shell-browser-preview.png`; OpenPencil lint: 0 errors, 0 warnings. Commit: pending.
- [x] T3 [S1-S6, S12-S16] Design the mobile count workflow and its responsive expansion without adding reference-only functionality. Evidence: `design/cyndy-count-workflow/index.html`, `cyndy-count-workflow.fig`, `cyndy-count-browser-preview.png`, and `cyndy-count-320-preview.png`; OpenPencil lint: 0 errors, 0 warnings; user-approved. Route: OpenPencil design artifact. Commit: pending.
- [x] T4 [S1-S8] Design History list and empty states as the next reviewable mobile slice. Evidence: `design/cyndy-history-workflow/index.html`, `cyndy-history-workflow.fig`, and `cyndy-history-browser-preview.png`; OpenPencil lint: 0 errors, 0 warnings; user-approved. Route: OpenPencil design artifact. Commit: pending.
- [x] T5 [S1-S8, S11] Design Settings, error, confirmation, and future print-adjacent states as a separate reviewable slice. **Status: approved.** Evidence: `design/cyndy-settings-workflow/index.html`, `cyndy-settings-workflow.fig`, and `cyndy-settings-browser-preview.png`; OpenPencil lint: 0 errors, 0 warnings; user approved it on 2026-03-30. Route: OpenPencil design artifact. Commit: pending.
- [x] T6 [S1-S8, S17, S19] Translate approved design into reviewable implementation slices with accessibility and behavior-preservation checks. **Status: approved.** Evidence: `docs/design/cyndy-ui-redesign-implementation-plan.md`; user authorized implementation on 2026-03-30. Proposed order: shared shell/navigation, Dashboard, Count, History, Settings/reset, then PWA/print regression gate. Route: application source. Commit: `6ae09ee`.
- [x] T7 [S1-S8, S17-S19] Create and validate a separate Android-first Dashboard visual prototype for user review. **Status: approved.** Evidence: `design/cyndy-dashboard-workflow/index.html`, `design.json`, and `cyndy-dashboard-browser-preview.png`; Chromium render and manifest validation passed. OpenPencil import/lint is unavailable in the current environment, so the `.fig` artifact remains pending. Route: OpenPencil design artifact. Commit: `420d472`.
- [x] T8 [S1-S8, S19] Center the favicon plus CYNDY module name in the header across every approved design slice while retaining the icon-only Home action on the left and theme/language controls on the right. **Status: approved.** Evidence: regenerated Chromium previews for shell, Count (including 320 px), History, and Dashboard; `git diff --check` passed. The Settings source was updated and opened directly because headless Chromium captures its open native dialog as a blank PNG. Route: OpenPencil design artifact. Commit: included in per-slice design commits.
- [x] T9 [S1-S8, S17, S19] Implement the shared application shell: responsive visual tokens, icon-only Home control, theme and locale preferences, and internal navigation while preserving route and accessibility contracts. **Status: verified.** Evidence: focused shell tests, `npm run typecheck`, `npm run build`, and deterministic full suite (68/68) passed; normal parallel suite remains timing-sensitive. Route: `app/src/routes/app-routes.tsx`, `app/src/styles.css`, app metadata, and focused tests. Commit: pending.
- [x] T10 [S1-S8, S17, S19] Implement the approved Dashboard welcome and existing local statistics without expanding data semantics. **Status: verified.** Evidence: history-route tests, deterministic full suite (68/68), production build, and `git diff --check` passed. Route: dashboard route, styles, history-route tests. Commit: pending.
- [x] T11 [S1-S6, S12-S16, S19] Implement the fixed Count row grammar and approved visual hierarchy while preserving calculation and native-control behavior. **Status: verified.** Evidence: focused tests, deterministic full suite (68/68), production build, and `git diff --check` passed. Route: count route, styles, route tests. Commit: pending.
- [x] T12 [S1-S8, S19] Implement the approved History cards and empty state while preserving stored-record behavior. **Status: verified.** Evidence: focused History route tests observed RED then GREEN; deterministic full suite (68/68), typecheck, production build, and `git diff --check` passed. Route: history route, styles, history-route tests. Commit: pending.
- [x] T13 [S1-S8, S11, S19] Implement Settings repair and reset visual hierarchy while preserving validation and confirmations. **Status: verified.** Evidence: focused History/settings/reset route tests observed RED then GREEN (14/14); deterministic full suite (72/72), typecheck, production build, and `git diff --check` passed. Repair-form field errors remain linked and receive focus; reset retains both confirmation stages, safe cancel focus restoration, failure feedback, and local-only reset semantics. No future printing behavior was added. Route: settings/dashboard route, styles, tests. Commit: pending.
- [x] T14 [S1-S8, S11] Run the PWA/offline/print regression gate after visual slices are integrated. **Status: verified.** Evidence: deterministic focused PWA and receipt tests (8/8) passed; cached navigation remains rooted at `/`; saved-receipt printing remains available and print CSS hides navigation/actions. No saved/unsaved future count-print feature or mock was added. Playwright E2E remains explicitly deferred because Chromium is absent. Route: focused tests and styles only if needed. Commit: pending.

## Log

L1. User request verbatim: "perfecto. a continuacion empezaremos a trabajar en la parte de diseno porque tenemos una deuda grande con la interfaz. tengo pensado que utilizemos si es posible la ayuda de (https://openpencil.dev/es/download ; https://github.com/open-pencil). ... Como referencia me gustaria usar la contadora que hemos realizado paralelamente a esta en el sitio https://cyndy.lovable.app/contar. esta tiene otras implementaciones que no hemos realizado pero para este trabajo me gustaria que nos enfocaramos en el diseno (color, formas, distribucion, ...). ... bamos a planificar bien y con calma los siguientes pasos."

L2. User chose an operational design direction with a theme-change button and a neutral Spanish/English language selector.

L3. User confirmed Android-first production review on a phone; desktop captures were only easier to share from the current PC.

L4. User clarified that CYNDY is the counter module within a future program. Current work prepares a module for a future host and does not simulate unknown parent-program navigation.

L5. User authorized the first design step: "hagamoslo".

L6. User validated the brief direction and authorized the first visual prototype: "avancemos".

L7. T2 produced two 360 px shell states: dark Spanish Count and light English History. OpenPencil imported and linted the document with 0 errors and 0 warnings; its raster export misrendered CSS variables, so Chromium produced the review PNG from the same mock source.

L8. User approved the direction and requested an icon-only theme-control label. User also recorded future scope for printing saved and unsaved counts; no printing behavior is added in this design slice.

L9. T2 refinement removed the visual theme text while preserving accessible names. The regenerated OpenPencil document has 0 errors and 0 warnings.

L10. User approved the refined shell preview: "abrio bien y queda aprobada".

L11. User requested denser count rows and fixed partial-count column geometry rather than width changes driven by numeric digit length.

L12. T3 produced dark Spanish and light English 360 px Count states. The workflow uses fixed denomination/quantity/subtotal columns, 4 px row gaps, a passive per-currency sticky total, native numeric-control representation, and one horizontal action row. OpenPencil lint: 0 errors and 0 warnings.

L13. User requested a more rounded note field and a new fixed row grammar: denomination, quantity, and subtotal each have comparable containers; `x` and `=` occupy their own vertically aligned columns.

L14. T3 refinement validated both desktop comparison and 320 px responsive preview. The fixed row grammar, rounded note field, passive total, dense spacing, and one-row actions passed structural checks; OpenPencil lint: 0 errors and 0 warnings.

L15. User requested right-aligned values in all row containers and numeric-only denomination/subtotal values without currency symbols.

L16. T3 refinement right-aligned denomination, quantity, and subtotal values; displayed denomination/subtotal values are numeric only while accessible labels retain the monetary context. OpenPencil lint: 0 errors and 0 warnings.

L17. User approved the final Count workflow: "asi como quedo tiene el visto bueno." T4 was split into History and Settings slices to preserve step-by-step visual review.

L18. T4 produced a dark Spanish History list with local-record summaries and a light English empty state. Structural checks passed; OpenPencil lint: 0 errors and 0 warnings.

L19. User approved the History slice: "asi me parece muy bien por el momento".

L20. T5 produced a dark Spanish Settings repair form with an associated validation error and a light English final-reset confirmation dialog with Cancel as the safe autofocus action. Structural checks passed; OpenPencil lint: 0 errors and 0 warnings.

L21. User approved the Settings/error/confirmation design slice: "tiene mi visto bueno".

L22. T6 exploration mapped five reviewable implementation slices: shared shell/navigation; Count; History; Settings/reset; and a final PWA/print regression gate. It identified one open product decision: preserve the existing Dashboard/Home route without inventing a future host while the approved bottom navigation exposes only Count, History, and Settings.

L23. User chose to retain Dashboard/Home as a visible module action while the bottom navigation remains Count, History, and Settings. The implementation plan is recorded in `docs/design/cyndy-ui-redesign-implementation-plan.md` and awaits approval before source implementation.

L24. User correction verbatim: "quedamos que serian solo el icono en el encabezado, sin nombre." Dashboard is intended as a welcome surface for important local user statistics; current behavior already exposes the latest saved count and local per-currency count statistics. A dedicated Dashboard visual slice must be designed and reviewed before application implementation.

L25. User authorized the next design slice verbatim: "si, prepara el prototipo". T7 will prototype only existing local Dashboard facts: welcome, start-count action, latest saved count, local record count, and per-currency record counts.

L26. T7 produced dark Spanish and light English 360 px Dashboard states, with an icon-only accessible Dashboard/Home header action, separate currency amounts, a latest-count card, and local record statistics. Chromium preview and manifest checks passed. The OpenPencil executable is unavailable in the current environment; import/lint and the `.fig` artifact remain pending.

L27. Parent review corrected an invalid nested-main landmark in the static prototype, regenerated the Chromium preview, and verified `git diff --check`; no remaining source-level issues were found in the prototype.

L28. User approved the Dashboard composition, including Home icon left and language/theme controls right, and requested verbatim: "centraras en todas las partes lo correspondiente al favicon + CYNDY (nombre de la app)."

L29. T8 applied a consistent header across all five design slices: icon-only Home at left, favicon plus CYNDY centered independently of the controls, and theme/language controls at right. Chromium previews were regenerated. The 320 px Count check initially exposed prototype horizontal overflow from `body { min-width: 320px; }`; the mobile media query now resets that constraint and the regenerated 320 px preview has no horizontal scrollbar.

L30. Headless Chromium renders the Settings prototype's open native dialog as a blank PNG, despite the same source working as an HTML document. The Settings source was opened directly for review; this is a preview-capture limitation, not a source change or a waived validation.

L31. User approved the completed visual MVP: "me considero que finalmente logramos un mvp en cuanto a lo visual!!" This approves the Dashboard slice and shared centered-header refinement. Source implementation remains gated on approval of the revised implementation plan.

L32. User accepted the checkpoint criterion for ongoing work: save the approved visual MVP as a Git commit before application implementation; then keep implementation slices as separate reviewable commits, with push/PR/merge as separate decisions.

L33. The approved visual MVP was committed in six reviewable commits (`025ec84`, `b1b3b83`, `326e6dd`, `9df3e2c`, `420d472`, `6ae09ee`) and pushed to `origin/design/cyndy-module-shell`. User then approved the workflow and authorized application implementation.

L34. T9 introduced the icon-only Home control, centered CYNDY mark, local theme/locale controls, and bottom navigation. Tests were observed RED then GREEN; focused tests, typecheck, build, and deterministic full test suite passed 68/68 with `--no-file-parallelism`. The ordinary parallel run has pre-existing timing sensitivity in local async data tests.

L35. T10 applied the approved Dashboard hierarchy to the existing local data: welcome hierarchy, start-count action, latest-count card, and local statistics card. It introduced no data-model, storage, conversion, cloud, search, filter, export, or reset-semantics changes. History-route tests, deterministic full suite (68/68), build, and `git diff --check` passed.

L36. T11 applied the fixed numeric Count row grammar with a visible numeric-only denomination/subtotal, fixed operator columns, right-aligned tabular values, and native quantity input. It preserves the passive fieldset-scoped total. Focused tests, deterministic full suite (68/68), build, and `git diff --check` passed.

L37. T12 applied the approved History visual hierarchy: independent local-record cards, saved-order dates and per-currency subtotal tiles, and an empty-state action to start a count. It preserves repository-backed loading, newest-first ordering, detail/receipt route links, and local-only stored-record semantics. Focused History tests were observed RED before source changes; deterministic full suite (68/68), typecheck, production build, and `git diff --check` passed.

L38. T13 applied the approved Settings repair form and destructive reset visual hierarchy. Tests observed RED then GREEN; an initial parent typecheck caught an `Element`/`HTMLElement` test inference mismatch, which was corrected without behavioral change. Deterministic full suite (72/72), typecheck, production build, and `git diff --check` passed. Validation, focus behavior, staged reset/cancel safety, local-only data semantics, and the absence of future printing behavior are preserved.

L39. T14 verified the existing offline and saved-receipt boundaries after all visual slices. Deterministic PWA and receipt tests passed 8/8. The service worker returns the current cache root (`/`) for navigations, and the existing saved-record receipt route retains browser print delivery while print CSS hides application navigation and receipt actions. No future saved/unsaved count printing or mock was introduced. Playwright E2E remains explicitly deferred because Chromium is absent.
