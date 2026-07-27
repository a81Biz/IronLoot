# tasks.md — PT-080

**Rama**: `feature/PT-080-payment-cycle`, desde `master`
Tests en RED antes de cada implementación. Arnés real de MP antes y después de cada fase.

Estados: `PENDING` · `IN_PROGRESS` · `BLOCKED` · `DONE`

---

## Fase 0 — Línea base y arnés

### PT-080.1 — Línea base
- **Objetivo**: fotografía del estado actual antes de tocar la ruta del dinero.
- **Outputs**: `evidence/PT-080/00-baseline/` — suite API y CORE, typecheck, lint, y estado en BD
  (saldo 5567.50, 3 reservas, 3 asientos).
- **Estado**: DONE

### PT-080.2 — Ampliar el arnés de verificación
- **Objetivo**: cerrar el hueco que ocultó F-02 y F-05.
- **Outputs**: el arnés puede entregar en **formato IPN** (`topic`+`id`) y con **id numérico**,
  además del formato Webhooks con id de orden que ya soporta.
- **Validación**: con el código actual, la entrega IPN debe fallar (500). Es el RED de la Fase A.
- **Estado**: DONE

---

## Fase A — Entrada de notificaciones

### PT-080.3 — Tests RED: normalización de formatos y validación por formato
- **Cubre**: AD-01, AD-02, D-4.
- **Outputs**: sobre normalizado desde Webhooks e IPN; HMAC obligatorio en Webhooks; confirmación
  obligatoria contra la API en IPN; firma inválida → 401; cabeceras ausentes → 401.
- **Estado**: DONE

### PT-080.4 — Tests RED: identificador canónico
- **Cubre**: AD-03.
- **Outputs**: `payment` → id canónico directo; `order`/`merchant_order` → resolución por
  `external_reference`; el mismo pago por dos rutas produce **la misma** clave; un id `PAY...`
  nunca se consulta contra `/v1/orders`.
- **Estado**: DONE

### PT-080.5 — Implementación Fase A
- **Objetivo**: GREEN de .3 y .4.
- **Validación**: arnés real en los **tres** formatos; línea base de MP intacta.
- **Estado**: DONE

---

## Fase B — Ciclo persistido

### PT-080.6 — Modelo y migración
- **Outputs**: `payment_cycle` + `payment_cycle_event`; `reference` única; índice por
  `status` + `nextCheckAt`.
- **Validación**: esquema verificado por consulta directa a PostgreSQL.
- **Estado**: DONE

### PT-080.7 — Tests RED: invariante de las tres fases y primera-respuesta-gana
- **Cubre**: AD-05, AD-06, AD-08.
- **Outputs**: desajuste de importe/moneda/usuario → `ANOMALY` sin acreditar; primera respuesta
  cierra; posteriores → `CANCELLED`; rechazo cierra y no «mejora»; duplicado → `DUPLICATE` con
  respuesta 2xx y **sin** lanzar la excepción mapeada a 409.
- **Estado**: DONE

### PT-080.8 — Solicitud al iniciar el pago
- **Outputs**: `/payments/initiate` crea el ciclo en `REQUESTED` con usuario, importe, moneda,
  proveedor y referencia.
- **Estado**: DONE

### PT-080.9 — Confirmación, persistencia e invariante
- **Objetivo**: GREEN de .7. Incluye emitir `PaymentCompletedEvent` al pasar a `SETTLED` (AD-09).
- **Estado**: DONE

### PT-080.10 — Tests RED: vía garantizada y expiración
- **Cubre**: AD-07, D-1, D-2.
- **Outputs**: consulta en la cadencia definida; pago aprobado sin notificación → acredita por
  consulta; a las 72 h sin resolver → `EXPIRED` sin acreditar; carrera webhook/consulta → una sola
  acreditación.
- **Estado**: DONE

### PT-080.11 — Job de resolución automática
- **Objetivo**: GREEN de .10. Usa `payments.expirationHours` (hoy configurado y sin uso).
- **Validación**: **sin túnel** — se crea un pago real y se deja que el job lo descubra.
- **Estado**: DONE

### PT-080.12 — Cola de anomalías
- **Cubre**: D-3.
- **Outputs**: un cobro duplicado genera automáticamente un `RefundRequest` (modelo existente) y
  el ciclo queda `ANOMALY`.
- **Estado**: DONE

