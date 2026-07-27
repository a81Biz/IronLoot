# Matriz de Hallazgos Pago Real MercadoPago → FDGE (2026-07-25)

**Origen:** prueba real de depósitos/gasto MercadoPago (`qa-out/mp-real-payment/report.md`).
**Contexto:** la prueba destapó que el flujo de acreditación de depósitos estaba **completamente roto** —
ningún pago habría acreditado en producción. Fixes ya aplicados en rama `test/mp-real-payment` (sin commit).

**Estados:** `PENDIENTE` · `STATE 1..7` · `VALIDATION_PENDING` · `CLOSED`.
**Regla:** los BUG no se auto-cierran → `VALIDATION_PENDING` (o CLOSED tras autorización de merge).

## Cola de procesamiento

| # | PT | Hallazgos que agrupa | Sev | Tipo | Archivo | STATE | Status |
|:--:|:--:|---|:--:|---|---|:--:|---|
| 1 | **PT-063** | #4 Webhook sin `@Public()` | **CRÍTICA** | BUG | `payments.controller.ts` | **CLOSED** | ✅ merged d100231 |
| 2 | **PT-064** | #6 parser UUID + #2 case-sensitive | **CRÍTICA** | BUG | `payments.service.ts` | **CLOSED** | ✅ merged d100231 |
| 3 | **PT-065** | #1 notification_url + #3 sandbox + #5 Orders API | ALTA | BUG | `mercadopago.provider.ts` | **CLOSED** | ✅ merged d100231 |
| 4 | **PT-066** | #7 force-close no liquida | ALTA | INVESTIGATION | — | **STATE 6** | **CLOSED** |

## Detalle de hallazgos (evidencia: prueba real MP)
- **#4 (CRÍTICA)**: `@Post('webhook/:provider')` sin `@Public()`; hay `APP_GUARD` JWT global (`app.module.ts:152`). MP/PayPal/HeyBanco no envían JWT → **401** → nunca acredita. Fix: `@Public()`.
- **#6 (CRÍTICA)**: `DEP-${userId}-${ts}` con `userId` UUID; parser `split('-')[1]` → UUID truncado → wallet no encontrada. Fix: regex `^DEP-(.+)-\d+$`.
- **#2**: handler compara `provider === 'MERCADO_PAGO'` pero la URL registrada usa `mercadopago`. Fix: `toUpperCase()`.
- **#1**: preferencia MP sin `notification_url`. Fix: env-driven.
- **#3**: `init_point` productivo con credenciales de prueba falla. Fix: flag `MERCADO_PAGO_SANDBOX`.
- **#5**: credenciales `APP_USR` usan Orders API; handler solo soportaba Payments API legacy (`payment.get` no resuelve IDs `ORD/PAY`). Fix: fetch `/v1/orders/{id}`.
- **#7 (gap)**: `admin.service.forceCloseAuction` solo marca `CLOSED`; el scheduler (`auction-scheduler.service`) crea la orden + convierte fondos. Force-close deja la subasta sin liquidar.

## Cierre de la matriz

**2026-07-25** — PT-063/064/065 fusionados a master (merge `d100231`, --no-ff) y CLOSED tras autorización. PT-066 CLOSED (investigación, candidato FPGE). Tests: 6 nuevos + 8 previos sin regresión. Evidencia funcional: 3 depósitos reales MP + gasto. Rama eliminada.
