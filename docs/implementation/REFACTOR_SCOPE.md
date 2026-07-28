# REFACTOR_SCOPE — PT-140 y PT-141

**Fecha**: 2026-07-28 · **Variante**: STATE 1-R · **Estado**: esperando ACK del Proposal Gate
**Origen**: revisión de coherencia de registros solicitada por el humano — *«se han realizado ya
varias fases y al parecer siempre quedan cosas por hacer y nunca se cierran completo»*.

> El alcance anterior de este fichero (**PT-126**, NestJS 10→11, cerrado y validado) se conserva en
> `archive/REFACTOR_SCOPE-PT-126.md`. FDGE manda sobrescribir; archivar antes evita que sobrescribir
> sea perder.

---

# PT-140 — REFACTOR (STANDARD): doce almacenes de pendientes, ningún punto de cierre

## El problema, medido

La pregunta del humano —«¿por qué nunca se cierra?»— tiene una respuesta estructural, no de
disciplina. **Un pendiente puede vivir hoy en doce sitios distintos, y ninguno declara cuál manda.**

| # | Almacén | Qué guarda |
|---|---|---|
| 1 | `docs/implementation/PENDING_TASKS.md` | Índice FDGE |
| 2 | `docs/implementation/MATRIZ-DEUDA-TECNICA.md` | «El documento que manda», según el #1 |
| 3 | `docs/implementation/HANDOFF.md` | § Riesgos y deuda + § Próximas acciones |
| 4 | `docs/implementation/DISCOVERY.md` | Los `F-XXX` dentro de las § Revisión U-00N |
| 5 | `docs/implementation/HISTORY.log` | `Status: VALIDATION_PENDING` |
| 6 | `docs/implementation/ROADMAP.md` | FPGE |
| 7 | `docs/implementation/FDGE_HALLAZGOS_TRACKER.md` | Hallazgos FDGE |
| 8 | `changes/PT-XXX/tasks.md` | Estado por tarea atómica |
| 9 | `PTSA/PENDIENTES.md` | Bloqueantes y pendientes por sesión |
| 10 | `PTSA/Hallazgos/H-XXX.md` + `ESTADO_ACTUAL.md` + `RESUMEN.md` | Hallazgos de auditoría |
| 11 | `docs/enterprise-documentation/10-Technical-Debt.md` | `TD-XXX` |
| 12 | `docs-v2/Informe-Remediacion.md` | Hallazgos de la remediación de julio |

### Lo que eso produce, verificado contra la fuente el 2026-07-28

| Registro | Dice | Realidad |
|---|---|---|
| `PENDING_TASKS.md:23` | `PT-104` PENDING | **Hecho**: `tests/qa-browser-suite/71-paypal-guaranteed.js:236-258` cuenta asientos del ledger, no deltas de saldo |
| `PENDING_TASKS.md:24` | `TD-014` PENDING | **Cerrada por PT-105**: `10-Technical-Debt.md:289-292`; ningún `main.ts` lleva `unsafe-inline` |
| `PENDING_TASKS.md:32` · `HANDOFF.md:49` | «Falta empujar `master`» | **Empujado**: `master == origin/master == 0731161`; `rev-list --left-right --count` → `0 0` |
| `PENDING_TASKS.md:91-167` | PT-127…130 `BLOCKED`, «ninguna rama abierta, ningún fichero de código tocado» | **Los cuatro fusionados** (a8d5bf0, 90ce57b, 676831c, bd5eed4). **44 filas de tareas mienten** |
| `PENDIENTES.md:152` | ADMIN sin favicon | **Hecho**: `favicon.svg` + `layouts/admin.html:7` |
| `HANDOFF.md:50` · `PENDING_TASKS.md:32` | «los siete jobs» | Son **ocho** (`ci.yml`: lint, security-audit, schema-drift, test-unit, test-integration, observabilidad, build, docker) |
| `HISTORY.log` | — | **PT-129 y PT-130 no tienen entrada**. Salta de PT-128 a PT-131, con evidencia y commits fusionados de ambos. Incumple FDGE STATE 7 sobre el fichero que el propio framework declara append-only y fuente de verdad |
| `ROADMAP.md:3` | `Health 86.1 · Clase C · Risk 100` | Hoy `95.5 · Clase A · Risk 24`. Emitido el **2026-06-23**, sesión S-001. **FPGE no se ha vuelto a ejecutar nunca** |
| `PTSA/PENDIENTES.md` | 7 bloques de sesión apilados (DS-004 … S-002-G) | Ninguno podado. El mismo pendiente (`PTSA/Motor-PTSA.md` no existe) aparece **cinco veces**, sin que nada diga qué bloque manda |
| `10-Technical-Debt.md:103-105` | «**Queda `styleSrc`**, que sigue llevándolo… registrado aparte como TD-014» | Catorce líneas antes declara TD-005 «CERRADA DEL TODO», y TD-014 está cerrada en `:289`. Se contradice consigo mismo; `coherencia-deuda-tecnica.spec.ts` pasa porque no lee prosa |

