# PT-143 — Self-Review

**Fecha**: 2026-07-28 · **Rama**: `fix/PT-143-aislamiento-e2e` · **Estado**: `VALIDATION_PENDING`.
Es un BUG: **lo cierra el humano.**

## Lo que consigue

**Los ocho jobs de CI se han ejecutado.** Siete en verde; `docker` rojo por PT-147.

Es lo que faltaba desde el principio de esta tanda: PT-136 hizo que el pipeline arrancara, PT-142
cerró la carrera que tumbaba `test-integration`, y este PT quitó lo último —el aislamiento— y destapó
el engaño final del job `docker`.

## Criterios de éxito

| # | Criterio | Estado |
|---|---|---|
| 1 | La guarda falla antes y pasa después | ✅ Listó 15 borrados sin filtro |
| 2 | `orders-flow` limpia lo suyo | ✅ |
| 3 | `auth-helper` borra en orden | ✅ Cero violaciones de clave ajena |
| 4 | La suite en paralelo contra base vacía | ✅ **82/82** en CI |
| 5 | Dos corridas con el mismo resultado | ⚠️ **Una sola corrida verde.** La anterior tenía otro código; no son comparables |
| 6 | Decidir `payments.e2e` | ✅ Doblada la pasarela (vía **[B]**) |
| 7 | `build` y `docker` se ejecutan | ✅ Los dos. `build` pasa, `docker` falla → **PT-147** |
| 8 | Regresión | ✅ **726/726** en 96 suites |

**El criterio 5 no lo declaro cumplido.** Pedía dos corridas seguidas con el mismo resultado y sólo
hay una en verde. Un aislamiento que funciona una vez no está demostrado — y menos aquí, donde el
defecto original era precisamente que **los fallos cambiaban de sitio entre corridas**.

## Lo que encontré y no esperaba

**`TestApp` imponía `ironloot_db`.** Una asignación directa a `process.env.DATABASE_URL` que pisaba
el entorno. En una máquina de desarrollo, las pruebas corrían contra la base que sostiene las
validaciones PTSA, y `auth-helper.cleanup()` borra por patrón de correo.

Lo que hace esto digno de anotar: **`auth-helper` tenía escrito el miedo exacto** —*«Be careful not to
delete real users if running on dev db. Ideally we run on test db»*— sin saber que veinte líneas más
allá había una línea que garantizaba lo que temía. Dos personas distintas, dos ficheros, y ninguna
mirando el otro.

**El job `docker` estaba muerto dos veces.** Condicionado a las ramas fantasma de PT-136 —en otro
sitio del mismo fichero que PT-136 había corregido— y apuntando a un `./Dockerfile` que no existe.
Y un job saltado **no cuenta como fallo**: el workflow decía `success`.

## Las dos veces que la guarda me cazó

**Sexta de la tanda**: los casos de control de la guarda de limpiezas contienen el patrón prohibido.
Inevitable, y se excluye a sí misma con la razón escrita.

**Séptima**: la guarda de ramas leyó mi propio comentario de `ci.yml` —que cita `refs/heads/prod` para
explicar el defecto— como una condición viva. **Y esa importa**: sin el arreglo, documentar por qué
una rama se retiró haría fallar la guarda, así que la forma de tenerla en verde sería no explicar
nada. Una guarda que penaliza escribir la razón produce ficheros sin razones.

## Lo que NO hice, a propósito

- **`--runInBand`**, descartado por escrito en `out-of-scope.md` antes de empezar.
- **Arreglar el job `docker`** más allá de su condición. Construir las cuatro imágenes y arrancarlas
  es PT-147, y **lo dejo corriendo y fallando**: rojo y visible por encima de saltado y oculto.
- **Rediseñar el aislamiento** con una base por worker. Se reserva por si acotar no basta.

## Lista de STATE 5

- [x] Criterios verificados, **y el 5 declarado incumplido**
- [x] Sin efectos colaterales: 726/726, `lint` 0 errores
- [x] Dos guardas nuevas, con 11 y 5 casos de control
- [x] Commits atómicos trazables a PT-143
- [x] **Sin artefactos de depuración** — comprobado buscando ficheros nuevos, no sólo `console.log`;
      es el repaso que fallé en PT-142 y que dejó `diag.cjs` en `src/`
- [ ] **`11-Conventions.md` — RULE-23 pendiente de escribir.** La segunda escritura no está hecha

## Lo que falta para cerrarlo

1. **RULE-23** en `11-Conventions.md` y la nota en `CLAUDE.md`.
2. **Una segunda corrida verde** (criterio 5).
3. **El VoBo humano.** Es un BUG.
