# test-scenarios.md — PT-080

**U** unitario · **I** integración (BD real) · **R** contra la pasarela real (arnés, sin túnel)

---

## Fase A — Entrada de notificaciones

| ID | Nivel | Escenario | Esperado |
|---|---|---|---|
| A-01 | U | Notificación **IPN** (`topic=payment&id=<num>`) | Se normaliza y **se procesa** (hoy: 500) |
| A-02 | U | Notificación **Webhooks** (`data.id` + firma válida) | Se procesa igual que hoy |
| A-03 | U | Webhooks con firma **inválida** | **401**, sin acreditar |
| A-04 | U | Webhooks sin `x-signature` / `x-request-id` | **401** |
| A-05 | U | IPN: nunca se confía en el payload | La acreditación usa **solo** la respuesta de la API |
| A-06 | U | IPN cuya consulta a la API devuelve rechazado | No acredita |
| A-07 | U | `topic=merchant_order` | Se confirma en `/merchant_orders/{id}` |
| A-08 | U | Id `PAY...` | **Nunca** se consulta contra `/v1/orders` |
| A-09 | U | Topic desconocido | Ignorado, 2xx, registrado |
| A-10 | R | Entrega real en formato IPN | Acredita |
| A-11 | R | Entrega real en formato Webhooks | Acredita (regresión de hoy) |

## Fase A — Identificador canónico

| ID | Nivel | Escenario | Esperado |
|---|---|---|---|
| A-12 | U | `topic=payment` | `data.id` es el canónico, sin consulta extra |
| A-13 | U | `topic=order` | Se resuelve por `external_reference` al id numérico |
| A-14 | I | **El mismo pago por orden y por pago** | **Una sola acreditación** (hoy: dos) |
| A-15 | U | `search` devuelve varios aprobados | `ANOMALY`, no acredita, `RefundRequest` |
| A-16 | U | `search` no devuelve nada | No acredita; el ciclo sigue abierto para reintento |

## Fase B — Invariante de las tres fases

| ID | Nivel | Escenario | Esperado |
|---|---|---|---|
| B-01 | I | Solicitud → confirmación → persistencia coherentes | `SETTLED`, acredita, emite `PaymentCompletedEvent` |
| B-02 | I | Importe confirmado ≠ solicitado | `ANOMALY`, **no acredita**, solicitud abierta |
| B-03 | I | Moneda distinta | `ANOMALY` |
| B-04 | I | Usuario distinto al de la solicitud | `ANOMALY` |
| B-05 | I | Confirmación sin solicitud previa | Evento registrado con `cycleId` nulo; no acredita |

## Fase B — Primera respuesta gana

| ID | Nivel | Escenario | Esperado |
|---|---|---|---|
| B-06 | I | Segunda respuesta tras cerrar | `CANCELLED`, sin efecto sobre el resultado |
| B-07 | I | Primera respuesta **negativa**, segunda positiva | El ciclo queda `FAILED`; la segunda se cancela |
| B-08 | I | Reentrega idéntica ×3 | `DUPLICATE`, 2xx, una sola acreditación |
| B-09 | I | Duplicado | **No** lanza la excepción mapeada a 409 |
| B-10 | I | Dos cobros distintos bajo la misma referencia | `ANOMALY` + `RefundRequest` automático |

## Fase B — Vía garantizada

| ID | Nivel | Escenario | Esperado |
|---|---|---|---|
| B-11 | R | **Pago real aprobado sin notificación** | Se acredita por consulta (el caso de los 180 MXN) |
| B-12 | I | Cadencia | `T+1m · 5m · 15m · 1h · 6h · cada 12h` |
| B-13 | I | 72 h sin resolver | `EXPIRED`, **sin acreditar**, visible |
| B-14 | I | Pago en efectivo pendiente a las 48 h | Sigue `REQUESTED`, **no** expira antes de tiempo |
| B-15 | I | Carrera webhook / consulta sobre el mismo pago | **Una sola acreditación** |
| B-16 | I | Consulta sobre ciclo ya cerrado | No hace nada |

## Fase C — Modularidad

| ID | Nivel | Escenario | Esperado |
|---|---|---|---|
| C-01 | U | Adaptador ficticio registrado | Se resuelve **sin tocar** `payments.service.ts` |
| C-02 | U | Adaptador ficticio eliminado | Suite verde, sin editar el servicio |
| C-03 | U | Alias en minúsculas (`/webhook/mercadopago`) | Resuelve (regresión de PT-064) |
| C-04 | U | Cada adaptador normaliza su importe | El núcleo no conoce `transaction_amount` ni `mc_gross` |
| C-05 | U | Proveedor sin configurar | No se ofrece en `/payments/providers` |
| C-06 | U | MercadoPago configurado | **Sí** se ofrece (guarda R-12 de PT-076) |

## Regresión

| ID | Nivel | Escenario | Esperado |
|---|---|---|---|
| R-01 | R | Depósito real por MercadoPago | Acredita como hoy |
| R-02 | R | Reentrega ×3 | Sin doble acreditación |
| R-03 | U | PayPal conserva la captura en dos fases | 31 tests de PT-076 verdes |
| R-04 | I | Retiro del vendedor | Sin cambios |
| R-05 | E2E | Suite QA por navegador | 148/148 |
| R-06 | U | Extracción de importe de Stripe | Sin cambios |

---

**58 escenarios.** Ninguno requiere túnel ni credenciales de PayPal: los marcados **R** usan el
arnés contra la API real de Mercado Pago, que ya funciona.
