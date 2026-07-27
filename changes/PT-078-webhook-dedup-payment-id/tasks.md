# tasks.md — PT-078: deduplicación de webhooks por identificador de pago

**Rama**: `fix/PT-078-webhook-dedup-payment-id`, desde `feature/PT-076-paypal-orders-v2`
**Orden**: secuencial. Tests RED antes de implementación.

Estados: `PENDING` · `IN_PROGRESS` · `BLOCKED` · `DONE`

---

### PT-078.1 — Tests RED: deduplicación por `paymentId` en los cuatro proveedores
- **Objetivo**: fijar los criterios 1–4 antes de tocar implementación.
- **Inputs**: `design.md` AD-01; `DISCOVERY.md` I-13.
- **Outputs**: reescritura del bloque de dedup de `payments-dedup-amount.spec.ts` — mismo
  `paymentId` reentregado (×4 proveedores), dos notificaciones distintas del mismo pago,
  dos pagos distintos, entregas concurrentes.
- **Validación**: RED.
- **Estado**: PENDING

### PT-078.2 — Tests RED: fail-open y propagación unificada
- **Objetivo**: fijar AD-02 y AD-04.
- **Outputs**: sin `paymentId` → acredita y registra error; fallo de acreditación en
  **Mercado Pago** → libera reserva y propaga (sustituye a T-32c de PT-076).
- **Validación**: RED.
- **Estado**: PENDING

### PT-078.3 — Migración: renombrar `event_id` → `payment_id`
- **Objetivo**: AD-03.
- **Outputs**: `schema.prisma` actualizado + migración de renombrado + cliente regenerado.
- **Validación**: migración aplica limpia; esquema verificado por consulta directa a
  PostgreSQL; restricción única intacta.
- **Estado**: PENDING

### PT-078.4 — Retirar `eventId` del contrato
- **Objetivo**: AD-01.
- **Outputs**: `eventId?` eliminado de `WebhookResult`; `paypal.provider.ts` deja de informarlo.
- **Validación**: `typecheck` en verde; ningún proveedor lo referencia.
- **Estado**: PENDING

### PT-078.5 — `creditOnce()` sobre `paymentId`
- **Objetivo**: GREEN de PT-078.1 y .2.
- **Outputs**: clave `paymentId`; desaparece la rama sin protección; fail-open documentado;
  propagación unificada con liberación de reserva.
- **Validación**: PT-078.1 y .2 en verde; **los tests de PT-076 siguen verdes**.
- **Estado**: PENDING

### PT-078.6 — Regresión y evidencia
- **Objetivo**: criterios 5–7.
- **Outputs**: suite completa API + CORE, typecheck, lint; evidencia en `evidence/PT-078/`.
- **Validación**: sin fallos; comparación contra la línea base de PT-076.
- **Estado**: PENDING

### PT-078.7 — Documentación
- **Objetivo**: trazabilidad.
- **Outputs**: ADR-027 (sustituye ADR-025, que pasa a *Sustituida*); TD-006 cerrada en
  `10-Technical-Debt.md`.
- **Validación**: revisión documental.
- **Estado**: PENDING

---

## Resumen

**7 tareas, 0 bloqueadas.** PT-078 se verifica entero con tests unitarios; no requiere
credenciales de PayPal, ni túnel, ni la suite por navegador.
