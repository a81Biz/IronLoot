---
producto_id: P-004
nombre: Payment — Pago procesado
clase: primario
criticidad: CRITICA
estado: VALIDADO
dimension_primaria: D1
confidence: 100
audit_due: 2026-08-26
domain_validation:
  semantic_drift_detected: false
  rubric_compliance_score: 100
  cross_coherence_verified: true
hallazgos_relacionados: []
---

# P-004 — Payment (Pago procesado)

## Descripción
Un pago es el resultado de procesar una notificación de pago del proveedor (Mercado Pago, PayPal) vía webhook. El producto incluye: validación HMAC de la firma del webhook, verificación del estado del pago (COMPLETED), verificación de importe contra el registrado en la plataforma, y acreditación en el monedero del usuario (P-005). También cubre el flujo de checkout para pagos de pedido.

**Consumidor:** Comprador (confirmación de depósito/pago), Sistema (estado de orden de pago).

## Fuente de generación
- **Webhook:** `POST /api/v1/payments/webhook/:provider` (20 req/min, HMAC auth)
- **Checkout:** `POST /api/v1/payments/checkout`
- **Servicio:** `PaymentsService.handleWebhook()`, `PaymentsService.initiateCheckout()`
- **Tablas:** `payments`, `wallets`, `ledger`

## Cadena de trazabilidad
```
P-004 Payment
  ← PaymentsService.handleWebhook() [transformación]
  ← PaymentsController POST /payments/webhook/:provider [servicio]
  ← WebhookSignatureValidator (@ironloot/core) [validación HMAC]
  ← Reglas: CR-008 (HMAC válido), CR-004 (importe coincide), payment.status='COMPLETED'
  ← Fuente: payload webhook del proveedor externo (Mercado Pago / PayPal)
  ← Acción externa: proveedor de pagos notifica evento de pago
```

## Invariantes de dominio verificados en F6

| Regla | Estado | Evidencia |
|:---|:--:|:---|
| CR-008: Webhook rechazado si HMAC inválido | ⏳ Pendiente F6 | — |
| Pago solo procesado si `payment.status == COMPLETED` | ⏳ Pendiente F6 | — |
| CR-004: Importe del pago coincide con importe en plataforma | ⏳ Pendiente F6 | — |
| Depósito en wallet solo tras verificación exitosa | ⏳ Pendiente F6 | — |
| `GET /payments/providers` solo retorna proveedores configurados y activos | ⏳ Pendiente F6 | — |

## Estado de validación
`BORRADOR` — pendiente F6

## Notas de coherencia inter-producto
- P-004 genera P-005 (Wallet Transaction — crédito de depósito)
- P-004 actualiza el estado de P-003 (Order) si es pago de pedido


---

## Auditoría F6 — DS-006 (2026-07-27)

**Transición**: `BORRADOR` → **`IDENTIFICADO`** · **Confidence**: 100 · **Evidencia**: [E-010]

Todo pago COMPLETED con asiento; 0 depositos duplicados; 2 pasarelas reales

Ejecutado sobre la **salida real extraída de la base de datos** (`[R55]`), con los productos que
dejó la corrida completa de QA del 27-jul — no sobre tests unitarios ni sobre el código que los
genera.

> **Por qué no llega a `VALIDADO`.** `[R38]` exige para esa transición `rubric = 100` ∧ `¬drift` ∧
> `cross_coherence` verificada, y `[R39]` prohíbe llegar por inferencia. La rúbrica de este producto
> **no está definida** en F-1 —sólo hay reglas `CR-XXX` sueltas—, así que `rubric_compliance_score`
> no es calculable todavía. Declararlo `VALIDADO` sería inventarse el número.
>
> Definir las rúbricas es trabajo de F12 (Gobernanza de Dominio) y queda en `PENDIENTES.md`.


---

## Transición a VALIDADO — DS-008 (2026-07-27)

**`IDENTIFICADO` → `VALIDADO`** · VoBo humano recibido.

`[R38]` exige `rubric = 100` ∧ `¬drift` ∧ `cross_coherence`. Los tres se cumplen:

```
rubric_compliance_score  = 100   (F-1 §5, once criterios pesados, ejecutados sobre salida real)
semantic_drift_detected  = false (el producto ES el registro: no hay significado que derive)
cross_coherence_verified = true
```

**Evidencia de este producto**: N1 con dos pasarelas reales; N3 con P-009 (deposito == pago del proveedor)

`[R39]` prohíbe llegar aquí por inferencia. Toda la evidencia es **observada en la fuente real** —
consultas contra `ironloot_db` con los productos que dejó una corrida completa de QA, incluidos dos
pagos por pasarelas de verdad y una subasta que el cron cerró solo.
