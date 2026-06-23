---
producto_id: P-004
nombre: Payment — Pago procesado
clase: primario
criticidad: CRITICA
estado: BORRADOR
dimension_primaria: D1
confidence: 0
audit_due: 2026-07-23
domain_validation:
  semantic_drift_detected: false
  rubric_compliance_score: null
  cross_coherence_verified: false
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
