# PT-235 — Self-Review

**Tipo:** REFACTOR (endurecimiento de guarda) · **Complejidad:** TRIVIAL · **Rama:** master
**Origen:** la reconstrucción del grafo del 2026-07-31. Un extractor semántico anotó que
`history.transactions`, `disputables` y `providers` se leen **en crudo** en las plantillas de CLIENT.

## Qué se midió antes de tocar nada

Los tres casos que el grafo señaló **son correctos**, y comprobarlo era el trabajo:

| Lectura | Por qué es correcta |
|---|---|
| `disputables` | `app.controller.ts:509` la asigna con `toItems<…>()`: ya llega normalizada, y `toItems` devuelve un array. Leerla en crudo es lo correcto |
| `providers` | `app.controller.ts:288` la construye con `.map()` sobre `res?.providers ?? []`. No viene del API: su forma la decide quien la escribe |
| `history.transactions` | `wallet.controller.ts:93` mapea `historia.items` a la clave `transactions` de su respuesta. La plantilla lee la clave que el API emite |

**Ninguno era un defecto.** El defecto estaba en la guarda.

## El hallazgo

`usosDeLista()` descartaba **toda** expresión con punto:

```ts
else if (!expr.includes('.')) anotar(expr, 'crudo');
// `x.y.items` o `a.b` con más de un punto no es una variable de primer nivel: no se juzga.
```

Así que `{% for tx in history.transactions %}` **no se juzgaba: ni para bien ni para mal**. Y ésa es
la forma exacta del defecto que PT-213 existe para impedir —el catálogo leía `data.items` sobre
`{data,total,page,limit}`—, sólo escrita con otra clave. Una clave nombrada que no coincida con lo
que el API emite da `undefined`, y en Nunjucks `undefined` es un `{% else %}`: **pantalla vacía, cero
errores, indistinguible de una lista legítimamente vacía.**

El comentario además **no describía el código**: decía «más de un punto» y el código excluía
cualquier punto.

## Lo que se cambió

`modo` gana el valor `'clave'`, y una expresión `X.algo` con **un** punto se juzga contra
`CLAVES_DECLARADAS`, un mapa `clave → motivo`. Se admite declarándola, no callándola — el motivo
no es decorativo: es lo que impide que la lista crezca hasta volver a tapar el defecto.

`x.y.z` con más de un punto **sigue sin juzgarse**, y ahora lo dice: nada del repositorio lo usa hoy,
y una guarda que opina sobre lo que no ha visto acaba acusando a código correcto (PT-103).

## Verificación

**RED antes de implementar:** `C7` falló con `TS2304: Cannot find name 'CLAVES_DECLARADAS'`.

**Y la comprobación que de verdad importa** — que la ampliación actúa sobre el código real y no sólo
sobre el caso sintético: al sustituir la clave declarada por una inexistente, la guarda acusa

> `CLIENT pages/payments.html: la plantilla recorre «history.transactions», una clave nombrada de un
> valor que viene del API y que nadie ha declarado.`

Restaurada la declaración, verde. `C7` prueba **las dos direcciones**: declarada pasa, no declarada
no pasa — sin la segunda mitad, vaciar el mapa dejaría el caso en verde.

## Checklist

- [x] Criterios verificados sobre salida real, no sobre lectura
- [x] Escenarios de prueba pasando — 9/9 en la guarda; **1.477/1.477** en las cinco suites
- [x] Sin efectos colaterales: `tsc --noEmit` limpio, lint sin errores nuevos
- [x] `11-Conventions.md` respetado — es `RULE-39`, y se amplía su guarda sin cambiar la regla
- [x] Commit atómico trazable a PT-235
- [x] Sin artefactos de depuración
- [x] Documentación actualizada: la limitación queda **declarada en el propio fichero**

## Lo que este PT deja dicho

Esta guarda se ha equivocado ya **cuatro veces**, y las cuatro midiendo otra cosa: la ruta de
plantilla con doble prefijo, `fetchJson(` como subcadena literal, la resolución de variable fuera del
ámbito del método, y ahora la exclusión de toda expresión con punto.

Las cuatro se encontraron **leyéndola con desconfianza o cruzándola con otra fuente** — ninguna
ejecutándola, porque las cuatro veces estaba verde. La cuarta la encontró **el grafo de conocimiento**,
que no comparte los supuestos de quien la escribió: eso es lo que aporta reconstruirlo.
