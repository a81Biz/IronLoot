# F6 — Domain Acid Test

**Estado**: COMPLETADA  
**Fecha**: 2026-06-23  
**Confidence**: 87%  
**Dimensión principal**: D1 — Domain Alignment

---

## Alcance

F6 evalúa el output semántico real de cada producto contra las reglas de F-1 (CR-001 a CR-015). No evalúa tests unitarios — evalúa si el código producirá el output de negocio correcto.

Niveles aplicables:
- Nivel 1: Reglas de negocio (CR-001 a CR-015)
- Nivel 2: Taxonomía / Rubric compliance  
- Nivel 3: Coherencia inter-producto
- Nivel 4: AI Guardrails → **NO_APLICA** (sistema determinista)

---

## Nivel 1 — Verificación de Reglas de Negocio (CR-001 a CR-015)

### CR-001 — Balance nunca puede ser negativo
**Verificación**: `WalletService.holdFunds()` lanza `InsufficientBalanceException` cuando `balance < amount`. `WalletService.withdraw()` idem. `prisma.$transaction()` con check pre-mutación.  
**Estado**: ✅ VERIFICADA  
**Confianza**: 95%

### CR-002 — Soft-close: nueva puja extiende subasta por AUCTION_SOFT_CLOSE_WINDOW_SEC
**Verificación**: `BidsService` define `EXTENSION_MS = 5 * 60 * 1000` (300s). `AuctionSchedulerService.getSoftCloseWindowSec()` lee 120s de config. Los valores son distintos y la configuración no tiene efecto sobre BidsService.  
**Estado**: ❌ VIOLADA  
**Finding**: H-001 (D1, ALTA, penalización -15)  
**Confianza**: 95%

### CR-003 — Fondos bloqueados al pujar: held_funds += bid.amount, balance -= bid.amount
**Verificación**: `WalletService.holdFunds()` atomicamente resta de balance y suma a held_funds en `prisma.$transaction()`. `WalletCalculation.canLockFunds()` de @ironloot/core valida pre-condición.  
**Estado**: ✅ VERIFICADA  
**Confianza**: 95%

### CR-004 — Depósito requiere coincidencia exacta de monto con payment record
**Verificación**: `WalletController.deposit()` verifica `payment.status !== 'COMPLETED'` y `payment.amount !== dto.amount` → `PaymentMismatchException`. Doble control: status y monto.  
**Estado**: ✅ VERIFICADA  
**Confianza**: 92%

### CR-005 — Ganador = puja más alta activa al cierre
**Verificación**: `AuctionSchedulerService.closeAuction()` usa `Bid.findFirst({ orderBy: { amount: 'desc' }, where: { status: 'ACTIVE' } })`.  
**Estado**: ✅ VERIFICADA  
**Confianza**: 90%

### CR-006 — Fondos de no-ganadores liberados al cierre
**Verificación**: `AuctionSchedulerService.closeAuction()` libera `held_funds` de todos los bidders excepto el ganador via `WalletService.releaseFunds()` en loop.  
**Estado**: ✅ VERIFICADA  
**Confianza**: 90%

### CR-007 — Disputa solo abierta dentro de 14 días post-entrega
**Verificación**: `DisputesService` usa `DisputeStateMachine.windowDays` de @ironloot/core para validar la ventana.  
**Estado**: ✅ VERIFICADA  
**Confianza**: 88%

### CR-008 — Webhooks de pago validados via HMAC antes de procesar
**Verificación**: Todos los providers (MercadoPago, PayPal, HeyBanco) validan HMAC antes de cualquier mutación. `WebhookSignatureValidator.validateHmacSignature()` de @ironloot/core para MercadoPago.  
**Estado**: ✅ VERIFICADA  
**Confianza**: 93%

