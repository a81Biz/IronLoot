# test-scenarios.md — PT-076

Cada escenario mapea a uno o más criterios de aceptación de `ENRICHMENT.md` §3.

Niveles: **U** unitario (red simulada) · **I** integración (BD real) · **E2E** sandbox real de PayPal.

---

## Configuración y disponibilidad

| ID | Nivel | Escenario | Esperado | CA |
|---|---|---|---|---|
| T-01 | U | `checkStatus()` con ClientID + Secret + WebhookID presentes | `true` | CA-03 |
| T-02 | U | `checkStatus()` con cualquiera de los tres ausente | `false` | CA-03 |
| T-03 | U | `getAvailableProviders()` con PayPal desconfigurado | No incluye `PAYPAL` | CA-01 |
| T-04 | U | `getAvailableProviders()` con MP configurado | **Sí** incluye `MERCADO_PAGO` (guarda de R-12) | CA-01, CA-15 |
| T-05 | I | UI de depósito con PayPal desconfigurado | La opción PayPal no se renderiza | CA-02 |

## Token OAuth2

| ID | Nivel | Escenario | Esperado | CA |
|---|---|---|---|---|
| T-06 | U | Primera llamada | Solicita token y lo cachea | CA-04 |
| T-07 | U | Segunda llamada dentro de la validez | Reutiliza el cacheado; **no** vuelve a pedirlo | CA-04 |
| T-08 | U | Llamada con token dentro del margen de 60s de expiración | Renueva de forma proactiva | CA-04 |
| T-09 | U | API responde 401 con token cacheado | Renueva y reintenta **una** vez | CA-04, R-07 |
| T-10 | U | El reintento vuelve a dar 401 | Error propagado, sin bucle | CA-04 |

## Creación de orden

| ID | Nivel | Escenario | Esperado | CA |
|---|---|---|---|---|
| T-11 | U | Depósito de 500 MXN | Cuerpo con `intent=CAPTURE`, `currency_code=MXN`, `value="500.00"` | CA-05 |
| T-12 | U | Referencia de usuario | `custom_id = DEP-<userId>-<timestamp>` | CA-13 |
| T-13 | U | Cabecera de idempotencia | `PayPal-Request-Id` presente y estable para la misma orden | CA-05 |
| T-14 | U | Respuesta con `rel: "payer-action"` | Devuelve esa URL | CA-06 |
| T-15 | U | Respuesta con `rel: "approve"` (formato antiguo) | Devuelve esa URL | CA-06, R-08 |
| T-16 | U | Respuesta sin ninguno de los dos | Error explícito, **no** `undefined` propagado | CA-06 |
| T-17 | U | URLs de retorno | Apuntan a CLIENT (5175), nunca a 5173 | CA-14 |

## Webhook — verificación de firma

| ID | Nivel | Escenario | Esperado | CA |
|---|---|---|---|---|
| T-18 | U | Firma válida (`verification_status: SUCCESS`) | Procesa el evento | CA-08 |
| T-19 | U | Firma inválida (`FAILURE`) | **Rechaza**, no acredita, log de error | CA-11 |
| T-20 | U | Falta alguna cabecera `PAYPAL-*` | Rechaza sin llamar a PayPal | CA-11 |
| T-21 | U | `PAYPAL_WEBHOOK_ID` no configurado | Error de configuración, no acredita | CA-11 |

## Webhook — despacho y captura

| ID | Nivel | Escenario | Esperado | CA |
|---|---|---|---|---|
| T-22 | U | `CHECKOUT.ORDER.APPROVED` | Llama a `/capture` y devuelve `null` (no acredita todavía) | CA-07 |
| T-23 | U | La captura devuelve error | No-2xx, para que PayPal reintente (R-10) | CA-07 |
| T-24 | U | `PAYMENT.CAPTURE.COMPLETED` | `WebhookResult{status:'COMPLETED', amount, externalId: custom_id}` | CA-08, CA-13 |
| T-25 | U | Evento no suscrito (p. ej. `PAYMENT.CAPTURE.DENIED`) | `null`, sin acreditar | CA-11 |

## Extracción de importe — guarda de regresión

| ID | Nivel | Escenario | Esperado | CA |
|---|---|---|---|---|
| T-26 | U | PayPal: `result.amount = 500` | Acredita 500 | CA-09 |
| T-27 | U | **MercadoPago**: sin `amount`, con `transaction_amount` | Acredita por `transaction_amount` — comportamiento **idéntico al actual** | CA-09, CA-15 |
| T-28 | U | **Stripe**: sin `amount`, con `amountTotal` en centavos | Acredita `amountTotal/100` — idéntico al actual | CA-09 |
| T-29 | U | Ningún campo de importe resoluble | No acredita; log de error | CA-09 |
| T-30 | U | Importe con decimales (`"99.99"`) | Acredita exactamente 99.99, sin redondeo | CA-10 |

## Idempotencia

| ID | Nivel | Escenario | Esperado | CA |
|---|---|---|---|---|
| T-31 | I | Mismo `id` de evento entregado dos veces | Una sola acreditación; segunda responde 200 | CA-12 |
| T-32 | I | Dos entregas **concurrentes** del mismo evento | Una sola fila en el ledger (la transacción resuelve la carrera) | CA-12 |
| T-33 | I | Dos eventos **distintos** del mismo usuario | Dos acreditaciones — la dedup no es por usuario | CA-12 |

## Referencia de usuario

| ID | Nivel | Escenario | Esperado | CA |
|---|---|---|---|---|
| T-34 | U | `custom_id` con UUID con guiones | `userId` extraído correctamente | CA-13 |
| T-35 | U | `custom_id` que no casa el patrón `DEP-<uuid>-<ts>` | No acredita; log de error | CA-13 |

## End-to-end (sandbox real) — bloqueados por credenciales

| ID | Nivel | Escenario | Esperado | CA |
|---|---|---|---|---|
| T-36 | E2E | Depósito de 500 MXN completo | Wallet +500 MXN, asiento `DEPOSIT` en ledger, verificado **por consulta a BD** | CA-05, CA-07, CA-08, CA-10 |
| T-37 | E2E | El comprador cancela en PayPal | Retorno a `deposit-cancel`, **sin** cambio de saldo | CA-14 |
| T-38 | E2E | El comprador aprueba y cierra el navegador sin volver | La captura ocurre igualmente vía webhook (valida AD-01) | CA-07 |
| T-39 | E2E | Reenvío manual del webhook desde el dashboard de PayPal | Sin doble acreditación | CA-12 |
| T-40 | E2E | Depósito de 99.99 MXN | Acredita exactamente 99.99 | CA-10 |

## Regresión

| ID | Nivel | Escenario | Esperado | CA |
|---|---|---|---|---|
| T-41 | E2E | Depósito real por MercadoPago tras los cambios | Acredita igual que en la línea base de PT-076.1 | CA-15 |
| T-42 | E2E | Suite QA por navegador completa | 100% verde | CA-15 |
| T-43 | I | Retiro del vendedor (PT-069..072) | Sin cambio de comportamiento | CA-15 |

---

## Cobertura

**43 escenarios**: 31 unitarios · 5 de integración · 7 end-to-end.

**38 ejecutables sin credenciales de PayPal.** Solo T-36..T-40 exigen sandbox real y túnel HTTPS. T-41..T-43 (regresión) necesitan entorno levantado y credenciales de MercadoPago, que ya existen.
