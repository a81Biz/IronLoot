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

- **Niveles:** unitario (core + api), integración (api con Postgres/Redis efímeros), e2e (api con DB). **Frontends: 119 casos** — CLIENT 103, ADMIN 13, BASE 3. ADMIN y BASE no tenían dónde poner una prueba hasta PT-101; CLIENT ya tenía, y ahí viven las guardas estáticas de plantillas.
- **Herramienta:** Jest, **cinco proyectos** desde PT-099 (antes `npm test` corría uno solo y
  omitía 205 casos). Cifras reales al **2026-07-27**: **85 suites / 720 casos** —
  API 66/467 · CLIENT 8/103 · CORE 8/134 · ADMIN 2/13 · BASE 1/3.
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

`tests/qa-browser-suite/70-payment-trace.js`, integrada en `run-all.sh`. **16 casos**, todos
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

## Fase 71 — Pago real por PayPal acreditado por la vía garantizada (PT-076 / PT-087)

`tests/qa-browser-suite/71-paypal-guaranteed.js`, integrada en `run-all.sh`. **17 casos**,
todos contra la pasarela real. La diferencia con la fase 70 es el punto: aquí **no hay
notificación**. El comprador aprueba en el checkout real de PayPal —navegador headless, cuenta
personal de sandbox— y nadie avisa a la API, igual que en desarrollo, donde PayPal no puede
alcanzar un contenedor local.

| Bloque | Qué verifica |
|---|---|
| QA-PP-01..02 | PayPal se ofrece y la solicitud crea la orden en la pasarela |
| QA-PP-03 | El id de la orden queda guardado en el ciclo — **sin él PayPal no puede sondear**, porque su API no ofrece búsqueda por `custom_id` |
| QA-PP-04 | La creación deja traza con su estado HTTP |
| QA-PP-05..06 | El comprador aprueba de verdad, y se comprueba que **ninguna notificación llegó**: es el escenario que se prueba |
| QA-PP-07..08 | La vía garantizada cierra el ciclo sola y **captura** la orden — en Orders v2 aprobar no mueve el dinero |
| QA-PP-09..10 | El monedero se acredita por el importe exacto y el asiento contable es **uno solo** |
| QA-PP-11..13 | La traza contiene los seis pasos, se atribuye **toda** a PAYPAL y la captura registra su endpoint |
| QA-PP-14 | **Ninguna credencial** de PayPal quedó persistida |
| QA-PP-15..16 | Un webhook fabricado se rechaza con **401** —no 500— y el saldo no cambia |

> **Requisitos**: las tres variables de PayPal en `src/api/.env` y `paypal-sandbox.json` con una
> cuenta **personal** de sandbox (ver `paypal-sandbox.example.json`). La fase se **salta sola** si
> falta. La cuenta *business* no sirve: PayPal responde `CANNOT_PAY_SELF` porque es la que cobra.



---

## Anexo — Estado real de las suites (2026-07-27, PT-109)

Este plan se escribió con cifras que hoy no describen el sistema. Se corrigen aquí en vez de
reescribir el documento: lo de arriba conserva el diagnóstico, que sigue siendo válido.

### Lo que hay

| Proyecto | Suites | Casos | Nota |
|---|--:|--:|---|
| API | 66 | 467 | |
| CLIENT | 8 | 103 | Incluye las guardas estáticas de plantillas (PT-096, PT-102, PT-105) |
| CORE | 8 | 134 | Sin NestJS ni BD |
| ADMIN | 2 | 13 | **No existían** hasta PT-101 |
| BASE | 1 | 3 | **No existían** hasta PT-101 |
| **Total** | **85** | **720** | |

**Suite de navegador**: `bash run-all.sh` → **193 casos en diez fases**, incluidas dos pasarelas
reales de punta a punta (Mercado Pago y PayPal).

### Lo que este plan no podía prever, y conviene que conste

- **Una suite verde no es un producto sano.** La puja en vivo estuvo apagada varios días con
  **168/168 en verde** (F-34): las pruebas ejercitaban la puja por HTTP y nadie comprobaba que el
  *otro* navegador se enterase. Lo cierra la fase 32, con dos navegadores reales.
- **Doce comprobaciones de traza no se ejecutaban nunca** (F-35/PT-104): la fase 70 trataba como
  síncrona una API que no lo es, y se rendía antes de llegar a ellas. 4 casos → 16.
- **Las guardas llevan casos de control.** Cada guarda estática incluye un caso que *debe*
  rechazar y otro que *debe* aceptar. Una guarda que solo ha visto verde no ha demostrado que sepa
  ver rojo.

### Lo que sigue sin cobertura, y este plan ya señalaba

`commissions` y `refunds` siguen con **0 tests**. Es la deuda de cobertura más cara que queda:
ambos tocan dinero. No se ha abierto PT para ellas.
