# PLAN_ACTUAL — STATE 2: Clasificación y Estrategia

**Fecha**: 2026-07-29
**PT en el plan**: **PT-168 · PT-169 · PT-170 · PT-171 · PT-172**
**Origen**: revisión de coherencia de hallazgos pedida por el humano — *«revisa todos los hallazgos y
verifica que ya esté todo y que no falte nada»*. Hallazgos en `DISCOVERY.md` § **F-167-A … F-167-H**.
**ACK**: el humano autorizó ejecutar los cinco sin parar — *«repara todo, comienza en orden y no
pares hasta terminar»*. Queda registrado como ACK explícito de STATE 1-B y STATE 2.
**Estado**: en ejecución.

> El plan anterior (**PT-136…PT-141**, cerrado y fusionado) se conserva en
> `archive/PLAN_ACTUAL-PT-136-141.md`.

---

## Objetivo

**Que ningún registro afirme algo que el repositorio contradiga.** Los 23 hallazgos PTSA cerrados
están efectivamente corregidos —se verificó ejecutando, no leyendo—; lo que está roto son ocho
declaraciones sobre ese trabajo. Se corrigen las ocho y, donde el defecto es de clase y no de caso,
**se deja una guarda**, porque en este repositorio *una prevención que se queda en una nota deja
volver el defecto* (H-014 en cuatro días).

## Clasificación

| PT | Tipo | Complejidad | Defecto | Guarda |
|---|---|---|---|---|
| **PT-168** | BUG | STANDARD | F-167-A, F-167-B — los derivados de PTSA contradicen a los `H-XXX` y la frescura es falsa | **RULE-33** |
| **PT-169** | BUG | STANDARD | F-167-C, F-167-E, F-167-F — PT-167 sin historia, nueve PT sin evidencia, dos fuera del registro de pendientes | **RULE-34** |
| **PT-170** | BUG | STANDARD | F-167-D — dos hallazgos citan carpetas de evidencia inexistentes; RULE-31 no las ve por diseño | RULE-31 (ampliada) |
| **PT-171** | BUG | STANDARD | F-167-G — `ND-002` y `ND-003` contradicen al código | **RULE-35** |
| **PT-172** | BUG | TRIVIAL | F-167-H — `_comentario_maxWorkers` produce aviso de Jest en cada corrida | la propia validación de Jest |

Ninguno es MAJOR: no hay cambio de arquitectura, ni de esquema, ni de dependencias. Se toca
documentación, registros y pruebas. **`src/` de aplicación no se toca en ninguno de los cinco** —
salvo `src/api/package.json` en PT-172, que es configuración de pruebas.

## Solución propuesta, por PT

### PT-168 — Los derivados de PTSA dicen lo que dicen los `H-XXX`

Se reescriben `ESTADO_ACTUAL.md`, `RESUMEN.md` y `PENDIENTES.md` para que declaren **1 hallazgo
activo (H-005) y 23 cerrados**, y para que la frescura diga el número real de commits.

**Lo que NO se hace, y es la decisión de este plan:** no se recalcula el Health ni se añade un
registro a `score-history.json`. Recalcular es una **emisión** de PTSA, y `CLAUDE.md` es terminante:
*PTSA nunca se auto-activa*; `resume PTSA` es un disparador del humano. Así que los scores de S-003 se
marcan **superados y pendientes de recálculo**, con la aritmética que saldría escrita al lado para que
el próximo delta sync la confirme o la corrija — sin fingir que ya ocurrió.

Es la salida honesta: quitar la falsedad sin inventar la medición. Escribir «Health 95.5» hoy sería
cometer H-021 —afirmar un resultado que ningún instrumento ha emitido— dentro del fichero que H-021
enseñó a desconfiar.

**RULE-33**: *los derivados de PTSA no contradicen el estado de los `H-XXX`.* La guarda lee el
`estado:` del frontmatter de cada hallazgo y lo compara con lo que `ESTADO_ACTUAL.md`, `RESUMEN.md` y
`PENDIENTES.md` presentan como activo.

### PT-169 — El rastro de trabajo no tiene huecos

1. **PT-167 entra en `HISTORY.log`** con su fecha real (2026-07-29) y su contenido real, leído del
   commit `58fd605`. Append al final: `HISTORY.log` es append-only y reordenarlo para que quede
   cronológico sería falsificar el registro que la regla existe para hacer fiable.
2. **Evidencia para los nueve PT que no la tienen.** No se fabrica: se **ejecuta ahora** lo que cada
   uno afirmó y se guarda la salida, fechada hoy y etiquetada como verificación posterior. Donde el
   PT era un cambio de documento, la evidencia es la guarda que lo vigila, ejecutada.
3. **PT-166 y PT-167 aparecen en `PENDING_TASKS.md`** como `VALIDATION_PENDING`, y `HANDOFF.md` deja
   de decir «nada más está pendiente». Son BUG: el agente no los cierra (STATE 6).

**RULE-34**: *todo PT que la historia deja `VALIDATION_PENDING` figura en el registro de pendientes, y
todo PT con entrada en la historia tiene carpeta de evidencia.* Son las dos direcciones que C1 y C2
dejaban sin vigilar, y las dos fallaron hoy.

### PT-170 — Una cita a una carpeta también se comprueba

Se corrigen las dos citas (`H-001` → PT-026, `H-023` → PT-162) apuntándolas a la evidencia que **sí**
existe, y se amplía `evidencia-citada-esta-en-git.spec.ts` para que una cita a **carpeta** exija que
el directorio exista.

