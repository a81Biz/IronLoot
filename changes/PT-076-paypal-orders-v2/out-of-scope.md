# out-of-scope.md — PT-076

Exclusiones explícitas. Lo listado aquí **no** se implementa en este PT; lo marcado como *deuda* queda registrado para priorización posterior vía FPGE.

---

## Excluido por decisión de alcance

| # | Qué | Por qué | ¿Deuda? |
|---|---|---|---|
| 1 | **PayPal en producción con dinero real** | PT-076 es exclusivamente sandbox. Pasar a producción exige credenciales live, revisión de cumplimiento y un PT propio | Sí — PT posterior |
| 2 | **Deduplicación de webhooks para MercadoPago** | MP tiene el mismo agujero de idempotencia, pero incluirlo mete un flujo validado con dinero real (PT-063..065) en el radio de cambio de este PT. El mecanismo `ProcessedWebhookEvent` queda genérico y listo para reutilizarse | **Sí — deuda conocida, alta prioridad** |
| 3 | **Job de reconciliación de órdenes `APPROVED` sin capturar** | Si la captura falla tras los 25 reintentos de PayPal, la orden queda aprobada y sin capturar. El módulo `scheduler` sería el sitio natural | Sí — R-11 |
| 4 | **Verificación local de firma** (CRC32 + certificado) | Ahorraría una llamada de red por webhook, pero implica criptografía propia y cacheo de certificados sin cobertura previa. `design.md` AD-05 | Sí — optimización |
| 5 | **Eliminar las utilidades IPN de `@ironloot/core`** | `buildIpnVerificationPayload()` y `validateIpnResponse()` quedan sin consumidores. Se marcan `@deprecated`; borrarlas es un refactor con su propio riesgo | Sí — refactor menor |
| 6 | **Eliminar `PAYPAL_BUSINESS_EMAIL`** | Se marca obsoleta. Quitarla podría romper entornos desplegados que aún la definan | Sí — limpieza |
| 7 | **Pago directo de órdenes de subasta con PayPal** | PT-076 cubre **solo** el depósito de wallet | Sí — feature |
| 8 | **Reembolsos vía PayPal** | El módulo `refunds` no se toca | Sí — feature |
| 9 | **Payout / retiro hacia PayPal** | El retiro del vendedor sigue siendo manual/SPEI (PT-069..072) | Ya registrada |
| 10 | **Configurar Stripe y Hey Banco** | Siguen sin credenciales. Ajenos a este PT | Ya registrada |
| 11 | **MCP de PayPal** | Descartado explícitamente por el desarrollador: opera la cuenta vía REST, no alimenta el flujo de checkout | No |

---

## Excluido por naturaleza

| # | Qué | Por qué |
|---|---|---|
| 12 | Rediseño de la UI de depósito | Solo cambia el origen de las opciones (estático → API). Sin cambios visuales |
| 13 | Cambios en `WalletService.deposit()` | La acreditación ya funciona. PT-076 solo cambia quién la invoca y con qué importe |
| 14 | Cambios en la interfaz `PaymentProvider` | `design.md` AD-01 evita tocarla deliberadamente. Solo `WebhookResult` recibe un campo opcional |
| 15 | Migración de otros proveedores a un patrón común | Tentador al ver los cuatro proveedores, pero es un refactor transversal ajeno a este objetivo |

---

## Frontera con lo que sí entra

Para evitar ambigüedad en la validación:

- **Sí entra**: que PayPal funcione end-to-end en sandbox, con acreditación verificada en BD y sin doble acreditación ante reentrega.
- **No entra**: que PayPal funcione en producción, ni que MercadoPago quede protegido frente a reentregas.
