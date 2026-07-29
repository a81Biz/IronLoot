# PT-172 — Self-Review (STATE 5)

**Fecha**: 2026-07-29 · **Tipo**: BUG · **Complejidad**: TRIVIAL en el enunciado, STANDARD en lo que salió
**Hallazgo que cierra**: F-167-H

## Qué se hizo

El bloque `jest` de `package.json` llevaba una clave `_comentario_maxWorkers` con la medición de PT-159.
JSON no admite comentarios, así que la explicación se colaba como clave — y **Jest la rechaza**,
emitiendo *«Unknown option … This is probably a typing mistake»* **dos veces por corrida**.

Medido: **2 avisos antes, 0 después.**

La salida no era borrar el comentario: **el comentario es la razón de que `maxWorkers` valga 1**, y
PT-159 lo dejó ahí a propósito porque *«fue una prevención que se quedó en una nota lo que hizo volver a
H-014 en cuatro días»*. Así que la configuración pasa a `src/api/jest.config.js`, donde un comentario es
un comentario, y el texto se conserva íntegro pegado a la opción que explica.

## Tres cosas que no estaban previstas, y las tres las encontró probar

**1. Al mover la config, las 111 suites fallaron con `SyntaxError` sobre TypeScript válido.**
`docker-compose` monta `/app/src`, `/app/test`, `/app/package.json`… y no el fichero nuevo. Sin config,
Jest cae a Babel y no aplica `ts-jest`.

Es **PT-138 otra vez**, y su comentario ya estaba escrito **tres líneas más arriba en el mismo
`docker-compose.yml`**: *«lo que no está montado, el contenedor lo ejecuta de otra forma — no falla,
miente»*. Aquí falló ruidosamente por suerte: si `jest.config.js` hubiera sido opcional, la suite habría
corrido con otra configuración —otros `roots`, otro `maxWorkers`— y **verde**.

Se añade el montaje y **una guarda que lo vigila**, vista fallar al retirar el montaje a propósito
(`guarda-RED.txt`).

**2. Retirar el bloque `jest` desplazó líneas, y la guarda de H-016 lo cazó en el acto.** El TRD citaba
`package.json:156` y `:157` para Node y npm; el fichero pasó a tener 147 líneas y las dos quedaron fuera
de rango. Corregidas a `:121` y `:122`.

Es la demostración en vivo de para qué existe esa guarda: **una cita por número de línea envejece con
cualquier edición del fichero citado**, y ésta la produjo un cambio que no tenía nada que ver.

**3. Y apareció una cita que ya estaba mal antes de este PT.** `10-Technical-Debt.md` situaba `stripe`
en `package.json:68`, que es `ioredis`. Está en la 80, **y no se ha movido** — comprobado contra
`HEAD` anterior. Ninguna guarda la cubría: `coherencia-documentacion-codigo` vigila la tabla de stack
del TRD y su prosa, **no el registro de deuda**. Corregida y anotada en el propio documento.

## Evidencia

| Fichero | Qué prueba |
|---|---|
| `verificacion.txt` | **0** avisos de validación; el montaje dentro del contenedor; `maxWorkers: 1` con su explicación; corrida completa |
| `guarda-RED.txt` | La guarda del montaje **vista fallar** al retirarlo (C3) |
| `guarda-GREEN.txt` | **9/9** con el montaje puesto |

## Checklist

- [x] El texto de PT-159 y PT-166 **conservado íntegro**, y ahora legible junto a la opción
- [x] Una sola fuente de configuración: `package.json` ya no lleva bloque `jest`, y hay un control (C2)
      que lo exige — tener las dos es garantizar que alguien edite la que no se lee
- [x] Guarda nueva **vista fallar** (RULE-14), con 4 casos de control incluido AC-03, que impide que C3
      pase en vacío si el servicio se renombra
- [x] Las dos citas desplazadas y la preexistente, corregidas
- [x] Suite completa: **111 suites / 881 pruebas** · `test:guardas`: **17 suites / 183 pruebas**
- [x] No se tocó ninguna dependencia, así que **no se regenera ningún lock**

## Una nota sobre el alcance

Se clasificó TRIVIAL y **no lo era**. Un cambio de una clave en `package.json` acabó tocando
`docker-compose.yml`, dos documentos y una guarda nueva. Queda escrito porque la lección es de
estimación: **mover configuración de sitio cruza la frontera del contenedor**, y ahí este repositorio ya
ha pagado tres veces (PT-129, PT-135, PT-138).
