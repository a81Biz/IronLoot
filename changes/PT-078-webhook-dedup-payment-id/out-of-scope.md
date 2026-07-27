# out-of-scope.md — PT-078

| # | Qué | Por qué | ¿Deuda? |
|---|---|---|---|
| 1 | **Purga de `processed_webhook_events`** | La tabla crece sin límite. Con un registro por pago el volumen es bajo, pero acabará necesitando retención. El módulo `system-cleanup` es el sitio natural | Sí |
| 2 | **Deduplicación en el resto de webhooks** (envíos, disputas, KYC) | PT-078 cubre solo la acreditación de wallet, que es donde hay dinero | Sí |
| 3 | **Idempotencia de salida** (reintentos *hacia* la pasarela) | Problema distinto; PayPal ya se cubre con `PayPal-Request-Id` en PT-076 | Sí |
| 4 | **Unificar el `paymentId` de Stripe** con la semántica de los otros | Stripe usa `client_reference_id`, que es nuestra referencia y no un id del proveedor. Sirve como clave; cambiarlo exige tocar el proveedor y no hay credenciales para verificarlo | Sí |
| 5 | **Verificación contra pasarelas reales** | PT-078 se valida con tests unitarios. La comprobación con dinero real llega con PT-076.15/.16 | No |
| 6 | **Job de reconciliación de depósitos perdidos** | Los depósitos ya perdidos por la pérdida silenciosa anterior no se recuperan retroactivamente | Sí |
| 7 | **Cobertura de la puerta KYC de `withdrawals.request`** | Heredado de PT-079 (alternativa B2); ajeno a este PT | Sí |

## Frontera

- **Sí entra**: que ninguna reentrega ni notificación duplicada acredite dos veces, en los
  cuatro proveedores, y que un fallo de acreditación deje de perderse en silencio.
- **No entra**: retención de la tabla, otros webhooks, ni recuperar depósitos ya perdidos.
