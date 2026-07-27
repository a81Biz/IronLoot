# Evidencia — PT-087

**Fecha**: 2026-07-27 · **Rama**: `fix/PT-087-garantias-por-proveedor`

## Lo verificado contra la pasarela real

Credenciales de sandbox reales. Ningún resultado de esta página proviene de un doble de prueba.

### Descubrimientos sobre la cuenta de PayPal

| Comprobación | Resultado |
|---|---|
| OAuth2 `client_credentials` | HTTP 200, token ~9 h, `app_id=APP-3A4645787U352753E` |
| Scopes concedidos | **21**, incluidos `payments/refund`, `payments/payouts`, `applications/webhooks`, `disputes/*`, `invoicing`, `subscriptions` |
| Alta de webhook por API | **Aceptada sin validar que la URL responda** → `79912641J8336873F` |

Dos correcciones a lo que se había afirmado antes: **Payouts no necesita aprobación** de cuenta
(el scope está concedido), y **el `PAYPAL_WEBHOOK_ID` no había que pedirlo** — `applications/webhooks`
permite crearlo por API.

### El fallo, observado

Orden `6D025229D0199593K`, 321.50 MXN, aprobada por el comprador en el checkout real:

```
ciclo:    REQUESTED   check_count=0   canonical=NULL
traza:    DEPOSIT_REQUESTED            ← una sola entrada
monedero: no existe
```

Tres ciclos de PayPal habrían caducado a las 72 h sin acreditar.

### Tras la corrección, mismo pago

```
PROVIDER_CONFIRM  .../v2/checkout/orders/6D025229D0199593K          200   429ms
PROVIDER_CONFIRM  .../v2/checkout/orders/6D025229D0199593K/capture  201  1376ms
POLL_ATTEMPT      OK
CYCLE_DECISION    PROCESSED
WALLET_CREDITED   OK   (PAYPAL)
```

`ledger: DEPOSIT 321.50 saldo 0.00->321.50` — monedero creado por el propio depósito.

### Cadena completa, sin intervención

Orden `5P679773ED727682X`: `provider_ref` guardado **solo**, comprador aprueba, el cron encuentra,
captura y acredita. Saldo 321.50 → 643.00. **Sin un solo webhook.**

### Fase QA 71 — 17/17

Ejecutada contra la pasarela real con navegador headless:

```
QA-PP-05  El comprador aprueba en el checkout real           status=APPROVED
QA-PP-06  Ninguna notificacion llego                         0 notificaciones
QA-PP-07  La via garantizada cierra el ciclo sin notificacion status=SETTLED
QA-PP-08  El sondeo CAPTURA la orden aprobada                status=COMPLETED
QA-PP-09  El monedero se acredita por el importe exacto      798.75 → 1120.25
QA-PP-10  El asiento contable existe y es UNO solo           1 filas
QA-PP-14  Ninguna credencial de PayPal quedo persistida      coincidencias=0
QA-PP-15  Un webhook fabricado se rechaza con 401            HTTP 401
=== PAYPAL VIA GARANTIZADA === total=17 PASS=17 FAIL=0 SKIP=0
```

### No regresión de Mercado Pago

Cobro real `ORDTST01KYGNZX26XT51S4T7H5GZQQ8J`, pago canónico `170708390362`, notificación firmada
HTTP 201. Traza de siete pasos íntegra, ciclo `SETTLED`, acreditado 155.75.

### Cuadre final

```
ledger   suma: 798.75
payments suma: 798.75
wallet   saldo: 798.75
```

## Suites

API **57 suites / 375 tests** · CORE **8 / 134** · `typecheck` limpio · `lint` 0 errores.
Tests nuevos: 19 (garantías por proveedor y de PayPal) + 10 (integridad de acreditación) + 3
(idempotencia del asiento) + 3 (reconciliación por registro).

## Hallazgos resueltos en este mismo ciclo

| # | Hallazgo | Cómo se encontró |
|---|---|---|
| F-06 | PayPal no dejaba traza | Traza real con **una** entrada |
| F-07 | PayPal sin vía garantizada | `lookup()` devolvía `null` para todo lo que no fuera MP |
| F-08 | Firma inválida ⇒ 500 en vez de 401 | Webhook fabricado contra la API |
| F-09 | El ciclo se cerraba antes de acreditar | 321.50 capturados, `SETTLED`, usuario sin nada |
| F-10 | Un depósito fallaba si el monedero no existía | `NotFoundException: Wallet not found` en el cron |
| F-11 | La traza atribuía a MERCADO_PAGO las acreditaciones de PayPal | `provider` en duro en `creditWallet` |
| F-12 | El asiento contable se duplicaba al reintentar | 3 filas de 321.50 para 2 pagos |

F-09..F-12 no existían en el alcance inicial: aparecieron **al verificar** la corrección de
F-06..F-08, y se resolvieron aquí en vez de dejarlos anotados.