### CR-009 — Retiro requiere método de pago registrado del usuario
**Verificación**: La validación está comentada en `WalletController.withdraw()`. El sistema acepta cualquier `referenceId`.  
**Estado**: ❌ PARCIALMENTE VIOLADA (stub/mock en producción)  
**Finding**: H-004 (D2, MEDIA, penalización -5)  
**Nota**: Clasificado en D2 (arquitectural) no D1 porque el PRD Out-of-Scope reconoce el stub. La regla de dominio no está violada por diseño sino por deuda técnica documentada. D1 no penaliza por esto.  
**Confianza**: 88%

### CR-010 — 2FA requerido para usuarios con 2FA activado
**Verificación**: `AuthService` verifica `user.twoFactorEnabled` y si true, valida TOTP antes de emitir tokens.  
**Estado**: ✅ VERIFICADA  
**Confianza**: 90%

### CR-011 — Toda transacción gravable genera CfdiRecord válido (UUID SAT, XML firmado)
**Verificación**: `CfdiService` es un stub. No genera CFDI reales. Schema `cfdi_records` existe pero no hay integración PAC.  
**Estado**: ❌ VIOLADA  
**Finding**: H-005 (D1, ALTA, penalización -15)  
**Confianza**: 98%

### CR-012 — Toda mutación de wallet genera LedgerEntry inmutable
**Verificación**: `WalletService.[deposit|withdraw|holdFunds|releaseFunds]` — todos crean `LedgerEntry` dentro de `prisma.$transaction()`. No hay ruta de código que mute wallet sin ledger.  
**Estado**: ✅ VERIFICADA  
**Confianza**: 95%

### CR-013 — Usuarios BANNED no pueden autenticarse
**Verificación**: `AuthService` verifica `user.state === UserState.BANNED` → throw `ForbiddenException`.  
**Estado**: ✅ VERIFICADA  
**Confianza**: 92%

### CR-014 — Límite diario de retiro 5000 MXN
**Verificación**: `WalletController.withdraw()` verifica `dailyWithdrawn + dto.amount > DAILY_LIMIT` (5000). Control activo.  
**Estado**: ✅ VERIFICADA  
**Confianza**: 92%  
**Nota**: Valor hardcodeado como constante — no configurable, pero correcto.

### CR-015 — Montos financieros en Decimal, nunca Float
**Verificación**: `schema.prisma` — todos los campos monetarios son `Decimal(10,2)` o `Decimal(12,2)`. No hay `Float` en entidades financieras.  
**Estado**: ✅ VERIFICADA  
**Confianza**: 98%

---

## Resumen Nivel 1

| CR | Estado | Finding |
|---|---|---|
| CR-001 | ✅ | — |
| CR-002 | ❌ VIOLADA | H-001 |
| CR-003 | ✅ | — |
| CR-004 | ✅ | — |
| CR-005 | ✅ | — |
| CR-006 | ✅ | — |
| CR-007 | ✅ | — |
| CR-008 | ✅ | — |
| CR-009 | PARCIAL (stub) | H-004 (D2) |
| CR-010 | ✅ | — |
| CR-011 | ❌ VIOLADA | H-005 |
| CR-012 | ✅ | — |
| CR-013 | ✅ | — |
| CR-014 | ✅ | — |
| CR-015 | ✅ | — |

**13/15 CRs verificadas** (2 violadas, 1 parcial-deuda técnica clasificada D2)

---

## Nivel 2 — Rubric Compliance

El sistema IronLoot no tiene taxonomía de calificación externa (no es un sistema de recomendación, búsqueda semántica, ni generación de contenido). La rubric de dominio es implícita en las CR.

**Rubric compliance score**: N/A — sustituido por CR verification rate = 87% (13/15 complete)

---

## Nivel 3 — Coherencia Inter-Producto

