// Payment subdomain: webhook signature validation utilities.
export * from "./webhook-signature-validator";

// PT-191 (AUD-012) — `ipn-validator.ts` retirado, y no por estar muerto sino por **describir mal un
// subsistema vivo**. Implementaba el IPN de **PayPal** —`cmd=_notify-validate`, respuesta `VERIFIED`—,
// un protocolo que esta plataforma no usa: PayPal va por Orders v2 y el unico IPN vivo es el de
// Mercado Pago, que se confirma **contra su API** porque su firma no es validable por diseno
// (`mercadopago.provider.ts`). Quien leyera este fichero para saber como se valida una notificacion de
// pago obtenia una respuesta falsa, con la confianza que da encontrarla en el dominio.
//
// Es la familia de H-016: un contrato sin implementadores se lee con confianza y es falso.
