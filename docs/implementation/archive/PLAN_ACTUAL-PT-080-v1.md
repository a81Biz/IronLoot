# PLAN_ACTUAL — PT-080: modularidad de pasarelas sobre el puerto de CORE

**PT-080** | **Fecha**: 2026-07-25 | **Tipo**: REFACTOR | **Complejidad**: MAJOR | **Estado**: STATE 2 — esperando ACK

**Entrada**: `REFACTOR_SCOPE.md` (PT-080, ACK 2026-07-25) · `CONTEXT_ANALYSIS.md` § PT-080
**Decisiones del humano ya tomadas**: separación PT-080/PT-081 aceptada · **se adopta el puerto de CORE**

---

## 1. Objetivo

Que añadir, quitar o cambiar una pasarela de pago **no obligue a tocar la lógica de
transacción**, y que lo específico de cada pasarela viva únicamente en su adaptador.
Sin cambiar ningún comportamiento observable de pago.

---

## 2. Solución propuesta

### 2.1 El puerto de CORE hay que evolucionarlo, no solo importarlo

El puerto actual no soporta la realidad de los cuatro proveedores:

| Método actual en CORE | Problema |
|---|---|
| `validateWebhook(payload, headers): boolean` | **Síncrono.** PayPal verifica con una llamada HTTP a `verify-webhook-signature`; no cabe en un booleano síncrono. |
| `initiatePayment(orderId, amount, currency)` | Faltan `description` y el email del pagador, que MercadoPago y PayPal necesitan. |
| `getTransactionStatus(externalId): PaymentStatus` | Devuelve solo el estado; el núcleo necesita también importe y referencia. |
| — | **No hay puerta de configuración.** El registro necesita saber si un proveedor está configurado. |
| — | **No hay identidad ni alias.** Hoy los alias viven en un mapa dentro del servicio. |

**Propuesta de puerto evolucionado** (en CORE, libre de framework — RULE-02):

```
PaymentProviderKey       identidad + alias declarados por el propio adaptador
isConfigured()           puerta de configuración (sustituye a checkStatus)
initiatePayment(...)     con descripción y pagador
validateWebhook(...)     ASÍNCRONO → Promise<boolean>
handleWebhook(...)       devuelve resultado normalizado o null
getTransactionStatus()   devuelve resultado normalizado, no solo el estado
```

El tipo `WebhookResult` de la API se traslada a CORE como resultado normalizado, con
`paymentId`, `reference`, `status`, `amount` y el payload crudo para trazabilidad.

**El duplicado de la API se elimina.** `@ironloot/core` no gana ninguna dependencia de
framework: sigue siendo solo tipos e interfaces.

### 2.2 La validación de firma se mantiene como paso explícito del núcleo

Aunque cada adaptador implemente su propio mecanismo, el núcleo **llama a `validateWebhook`
antes de `handleWebhook`**, en lugar de dejar la validación escondida dentro del adaptador.

Razones:
- **RULE-04** («nunca confiar en payloads sin validar») pasa a ser una garantía estructural
  observable, no una convención que cada adaptador puede olvidar.
- Un fallo de firma queda **distinguible** de un fallo de procesamiento — que es justo lo que
  se pide para rastrear fallos.

### 2.3 Registro de proveedores por inyección

Los cuatro adaptadores se registran bajo un token de inyección múltiple. Un
`PaymentProviderRegistry` los recibe como colección y los resuelve por clave o alias.

Desaparecen de `payments.service.ts`:
- el `switch` de `initiatePayment`
- la cadena `if/else` de `handleWebhook`
- el mapa `providerAliases`
- la enumeración manual de `getAvailableProviders`

**Añadir una pasarela** = crear el adaptador + una línea en el módulo.
**Quitarla** = borrar esas dos cosas. Cero ediciones en la lógica de transacción.

### 2.4 El núcleo deja de conocer campos de pasarela

La cadena `transaction_amount ?? mc_gross ?? amountTotal` desaparece del servicio.
**Cada adaptador normaliza su propio importe** y lo devuelve en el resultado. El núcleo solo
lee `result.amount`.

Esto es lo contrario de acoplar: el núcleo deja de saber de proveedores.

### 2.5 La deduplicación lanza la excepción de dominio

`PaymentAlreadyProcessedException` —que existe y nunca se ha usado— sustituye al
`logger.info` que puse en PT-078. Entra en el pipeline de errores con `traceId` y
`EntityType.PAYMENT`. La respuesta HTTP sigue siendo 200 (la pasarela no debe reintentar un
duplicado); lo que cambia es que el evento queda tipado y trazable.

### 2.6 `reconcilePayments` deja de tipar proveedores en duro

`'MERCADO_PAGO' | 'PAYPAL'` pasa a resolverse contra el registro. Era el quinto punto de
edición al añadir una pasarela.

### 2.7 Estrategia de migración: estrangulamiento, no big bang

Orden deliberado, con la suite en verde en cada paso:

1. Puerto evolucionado en CORE + registro, **sin migrar ningún adaptador** (convivencia).
2. **MercadoPago primero** — es el único con verificación funcional real (arnés de hoy).
3. PayPal.
4. Stripe y Hey Banco (sin credenciales; solo cobertura unitaria).
5. Retirar el contrato duplicado y las ramas muertas del servicio.

Así, si algo se tuerce, se detecta con el proveedor que sí se puede probar de verdad.

---

## 3. Alternativas consideradas

