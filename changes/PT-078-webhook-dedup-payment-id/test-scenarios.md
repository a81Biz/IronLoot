# test-scenarios.md — PT-078

Nivel **U** = unitario con Prisma simulado. **Todos ejecutables sin credenciales.**

## Deduplicación por proveedor (criterio 1)

| ID | Escenario | Esperado |
|---|---|---|
| D-01 | PayPal: mismo `paymentId` entregado dos veces | Una sola acreditación |
| D-02 | **Mercado Pago**: mismo `paymentId` dos veces | Una sola acreditación (hoy acredita dos) |
| D-03 | **Stripe**: mismo `paymentId` dos veces | Una sola acreditación |
| D-04 | **Hey Banco**: mismo `paymentId` dos veces | Una sola acreditación |
| D-05 | La reserva se inserta con `{ provider, paymentId }` | Datos exactos verificados |

## El caso que motiva el PT (criterio 2)

| ID | Escenario | Esperado |
|---|---|---|
| D-06 | MP: dos notificaciones **distintas** (`payment.created`, `payment.updated`) sobre el mismo pago aprobado | **Una sola acreditación** |
| D-07 | Mismo pago llegando por la Orders API y por la Payments API legacy de MP | Una sola acreditación |

## Casos legítimos que NO deben bloquearse (criterio 3)

| ID | Escenario | Esperado |
|---|---|---|
| D-08 | Dos pagos distintos del mismo usuario | Dos acreditaciones |
| D-09 | Mismo `paymentId` en **proveedores distintos** | Dos acreditaciones (la clave es compuesta) |
| D-10 | Reintento del usuario tras un depósito fallido | Acredita: la clave es el pago, no la referencia |

## Concurrencia (criterio 4)

| ID | Escenario | Esperado |
|---|---|---|
| D-11 | Dos entregas concurrentes del mismo pago | Una sola acreditación |
| D-12 | La segunda recibe violación de unicidad (P2002) | Responde `{received:true}` sin acreditar |

## Fail-open (AD-02)

| ID | Escenario | Esperado |
|---|---|---|
| D-13 | `WebhookResult` sin `paymentId` | **Acredita** + registra error |
| D-14 | `paymentId` vacío | Igual que D-13 |

## Propagación unificada (AD-04)

| ID | Escenario | Esperado |
|---|---|---|
| D-15 | Fallo de acreditación en **Mercado Pago** | Libera reserva y **propaga** (sustituye a T-32c de PT-076) |
| D-16 | Fallo de acreditación en PayPal | Libera reserva y propaga (sin cambio) |
| D-17 | Error de BD distinto de P2002 al reservar | Propaga sin acreditar |

## Regresión (criterio 5)

| ID | Escenario | Esperado |
|---|---|---|
| D-18 | Extracción de importe: PayPal `amount`, MP `transaction_amount`, Stripe `amountTotal` | Sin cambios respecto a PT-076 |
| D-19 | `getAvailableProviders()` derivado de `checkStatus()` | Sin cambios |
| D-20 | Los 47 tests de PT-076 (salvo el bloque de dedup, reescrito) | Verdes |

**20 escenarios**, todos unitarios y sin dependencias externas.
