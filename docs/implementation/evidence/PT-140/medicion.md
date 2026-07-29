# PT-140 — Evidencia

## La respuesta a la pregunta que abrió esto

*«Se han realizado ya varias fases y al parecer siempre quedan cosas por hacer y nunca se cierran
completo.»*

**La causa era estructural, no de disciplina.** Un pendiente podía vivir en **doce** sitios y ninguno
declaraba cuál mandaba. De los doce, **uno solo** tenía guarda automática.

## Lo que medía el RED

```
C1  7 PT que PENDING_TASKS marca pendientes y HISTORY declara terminados
    PT-026, PT-029, PT-030, PT-082, PT-104, PT-127, PT-128

C2  12 PT con carpeta de evidencia y SIN entrada en HISTORY.log
    PT-076, PT-086, PT-129, PT-130  +  los nueve de esta sesión

C3  TD-014 cerrada en 10-Technical-Debt y listada como pendiente
```

**Ninguna de esas filas era trabajo sin hacer.** Todas eran trabajo hecho que ningún registro recogió.
Y nueve de los doce eran **deuda mía**: llevaba la sesión entera fusionando sin escribir STATE 7.

## Dos cosas que costaron y merecen quedar

**El analizador acusaba a 78 PT.** `HISTORY.log` **agrupa**: cabeceras como
`## PT-090 … PT-104 — VALIDACION` cierran quince de una vez. Mirando sólo el primer `PT-XXX` de la
línea, catorce registrados parecían ausentes. Importa más de lo que parece: **una guarda ruidosa acaba
desactivada**, y entonces deja de proteger también lo que sí detectaba.

**Y no funcionaba por una razón invisible.** Mis `\b` se habían convertido en **caracteres de
retroceso literales** (`0x08`) al escribir el fichero. `grep` los mostraba como nada —la línea
*parecía* correcta— y sólo `cat -A` los delató. La regex no casaba nunca, así que la guarda devolvía
cero entradas, que es como acusar a todo el mundo.

## El GREEN

```
Tests: 10 passed, 10 total
```

- **13 entradas** añadidas a `HISTORY.log`, al final y con su fecha real anotada.
- `PENDING_TASKS.md` reconstruido, con la tabla de precedencia arriba.
- `PTSA/PENDIENTES.md` podado a **un** bloque vivo; los siete anteriores íntegros en `PTSA/archive/`.
- `ROADMAP.md` **retirado con su razón escrita**.
- La regla en `CLAUDE.md` y **RULE-20**.

## El ROADMAP, y la causa mecánica de todo esto

Declaraba `Clase C · Health 86.1 · Risk 100` cuando hoy es `Clase A · 95.5 · 24`. Llevaba cinco
semanas diciendo algo que había dejado de ser cierto.

**FPGE no se había vuelto a ejecutar nunca desde S-001.** El bucle `FDGE → PTSA → FPGE → FDGE` estaba
roto en su tercer eslabón: nadie decidía qué seguía, se iba haciendo lo que aparecía. **Ésa es la
respuesta mecánica a la pregunta del humano**, y no se ve mirando ningún PT concreto.

No se regenera ahora porque hoy hay **un** hallazgo activo y priorizar una lista de uno es teatro.
Vuelve tras el próximo `resume PTSA`.

## Lo que este PT NO arregla, a conciencia

`10-Technical-Debt.md:103-105` se contradice consigo mismo —TD-005 «cerrada del todo» y catorce líneas
después «queda `styleSrc`»—. **Ninguna guarda lo caza porque es prosa**, y escribir una que lo hiciera
enseñaría a redactar para el linter. Se corrige a mano en PT-141.

## Regresión

```
777 / 777  en 101 suites
```