**El patrón**: nada de esto es trabajo sin hacer. Es **trabajo hecho que ningún registro recogió**.
La sensación de «nunca se cierra» es exacta y su causa es que cerrar exige hoy escribir en hasta
doce sitios, y sólo dos tienen guarda automática.

## Qué cambia

1. **Una regla de precedencia declarada en `CLAUDE.md`**: qué registro manda para qué clase de
   pendiente, y cuál es derivado. Sin ella, todo lo demás se vuelve a desincronizar.
2. **`PENDING_TASKS.md` reconstruido contra el código**, como ya hizo PT-090 y PT-103 — con la
   diferencia de que esta vez queda mecanismo, no sólo corrección.
3. **`PTSA/PENDIENTES.md` podado**: un solo bloque vivo, el resto a `PTSA/archive/`. Es un artefacto
   de estado (`ESTADO_ACTUAL`-like), no un log; hoy se comporta como log sin serlo.
4. **`HISTORY.log`: las dos entradas que faltan**, PT-129 y PT-130, reconstruidas desde sus
   evidencias y commits. Append al final con su fecha real anotada, **nunca reescribiendo** el orden.
5. **`ROADMAP.md` regenerado** con una corrida FPGE real sobre el estado de hoy, o retirado con su
   razón escrita. Un roadmap de hace cinco semanas que declara Clase C es peor que ninguno.
6. **Una guarda**: `coherencia-de-registros.spec.ts`, de la familia de `coherencia-deuda-tecnica`.
   Comprueba lo que es determinista y sólo eso:
   - todo `PT-XXX` marcado `PENDING`/`BLOCKED` en `PENDING_TASKS.md` **no** aparece con `Status: DONE`
     ni `VALIDATION_PENDING` en `HISTORY.log`;
   - todo `PT-XXX` con carpeta en `docs/implementation/evidence/` **tiene** entrada en `HISTORY.log`
     (esto solo ya habría cazado PT-129 y PT-130);
   - todo `TD-XXX` declarado cerrado en `10-Technical-Debt.md` no figura pendiente en
     `PENDING_TASKS.md`.

   Con casos de control en los dos sentidos, como exige RULE-14.

## Qué NO cambia

- **Ni una línea de `src/`.** Este PT no toca producto.
- **`HISTORY.log` no se reescribe.** Es append-only y se respeta: las entradas que faltan se añaden
  al final, fechadas hoy, diciendo a qué fecha corresponden.
- **Los hallazgos PTSA no se cierran.** `[R44]` es de PTSA y sigue vigente: los cierra el humano.
- **No se inventa estado.** Todo lo que se marque hecho lleva su cita `fichero:línea`, como en PT-090.
- **No se fusionan los frameworks.** FDGE, PTSA y FPGE siguen con sus artefactos separados; lo que se
  declara es la precedencia entre ellos, que hoy no existe.

## Quality bar — cómo se sabe que está completo

1. `coherencia-de-registros.spec.ts` en verde, con sus casos de control demostrando que sabe fallar.
2. **Cero contradicciones** entre `PENDING_TASKS.md`, `HISTORY.log` y `10-Technical-Debt.md`, medido
   por la guarda y no por lectura.
