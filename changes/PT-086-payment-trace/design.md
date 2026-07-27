# PLAN_ACTUAL — PT-086: traza completa de cada transacción de pago

**PT-086** | 2026-07-26 | FEATURE | STANDARD | Rama: `feature/PT-086-payment-trace`
**Entrada**: `ENRICHMENT.md` (PT-086, ACK 2026-07-26)

## 1. Objetivo

Que de cada pago quede constancia de **por dónde pasó y qué datos se enviaron en cada paso**,
suficiente para sostener una disputa con la pasarela.

## 2. Decisión delegada: se redactan las credenciales

El desarrollador delegó la decisión. Se redactan, por coherencia con lo que el proyecto ya tenía
decidido: `AuditEvent.payload` está documentado en el propio esquema como **«whitelisted data
only»**. Guardar el `Authorization: Bearer` de Mercado Pago contradiría esa decisión previa y
convertiría la traza en un almacén de secretos reutilizables.

Se redacta por lista explícita y **lo redactado se marca**: la traza dice que el campo existía.
Todo lo demás se guarda íntegro, incluidos los cuerpos completos de petición y respuesta.

## 3. Solución

**3.1 Se extiende `PaymentCycleEvent`, no se crea tabla nueva.** Ya es del dominio correcto, ya
guarda payload íntegro y ya cuelga del ciclo. Campos nuevos: `direction`, `step`, `endpoint`,
`httpStatus`, `durationMs`, `traceId`, `reference`, `redactedFields`. Todos opcionales: los
tests de PT-080 deben pasar sin tocarlos.

**3.2 `PaymentTraceService` como punto único de escritura.** La redacción vive dentro. Ningún
llamante puede saltársela, que es la única forma de que R-1 no dependa de la disciplina de quien
escribe.

**3.3 Vocabulario cerrado de pasos**, para que la traza sea consultable y no prosa libre:
`DEPOSIT_REQUESTED · PROVIDER_CREATE · NOTIFICATION_RECEIVED · SIGNATURE_OK · SIGNATURE_REJECTED ·
PROVIDER_CONFIRM · CYCLE_DECISION · WALLET_CREDITED · PAYMENT_RECORDED · POLL_ATTEMPT ·
CYCLE_EXPIRED · REFUND_RAISED`.

**3.4 `reference` en cada entrada.** Permite consultar la traza aunque la entrada no cuelgue de
un ciclo (notificación huérfana) y evita un `join` para el caso normal.

**3.5 Nunca bloquea.** Un fallo escribiendo la traza se registra y el pago sigue. Mismo criterio
que PT-085 aplicó al registro contable: el saldo del usuario no depende de un apunte.

## 4. Alternativas rechazadas

| # | Alternativa | Veredicto |
|---|---|---|
| A1 | Usar `AuditEvent` | **Rechazada.** Su payload es explícitamente «whitelisted», y no tiene dirección, endpoint, estado HTTP ni duración |
| A2 | Tabla nueva `payment_traces` | **Rechazada.** Duplicaría `payment_cycle_events`, que ya existe para esto y ya guarda payload |
| A3 | Guardar también las credenciales | **Rechazada.** Contradice la decisión previa del proyecto y crea un almacén de secretos |
| A4 | Redactar en cada llamante | **Rechazada.** La seguridad no puede depender de que nadie se olvide |
| A5 | Escribir la traza de forma síncrona y bloqueante | **Rechazada.** Un apunte no puede costar un depósito |

## 5. Análisis de regresión

| Riesgo | Mitigación |
|---|---|
| Tocar `PaymentCycleEvent` rompe PT-080 | Campos **opcionales**; los tests de PT-080 pasan sin cambios |
| Inyectar la traza en el adaptador de MP rompe su suite | Dependencia opcional; sus 15 tests deben seguir verdes |
| Se filtra una credencial | Test que inyecta un token y verifica que no se persiste |
| La escritura rompe el pago | Test con la escritura fallando |

**Debe preservarse**: acreditación de MP, deduplicación, vía garantizada, registro contable,
suite QA 148/148.

## 6. Criterios de éxito

CA-01..CA-12 del `ENRICHMENT.md`, más: suite API y CORE en verde, typecheck, lint sin errores, y
una traza real de un depósito contra la pasarela.

## 7. Estado

STATE 2 y 3 condensados por indicación del desarrollador («toma la mejor decisión»). Se procede a
implementación.