| Relación | Verificación | Estado |
|---|---|---|
| P-001 (Bid) → P-002 (AuctionResult) | Bid ganador determina el cierre + Order | ✅ |
| P-001 (Bid) → P-005 (WalletTransaction) | holdFunds al pujar, releaseFunds al ser superado | ✅ |
| P-002 (AuctionResult) → P-006 (Order) | OrdersService invocado por closeAuction | ✅ |
| P-004 (PaymentWebhook) → P-005 (WalletTransaction) | deposit() solo tras COMPLETED + amount match | ✅ |
| P-005 (WalletTransaction) → P-009 (CfdiRecord) | ESPERADO: CFDI por transacción — CADENA ROTA | ❌ H-005 |
| P-006 (Order) → P-007 (DisputeRecord) | Dispute requiere Order en estado DELIVERED | ✅ |
| P-008 (AuthToken) → P-010 (PageRenderSSR) | Token extraído del cookie para llamadas SSR | ✅ |

---

## Score D1

Penalizaciones:
- H-001: ALTA → -15
- H-005: ALTA → -15

**D1 = 100 - 15 - 15 = 70**

Regla del Agua Potable: D1 = 70 ≥ 60 → **NO ACTIVADA**

---

## Update U-004 — DS-004 (2026-07-27)

Domain Acid Test Nivel 1 ejecutado **sobre la salida real en BD** (`[R55]`), con los productos de
la corrida completa de QA del 27-jul: pujas reales, subastas cerradas, dos pagos por pasarelas de
verdad, retiros y asientos.

**11 de 12 invariantes cumplen. Ninguna violación.** El único sin datos es CFDI (H-005).

Se añadieron tres invariantes que no estaban en `CR-001…CR-015` porque el dominio los exige: el
cuadre del último `balance_after` contra el balance, que todo pago `COMPLETED` tenga asiento, y que
ninguna referencia tenga asiento duplicado. Son las garantías que PT-087 introdujo tras encontrar
lo contrario. Las tres pasan.

Evidencia: **E-010**. Limitación declarada: muestra pequeña (3 monederos, 3 pujas, 2 pagos); no es
volumen de producción.


---

## Update U-005 — DS-008 (2026-07-27): Niveles 2 y 3 ejecutados

Hasta ahora sólo se había corrido el **Nivel 1** (reglas de negocio). `[R38]` exige además
`rubric = 100` ∧ `¬drift` ∧ `cross_coherence` para que un producto llegue a `VALIDADO`.

### Corrección de premisa

Se dio por hecho en DS-006 y DS-007 que **«las rúbricas no están definidas en F-1»**. Era falso:
F-1 §5 las declara, y ya adaptadas a un sistema transaccional —«la rúbrica es la correcta
aplicación de reglas de negocio y validaciones»— con cinco bloques y una lista de vocabulario
prohibido.

Lo que faltaba no era escribirlas: era **ejecutarlas y pesarlas**.

### Nivel 2 — `rubric_compliance_score`

Once criterios derivados de F-1 §5, con pesos que reflejan lo que el dominio no puede permitirse
(el dinero pesa más):

| Criterio | Peso | Resultado |
|---|--:|:--|
| 5.1a Toda operación crea sus registros relacionados | 20 | ✅ |
| 5.1b Toda transacción de dinero tiene entrada de Ledger | 25 | ✅ |
| 5.1c Todo cierre con ganador crea pedido | 15 | ✅ |
| 5.1d Toda venta liquidada registra su comisión | 15 | ✅ *(lo cerró PT-114)* |
| 5.2a El ledger cuadra con el balance | 15 | ✅ |
| 5.2b Cada asiento tiene tipo del catálogo | 5 | ✅ |
| 5.3a Webhook con firma inválida rechazado antes de procesar | 10 | ✅ |
| 5.3b Depósito verificado contra el proveedor | 10 | ✅ |
| 5.4a Disputas respetan la ventana de 14 días | 10 | ✅ *(0 fuera de plazo en datos reales)* |
| 5.4b Soft-close configurable | 5 | ✅ *(`system_config` = 120)* |
| 5.5a Ningún error expone traza interna | 10 | ✅ *(JSON con `traceId`, sin stack)* |

