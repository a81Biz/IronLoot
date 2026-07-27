# ENRICHMENT — PT-092: verificar que la cuenta de cobro es del vendedor

**PT-092** | 2026-07-27 | FEATURE (+ BUG TD-003) | MAJOR | Rama: `feature/PT-092-verificacion-de-cuenta`
**Entrada**: `DISCOVERY.md` § PT-090 (TD-003 reescrita) · **Matriz**: item #5
**Decisión de producto del desarrollador** (refinada 2026-07-27): verificar **moviendo dinero de
verdad**, con un **token corto** como referencia del movimiento, y que el vendedor lo declare.
Los fondos salen **de su primera venta**, no de la plataforma. Alcance: **completo** — no hay
vendedores registrados todavía, así que activar el bloqueo no deja a nadie fuera.

## 1. El estado real, medido

| Hecho | Evidencia |
|---|---|
| El único destino de retiro es una **CLABE** | `UserPaymentMethod` tiene `clabe`, `bankName`, `holderName`; no hay campo de PayPal |
| `isVerified` nace `false` | `payments.service.ts:75` |
| **Nadie lo pone nunca a `true`** | `grep -rn "isVerified: true" src/` → vacío |
| **Nadie lo comprueba** | `getUserPaymentMethod()` filtra por `isActive`, no por `isVerified` |
| La dispersión del retiro es **manual** | `ManualPayoutProvider`; un admin marca `markPaid` |

Hoy se puede retirar a una CLABE que nadie ha confirmado. El dígito verificador se valida
(`isValidClabe`), lo que atrapa erratas de tecleo pero **no la titularidad**: una CLABE ajena
válida pasa igual.

## 2. La distinción que gobierna el diseño

> **Un cargo verifica el instrumento al que se cobra, no otro.**

Cobrar 20 MXN al PayPal del vendedor y devolvérselos demuestra que **ese PayPal es suyo**. No
demuestra nada sobre una CLABE, que es un instrumento distinto y puede ser de otra persona.

El ataque que quedaría abierto si se ignorara: el vendedor verifica con su propio PayPal, pasa la
comprobación, y registra como destino de retiro una CLABE ajena o de un tercero interpuesto. La
verificación diría «cuenta verificada» y el dinero saldría a la cuenta equivocada.

Por eso la propuesta separa los dos destinos, y la idea del cargo se aplica **donde sí prueba lo
que tiene que probar**.


## 2-bis. El diseño refinado — tres destinos, un solo mecanismo

La idea del cargo se generaliza: **el token viaja con el movimiento de dinero y solo lo ve quien
tiene acceso a la cuenta**.

| Destino | Movimiento | Dónde aparece el token | Reintegro |
|---|---|---|---|
| **PayPal** | Cargo de N y devolución | Nota del cobro | Devuelto (probado: `REFUNDED`) |
| **CLABE** | **Depósito** de N desde el saldo del vendedor | Concepto/referencia del SPEI | **Ninguno**: el dinero ya es suyo y llegó a su banco |
| **Tarjeta de débito** | Cargo de N con el token en el descriptor | Estado de cuenta de la tarjeta | Devuelto |

**Por qué el token gana a los céntimos aleatorios**: los céntimos pueden alterarse por comisiones
o redondeos del banco intermediario, y solo dan 100 combinaciones. Una referencia llega íntegra al
estado de cuenta y admite el espacio que se quiera.

**Por qué los fondos salen de la primera venta**: si la plataforma pagara cada verificación, dar
de alta cuentas en masa sería un vector para drenarla. Saliendo del saldo del propio vendedor, el
ataque desaparece y la verificación ocurre justo cuando ya hay dinero que retirar.

**Consecuencia para la CLABE**: la verificación **es** un retiro pequeño. Nada se pierde ni se
devuelve — los N pesos ya son del vendedor y acaban en su banco. Coste neto para todos: cero.

### Viabilidad técnica, comprobada

| Pieza | Estado |
|---|---|
| Cargo + devolución en PayPal | **Probado** contra sandbox: capturado `7DF26051AU788411U`, devuelto `448946423W681830A`, captura `REFUNDED` |
| Token en el estado de cuenta de una tarjeta | **Viable**: el SDK de Mercado Pago expone `statement_descriptor` |
| Referencia en el SPEI del micro-depósito | **Encaja**: `WithdrawalRequest.payoutReference` ya existe para el flujo manual |

## 3. Criterios de aceptación

### CA-01 — PayPal como destino de retiro
El vendedor puede registrar una cuenta de PayPal como destino, además de una CLABE.

### CA-02 — Verificación de PayPal por cargo y devolución
Al registrar un PayPal, el sistema **cobra un importe pequeño de céntimos aleatorios** a esa
cuenta y lo **devuelve** de inmediato. Si el cobro se completa, la cuenta queda `isVerified`.

