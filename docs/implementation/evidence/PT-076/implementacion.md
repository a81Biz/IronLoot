# PT-076 — Evidencia de implementación (STATE 4/5, parcial)

**Fecha**: 2026-07-25 | **Rama**: `feature/PT-076-paypal-orders-v2` | **Commits**: 4

---

## Commits

| Hash | Tareas | Contenido |
|---|---|---|
| `ff7ef11` | .2 .3 .8 .9 | OAuth2 con cacheo + `POST /v2/checkout/orders` |
| `d33daad` | .4 .7 .10 | Webhook verificado, despacho por evento y captura |
| `4e3c167` | .5 .6 .11 .12 | Idempotencia, migración y disponibilidad real de proveedores |
| `e7170da` | .13 .18 | Métodos de depósito dinámicos + ADR y deuda técnica |

---

## Resultados de ejecución

| Comprobación | Línea base (PT-076.1) | Ahora |
|---|---|---|
| `npm test` (API) | 41 suites / 201 tests — **21 fallos** | ✅ **45 suites / 248 tests, 0 fallos** |
| `npm test` (CORE) | — | ✅ 8 suites / 134 tests |
| `npm run typecheck` | ✅ | ✅ |
| `npm run lint:check` | 0 errores / 694 warnings | 0 errores (hook pre-commit en verde) |
| CLIENT `npm run build` | — | ✅ compila |
| Drift de migraciones | — | ✅ `Database schema is up to date!` |
| API en contenedor | — | ✅ arranca; `/api/v1/health` → 200 |

**47 tests nuevos**, todos escritos en RED antes de su implementación:
`paypal-auth.spec.ts` (11) · `paypal-create-order.spec.ts` (10) · `paypal-webhook.spec.ts` (10) ·
`payments-dedup-amount.spec.ts` (16).

---

## Verificación en la fuente real

Tabla creada y comprobada por consulta directa a PostgreSQL, no por inferencia:

```
                      Table "public.processed_webhook_events"
    Column    |           Type           | Nullable |      Default
--------------+--------------------------+----------+-------------------
 id           | uuid                     | not null |
 provider     | "PaymentProvider"        | not null |
 event_id     | character varying(255)   | not null |
 processed_at | timestamp with time zone | not null | CURRENT_TIMESTAMP
Indexes:
    "processed_webhook_events_pkey" PRIMARY KEY, btree (id)
    "processed_webhook_events_provider_event_id_key" UNIQUE, btree (provider, event_id)
```

---

## Criterios de aceptación

| CA | Estado | Verificado por |
|---|---|---|
| CA-01 disponibilidad derivada de config | ✅ | T-03, T-04, T-04b, T-04c |
| CA-02 UI sin PayPal si no configurado | ✅ | PT-076.13 + build CLIENT |
| CA-03 gate coherente | ✅ | T-01, T-02, T-02b |
| CA-04 token cacheado y renovado | ✅ | T-06..T-10 |
| CA-05 orden Orders v2 en MXN | ✅ | T-11, T-11b |
| CA-06 tolera `payer-action` y `approve` | ✅ | T-14, T-15, T-16 |
| CA-07 captura tras aprobación | ✅ | T-22, T-23 |
| CA-08 verificación de firma | ✅ | T-18, T-24 |
| CA-09 importe sin romper MP/Stripe | ✅ | T-26..T-30 |
| CA-10 saldo exacto en wallet | ⏳ | Requiere E2E real (PT-076.15) |
| CA-11 rechazo de firma inválida | ✅ | T-19, T-20, T-21, T-25 |
| CA-12 sin doble acreditación | ✅ unitario / ⏳ real | T-31..T-33; falta reenvío real (PT-076.16) |
| CA-13 referencia en `custom_id` | ✅ | T-12, T-24 |
| CA-14 URLs a CLIENT 5175 | ✅ | T-17, T-17b |
| CA-15 sin regresión en MP | ✅ unitario / ⏳ navegador | T-27, T-28, T-32c; falta suite QA (PT-076.17) |
| CA-16 deuda técnica corregida | ✅ | PT-076.18 |

**13 de 16 verificados.** Los 3 restantes exigen entorno real: credenciales de PayPal
(CA-10, CA-12-real) y la suite QA por navegador (CA-15-navegador).

---

## Self-Review

- [x] Todos los criterios verificables sin entorno real, verificados.
- [x] Tests escritos en RED antes de la implementación, en las cuatro tandas.
- [x] Sin efectos colaterales: los otros tres proveedores no se modificaron; los campos
      nuevos de `WebhookResult` son opcionales.
- [x] Guardas de regresión explícitas para MercadoPago (T-27, T-32c) y Stripe (T-28).
- [x] Commits atómicos, con convención y trazables a PT-076.
- [x] Sin `console.log`, sin código comentado, sin artefactos de depuración.
- [x] Documentación actualizada: ADR-023..026, TD-002 corregida, TD-006/TD-007 nuevas.
- [x] Deltas respecto al plan registrados en `changes/PT-076-paypal-orders-v2/tasks.md`.
- [ ] **Pendiente**: evidencia funcional (capturas, logs de pago real, consulta de saldo).

---

## Pendiente

| Tarea | Bloqueo |
|---|---|
| PT-076.14 configuración | Credenciales de PayPal |
| PT-076.15 E2E real | Credenciales + túnel HTTPS |
| PT-076.16 reentrega e importe decimal | Credenciales + túnel HTTPS |
| PT-076.17 regresión por navegador | **Decisión humana**: `run-all.sh` trunca 29 tablas |

---

## Estado

**VALIDATION_PENDING parcial** — implementación completa y verificada por tests; la
evidencia funcional contra PayPal real sigue pendiente. PT-076 **no puede marcarse DONE**
hasta cerrar CA-10, CA-12-real y CA-15-navegador.
