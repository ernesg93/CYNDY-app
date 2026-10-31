# CYNDY Libro de caja
Objective: implement approved mobile visual direction while protecting local records and offline behavior.
Branch: feat/cyndy-libro-de-caja; delivery: feature-branch-chain (user selected); checks: Vitest, build, Playwright, Android.

## Specs
S1. "en cuanto a las caracteristicas visuales me parecen bien."
S2. "01 · Panel principal:\nqueda aprobado tal cual"
S3. "02 · Nuevo conteo:\ncasi aprobado, me preocupa el detalle donde van las cantidades, no se si se ejuste a cantidades de hasta 8 cifras. de igual manera podemos presindir en esta parte, correspondiente a los conteos parciales, de los simbolos y los codigos. haciendo esto podemos mostrar los numeros alineados a su margen derecho, vistos desde fuera, en la vertical visual, se acomodan a partir de las unidades, decenas centena, ...\ntener presente ademas que seria bueno tener siempre visible el total de cada denominacion mientras se esta contando una moneda.\notra cosa, aqui no se muestra, pero pido que el mensaje de confirmacion para guardar un segundo conteo identico deberia mostrarse por encima, como una alerta, no al final como era antes, porque puede pasar que no sea visible por el usuario."
S4. "mantener fijo el total de la moneda activa mientras te desplazás por sus denominaciones"
S5. "03 · Historial:\nno tengo objecion, pasa la aprobacion."
S6. "04 · Detalle guardado y 05 · Recibo:\nen mi opinion y ahora es que me doy cuenta, me parece que hemos heredado por mala planificacion una pequena sobre ingieneria. el detalle y el recibo pueden mostrarse iguales y en ves de \"Abrir recibo\" podemos dejar la obcion \"Imprimir o guardar\". me parece que asi sera suficiente y no haria necesidad de \"05 · Recibo\".\ntambien se puede quitar el boton \"Volver al historial\", ya lo podemos hacer por la otra via que tenemos en la barra inferior."
S7. "06 · Ajustes:\nQueda bien asi como esta"
S8. "los enlaces antiguos a `/history/:id/receipt` abrirán el **detalle unificado del mismo conteo**, sin iniciar la impresión automáticamente."
S9. "Los conteos y las notas anteriores deben seguir disponibles en el dispositivo." "Los importes de monedas distintas **nunca se mezclan ni convierten**." "La app debe seguir funcionando offline después de la primera carga." "Mantendremos español e inglés, temas claro y oscuro, y confirmaciones para acciones destructivas."
S10. "Verificación: Android, accesibilidad, importes extremos, impresión, modo offline y conservación de conteos y notas anteriores."

## Tasks
- [x] T1 [S1-S2,S5,S7,S9] Implement shared Libro de caja visual foundation and approved panel/history/settings; route: delegated (context backstop); focused Vitest 14+44, build and 15 E2E passed; visual readback and warm-status contrast checked; commit: pending.
- [~] T2 [S3-S4,S9] Implement count layout, fixed active currency total and duplicate-save alert; route: delegated (context backstop); commit: pending.
- [ ] T3 [S6,S8-S9] Unify saved detail/print and preserve legacy receipt URLs; route: delegated (context backstop); commit: pending.
- [ ] T4 [S1-S10] Verify screen states, accessibility, offline/upgrade, print, compatibility and delivery readiness; route: independent verify for shared contracts and stored data; commit: pending.

## Log
L1. "si, me parece bien"
L2. User approved the illustrated Libro de caja visual direction and selected legacy receipt compatibility: legacy receipt links open unified detail without printing automatically. Design exploration exists as untracked `design/cyndy-direcciones-visuales/`; preserve it and decide inclusion as part of the work unit. OpenPencil integration remains unverified; no installation authorized.
L3. This is authorized implementation, not permission to push, create PR, merge, or deploy. Prior Android offline-first and local-only constraints remain in force. Initial base: 4a024a1. Forecast exceeds about 400 authored changed lines.
L4. User selected "Cadena con rama de seguimiento (recomendada)". T1 writer observed RED for latest title, then GREEN (14 tests), and 44 count-route tests plus typecheck passed. Build passed. Initial E2E command failed all 10 at browser launch due to browser-cache path; independent diagnosis identified existing project-local Chromium. With correct path, E2E observed RED for old header color, then GREEN after updating the approved palette assertion. Pixel 7 emulation visual readback found old green status/icon accents; focused E2E RED then GREEN after palette adjustment; all 15 E2E passed. Native assessment unassessable due undeclared untracked files.