```
rubric_compliance_score = round(100 × 140/140) = 100
```

> **Los tres últimos se ejecutaron en vivo, no por inspección.** En una primera pasada los di por
> buenos leyendo el código, y eso es más débil que consultar la salida. Se rehicieron: `0` disputas
> fuera de plazo sobre datos reales, la clave leída de `system_config`, y una petición de error real
> devolviendo JSON estructurado sin traza.

### Nivel 3 — `cross_coherence_verified`

| Upstream → Downstream | Regla | Resultado |
|---|---|:--|
| P-001 → P-002 | El precio final == la puja más alta | ✅ 0 |
| P-002 → P-003 | El importe del pedido == el precio final | ✅ 0 |
| P-003 → P-010 | La comisión == el % aplicado al importe | ✅ 0 |
| P-010 → P-009 | El registro de comisión == el asiento `FEE_PLATFORM` | ✅ 0 |
| P-004 → P-009 | El depósito acreditado == el pago del proveedor | ✅ 0 |
| P-003 → P-006 | Toda disputa cuelga de un pedido existente | ✅ 0 |
| P-005 → P-009 | El último `balance_after` == el balance | ✅ 0 |
| P-011 → vendedor | Ningún vendedor habilitado sin KYC aprobado | ✅ 0 |
| P-008 → usuarios | Ninguna sesión sin usuario real | ✅ 0 |
| **P-002 → P-007** | **El tipo del aviso corresponde al evento** | ❌ **1** → **H-012** |

`[R56]`: una incoherencia downstream marca la cadena. Aquí queda **acotada a P-007**: el aviso al
vendedor reutiliza `AUCTION_WON` porque el catálogo no tiene `AUCTION_SOLD`. No contradice al
upstream —la subasta sí se cerró y sí se vendió— sino que **etiqueta mal el evento**.

### Veredicto por producto

| Producto | Nivel 1 | Nivel 2 | Nivel 3 | Apto para `VALIDADO` |
|---|:--:|:--:|:--:|:--|
| P-001 Bid | ✅ | ✅ 100 | ✅ | **Sí** |
| P-002 AuctionClose | ✅ | ✅ 100 | ✅ | **Sí** |
| P-003 Order | ✅ | ✅ 100 | ✅ | **Sí** |
| P-004 Payment | ✅ | ✅ 100 | ✅ | **Sí** |
| P-005 WalletTransaction | ✅ | ✅ 100 | ✅ | **Sí** |
| P-006 Dispute | ✅ | ✅ 100 | ✅ | **Sí** |
| **P-007 Notification** | ✅ | ✅ 100 | ❌ | **No** — H-012 |
| P-008 JwtToken | ✅ | ✅ 100 | ✅ | **Sí** |
| P-009 LedgerEntry | ✅ | ✅ 100 | ✅ | **Sí** |
| P-010 CommissionRecord | ✅ | ✅ 100 | ✅ | **Sí** |
| P-011 KycSubmission | ✅ | ✅ 100 | ✅ | **Sí** |
| **P-012 CfdiRecord** | ⚠️ sin instancias | — | — | **No** — H-005 |

**Diez de doce cumplen `[R38]`.**

> **No se aplica la transición.** `[R39]` permite al auditor moverlos con esta evidencia, pero el
> humano pidió ver el proceso antes de dar el visto bueno. Los diez quedan **aptos y a la espera**.

---

## Update U-006 — S-002 (2026-07-27): el Acid Test, otra vez sobre salida real

`npm run audit:domain`, contra `ironloot_db` en marcha.

### Nivel 1 y 2 — 14 reglas, 14 cumplen

`rubric_compliance_score = **100**`. Ninguna violación. Incluye las tres que PT-087 introdujo
después de encontrar lo contrario: el cuadre del último `balance_after` del ledger contra el balance
del monedero, que todo pago `COMPLETED` tenga asiento, y que ningún depósito se acredite dos veces.

### Nivel 3 — coherencia inter-producto