| # | Alternativa | Veredicto |
|---|---|---|
| A1 | Consolidar el contrato en la API y dejar muerto el puerto de CORE | **Rechazada por decisión del humano.** Menos trabajo, pero perpetúa la documentación mintiendo. |
| A2 | Adoptar el puerto de CORE **tal cual** | **Rechazada.** `validateWebhook` síncrono es incompatible con PayPal, que verifica por HTTP. Forzarlo obligaría a validar dentro de `handleWebhook` y perderíamos la distinción entre fallo de firma y fallo de proceso. |
| A3 | Carga dinámica de adaptadores desde configuración (plugins) | **Rechazada.** Modularidad de sobra para el problema, a cambio de fallos en tiempo de ejecución y de perder la comprobación de tipos. El array de inyección da lo mismo con verificación en compilación. |
| A4 | Dejar la validación de firma dentro de `handleWebhook` | **Rechazada.** Simplifica el puerto pero hace RULE-04 inobservable y mezcla dos causas de fallo distintas. |
| A5 | Migrar los cuatro adaptadores de golpe | **Rechazada.** Tres de los cuatro no se pueden verificar funcionalmente (sin credenciales). Migrar primero el único verificable es la única forma de tener señal real. |
| A6 | Resucitar `ProcessPaymentUseCase` de CORE | **Diferida.** Es ADR-008 / AUD-012 y afecta a los cuatro use-cases, no solo a pagos. Fuera de alcance. |

---

## 4. Análisis de regresión (obligatorio — MAJOR)

### Qué puede romperse

| Riesgo | Superficie | Mitigación |
|---|---|---|
| **La acreditación de MercadoPago deja de funcionar** | `payments.service.ts` + adaptador MP, ruta de dinero real | Arnés real (`mp-deposit.cjs`) ejecutado **antes y después** de migrar MP. Ya validado hoy: 5000 → 5250 → 5387.50 |
| **La deduplicación deja de deduplicar** | `creditOnce` | Reentrega ×3 real, saldo intacto. Ya validado hoy |
| Los alias en minúsculas (`/webhook/mercadopago`) dejan de resolver | Registro | Test unitario por alias + entrega real. Es el bug de PT-064; no puede reaparecer |
| PayPal pierde la captura en dos fases | Adaptador PayPal | Los 31 tests unitarios de PT-076 deben seguir verdes sin cambios de expectativa |
| Un proveedor desaparece del desplegable | `getAvailableProviders` vía registro | Test de que MP sigue apareciendo (riesgo R-12 de PT-076) |
| `@ironloot/core` gana dependencias de framework | Puerto en CORE | RULE-02: el puerto son solo tipos. Verificable con el build de CORE y su suite (8/134) |
| El admin deja de listar pagos | `reconcilePayments` | Suite QA fase 50 (admin-writes) |

### Comportamientos que deben preservarse **exactamente**

Depósito por MercadoPago · deduplicación por identificador de pago · rechazo de firma inválida ·
resolución de `DEP-<uuid>-<ts>` · captura en dos fases de PayPal · retiro del vendedor ·
pujas, bloqueo de fondos y cierre de subastas · suite QA 148/148.

---

## 5. Dependencias

- **Ninguna externa.** PT-080 se verifica con tests unitarios + el arnés de MercadoPago que
  ya existe y funciona. **No requiere credenciales de PayPal.**
- `@ironloot/core` debe recompilarse (`npm run build`) antes de que la API lo consuma.
- No toca el esquema de base de datos: **sin migración**.

---

## 6. Riesgos

| ID | Riesgo | Mitigación |
|---|---|---|
| R-1 | Ruta del dinero; `payments.service.ts` es el fichero más tocado | Migración por estrangulamiento; MP primero; arnés real antes y después |
| R-2 | Evolucionar el puerto arrastra a los cuatro adaptadores | El paso 1 introduce el puerto **sin migrar nada**; la convivencia es temporal pero explícita |
| R-3 | Stripe y Hey Banco no son verificables funcionalmente | Se migran al final, con cobertura unitaria y quedando registrado que no hay verificación real |
| R-4 | El build de CORE y el de la API se desincronizan | Orden fijo: CORE `build` → API `typecheck` → suite |
| R-5 | El refactor tienta a corregir defectos de paso (H-01, 500 en firma inválida) | Fuera de alcance explícito; se registran, no se tocan |

---

## 7. Restricciones

- **RULE-01**: nada de código antes del ACK del Proposal Package.
- **RULE-02**: CORE sin NestJS/Prisma/Express/Redis.
- **RULE-04**: ningún payload de webhook se procesa sin validar.
- **RULE-05**: ledger insert-only.
- **RULE-06**: tests en RED antes de implementación.
- Commits atómicos trazables a PT-080.
- MXN como moneda global.

---

## 8. Criterios de éxito

Los siete de la barra de calidad de `REFACTOR_SCOPE.md` §4:

1. Añadir una pasarela no requiere editar `payments.service.ts` (adaptador ficticio en test).
2. Quitarla tampoco.
3. `grep` de `transaction_amount|mc_gross|amountTotal` en el servicio → **0**.
4. Un solo contrato de proveedor en el repo (fuera de CORE → **0**).
5. `PaymentsService` baja de 29 aristas al reejecutar Graphify.
6. La deduplicación produce `PaymentAlreadyProcessedException` con `traceId`.
7. **Sin regresión funcional**: depósito real por MercadoPago + reentrega, idénticos a hoy.

Más: suite API en verde, CORE en verde, typecheck, lint sin errores, y suite QA 148/148.

---

## 9. Estado

**STATE 2 COMPLETO — ESPERANDO ACK**

Siguiente paso tras el ACK: STATE 3 — Proposal Package en
`changes/PT-080-payment-provider-registry/`.

Rama prevista (**no creada**): `refactor/PT-080-payment-provider-registry`, desde `master`.

Prohibido hasta el ACK del Proposal Package: creación de rama, modificación de código fuente.
