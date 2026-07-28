# PT-136 — Design: el CI que nunca ha corrido

**Tipo**: BUG · **Complejidad**: MAJOR · **Origen**: revisión de coherencia de registros (2026-07-28)
**Bloquea a**: PT-137, PT-138, PT-139, PT-140 y PT-141.B

## El defecto, en tres medidas

```
.github/workflows/ci.yml:3-7
  on:
    push:          branches: [dev, qa, prep, prod]
    pull_request:  branches: [dev, qa, prep, prod]

$ git branch -r                                              -> origin/master, y nada mas
$ gh api repos/a81Biz/IronLoot/actions/runs --jq .total_count -> 0
```

Las cuatro ramas del disparador **no existen**. No hay `workflow_dispatch`, así que tampoco puede
lanzarse a mano. GitHub lista el workflow como `active` — es sintácticamente válido — y por eso nadie
ha visto nunca un error.

## Por qué esto es MAJOR y no una línea de YAML

Cambiar el disparador es trivial. **Lo que no es trivial es lo que pasa después**: ocho jobs que
nunca se han ejecutado arrancan a la vez, con `npm ci` gobernado por los locks de PT-135 por primera
vez. El precedente está escrito: PT-128 ejecutó los 17 ficheros e2e por primera vez y **42 de 80
tests fallaron** — no por un defecto del job, sino porque los tests probaban un contrato viejo.

Aquí el estreno es ocho veces mayor.

## Decisiones de arquitectura

### D1 — El disparador se declara contra la realidad, no contra una aspiración

```yaml
on:
  push:
    branches: [master]
  pull_request:
    branches: [master]
  workflow_dispatch:
```

Se retiran `dev`, `qa`, `prep` y `prod`. **Declarar ramas que nadie ha creado nunca es exactamente lo
que produjo este defecto**; conservarlas «por si acaso» reproduce la causa. Si algún día hay flujo de
entornos, entra con su ADR y con las ramas creadas.

### D2 — `workflow_dispatch` no es un extra: es el mecanismo de estreno

Con él, la primera corrida se lanza **a mano y mirando** (`gh workflow run CI --ref master`), antes de
que un push la dispare sola. Es la diferencia entre estrenar los ocho jobs de frente y de espaldas.
Se queda después: un workflow que sólo puede correr cuando alguien empuja es un workflow que no se
puede interrogar.

### D3 — Lo que salga rojo se triara; no se pone verde

Regla escrita antes de mirar los resultados, para que el resultado no la escriba:

| Lo que falla | Qué se hace |
|---|---|
| **El job** (falta un paso, un `env`, una ruta) | Se corrige **aquí**. Es el alcance de PT-136 |
| **El repositorio** (un test real que falla, una vulnerabilidad real) | **PT propio**, registrado. No se parchea dentro de PT-136 |
| **Un test viejo contra contrato nuevo** (el caso de PT-128) | PT propio. Es trabajo de contenido, no de pipeline |

Ningún job se marca `continue-on-error` para que la corrida se vea verde. Rojo y visible es
literalmente lo que se está comprando.

### D4 — La guarda ataca la clase, no el caso

`ramas-del-disparador-existen.spec.ts`: **toda rama nombrada en el `on:` de cualquier workflow tiene
que existir en el remoto.**

Por qué una guarda y no sólo el arreglo: PT-129 tapó su síntoma con un parche en un `Dockerfile` y el
mismo defecto volvió **dos veces más**. La lección literal de PT-135 es que un parche no impide la
cuarta vez. Un `ci.yml` corregido a mano hoy vuelve a desalinearse el día que alguien añada un
workflow nuevo copiando el disparador del anterior.

**Cómo resuelve las ramas sin depender de la red**: lee la salida de `git ls-remote --heads` cacheada
en un fichero, o `git branch -r` sobre el checkout. En CI el checkout tiene los refs; en local
también. Si no puede resolver el remoto, **la prueba falla** — no se salta. `SIN_DATOS` no es un
aprobado (lección de PT-122, y la razón por la que PT-138 existe).

### D5 — La cuenta de jobs se corrige donde está mal

Son **ocho**: `lint` · `security-audit` · `schema-drift` · `test-unit` · `test-integration` ·
`observabilidad` · `build` · `docker`. Los registros dicen «los siete jobs» en `HANDOFF.md:50` y
`PENDING_TASKS.md:32`. Es menor, y es exactamente el tipo de cifra que se copia de documento en
documento sin que nadie la cuente — la familia de H-016.

## Lo que este PT NO decide

- **No reorganiza los `needs`.** Los tres checkpoints van sin `needs` por decisión de PT-128 (H-015),
  y ese razonamiento sigue siendo correcto. Lo que faltaba no era la topología: era que el workflow
  arrancara.
- **No añade jobs nuevos.** El escáner de imagen base (TD-016) es su propio PT.
- **No toca los tests.** Si un test falla en CI, el test es de otro PT.

## Riesgo principal y su antídoto

**R1 — la primera corrida sale roja.** Probabilidad alta, y es el resultado esperado. El antídoto no
es evitarlo: es **verlo en un `workflow_dispatch` controlado** en vez de en un push, y tener escrita
de antemano (D3) la regla de qué se corrige aquí y qué se abre como PT.

El fracaso de este PT no sería una corrida roja. Sería una corrida verde conseguida silenciando algo.
