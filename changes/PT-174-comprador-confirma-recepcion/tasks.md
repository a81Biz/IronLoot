# PT-174 — Tareas atómicas

> **PT-173 va primero** (conecta la máquina de estados). Estas tareas asumen que ya está.

## PT-174.1 — La autorización se parte por transición

- **Objetivo**: `SHIPPED` sólo el vendedor; `DELIVERED` sólo el comprador.
- **Entrada**: `shipments.service.ts:updateStatus(userId, id, dto)`.
- **Salida**: 403 al vendedor que intenta `DELIVERED`, con mensaje que dice quién debe hacerlo; 403 al
  comprador que intenta `SHIPPED`; 403 a un tercero en ambas.
- **Validación**: prueba unitaria con los tres actores por las dos transiciones.
- **Status**: PENDING

## PT-174.2 — `deliveredAt` se sella, y el pedido pasa por la máquina

- **Objetivo**: la confirmación del comprador sella `shipment.deliveredAt` y mueve el pedido **vía
  `ordersService.updateStatus`**, no con un `update` directo.
- **Salida**: `deliveredAt` con la hora real; `order.status = DELIVERED`; excepción si la transición no
  es válida.
- **Validación**: `PAID → DELIVERED` directo se rechaza; `PAID → SHIPPED → DELIVERED` pasa.
- **Status**: PENDING

## PT-174.3 — La liberación cuenta 72 h desde la confirmación

- **Objetivo**: `releaseMaturedSettlements` deja de liberar por estado y libera por tiempo.
- **Entrada**: `SETTLEMENT_HOLDBACK_HOURS` (72), `DISPUTE_WINDOW_DAYS` (14).
- **Salida**: libera si `shipment.deliveredAt <= ahora − 72 h` **o** `order.createdAt <= ahora − 14 d`.
- **Validación**: cuatro casos — confirmado hace 1 h (no libera), hace 73 h (libera), sin confirmar con
  pedido de hace 15 d (libera), ya liberado (no vuelve a liberar).
- **Status**: PENDING

## PT-174.4 — Disparador del cron, sólo en desarrollo

- **Objetivo**: que la fase de QA no espere los 30 min del cron.
- **Salida**: `POST /api/v1/diagnostics/scheduler/release-settlements` bajo `DevelopmentOnlyGuard`,
  devuelve cuántos pedidos liberó.
- **Validación**: prueba de que con `NODE_ENV=production` responde 403.
- **Status**: PENDING

## PT-174.5 — Interfaz en CLIENT

- **Objetivo**: el vendedor declara envío; el comprador confirma recepción.
- **Salida**: controles en el detalle del pedido. El del comprador **sólo visible con el envío
  `SHIPPED`**. JS en `public/js/`, estilos en el CSS del sitio, `data-accion` registrada (RULE-30) y
  `confirm()` previo por ser una acción con consecuencia económica.
- **Validación**: `plantillas-sin-js-inline`, `estilos-fuera-de-plantillas`, RULE-30 y
  `rutas-que-el-client-invoca` en verde.
- **Status**: PENDING

## PT-174.6 — Aviso al comprador cuando el vendedor envía

- **Objetivo**: que el comprador sepa que tiene algo que confirmar.
- **Salida**: notificación in-app al pasar a `SHIPPED`. **Correo fuera de alcance.**
- **Validación**: la notificación existe y su tipo corresponde al evento — es la lección de H-012, donde
  el aviso al vendedor reutilizaba el tipo del comprador.
- **Status**: PENDING

## PT-174.7 — Documentación y contrato

- **Objetivo**: que quede escrito quién puede qué y por qué la espera es de 72 h.
- **Salida**: `CLAUDE.md` (la regla), `.env.example` (`SETTLEMENT_HOLDBACK_HOURS`), y una `RULE-NN` nueva
  si la revisión concluye que hace falta.
- **Status**: PENDING