3. `HISTORY.log` contiene una entrada por cada carpeta de `evidence/`.
4. `PTSA/PENDIENTES.md` tiene **un** bloque vivo, y el pendiente de `PTSA/Motor-PTSA.md` aparece
   **una** vez o está resuelto.
5. La regla de precedencia está escrita en `CLAUDE.md` y un lector nuevo puede responder «¿dónde
   apunto un pendiente?» sin preguntar.
6. La guarda corre **en CI** — lo que depende de **PT-136**.

## Riesgo de regresión — qué debe conservarse exacto

| Riesgo | Por qué importa | Cómo se comprueba |
|---|---|---|
| Marcar hecho algo que no lo está | Es literalmente el defecto que este PT corrige, cometido otra vez | Cada fila que cambie de estado lleva cita `fichero:línea` verificada, como PT-090 |
| Perder historia al podar `PENDIENTES.md` | `[A6]` de PTSA: inmutabilidad auditable | Se mueve a `PTSA/archive/`, no se borra; el bloque vivo enlaza al archivo |
| La guarda se vuelve tan estricta que estorba | Una guarda que obliga a mentir para pasar es peor que ninguna | Sólo comprueba lo determinista; nada de prosa. Y se prueba en los dos sentidos |
| Reescribir `HISTORY.log` | Prohibido por FDGE STATE 7 | El diff sólo añade al final |

## Dependencia

**PT-136 primero.** Sin CI que se ejecute, la guarda nueva nace en el mismo estado que las once
anteriores: correcta, escrita, y sin correr sola nunca. Sería el defecto de este PT cometido dentro
del PT que lo arregla.

---

# PT-141 — REFACTOR (MAJOR): una sola documentación oficial

## La decisión, ya tomada

**Decisión del humano, 2026-07-28: `docs-v2/` es la fuente de verdad.**

## El problema, medido

Dos árboles se declaran mutuamente sustitutos, y `CLAUDE.md` —el documento que gobierna a todo
agente— obliga al contrario del que se declara oficial:

| | `docs/enterprise-documentation/` | `docs-v2/` |
|---|---|---|
| Qué dice de sí mismo | *«un recorrido del 23-jun con correcciones encima, no una regeneración. **Toca regenerar. Decisión del humano**»* (`README.md:8-15`) | *«Esta carpeta es la **única fuente de verdad** del proyecto. **Sustituye funcionalmente** a `docs/enterprise-documentation/`»* (`README.md:5`) |
| Generado | 2026-06-23 | 2026-07-23 |
| Ficheros | 12 + `inventory/` | 31 |
| Veces citado en `CLAUDE.md` | **10** (Foundation Protocol, fuentes obligatorias de FDGE, `11-Conventions`, `10-Technical-Debt`) | **1** (`transversal/Registro-Maestro-de-ADR.md`) |

Y el coste es real y recurrente: los commits `6decb1a` y `4f40358` («la segunda escritura, en todos
los documentos que la debían») **escriben en los dos árboles a la vez**. Cada PT paga doble, y la
divergencia es cuestión de tiempo — H-016 ya demostró que una cita precisa que se desplaza se lee con
confianza y es falsa.

## Qué cambia

1. **ADR-049** en `docs-v2/transversal/Registro-Maestro-de-ADR.md`: `docs-v2/` es la documentación
   oficial; `docs/enterprise-documentation/` queda reducido al **contrato de agente** que FDGE y
   Foundation Protocol necesitan.
2. **`CLAUDE.md` reescrito** en sus 10 citas: las fuentes obligatorias de FDGE (Parte 3) y de PTSA
   apuntan a `docs-v2/` para arquitectura, PRD, TRD y flujos.
3. **`docs/enterprise-documentation/` se regenera con `[START FOUNDATION]`** y queda acotado a lo que
   sólo él aporta y ningún documento de `docs-v2/` cubre:
   - `11-Conventions.md` — las `RULE-NN`, que son el contrato operativo de todo agente;
   - `10-Technical-Debt.md` — el registro `TD-XXX`, al que apunta la guarda de PT-103;
   - `inventory/` — los seis inventarios derivables del código.
   El resto (`01`…`09`) se archiva bajo `docs/enterprise-documentation/archive/` con una nota que
   diga a qué documento de `docs-v2/` ha ido cada uno.
