# PT-104 — Self-Review

**Fecha**: 2026-07-27 · **Rama**: `fix/PT-104-medir-el-credito-por-referencia` ·
**Estado**: VALIDATION_PENDING

## Checklist FDGE STATE 5

- [x] **¿Criterios de aceptación verificados?** Los tres de `PLAN_ACTUAL.md` §5.
- [x] **¿RED y GREEN sobre la misma evidencia?** Sí: `vieja-falla-nueva-pasa.txt` reproduce el
      fallo observado (`99049 → 99507.9`) y demuestra que la medición nueva pasa con esos mismos
      datos.
- [x] **¿Sin efectos en producción?** No se tocó código de producto. El sistema no tenía nada roto.
- [x] **¿Commit atómico?** Uno.
- [x] **¿Sin código muerto?** `saldoAntes` quedó sin uso en ambas fases al cambiar la aserción, y
      se retiró. `saldoDespues` se conserva **sólo** en phase 71, donde `QA-PP-16` comprueba que el
      saldo *no* cambia — ahí restar saldos sí es la medida correcta: mide que no pasa nada.

## Lo que apareció al verificar, y no estaba en el plan

La fase 70 nunca llegaba a mi aserción: abortaba tres casos antes.

`createOrder` devuelve lo que responda Mercado Pago, y `/v1/orders` con `processing_mode:
automatic` puede contestar **`processing`** — orden creada, cobro en curso. La fase tomaba eso por
un fallo y se rendía. **El pago sí se cobraba** —la vía garantizada lo acreditaba después, y así se
descubrió F-35— pero doce comprobaciones de traza no se ejecutaban nunca.

| | Antes | Después |
|---|---|---|
| Fase 70 | 4 casos, 1 rojo | **16 casos, 16 verdes** |
| Fase 71 | 17 casos, 1 rojo | **17 casos, 17 verdes** |

Tratar como síncrona una API que no lo es no es un fallo de la pasarela. Se arregla aquí porque sin
ello no había forma de demostrar la corrección de esta misma tarea — y porque es el mismo defecto
de fondo: **una prueba que asume algo que el sistema nunca prometió**.

## Un tropiezo

Escribí `node -e "require('./70-payment-trace.cjs')"` para comprobar la sintaxis. El fichero es una
IIFE: **lo ejecutó**, y lanzó una solicitud de depósito real de 137.40 que quedó en `REQUESTED`.
Sin consecuencia —expira a las 72 h por `PAYMENT_EXPIRATION_HOURS`— pero es un cobro real iniciado
por descuido. Para comprobar sintaxis, `node --check`.

## Lo que no cubre

La aserción nueva sigue sin detectar que el importe acreditado sea el que el usuario pidió si el
propio sistema lo calculó mal desde el principio: compara contra `AMOUNT`, que es lo que la prueba
solicitó. Eso está bien — es lo que debe comprobar— pero conviene no leerlo como más de lo que es.