- Verifica **existencia**, **operatividad** y **titularidad** en un solo paso.
- Es automático: no espera a nadie.
- Usa credenciales que ya tenemos (scope `payments/refund` concedido, comprobado el 2026-07-27).

### CA-03 — El reintegro va donde el vendedor elija
Terminada la verificación, el importe vuelve **a su monedero de IronLoot** o **a su PayPal**,
según elija. Por defecto, a PayPal (de donde salió: es el camino que menos explicación necesita).

### CA-04 — Verificación de CLABE por micro-depósito con token
Una CLABE **no se puede cobrar**: debitarla exige domiciliación. Se verifica al revés — se le
**envía** un importe fijo (**20 MXN**) desde el saldo del vendedor, con un **token corto** como
concepto del SPEI. El vendedor lee su estado de cuenta y declara el token.

- Requiere **saldo**, luego ocurre naturalmente tras la primera venta.
- **No se devuelve**: el dinero ya es suyo y llegó a su banco.
- **Restricción**: la dispersión es manual, así que el envío lo hace el administrador dentro del
  flujo que ya existe, usando `payoutReference`.

### CA-04-bis — Verificación de tarjeta de débito
Mismo mecanismo, invertido: se **cobra** N a la tarjeta con el token en `statement_descriptor` y
se devuelve. El vendedor declara el token que ve en su estado de cuenta.

### CA-05 — Sin verificar no se retira
`withdrawals.request` rechaza un método con `isVerified = false`. Es el cierre de TD-003 y el
motivo de todo lo demás.

### CA-06 — El intento de declarar el token está limitado
Máximo **5 intentos** por método. Agotados, queda bloqueado y requiere intervención del
administrador. El token se genera con `crypto` y tiene espacio suficiente para que la fuerza bruta
no sea viable, pero el límite es la defensa que no depende de esa suposición.

### CA-07 — La verificación caduca
Un micro-depósito no declarado en **7 días** vence. Una cuenta bancaria puede cerrarse; una
verificación abierta indefinidamente deja de significar nada.

### CA-08 — Todo el recorrido queda en la traza
Cada paso —cargo, devolución, envío, intento de declaración— se registra con el mecanismo de
PT-086. Es dinero moviéndose: aplica la misma regla que a los depósitos.

### CA-09 — El importe de verificación no es del usuario
El cargo de verificación **no acredita saldo** ni cuenta como depósito. Es un movimiento técnico
y debe distinguirse en el ledger para no contaminar la contabilidad.

## 4. Escenarios de prueba

| # | Escenario | Esperado |
|---|---|---|
| V-01 | Registrar PayPal y completar el cargo | `isVerified = true`, reintegro emitido |
| V-02 | El cargo de verificación falla (cuenta inexistente) | Sigue sin verificar, con motivo legible |
| V-03 | El reintegro elegido es «al monedero» | Ledger con asiento propio, distinguible de un depósito |
| V-04 | Retirar con método sin verificar | **Rechazado**, 400 |
| V-05 | Retirar con método verificado | Aceptado |
| V-06 | Declarar el importe correcto del micro-depósito | `isVerified = true` |
| V-07 | Declarar un importe incorrecto | Falla, intentos +1 |
| V-08 | Agotar los 5 intentos | Método bloqueado |
| V-09 | Declarar pasados 7 días | Vencido, no verifica |
| V-10 | Un método de otro usuario | Se comporta como inexistente (misma regla que PT-088) |
| V-11 | Verificar dos veces la misma cuenta | Idempotente, no cobra dos veces |
| V-12 | El importe de verificación **no** aparece como depósito acreditable | El saldo disponible no cambia |

## 5. Requisitos no funcionales

- **Seguridad**: el importe generado no puede ser predecible; se genera con `crypto`, no con `Math.random`.
- **Dinero**: si el cargo se completa y el reintegro falla, **queda registrado como pendiente de devolver**, nunca perdido. Misma disciplina que el ciclo de pago de PT-080.
- **Trazabilidad**: PT-086 para todo el recorrido.
- **Idempotencia**: reintentar una verificación no cobra dos veces.

## 6. Fuera de alcance

- **La dispersión automática por SPEI**: sigue siendo manual. Sin ella el micro-depósito a CLABE
  depende del administrador, y así se declara.
- **Mercado Pago como instrumento de verificación**: la idea original lo contemplaba, pero MP no
  ofrece un destino de retiro en este sistema — verificar con MP repetiría el problema del §2
  (verificar un instrumento distinto del que recibe el dinero). Si algún día MP es destino de
  retiro, se añade entonces.
- **Verificación por documento o KYC reforzado**: ya existe el módulo de KYC y es una puerta
  distinta (ADR-021).

## 7. Confianza

Architecture Confidence: 90%. Implementation Confidence: 75% — la parte de PayPal es directa y
verificable contra el sandbox; la de CLABE depende del flujo manual del administrador y hay que
diseñar cómo encaja sin estorbar.