El caso de control AC-02 —*«una carpeta sin fichero no es una cita comprobable»*— **se corrige, no se
borra**: era cierto para «está seguida por git» y falso para «existe». Se deja escrito por qué
cambia, porque un caso de control que se retira sin explicación es una guarda que se debilita en
silencio.

### PT-171 — El registro de deuda deja de contradecir al código

`ND-002` y `ND-003` se cierran con la cita verificada que los resuelve. `ND-004` se deja abierto:
sigue siendo cierto.

**RULE-35**: *un `ND-XXX` que cita fichero:línea se comprueba igual que un `TD-XXX`.* Viven en el
mismo fichero y pesan lo mismo para quien lo lee.

### PT-172 — El comentario va donde no rompe la validación

`_comentario_maxWorkers` sale del bloque `jest` de `package.json` y su contenido se conserva íntegro
donde sí se lee sin coste. **El texto no se pierde** — es la medición de PT-159 y es la razón de que
`maxWorkers` valga 1.

## Alternativas consideradas

| Alternativa | Por qué se rechaza |
|---|---|
| **Recalcular el Health en PT-168** | Es una emisión de PTSA. `CLAUDE.md` prohíbe la auto-activación. Y afirmar un score que ningún instrumento emitió es H-021 otra vez |
| **Dejar los scores de S-003 y sólo quitar los hallazgos de las listas** | Deja D2=80 y D4=94 imputados a hallazgos cerrados: la incoherencia se mueve, no se va. Se marcan como superados |
| **Fabricar la evidencia de los nueve PT desde su descripción** | Sería inventar ejecución. FDGE dice que la evidencia **es** la ejecución. Se ejecuta ahora y se fecha hoy |
| **Reordenar `HISTORY.log` para meter PT-167 en su sitio** | Append-only. Reordenar es falsificar |
| **Borrar el caso de control AC-02 en PT-170** | Retirar un control sin explicación lo debilita en silencio. Se corrige y se razona |
| **Una sola guarda para los tres defectos de registro** | Tres clases distintas de mentira, tres fallos distintos. Una guarda que lo vigila todo no dice qué se rompió |

## Dependencias

Ninguna entre los cinco: se pueden ejecutar en cualquier orden. Se ejecutan en el orden del informe
porque es el que pidió el humano. **PT-170 depende de que PT-169 exista** sólo en un punto: si PT-169
crea `evidence/PT-162/`, la cita de `H-023` se arregla sola. Se resuelve creando la evidencia primero
y reapuntando después.

## Riesgos y análisis de regresión

| Riesgo | Mitigación |
|---|---|
| **Ampliar RULE-31 rompe la guarda en verde** y acusa citas históricas legítimas | Se mide antes de fijar: si aparecen citas rotas en `HISTORY.log` (append-only, no editable), la guarda **excluye ese fichero por declaración explícita**, no por omisión |
| **RULE-34 acusa PT antiguos sin evidencia** | Los nueve se resuelven en PT-169. Si aparecen más de PT-001…147, se declara la ventana de la regla y se dice cuántos quedan fuera — **nunca un tope silencioso** |
| **Tocar `package.json` invalida el lock** | PT-172 sólo edita el bloque `jest`. No se toca ninguna dependencia, así que no se regenera lock. Si hiciera falta: `npm run lock:api` en contenedor, nunca en el host |
| **Editar `PENDIENTES.md` de PTSA fuera de una sesión PTSA** | Es corrección de una falsedad en un derivado, no una fase de auditoría. Se anota como tal y no se toca ningún `H-XXX` ni `AUDIT_LOG.md` (append-only) |
| **Las guardas nuevas pasan en vacío** | Cada una lleva una aserción previa de que encontró algo que mirar, y casos de control en los dos sentidos. Es el defecto que C1 tuvo hoy |

**Lo que podría romperse y se comprueba:** la suite del API completa (107 suites / 825 pruebas) y las
8 guardas de documentación, antes y después de cada PT.

## Criterios de éxito

1. Los tres derivados de PTSA declaran **1 activo / 23 cerrados** y una frescura con número real.
2. `HISTORY.log` tiene entrada para **PT-167**; los **nueve** PT tienen carpeta de evidencia con
   salida ejecutada.
3. `PENDING_TASKS.md` y `HANDOFF.md` declaran **PT-166 y PT-167** como `VALIDATION_PENDING`.
4. **Cero** citas a evidencia —fichero o carpeta— que no exista, en `PTSA/`, `docs/implementation/` y
   `changes/`.
5. `ND-002` y `ND-003` cerrados con cita verificada; `ND-004` intacto.
6. `npx jest` **sin avisos de validación**.
7. Las tres reglas nuevas (**33, 34, 35**) declaradas en `11-Conventions.md`, citadas por sus guardas,
   y **vistas fallar** con su caso de control.
8. Suite completa en verde al terminar, y `test:guardas` también.

## Lo que este plan NO hace

- **No recalcula el score de PTSA** ni escribe en `score-history.json` ni en `AUDIT_LOG.md`. Queda un
  `resume PTSA` pendiente, que sólo el humano dispara.
- **No cierra PT-166 ni PT-167**: son BUG y los cierra una persona.
- **No toca H-005**, que sigue `ABIERTA` esperando PAC y decisión fiscal.
- **No toca `ND-004`**, ni `TD-001`/`TD-002`/`TD-009`, que están abiertos con razón.
- **No reordena `HISTORY.log`** ni edita `AUDIT_LOG.md`.
