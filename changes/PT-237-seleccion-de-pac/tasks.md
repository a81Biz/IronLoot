# PT-237 — Tareas atómicas

Estado inicial: **todas `PENDING`**. Se marcan al terminarlas y verificarlas, nunca antes.

| # | Objetivo | Entrada | Salida | Validación | Estado |
|---|---|---|---|---|---|
| PT-237.1 | Medir el estado real antes de tocar: filas `cfdi_records` por estado | BD de desarrollo | Cifra en la evidencia | Consulta ejecutada, salida capturada | DONE |
| PT-237.2 | Guarda RED: activar sin PAC disponible debe fallar | — | `cfdi-seleccion-de-pac.spec.ts` en rojo | El caso falla nombrando lo que falta | DONE |
| PT-237.3 | Guarda RED: `generate()` sin PAC no deja `PENDING` | — | Caso en rojo | Falla sobre el código actual | DONE |
| PT-237.4 | Guarda RED: ningún mensaje del módulo nombra un símbolo inexistente | — | Caso en rojo por `ICfdiPacProvider` | Falla nombrando la línea | DONE |
| PT-237.5 | `CfdiPacRegistry` con `all()`, `available()`, `resolve()` | Patrón de `PaymentProviderRegistry` | `cfdi-pac.registry.ts` | Compila; cero proveedores registrados | DONE |
| PT-237.6 | `CfdiService` valida proveedor, exige disponible para activar, y no escribe `PENDING` | Registro | `cfdi.service.ts` | Las tres guardas en verde | DONE |
| PT-237.7 | El mensaje deja de citar `@ironloot/core integrations` | — | `cfdi.service.ts` | Guarda de citas en verde | DONE |
| PT-237.8 | `getConfig()` expone los proveedores; ADMIN los pasa a la vista | Registro | API + `configuration.service.ts` | La vista recibe la lista | DONE |
| PT-237.9 | `cfdi-config.html`: `<select>` en vez de texto libre, con el aviso de `TD-001` | — | Plantilla | Guardas de CSS y de formularios en verde | DONE |
| PT-237.10 | `TD-001` gana lo medido y lo decidido | — | `10-Technical-Debt.md` | Guarda de coherencia de deuda en verde | DONE |
| PT-237.11 | Evidencia y self-review | Todo lo anterior | `evidence/PT-237/` | Checklist completo | DONE |
| PT-237.12 | `HISTORY.log` + `HANDOFF.md` + índice de estado | — | Registros | `npm run indice:estado` sin abortar | DONE |

## Criterios de aceptación (del `design.md`)

- **AC-1** Activar CFDI sin PAC disponible falla **nombrando el motivo**.
- **AC-2** Guardar una clave de PAC no registrada se rechaza.
- **AC-3** `generate()` sin PAC no deja ninguna fila en `PENDING`.
- **AC-4** Ningún mensaje de tiempo de ejecución del módulo nombra un símbolo o paquete inexistente.
- **AC-5** Las cuatro tienen guarda, con control en las dos direcciones.