5 parejas upstream→downstream, **0 desviaciones**. `cross_coherence_verified = true`.

La corrección de H-012 se ve ahora en **datos**, no sólo en el catálogo: hay un `AUCTION_SOLD` real
en `notifications`.

### Nivel 4 — `NO_APLICA`

Sistema determinista, sin LLM. Sin cambios respecto a F-1.

### Cobertura de esta ejecución — dicho sin adornos

10 de 12 productos tienen salida real en la base hoy:

```
 bids 3 · auctions 1 (CLOSED) · orders 1 · payments 1 · payment_cycles 4 · wallets 4
 ledger 15 (9 tipos) · notifications 4 · commission_records 1 · kyc 1 (APPROVED)
 withdrawal_requests 2 · sessions 25
 disputes 0 · cfdi_records 0
```

**P-012** sigue sin instancias por H-005. **P-006 (Dispute) tampoco tiene ninguna**: la base se
reconstruyó después de DS-008 y las disputas que E-015 observó ya no están. E-015 sigue siendo una
captura válida de lo que hubo, pero **hoy no es reproducible**. P-006 conserva `VALIDADO` por esa
evidencia, con la salvedad anotada en F3 (U-006).

La muestra sigue siendo pequeña — 4 monederos, 3 pujas, 1 pago liquidado. Demuestra que los
invariantes no se violan en el camino observado; **no** que sean inviolables bajo concurrencia.

### Score D1 — S-002

```
100 − 15 (H-005, ALTA, ABIERTA) = 85
```

Sin cambio respecto a DS-008. H-010, H-011 y H-012 están CERRADA y no penalizan.

---

## Update U-007 — 2026-07-29 (S-004-M, medicion dirigida)

**El Domain Acid Test, por fin sobre salida real y no sobre una base vacia.**

`run-all.sh` genero la salida (3 usuarios, 1 subasta, 3 pujas, 1 pago, 3 ciclos de pago, 12 asientos del
ledger, 19 eventos de traza, 2 retiros) y **D1 se midio en la misma sesion** — la ventana se habia cerrado
dos veces antes (S-002 y S-003), porque `run-all.sh` trunca la base al empezar.

**12 de las 14 reglas medidas, las 12 CUMPLEN.** En S-004 solo se pudo medir 1.

```
  rubric_compliance_score = 100
  Sin datos (fuera del denominador): R-5.1a, R-5.1d
```

Y las que miden dinero de verdad cumplen **sobre salida real**, no sobre un test:

| Regla | Peso | Que garantiza |
|---|---:|---|
| `CR-003` | 25 | El ultimo `balance_after` del ledger coincide con el saldo del monedero |
| `CR-004` | 20 | El deposito acreditado coincide con el pago del proveedor |
| `R-5.1b` | 25 | Todo pago `COMPLETED` tiene su asiento de deposito |
| `R-5.1c` | 25 | Ningun deposito se acredito dos veces |
| `R-5.3b` | 15 | Ningun vendedor habilitado sin KYC aprobado |

`CR-003` es la que cierra el circulo de **RULE-24**: los siete caminos que mueven saldo leen bloqueando la
fila, y el invariante ledger-vs-saldo se cumple sobre 12 asientos reales.

**Las dos `n/d` son legitimas y se comprobo antes de concluir**: `R-5.1a` («toda subasta cerrada con pujas
genera pedido») y `R-5.1d` («toda venta liquidada registra su comision») salen sin datos porque hay **0
subastas en `CLOSED`** — la unica subasta sigue abierta, y la suite no espera los 120 s de la ventana de
cierre. **No es una violacion de dominio**; es un flujo que la suite no llega a completar.

**Consecuencia para la proxima medicion:** para cubrir esas dos reglas —y con ellas el pedido, la comision
y la liquidacion— hace falta una corrida que **cierre** una subasta. Es el unico hueco que queda en D1, y
es de la suite, no del producto.

Evidencia: **E-032**.
