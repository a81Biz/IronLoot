# PT-117 — Self-Review

**Fecha**: 2026-07-27 · **Rama**: `fix/PT-117-tipo-de-aviso-al-vendedor` ·
**Estado**: VALIDATION_PENDING

## Por qué este documento llega tarde

**Me salté el STATE 5.** Pasé de la implementación al `HISTORY.log` sin generar evidencia ni
self-review, y el humano lo señaló. Es la tercera vez en esta sesión que me lo tiene que decir.

FDGE no dice «genera evidencia si el cambio es grande»: dice que **toda implementación genera
evidencia, sin excepciones**, y que TRIVIAL permite *condensar*, no *saltar*. Un cambio de una línea
también se verifica.

## Checklist FDGE STATE 5

- [x] **¿Criterios de aceptación verificados?** Los cuatro de `PLAN_ACTUAL.md` §5.
- [x] **¿Escenarios pasando?** TA-01, TA-02, TA-03 (3/3).
- [x] **¿Efectos colaterales?** `npm test` 485 (API) + 103 (CLIENT). La migración no tocó filas.
- [x] **¿Reglas de `11-Conventions.md` respetadas?** Sí.
- [x] **¿Commit atómico y trazable?** Uno.
- [x] **¿Sin artefactos de depuración?** Sí.
- [x] **¿Documentación actualizada?** El comentario del atajo desapareció: ya no hay atajo.

## Evidencia

| Qué | Dónde |
|---|---|
| La migración, comprobada aditiva antes de aplicarse | `migracion-aditiva.txt` |
| El contraste antes/después sobre salida real | `contraste-en-los-datos.txt` |

## Regresión — lo que el plan previó y lo que pasó

| Riesgo previsto | Resultado |
|---|---|
| `ALTER TYPE … ADD VALUE` no corre en transacción | Se aplicó suelto. Correcto |
| Las notificaciones existentes | 4 antes, 4 después. Intactas |
| Consumidores del tipo | `TA-03` fija que los siete valores previos siguen ahí |
| El cierre de subasta | Cerrado por el cron, sin intervención |

## Un tropiezo, y es mío

Durante la verificación reabrí a `ACTIVE` una subasta **que ya tenía pedido** — lo hizo mi propio
script de validación de la puja en vivo, que la reabre para poder pujar. El cierre chocó con la
restricción única de `auction_id` y el cron dejó de poder cerrarla.

No es un defecto del producto: es un estado que yo fabriqué. Lo devolví a `CLOSED` y usé una subasta
limpia. Pero conviene anotarlo: **un script de validación que muta estado puede dejar el sistema en
una forma que no ocurriría sola**, y confundir eso con un hallazgo cuesta tiempo.

## Lo que este PT desbloquea

**P-007 pasa a `VALIDADO`**, que era lo único que H-012 bloqueaba.
