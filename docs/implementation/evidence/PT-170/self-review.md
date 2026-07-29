# PT-170 — Self-Review (STATE 5)

**Fecha**: 2026-07-29 · **Tipo**: BUG · **Complejidad**: STANDARD
**Hallazgo que cierra**: F-167-D

## Qué se hizo

Tres citas a evidencia inexistente, y la guarda que no las veía.

| Documento | Citaba | Ahora |
|---|---|---|
| `PTSA/Hallazgos/H-023.md` | `evidence/PT-162/` — no existe | `evidence/PT-160/self-review.md`, donde vive de verdad la evidencia del grupo `## PT-159 / PT-160 / PT-162` |
| `PTSA/Hallazgos/H-001.md` | `evidence/PT-026/` — **nunca existió** | la entrada `## PT-026` de `HISTORY.log` y el código vivo (`bids.service.ts:113`) con su prueba |
| `changes/PT-145-.../tasks.md` | `evidence/PT-145/` — nunca se creó | anotado: el hueco está declarado y contado en `evidence-baseline.json` |

**Los dos primeros son hallazgos cerrados.** Quien siguiera la cita para comprobar el cierre no
encontraba nada. Es H-016 dentro de los propios hallazgos.

## Lo que no se hizo, y es deliberado

**No se creó ninguna carpeta para que una cita cuadrase.** Es hacerlo al revés, y es literalmente la
lección de PT-141 con `PTSA/Motor-PTSA.md`: *«crear ficheros para que una referencia deje de estar rota
es hacerlo al revés»*. Se apunta a lo que existe y es verificable.

**No se tocó `HISTORY.log`**, que cita `evidence/PT-026/`, `PT-046/` y `PT-145/`. Es append-only:
corregirlo exigiría reescribir el log, y reescribirlo es falsificar el registro.

## La guarda: AC-02 corregido, no borrado

RULE-31 declaraba en su caso de control AC-02 que *«una carpeta sin fichero no es una cita
comprobable»*. Cierto para «está en git» —git no sigue directorios— y **falso para «existe»**.

Retirar el caso de control habría debilitado la guarda en silencio. Se **corrige su enunciado** y se
comprueban las dos mitades: que una carpeta no es una cita a *fichero*, y que **sí** es una cita a
carpeta.

**Citar no es comentar.** Se descartan las líneas de blockquote, porque un documento que explica que
una cita está rota tiene que poder escribir la ruta rota — los avisos de este PT en `H-001` y `H-023` lo
hacen. La alternativa era detectar negaciones en la prosa, y eso **enseña a escribir para el linter**.

**Las exclusiones declaran su motivo, y hay un control que lo exige** (C5): una exclusión sin motivo es
una puerta de escape.

## Evidencia

| Fichero | Qué prueba |
|---|---|
| `guarda.txt` | **14/14** tras el arreglo. Antes acusaba exactamente la cita de `changes/PT-145` |
| `medicion.txt` | El barrido completo: **0** citas a carpeta rotas fuera de las exclusiones declaradas |

## Checklist

- [x] La ampliación **vista acusar** antes de arreglar (acusó `H-001`, `H-023`, `changes/PT-145`)
- [x] 4 casos de control nuevos: AC-02 corregido, AC-05 (una cita a fichero no cuenta dos veces),
      AC-06 (blockquote no se acusa), AC-07 (la misma ruta fuera del blockquote sí)
- [x] Aserción previa de que hay citas a carpeta que mirar (>10) — no pasa en vacío
- [x] RULE-31 actualizada en `11-Conventions.md`, diciendo qué cambia y por qué
- [x] No se fabricó ninguna carpeta; no se tocó `HISTORY.log`
