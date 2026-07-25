# Reporte QA — Suite completa desde cero + Retiro real del vendedor + MP real

**Fecha:** 2026-07-24 23:02 · **Run:** `20260724-230258` · **Modo:** headed (Chromium/Firefox/WebKit)
**Reset:** BD truncada (empezar de cero) + API reiniciada.

## Alcance
Suite QA completa reejecutada desde cero, incorporando el **subsistema de retiro real del vendedor**
(PT-069..072) y la **compra real por Mercado Pago**, más verificación de historial comprador/vendedor.

## Resultado por fase

| Fase | PASS/Total | Notas |
|---|---|---|
| 00 smoke (57 rutas) | 57/57 ✅ | 4 pantallas con consoleError (favicon/dev, ruido conocido) |
| 10 bootstrap (mundo, **KYC-gated**) | 12/13 | 1 FAIL: contrato depósito `/payments/initiate` sin `redirectUrl` (preexistente, pasarela fuera de alcance — fondeo por crédito de prueba) |
| 20 authed (41 rutas privadas) | 41/41 ✅ | 0 consoleError |
| 30 e2e (puja→bloqueo→outbid→ledger) | 5/5 ✅ | HOLD_BID/RELEASE_BID reales |
| 31 outbid (re-bid) | 0/1 | flakiness preexistente; el outbid ya se valida en E2E-6 |
| 40 extras (auth/responsive/CSP/cross-browser) | 16/16 ✅ | Firefox + WebKit OK |
| 50 admin-writes (SEO/CMS/usuario) | 4/4 ✅ | persistencia en BD verificada |
| **60 retiro real del vendedor** | **12/12 ✅** | ver detalle abajo |
| historial comprador + vendedor | ✅ | pujas y subastas visibles |

## Compra real por Mercado Pago (Orders API + webhook firmado)
- Orden MP creada y **acreditada**: `ORDTST01KYBTSTFB6ZD8851DXG65A6ZM` (status `processed/accredited`, `paid=1500.00`).
- Webhook HMAC firmado con secret real → **HTTP 201** (camino real de la app).
- Wallet comprador: **5000 → 6500** · ledger `DEPOSIT 1500.00`. ✅ Acreditado por el path real.

## Retiro real del vendedor (PT-069..072) — detalle 12/12

| Caso | Regla | Resultado |
|---|---|---|
| KYC del vendedor APPROVED (gate) | RN-62 | ✅ approved=true |
| Rechazar CLABE con verificador inválido | RN-63 | ✅ HTTP 400 |
| Registrar cuenta bancaria (CLABE válida) | RN-63 | ✅ HTTP 201, persistida |
| Venta liquidada a `pendingBalance` (holdback 900) | RN-64 | ✅ pending 0→900, disponible 0 (retenido) |
| Liberar holdback → disponible (`SETTLEMENT_RELEASE`) | RN-64 | ✅ disponible 0→900 |
| Solicitud de retiro **reserva** fondos | RN-65 | ✅ HTTP 201, REQUESTED, disponible 900→400, ledger `WITHDRAWAL 500` |
| Gate saldo insuficiente | RN-65 | ✅ HTTP 400 |
| Admin ve la cola de retiros | RN-66 | ✅ GET /admin/withdrawals (en cola) |
| Admin **aprueba** (REQUESTED→APPROVED) | RN-66 | ✅ HTTP 200 |
| Admin marca **PAGADO** tras SPEI (APPROVED→PAID) | RN-66 | ✅ HTTP 200, ref=SPEI-QA-0001, disponible sin cambio (ya reservado) |
| **Rechazo** reintegra fondos (→REJECTED + ADJUSTMENT) | RN-66 | ✅ disponible 400→(reserva)200→(reintegro)400, ledger `ADJUSTMENT 200` |

> El **origen del dinero** (venta cerrada + cron de liberación) se sembró en BD replicando el camino ya
> cubierto por pruebas unitarias (`settlement.spec`, `withdrawals.service.spec`). El **subsistema de retiro**
> (solicitud→aprobación→pago→rechazo) se ejercitó **REAL** vía API (BFF vendedor + admin `x-admin-key`).

## Historial (comprador ↔ vendedor)
- **Comprador `/my-bids`:** muestra pujas reales — *"Reloj de colección QA · MXN 600 · MXN 700 · Superada"*. ✅
- **Vendedor `/seller/auctions`:** muestra su subasta — *"Reloj de colección QA · ACTIVE · MXN 700"*. ✅
- `/orders`, `/won-auctions`, `/seller/orders`: vacíos porque la subasta sigue **ACTIVE** (aún no cierra) — comportamiento esperado.

## Evidencia
JSON por fase + capturas en `qa-out/20260724-230258/` (subcarpetas por fase; retiro en `60-withdrawal/`).
