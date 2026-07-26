# Master Test Plan — IronLoot

| Metadato | Valor |
|---|---|
| **Origen** | Reconstrucción basada en evidencia (no existía un Master Test Plan) |
| **Fuente** | `audit/raw/F-core-tests.md`, `src/api/test/*`, `src/packages/core/**/*.spec.ts`, `.github/workflows/ci.yml` |
| **Fecha** | 2026-07-23 |
| **Documentos usados** | 10-Technical-Debt (ND-004 thresholds) |
| **Código usado** | ~57 archivos de test en el repo |
| **Nivel de confianza** | Alto (conteos por grep; casos con `it.each` marcados "aprox") |

## 1. Estrategia y alcance

- **Niveles:** unitario (core + api), integración (api con Postgres/Redis efímeros), e2e (api con DB). **Frontends: 0 tests** (base/client/admin).
- **Herramienta:** Jest. Core = 12 suites / **157 casos** (por CLAUDE.md; ~104 bloques fuente). API = 30 unit/integración (~161) + 15 e2e (~79). **Total ~57 suites / ~344 bloques.**
- **CI (`.github/workflows/ci.yml`):** lint→typecheck→test-unit(cobertura→Codecov, `fail_ci_if_error:false`)→test-integration(Postgres+Redis)→build→docker(prod/prep). **Riesgo:** scripts invocados en raíz sin `package.json` raíz que los defina (`AUD-028`).

## 2. Inventario de suites (resumen)

| Capa | Suites | Bloques aprox | Cobertura |
|---|---|---|---|
| core dominio | 8 | 134 casos | Money, wallet-calc, FSM auction/order/dispute, bid-validation, HMAC, validador IPN (**obsoleto desde PT-076**), 4 use-cases |
| api unit/integ | 30+ | ~175 | users(21), auctions(11), lock(11), auth(9), wallet(8→13), disputes(7), scheduler-lock(7)… **+retiro real (PT-069..072): kyc.service(4), clabe.util(3), settlement(2), withdrawals.service(5)** |
| api e2e | 15 | ~79 | watchlist(9), auth(8), settings(7), bids(7), auctions(6), wallet(5), orders(5)… |
| **QA navegador (Playwright)** | 1 harness | ~135 checks | smoke + bootstrap del mundo + 41 rutas autenticadas + E2E puja/superado + admin writes + **MP real (Orders API + webhook firmado)** + **historial** + **flujo de retiro end-to-end (KYC→método→venta→holdback→liberación→solicitud→admin approve/mark-paid)** |
| frontends | 0 | 0 | **ninguna (unit)** |

## 3. Mapa de cobertura por módulo (estado real)

| Estado | Módulos |
|---|---|
| **TESTED** | auth, users, auctions, disputes, shipments, ratings, notifications, wallet*, health, redis-lock, **kyc (PT-069), withdrawals/settlement/clabe (PT-070..072)** |
| **PARTIAL** | bids (fund-lock, 4 unit), payments (webhook idempotencia), orders (1 unit), scheduler (cierre 3 unit + liberación holdback), diagnostics, watchlist (sólo e2e) |
| **UNTESTED** | **refunds**, **commissions**, cfdi, cms, audit, feature-flags, seo, system-cleanup, system-config, upload, admin, **todo el frontend (unit)** |

## 4. Veredicto de caminos críticos financieros

| Camino crítico | Cobertura | Riesgo |
|---|---|---|
| Bloqueo de fondos al pujar | core math ✅ (12); producción PARTIAL (4 unit) | race hold-antes-de-TX sin test (AUD-013) |
| Cierre y settlement | core ✅ pero **no cableado**; producción PARTIAL (3) | evento financiero central débilmente cubierto (AUD-012) |
| Ledger | unit ✅ (8) | conversión held→settled poco cubierta |
| Webhooks de pago | firma ✅ (core 7+11); handler API PARTIAL (6) | idempotencia de duplicados sin test dedicado |
| Disputas | ✅ (core 7 + 7) | — |
| **Comisiones** | **0 tests** | revenue sin guardas (AUD-013) |
| **Reembolsos (producción)** | **0 tests** | over-refund/estado inválido sin verificar (AUD-013) |

## 5. Brechas de cobertura (ranking)

1. commissions 0 tests · 2. refunds servicio 0 tests · 3. use-cases core probados pero no ejecutados (falsa confianza, AUD-012) · 4. cierre/settlement débil · 5. race de fund-lock · 6. Money VO no usado en prod · 7. idempotencia de webhook en API · 8. divergencia de regla de puja sin test candado (AUD-009) · 9. audit/system-config/cfdi/kyc sin tests · 10. frontend entero sin tests.

## 6. Recomendaciones de QA (alineadas a FDGE tests-first)

- **Prioridad 1 (dinero):** suites para commissions y refunds; tests de settlement de cierre; idempotencia de webhook.
- **Prioridad 2 (regresión):** candado para la divergencia de puja PUBLISHED/ACTIVE (AUD-009/016); decidir cablear core use-cases y mover su cobertura al path real (AUD-012).
- **Prioridad 3 (frontend):** smoke tests de BFF/auth y de los flujos de escritura de CLIENT (AUD-003) y de la UI de puja cuando exista (AUD-002).
- **Definir umbral de cobertura** (hoy ND-004, no fijado) y activarlo en CI.

> Matriz requisito×prueba en [Matriz-Requisito-Prueba.md](Matriz-Requisito-Prueba.md). Defectos = [Registro de Hallazgos](../transversal/Registro-de-Hallazgos.md).


## Fase 70 — Pago real por Mercado Pago y traza completa (PT-080 / PT-085 / PT-086)

`tests/qa-browser-suite/70-payment-trace.cjs`, integrada en `run-all.sh`. **16 casos**, todos
contra la pasarela real:

| Bloque | Qué verifica |
|---|---|
| QA-TR-01..02 | La solicitud abre el ciclo en `REQUESTED` |
| QA-TR-03..04 | Se crea un cobro **aprobado de verdad** en Mercado Pago y se resuelve su identificador canónico |
| QA-TR-05..07 | La notificación firmada se acepta, el wallet se acredita por el importe exacto y el ciclo queda `SETTLED` |
| QA-TR-08 | El pago queda registrado en `payments` — la tabla que antes estaba siempre vacía |
| QA-TR-09..11 | La traza contiene los **siete pasos**, en orden, y las llamadas salientes registran su endpoint |
| QA-TR-12..13 | **Ninguna credencial** quedó persistida, y lo redactado quedó marcado |
| QA-TR-14..15 | La reentrega no acredita de nuevo y queda registrada como duplicada |

> **Alcance**: el checkout del comprador no se automatiza (es UI de Mercado Pago). El cobro se
> crea con la Orders API y tarjeta de prueba — es el mismo pago real que generaría el checkout;
> lo que se verifica es **nuestro tratamiento** de ese pago.
