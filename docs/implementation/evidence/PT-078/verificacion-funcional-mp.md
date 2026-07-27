# PT-078 — Verificación funcional contra MercadoPago real

**Fecha**: 2026-07-25 | **Rama**: `master` | **Entorno**: stack Docker completo, API con el código fusionado

Ejecutado con `tests/qa-browser-suite/mp-deposit.cjs`, que crea una **orden real aprobada** en
MercadoPago (Orders API, tarjeta de prueba APRO tokenizada) y entrega a la API local un
**webhook firmado con el `MERCADO_PAGO_WEBHOOK_SECRET` real**. No es una simulación: recorre
`payments.controller` → `MercadoPagoProvider.handleWebhook` (validación HMAC + consulta a la
Orders API de MP) → `PaymentsService.creditOnce` → `WalletService.deposit`.

---

## V-01 — Acreditación real (la ruta que PT-078 modificó)

```
Orden MP: id=ORDTST01KYEDNWKHXHCS58ZPA3GESWMT status=processed/accredited paid=250.00
Webhook firmado → HTTP 201
Wallet: 5000.00 -> 5250.00 | ledger: DEPOSIT 250.00
```

✅ MercadoPago **acredita correctamente** con el código de PT-076 + PT-078 fusionado.
Reserva creada: `MERCADO_PAGO | ORDTST01KYEDNWKHXHCS58ZPA3GESWMT`.

## V-02 — Reentrega del mismo webhook (el objetivo de PT-078)

El mismo webhook firmado, entregado **tres veces** más:

```
saldo antes=5250.00   reservas antes=1
  entrega #1: HTTP 201 {"received":true}
  entrega #2: HTTP 201 {"received":true}
  entrega #3: HTTP 201 {"received":true}
saldo despues=5250.00  reservas despues=1  asientos DEPOSIT=1
```

✅ **Ninguna reentrega acreditó de nuevo.** Saldo intacto, una sola reserva, un solo asiento.
Antes de PT-078 cada una de esas tres entregas habría sumado 250 MXN.

## V-03 — Un pago distinto sí acredita (la dedup no bloquea lo legítimo)

```
Orden MP: id=ORDTST01KYEDQRYCC27CE8JRYR04XG4K paid=137.50
Wallet: 5250.00 -> 5387.50 | ledger: DEPOSIT 137.50
```

✅ Segundo pago acreditado, con decimales exactos. Dos reservas, una por pago.

## V-04 — Firma inválida

```
POST /payments/webhook/MERCADO_PAGO  (x-signature falsificada)  → HTTP 500
balance sin cambios = 5387.50
```

✅ Rechazado, sin acreditar.

---

## Estado final verificado en BD

```
balance = 5387.50            (5000 + 250 + 137.50)
processed_webhook_events:
  MERCADO_PAGO | ORDTST01KYEDNWKHXHCS58ZPA3GESWMT
  MERCADO_PAGO | ORDTST01KYEDQRYCC27CE8JRYR04XG4K
```

Dos pagos, dos reservas, dos asientos. Tres reentregas sin efecto.

---

## Conclusión

**MercadoPago funciona con el código fusionado.** Los criterios 1–4 de PT-078, que hasta ahora
solo tenían cobertura unitaria, quedan verificados contra la pasarela real.

El riesgo que se venía arrastrando —«ruta de dinero real modificada y solo verificada con
mocks»— queda **cerrado para MercadoPago**.

---

## Hallazgos residuales (NO corregidos aquí)

**H-01 — La firma inválida devuelve 500, no 4xx.**
Un webhook falsificado provoca un error 500. Como MercadoPago reintenta ante cualquier
respuesta que no sea 2xx, un atacante puede forzar reintentos indefinidos con firmas basura.
No hay riesgo de acreditación (se rechaza correctamente), pero el código de estado es
incorrecto: debería ser 401/403. Comportamiento **preexistente**, no introducido por PT-078.

**H-02 — MercadoPago usa dos espacios de identificadores distintos como `paymentId`.**
`mercadopago.provider.ts:210` devuelve `order.id` en la rama de la Orders API, y `:222`
devuelve `paymentInfo.id` en la rama de la Payments API legacy. En la prueba V-01 la orden
`ORDTST01KYEDNWKHXHCS58ZPA3GESWMT` contenía además un pago `PAY01KYEDNWM3EHE6WWKPJ4228D91`.

Si un mismo pago pudiera notificarse por ambas rutas, las claves de deduplicación serían
distintas y se acreditaría dos veces. **No se ha observado que ocurra** —en la prueba solo
llegó la notificación de orden— pero el escenario D-07 del Proposal Package asumía que ambas
rutas producen la misma clave, y eso **no está demostrado**. Requiere verificación explícita.

**H-03 — El importe se resuelve de forma distinta según el proveedor.**
PayPal informa `result.amount` normalizado; MercadoPago depende de
`metadata.transaction_amount`. Funciona, pero son dos contratos conviviendo en la misma
cadena de extracción. Candidato a homogeneización.
