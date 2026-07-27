# Self-Review — PT-087

- [x] **Criterios de éxito del PLAN_ACTUAL**: los 7, incluido el nº 3, que dependía de una cuenta
      personal de sandbox y quedó cubierto (QA-PP-07/08/09).
- [x] **Tests primero (RED)**: verificado en dos rondas. 3 suites / 10 tests en rojo antes de
      tocar `src/`; después, 3 suites / 9 tests en rojo para F-09..F-12.
- [x] **Sin efectos colaterales**: Mercado Pago verificado contra la pasarela real tras el cambio
      —cobro real, notificación firmada, traza de siete pasos, acreditación— y su suite intacta.
- [x] **Convenciones**: el adaptador nuevo sigue el patrón de `mercadopago.provider.ts` (traza
      opcional inyectada, `authorizedCall` con estado y duración).
- [x] **Sin artefactos de depuración**: sin `console.log` ni código comentado en `src/`.
- [x] **Documentación**: ADR-036..040, RN-81..85, migraciones 24–25, fase QA 71, inventario.
- [x] **Credenciales**: `paypal-sandbox.json` está en `.gitignore`; se versiona solo el ejemplo.
      Verificado con `git check-ignore`. Cero credenciales en la traza persistida (QA-PP-14).

## Lo que no quedó cubierto, dicho claro

- **El webhook de PayPal no se ejercitó con una firma válida.** Verificar una firma legítima exige
  que PayPal alcance la API, y no hay URL pública. Lo que sí está probado es el rechazo (401) y
  que la vía garantizada acredita sin webhook, que es el camino real en este entorno.
- **Stripe y HeyBanco siguen sin traza ni vía garantizada.** No están configurados ni son
  verificables. La prueba `provider-guarantees` los cubre en lo exigible a todos (401 y registro);
  el resto se instrumenta cuando se activen.
- **El webhook registrado en PayPal apunta a una URL de marcador.** Sirvió para obtener el
  `PAYPAL_WEBHOOK_ID` que `checkStatus()` exige. Cuando exista URL pública hay que actualizarlo.

## Una decisión discutible, declarada

`Payment.reference` pasó a **única**. Es correcto para depósitos —una solicitud es un pago— pero
impone una restricción a toda la tabla. Se apoya en que los pagos de orden llevan `reference` nula
y en PostgreSQL varios NULL no colisionan. Si algún día un pago de orden necesitara referencia
compartida, esta restricción habría que revisarla.
