# Prueba real MercadoPago — Depósitos y gasto (ciclo económico end-to-end)

**Fecha:** 2026-07-25 · **Entorno:** credenciales TEST de la app "Iron Loot" (test user MLM 1447980859)
**Método:** Orders API (creación de pago real aprobado) + webhook firmado con el secret real → acreditación por el path real de la app.

## Resultado: ✅ ciclo completo, real, verificado en BD

| Paso | Acción | Verificación |
|---|---|---|
| Depósito 1 | Orden MP $500 `accredited` → webhook firmado | wallet 0 → **500**, ledger `DEPOSIT` ref `DEP-<uuid>` |
| Depósito 2 | Orden MP $1,500 `accredited` | wallet 500 → **2,000** |
| Depósito 3 | Orden MP $3,000 `accredited` | wallet 2,000 → **5,000** |
| Puja | Comprador puja $3,000 en subasta activa | `held_funds` 0 → **3,000**, disponible 5,000 → **2,000**, `HOLD_BID` |
| Cierre | Scheduler cierra subasta (endsAt pasado) | subasta `CLOSED`, **orden creada** (ganador = comprador) |
| Compra | Liquidación automática | orden **PAID** $3,000, `held` 3,000 → **0**, `DEBIT_ORDER` |

**Total: depositó $5,000 reales de MP, gastó $3,000 ganando la subasta, disponible final $2,000.**

Cada pago es real en el entorno de prueba de MP (`status: processed / accredited`), acreditado por el path
real de la app (validación de firma HMAC + fetch a MP + `walletService.deposit`). Evidencia: `ledger.txt`.

---

## 🐛 6 bugs reales + 1 gap descubiertos por esta prueba

> La prueba de pago real destapó que **el flujo de acreditación de depósitos estaba completamente roto** —
> los pagos **nunca** habrían acreditado en producción. Correcciones en rama `test/mp-real-payment`.

| # | Severidad | Bug | Fix |
|---|---|---|---|
| 1 | ALTA | Provider MP no fijaba `notification_url` → MP no sabía a dónde notificar | Añadido `notification_url` env-driven en la preferencia |
| 2 | MEDIA | Webhook case-sensitive: handler compara `MERCADO_PAGO` pero la URL registrada usa `mercadopago` → no acredita | `provider.toUpperCase()` en `handleWebhook` |
| 3 | MEDIA | Provider usaba `init_point` (producción) con credenciales de prueba → checkout falla | Flag `MERCADO_PAGO_SANDBOX` para `sandbox_init_point` (nota: dominio sandbox deprecado; el pago real va por Orders API) |
| 4 | **CRÍTICA** | **Webhook sin `@Public()`**: el guard JWT global rechaza todo webhook (sin JWT) con **401** → **ningún pago acredita en producción** | `@Public()` en `webhook/:provider` |
| 5 | ALTA | Handler solo soportaba la **Payments API legacy**; credenciales `APP_USR` usan la **Orders API** (IDs `ORD…/PAY…` no consultables por `payment.get`) | Fetch vía Orders API (`/v1/orders/{id}`) cuando el id es formato Orders |
| 6 | **CRÍTICA** | Parser de `external_reference`: `DEP-<userId>-<ts>` con `split('-')[1]` → **UUID truncado** → wallet no encontrado → no acredita | Regex `^DEP-(.+)-\d+$` extrae el UUID completo |
| 7 | ALTA (gap) | Admin **force-close** cierra la subasta pero **no liquida** (no crea orden ni convierte fondos); solo el scheduler lo hace | Documentado — pendiente PT (unificar liquidación) |

**Archivos tocados (rama `test/mp-real-payment`):**
`src/api/src/modules/payments/providers/mercadopago.provider.ts`,
`src/api/src/modules/payments/payments.controller.ts`,
`src/api/src/modules/payments/payments.service.ts`.

## Recomendación
Formalizar estos fixes vía FDGE (especialmente #4 y #6, que bloqueaban toda acreditación de depósitos).
El #4 (webhook sin `@Public`) es un defecto de producción crítico independiente de MercadoPago (afecta a
cualquier pasarela: PayPal, HeyBanco).
