# PT-063 — Design
## Decisión
`@Public()` en el método `webhook` del `PaymentsController`. El guard JWT global (APP_GUARD) respeta la
metadata `IS_PUBLIC_KEY`; la autenticidad del webhook la garantiza la firma HMAC en `provider.handleWebhook`.
## Racional
Los webhooks los invoca la pasarela (sin JWT). Patrón ya usado por `auth.controller`. Cambio mínimo, 1 línea + import.
