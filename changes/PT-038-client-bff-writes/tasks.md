# PT-038 — Tareas atómicas

Orden tests-first.

| ID | Objetivo | Inputs | Outputs | Validación | Status |
|---|---|---|---|---|---|
| **PT-038.1** | Test RED: `injectAuthHeader` pone `Authorization: Bearer <cookie>`; sin cookie no pone header. (Incluye setup mínimo de jest en CLIENT si no existe.) | D1 | `test/inject-auth-header.spec.ts` (+ jest config) | test **falla** (RED) al no existir la función | DONE |
| **PT-038.2** | Implementar `injectAuthHeader` + cablear proxy BFF en `client/src/main.ts`. | D1, D2, `base/src/main.ts` | `common/bff/inject-auth-header.ts`, `main.ts` | PT-038.1 **GREEN**; build OK | DONE |
| **PT-038.3** | Corregir las 8 plantillas: path relativo + método/ruta correctos. | D3, `Catalogo-de-API` | 8 `.html` | grep: sin `API +` en los fetch de escritura; método/ruta = API | DONE |
| **PT-038.4** | Verificación estática de paridad de rutas. | Catálogo | log | 0 mismatches vs `Catalogo-de-API` | DONE |
| **PT-038.5** | Build CLIENT (`npm run build`) + typecheck; regresión API unit (sanity). | — | — | build OK; tsc OK | DONE |
| **PT-038.6** | Docs (STATE 7): `05-UIUX`/`Catalogo-de-API`/`RF-UI-06`, Registro AUD-003. | — | docs-v2 | revisión | DONE |

**Nota:** CLIENT hoy tiene 0 tests (sin jest configurado). PT-038.1 añade la config mínima de jest para el paquete `@ironloot/client` (o se ubica el spec donde el toolchain lo ejecute). Si el coste de configurar jest en CLIENT excede el alcance, se degrada a verificación estática del wiring + build, documentándolo en evidencia.

**Regla:** nada de código antes del ACK del PROPOSAL GATE.
