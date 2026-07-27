# PT-080 — Cierre

**Fecha**: 2026-07-26 | **Rama**: `feature/PT-080-payment-cycle` | **6 commits**
**Tareas**: 20 de 20 completadas

---

## Resultado de las suites

| | Línea base (PT-080.1) | Cierre |
|---|---|---|
| API | 45 suites / 264 tests | ✅ **49 suites / 304 tests** |
| CORE | 8 / 134 | ✅ 8 / 134 |
| `typecheck` | ✅ | ✅ |
| `lint:check` | 0 errores | ✅ 0 errores (746 warnings preexistentes) |
| **Suite QA por navegador** | 148/148 | ✅ **148/148** |

**40 tests nuevos**, todos escritos en RED antes de su implementación.

---

## Verificación contra la pasarela real

No hay una sola afirmación aquí que se apoye solo en mocks.

| Prueba | Antes | Después |
|---|---|---|
| Notificación en formato **IPN** | **HTTP 500**, nunca acreditaba | ✅ acredita (321.45 MXN) |
| El mismo pago notificado **como orden y como pago** | **acreditaba dos veces** | ✅ una sola vez |
| Reentrega de la misma notificación | sin duplicar | ✅ sin duplicar, y registrada |
| Firma inválida | 500 | ✅ 401 |
| Alias `/webhook/mercadopago` | 201 | ✅ 201 (regresión PT-064 intacta) |
| **Pago aprobado SIN notificación** | **se perdía en silencio** | ✅ **acreditado por consulta** (412.30 MXN) |

Saldo del comprador a lo largo de la verificación: 5000 → 5250 → 5387.50 → 5567.50 → 5888.95 →
6164.75 → **6577.05**. Cada salto corresponde a un pago real aprobado en Mercado Pago.

### El ciclo de tres fases, observado

```
/payments/initiate  → REQUESTED  (275.80 MXN)
notificación IPN    → SETTLED, canónico 169719639425
reentrega           → DUPLICATE, saldo intacto
eventos             → IPN|PROCESSED, IPN|DUPLICATE
```

### La vía garantizada, observada

Se creó un pago real de 412.30 MXN y **no se notificó**. El job lo encontró y lo acreditó solo:
ciclo `SETTLED`, evento `POLL | PROCESSED`. Es el escenario exacto de los 180 MXN que se
perdieron esta misma sesión.

---

## Barra de calidad

| # | Criterio | Resultado |
|---|---|---|
| BQ-1 | Añadir una pasarela no requiere editar `payments.service.ts` | ✅ adaptador ficticio en test |
| BQ-2 | Quitarla tampoco | ✅ |
| BQ-3 | Cero nombres de campo de pasarela en el núcleo | ✅ (solo queda la mención en un comentario) |
| BQ-4 | Un único contrato de proveedor | ✅ |
| BQ-6 | La deduplicación es trazable | ✅ `payment_cycle_events` |
| BQ-7 | Sin regresión funcional | ✅ QA 148/148 + arnés real |

Los cinco puntos que había que editar para añadir una pasarela —`switch`, `if/else`, mapa de
alias, `getAvailableProviders` y el tipado en duro de `reconcilePayments`— han desaparecido.

---

## Hallazgos resueltos en este ciclo

| Hallazgo | Cómo se cerró |
|---|---|
| **F-01** firma inválida → 500 | 401 tipado (D-3 de TD-009: no garantiza cese de reintentos) |
| **F-02** tres identificadores; rama `PAY` con 400 | Identificador canónico por proveedor, enrutado por topic |
| **F-03** excepción mapeada a 409 | El duplicado se registra, no se lanza |
| **F-04** pago cobrado sin acreditar | Vía garantizada + expiración a 72 h |
| **F-05** formato IPN rechazado | Los dos formatos, con validación distinta cada uno |
| **G-01/G-02** puerto muerto y contrato duplicado | Puerto de CORE revivido y evolucionado |
| **G-05/G-06** `payments` vacía, `reconcilePayments` inoperante | Ambos leen el ciclo |
| `PAYMENT_EXPIRATION_HOURS` sin uso | En uso como plazo de expiración |

---

## Lo que queda abierto, con destino

| Qué | Destino |
|---|---|
| Modelo order-céntrico: `Payment.orderId` y `RefundRequest.orderId` obligatorios | **TD-008** |
| El 401 no garantiza el cese de reintentos | **TD-009** |
| `dist/` obsoleto de CORE + purga de tablas de webhooks | **PT-082** |
| Cobertura KYC de `withdrawals.request` | **PT-083** |
| Cablear los use-cases de CORE | **PT-084** |
| Vía garantizada para PayPal, Stripe y Hey Banco | Cuando tengan credenciales verificables |
| Verificación funcional de PayPal | **PT-076.15/.16**, bloqueada por credenciales |

---

## Estado

**VALIDATION_PENDING** — el ciclo contiene correcciones de BUG (F-01, F-02, F-05) y la
validación de bugs corresponde al humano.

**No fusionar antes que PT-076 y PT-078**, de los que depende la rama.
