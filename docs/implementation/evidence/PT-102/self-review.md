# PT-102 — Self-Review

**Fecha**: 2026-07-27 · **Rama**: `fix/PT-102-puja-en-vivo-apagada` · **Estado**: VALIDATION_PENDING

## Checklist FDGE STATE 5

- [x] **¿Criterios de aceptación verificados?** Los seis de `PLAN_ACTUAL.md` §7. El que importa,
      V-LIVE-3, medido dos veces: en desarrollo (`$950 → $1200`) y en una **corrida completa desde
      base vacía** (`$700 → $950`).
- [x] **¿Escenarios del Proposal Package pasando?** OS-01…OS-06 (6/6) y V-LIVE-0…V-LIVE-7 (8/8).
- [x] **¿Efectos colaterales en componentes relacionados?** Ver §«Regresión» abajo.
- [x] **¿Reglas de `11-Conventions.md` respetadas?** Y ampliadas: RULE-07 nace de este PT.
- [x] **¿Commits atómicos y trazables?** Tres: tests en RED, corrección, suite+documentación.
- [x] **¿Sin artefactos de depuración?** El `console.error` que se añade **es** la corrección, no
      un resto de depuración: RULE-07 exige que el fallo se vea.
- [x] **¿Documentación actualizada?** RULE-07 + Delta Log en `11-Conventions.md`.

## Evidencia

| Qué | Dónde |
|---|---|
| La guarda estática **falla** con el orden roto | `guarda-caza-la-regresion.txt` |
| `npm test` — los cinco proyectos | `npm-test.txt` (697, +6) |
| Fase 32 en corrida completa desde cero | `fase-32-corrida-completa.txt` |
| Resumen de la suite entera | `suite-completa.txt` |

## Regresión — qué se comprobó

| Riesgo previsto en `PLAN_ACTUAL.md` §6 | Resultado |
|---|---|
| La cuenta atrás tras `defer` | ✅ `V-LIVE-5`: `"0h 29m 51s"`, ni vacío ni `NaN` |
| El envío de puja | ✅ `V-LIVE-0` HTTP 201, y `e2e` 5/5 |
| La CSP | ✅ `V-LIVE-6`: cero violaciones. No se tocó |
| `plantillas-sin-js-inline` (PT-096) | ✅ CLIENT 89/89 |
| La suite completa | ✅ Ver salvedad abajo |
| ADMIN (Chart.js) | ✅ `OS-03` barre CLIENT y el analizador conoce `Chart`; ADMIN ya tenía el orden correcto |

## Lo que NO salió limpio, dicho tal cual

La corrida completa terminó con **dos casos rojos**, y ninguno es de este PT:

| Caso | Qué pasó |
|---|---|
| `QA-TR-03` | Mercado Pago devolvió `processing`: latencia de una pasarela real |
| `QA-PP-09` | Mide un delta de saldo, y el depósito de Mercado Pago **se acreditó dentro de esa ventana**. Ledger: `321.50 (PAYPAL) + 137.40 (MERCADO_PAGO) = 458.90`, exactamente el delta observado |

En `QA-PP-09` el sistema hizo lo correcto —la vía garantizada acreditó un pago que la notificación
no trajo—; lo que falla es cómo mide la prueba. Registrado como **F-35** en la matriz. No se
arregla aquí: mezclar lo haría irrevisable.

## Cosas que hice mal durante este PT, para que consten

1. **Mi fase nueva no era re-ejecutable.** Elegía al pujador por posición fija, así que en la
   segunda corrida pujaba quien ya iba ganando y recibía un 400 legítimo que parecía un fallo del
   feed. Corregido: el pujador se elige mirando quién lidera.
2. **Escribí el SQL del líder en varias líneas** y `psql -c` perdió el `ORDER BY … LIMIT 1`,
   devolviendo tres filas. Estuve dos corridas creyendo que la comparación fallaba cuando lo que
   fallaba era la consulta. Corregido, y anotado en el propio fichero para el siguiente.

Ninguna de las dos afecta al código de producción, pero las dos me costaron tiempo y las dos eran
evitables mirando antes de suponer.

## Alcance: una cosa que hice de más

Moví el `<script>` de la página **dentro** del `{% if auction %}`. No estaba en el Proposal
Package. Lo hice porque al ponerlos juntos se vio que sin subasta el script se cargaba igual y
reventaba al leer `#countdown` en la página de «subasta no encontrada» — el mismo defecto de fondo
(un script que corre cuando sus dependencias no están). Está en el commit y en el comentario de la
plantilla; si se considera fuera de alcance, se revierte en una línea.

## Lo que este PT desbloquea

- **PT-096** deja de estar bloqueado por F-34.
- **PT-098** vuelve a ser demostrable con la §2 de su guía, sin cambiarle una coma.

Ninguno de los dos se valida aquí: eso es del humano.
