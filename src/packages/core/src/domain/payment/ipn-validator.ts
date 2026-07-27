/**
 * PayPal IPN (Instant Payment Notification) verification utilities.
 *
 * CORE defines the verification protocol; HTTP I/O stays in the provider.
 * The provider calls buildIpnVerificationPayload, POSTs the result to PayPal,
 * then calls validateIpnResponse with PayPal's reply.
 *
 * @deprecated PT-076 — Sin consumidores desde la migración de PayPal a Orders v2 +
 * Webhooks. La verificación pasó a `POST /v1/notifications/verify-webhook-signature`
 * dentro de `PaypalProvider`. Estas funciones se conservan (con sus tests) porque
 * eliminarlas es un refactor con su propio riesgo, registrado como fuera de alcance
 * en `changes/PT-076-paypal-orders-v2/out-of-scope.md` nº 5.
 */

/**
 * Constructs the payload to send back to PayPal for IPN verification.
 * Must be POSTed verbatim to ipnpb.paypal.com (production) or
 * ipnpb.sandbox.paypal.com (sandbox).
 */
export function buildIpnVerificationPayload(rawBody: string): string {
  return `cmd=_notify-validate&${rawBody}`;
}

/**
 * Validates the response from PayPal's IPN verification endpoint.
 * Returns true only when PayPal responds with the exact string "VERIFIED".
 */
export function validateIpnResponse(response: string): boolean {
  return response.trim() === "VERIFIED";
}