4. **Corregida la contradicción interna de `10-Technical-Debt.md:103-105`** (TD-005 declarada
   «cerrada del todo» y tres líneas después «queda `styleSrc`»).
5. **`PTSA/Motor-PTSA.md` y `PTSA/PTSA.md`**: `CLAUDE.md:735` y `:840` citan dos ficheros que **no
   existen**, pendiente desde DS-004 — **cuatro sesiones PTSA**. O se escriben, o se retira la cita.
   Es la misma clase de defecto que H-016 y toca resolverla aquí.

## Qué NO cambia

- **`docs-v2/` no se reescribe.** Este PT no audita su contenido; decide su estatus.
- **`PTSA/`, `changes/` y `docs/implementation/` no se tocan.** Son evidencia e historia, no
  documentación de producto.
- **`docs/methodology/` sigue donde está**: es la autoridad de los cuatro frameworks y `CLAUDE.md`
  depende de ella.
- **Nada de `src/`.**

## Quality bar

1. Un lector nuevo abre `CLAUDE.md` y sabe, sin ambigüedad, qué árbol consultar para qué.
2. Ninguna ruta citada en `CLAUDE.md` apunta a un fichero inexistente — comprobable con un barrido
   automático (hoy fallan dos: `PTSA/Motor-PTSA.md` y `PTSA/PTSA.md`).
3. `docs/enterprise-documentation/README.md` declara su alcance reducido y la fecha de regeneración.
4. `coherencia-documentacion-codigo.spec.ts` (PT-130) sigue en verde tras el movimiento, **o** se
   amplía a `docs-v2/` si es ahí donde viven ahora las citas que vigilaba.
5. La guarda de deuda de PT-103 sigue apuntando a un `10-Technical-Debt.md` que existe.

## Riesgo de regresión

| Riesgo | Por qué importa | Cómo se comprueba |
|---|---|---|
| Romper las citas que vigila la guarda de PT-130 | H-016 volvería, y con aval | Ejecutar las dos guardas documentales antes y después |
| `11-Conventions.md` cambia de sitio y las `RULE-NN` se pierden de vista | Es el contrato que impide romper el repositorio | No se mueve. Se queda donde `CLAUDE.md` ya lo cita |
| Regenerar Foundation sobre un estado con bugs abiertos | El snapshot documentaría defectos como si fueran diseño | **La regeneración va después de PT-136…PT-139** |
| Archivar un documento que alguien usa | — | `grep -rn` de cada nombre en todo el repositorio antes de mover |

## Secuencia — importa

**PT-141 se parte en dos momentos:**

- **PT-141.A — la decisión, ahora**: ADR-049, reescritura de `CLAUDE.md`, resolución de las dos citas
  rotas. Barato y desbloquea a los demás, que dejan de escribir dos veces.
- **PT-141.B — la regeneración, después de PT-136…PT-139**: `[START FOUNDATION]` produce un snapshot
  de un sistema cuyos defectos conocidos están cerrados. Regenerar antes documentaría el CI que no
  corre y las dos pantallas muertas de ADMIN como si fueran el estado deseado.

---

# Orden propuesto de los seis PT

```
PT-136 (CI que nunca ha corrido)  ──┐
                                    ├──> PT-140 (registros)  ──> PT-141.B (regenerar Foundation)
PT-141.A (decision documental)  ────┘
PT-137 (Redis)   ┐
PT-138 (guardas) ├── independientes entre si; los tres pueden ir en paralelo tras PT-136
PT-139 (ADMIN)   ┘
```

**PT-136 va primero** porque cada uno de los otros cinco entrega una guarda o un control, y sin CI
que se ejecute todos nacen con el defecto que este repositorio ya ha pagado cuatro veces: un
mecanismo escrito que nunca corre solo.

---

**STOP. Esperando ACK del Proposal Gate.** Ninguna rama abierta, ningún fichero de código tocado.
`[No Proposal Gate Skip]`