### PT-080.13 — Reconciliación puntual de lo ya perdido
- **Objetivo**: recuperar depósitos históricos cobrados y no acreditados.
- **Outputs**: script que compara pagos aprobados en la pasarela contra el ledger y reporta.
  **No acredita solo**: emite informe para revisión.
- **Estado**: DONE

---

## Fase C — Modularidad

### PT-080.14 — Tests RED: registro de proveedores
- **Outputs**: un adaptador ficticio se registra y se resuelve sin tocar `payments.service.ts`;
  al eliminarlo, la suite sigue verde; alias en minúsculas siguen resolviendo.
- **Estado**: DONE

### PT-080.15 — Puerto de CORE evolucionado
- **Outputs**: identidad + alias, `isConfigured`, validación **asíncrona**, resultado normalizado.
  Se elimina el contrato duplicado de la API. RULE-02: solo tipos.
- **Estado**: DONE

### PT-080.16 — Registro por inyección y núcleo sin pasarelas
- **Objetivo**: GREEN de .14. Fuera el `switch`, el `if/else`, el mapa de alias y la cadena
  `transaction_amount ?? mc_gross ?? amountTotal`.
- **Estado**: DONE

### PT-080.17 — Migración de adaptadores
- **Orden**: MercadoPago (único verificable) → PayPal → Stripe → Hey Banco.
- **Estado**: DONE

### PT-080.18 — `reconcilePayments` sobre el ciclo
- **Outputs**: lee `payment_cycle` en lugar de la tabla vacía; sin proveedores en duro.
- **Estado**: DONE

---

## Cierre

### PT-080.19 — Regresión completa y evidencia
- **Outputs**: suite API y CORE, typecheck, lint, suite QA por navegador, arnés real de MP en los
  tres formatos, y verificación de la vía garantizada sin túnel.
- **Estado**: DONE

### PT-080.20 — Documentación
- **Outputs**: ADR de los dos formatos y de la vía garantizada; RN nuevas del ciclo de pago;
  TD-002/TD-006 revisadas; `11-Conventions` si procede.
- **Estado**: DONE

---

## Resumen

**20 tareas, 0 bloqueadas.** Nada requiere túnel ni credenciales de PayPal: la vía garantizada se
verifica por consulta, y la entrada de notificaciones con el arnés local.

**PT nuevos derivados** (fuera de este ciclo, ya numerados): **PT-082** (dist obsoleto de CORE +
purga de `processed_webhook_events`) · **PT-083** (cobertura KYC de `withdrawals.request`).


---

## Delta real vs planificado (2026-07-26)

**D-01 — La cola de anomalías no usa `RefundRequest`.**
El Proposal Package decía crear un `RefundRequest` automático ante cobro duplicado. No es
posible: `RefundRequest.orderId` es obligatorio y único con clave foránea a `Order`, y un
depósito de wallet no tiene orden — el mismo defecto estructural que `Payment.orderId`. La cola
pasa a ser la propia tabla del ciclo, donde la anomalía queda con su motivo. La decisión de
devolver dinero sigue siendo del admin (ADR-022). Registrado como **TD-008**.

**D-02 — Contrato de importe: cambio deliberado, no aditivo.**
El plan preveía que el núcleo dejara de leer `metadata`. La consecuencia real es que **si un
adaptador no informa `amount`, su depósito no acredita**. Se asume a propósito —el núcleo ya no
adivina— y cada adaptador lo cubre en su suite. Los tests T-27 y T-28, que eran guardas del
contrato anterior, se reescribieron sobre el nuevo.

**D-03 — El 401 no garantiza el cese de reintentos.**
Se afirmó en STATE 2 que un 4xx haría que la pasarela dejara de reintentar. **No está
documentado.** Se adopta por corrección semántica y observabilidad. Registrado como **TD-009**.

**D-04 — La vía garantizada solo cubre Mercado Pago.**
Es el único proveedor verificable de punta a punta. El registro de la Fase C deja el camino
hecho para los demás, pero la incorporación no entra en este PT.

**D-05 — Migración por `migrate diff`, no `migrate dev`.**
`prisma migrate dev` exige interactividad porque la BD de desarrollo se construyó con `db push`
y carece de historial. La migración se generó con `migrate diff`, se verificó puramente aditiva
(0 `DROP`) y se aplicó por `psql`.

**D-06 — Se amplió el reset de la suite QA.**
`run-all.sh` no truncaba las tablas nuevas del ciclo. Añadidas, porque una suite que deja
residuos entre ejecuciones deja de ser una línea base fiable.
