# HANDOFF — estado actual

**FDGE V3** · **2026-07-29** · Se **sobrescribe**: es el estado de ahora, no la historia.

**Rama**: `master`, árbol limpio, cero ramas sin fusionar. **Sin subir a `origin`.**

**Pruebas**: **1186** unitarias en verde — API **933** (114 suites) · CORE **134** · CLIENT **103** ·
ADMIN **13** · BASE **3**.

**Reglas duras**: **33** `RULE-NN`. **Guardas de documentación**: **12** suites / **135** pruebas.

---

## Estado: CERTIFICADO Clase A · cero hallazgos activos

**S-005 emitido el 2026-07-29.** `freshness = FRESH`, `commits_since_audit = 0`.

| Métrica | S-004-M | **S-005** |
|---|---|---|
| Health | 88.0 | **100 / 100** |
| Risk | 100 | **0 / 100** |
| Confidence | 97.9 | **91.0** |
| Clase | B | **A** |

**Hallazgos: 28 registrados, CERO activos.** Los cuatro de esta corrida —H-005, H-025, H-026, H-028— se
cerraron con VoBo, y los técnicos **verificados ejecutando**.

### Tres avisos que forman parte del resultado, no lo adornan

**1. El Health llega a 100 en parte porque el alcance se estrechó.** H-005 se cerró **aceptándola como
limitación declarada**, y lo que legitima el cierre es que la declaración de valor se corrigió a la vez
(`F-1 § U-006`): el producto ya **no promete** emitir CFDI, y `P-012` pasó a `FUERA_DE_ALCANCE_V1`. **El
sistema sigue sin emitir facturas.** Si v1.1 vuelve a prometerla, ese producto vuelve y H-005 se reabre.

**2. La Confianza está a UN punto del umbral de A** (91 contra 90). La baja **D5, al 0 %**: la fiabilidad
operacional **no está demostrada** — hacen falta 20 ciclos resueltos y hay 2.

**3. Cero hallazgos activos es cero defectos CONOCIDOS.** Esta jornada produjo **ocho hallazgos** en un día
de mirar y ejecutar, y **cinco llevaban meses en el código**. El `0` mide lo que se ha buscado.

### Esperan tu validación

**PT-177, PT-178, PT-179, PT-180** — los cuatro con evidencia ejecutada. Lista en
[`PENDING_TASKS.md`](PENDING_TASKS.md).

---

## El trabajo de la jornada, y por qué aparecieron cosas

La pregunta fue: *«no entiendo cómo es que salen cosas nuevas si no se ha implementado nada»*. De los
**siete hallazgos**, **cinco ya estaban en el código desde antes**:

| Hallazgo | Desde |
|---|---|
| El vendedor liberaba su propio holdback | desde que existe el módulo de envíos |
| El `*.js` del `.gitignore` se comía ficheros nuevos | desde PT-088 — **cuarta reincidencia** |
| Un 422 de la pasarela salía como 500 nuestro | desde PT-076 |
| El veredicto de coherencia sin denominador | desde que existe el checkpoint |
| Redis inobservable en `/health/detailed` | desde que existe el endpoint |

**Dos los causó la jornada** —la CLABE que rompió la fase 60 y el Chrome huérfano— y los dos están
corregidos. **Ninguno de los siete lo trajo una implementación nueva: los trajo ejecutar y mirar.**

### La cadena que ahora se recorre entera

`PT-173 … PT-176` cerraron el defecto de fondo: **la recepción la confirma quien recibe**. Hasta entonces
el vendedor marcaba entregado su propio envío y liberaba su propio dinero, sin enviar nada. Y la **fase
35** recorre la cadena completa —cierre → envío → recepción → liberación → retiro— **con cero escrituras a
la base**, frente a las seis que siembra la fase 60.

Visto pasar en navegador real: **17/17**, con la contabilidad cerrando sola —950 → 95 de comisión → 855
retenido → 855 liberado → 855 disponible— y `QA-CL-07` comprobando que el vendedor recibe **403**.

---

## La tanda PT-168 … PT-172: los registros dejan de mentir

**Los 23 hallazgos PTSA cerrados están efectivamente corregidos** — verificado ejecutando, no leyendo:
`audit:domain` da `verificado` 5/5 y **sale con 1** cuando no puede medir; los dos checkpoints corren
dentro del contenedor; el `warn` del DTO duplicado da 0; `_prisma_migrations` tiene las dos migraciones
aplicadas. **Lo que estaba roto era lo que el repositorio decía de sí mismo.**

| PT | Qué mentía | Guarda |
|---|---|---|
| **PT-168** | Tres derivados de PTSA declaraban activos cuatro hallazgos `CERRADA`; `commits_since_audit = 0` con 25 | **RULE-33** |
| **PT-169** | PT-167 sólo existía en su commit; PT-166 sin evidencia; los dos fuera del registro de pendientes | **RULE-34** |
| **PT-170** | `H-001` y `H-023` citaban carpetas de evidencia inexistentes | RULE-31 ampliada |
| **PT-171** | `ND-002` y `ND-003` contradecían al código — y `ND-002`, al cierre de `H-002` | **RULE-35** |
| **PT-172** | `_comentario_maxWorkers` producía dos avisos de Jest por corrida | guarda del montaje |

### Lo que más vale de la jornada

**Tres hallazgos propios corregidos a la baja antes de actuar.** «Nueve PT sin evidencia» eran **dos**:
la historia agrupa cabeceras con una carpeta por grupo, y contar por PT daba siete falsos positivos.
«Treinta PT huérfanos» eran **uno**: tres VoBo históricos son declaraciones de totalidad, no
enumeraciones. Perseguir el hallazgo mal medido habría creado siete carpetas para satisfacer una métrica
equivocada.

**Dos huecos que no se pueden cerrar escribiendo.** 34 grupos de `HISTORY.log` no tienen evidencia, y
fabricarla desde la descripción de un PT sería **inventar ejecución**. Se declaran en
`evidence-baseline.json` con el criterio de `security-baseline.json`: **la lista sólo baja**, y tres
comprobaciones vigilan la propia línea base.

**Un arreglo que rompió 111 suites, y lo dijo.** Mover la config de Jest a `jest.config.js` sin montarla
en el contenedor hizo caer a Babel: `SyntaxError` sobre TypeScript válido. Es **PT-138 otra vez**, con
su comentario escrito tres líneas más arriba en el mismo compose. Falló ruidosamente por suerte — si la
config hubiera sido opcional, la suite habría corrido con otros `roots` y **verde**.

**Y la guarda de H-016 cazó su propio caso en vivo:** retirar el bloque `jest` desplazó las líneas que
el TRD citaba de `package.json`. Apareció además una cita que **ya estaba mal antes** (`stripe` en la
68, que es `ioredis`), en un documento que ninguna guarda cubría.

---

## Lo que cerró hoy, antes de esta tanda

| | |
|---|---|
| **Tanda FPGE-003** | PT-148…PT-162, quince |
| **Cierre** | PT-163 (reputación pública) · PT-164 (imagen recortada) · PT-165 (patrones de guardas) |
| **Suite y TLS** | PT-166 (techo de memoria) · PT-167 (el comando de TLS que no existía) |
| **Hallazgos** | H-021, H-022, H-023, H-024 → `CERRADA` con VoBo humano |
| **Deuda** | TD-016 cerrada con triaje real; **ND-002 y ND-003** cerradas por PT-171 |

### Lo que más valió de la tanda FPGE-003

**Un instrumento que afirmaba sin medir.** `audit:domain` imprimía `cross_coherence_verified = true`
con las cinco comprobaciones en error, y salía con código 0. Dentro de la herramienta que la auditoría
usa para medir.

**Tres controles muertos en ADMIN.** Ninguna `data-accion` estaba registrada: el botón «Rechazar» de
moderación no abría nada. PT-096 movió el JS «tal cual» y «tal cual» perdió los `onclick`. PT-139
corrigió dos casos sin escribir el mecanismo; por eso quedaban tres.

**Una decisión revisada con dato nuevo.** PT-161 midió tamaño (3.1 %) y decidió no recortar la imagen
— correcto con lo que se sabía. PT-150 midió **seguridad**: catorce de treinta vulnerabilidades las
causaban dependencias de desarrollo en producción. PT-164 recortó: **548 → 450 MB** y **14 → 2**.
El bulto estaba en `packages/core`, que se copiaba entera y **no necesita `node_modules` en
ejecución**.

> Medí la variable equivocada. «Es más grande de lo necesario» lleva a contar MB; la pregunta útil era
> *qué mete en producción código que no se ejecuta*.

### Y una corrección de proceso

Señalaste que los pendientes **aumentaban**. Tenías razón: `PENDING_TASKS.md` había acumulado seis
entradas que no eran trabajo sino observaciones. Tres se cerraron haciéndolas; tres se movieron a
donde pertenecen.

**Una observación no es un pendiente.** Si no tiene dueño, alcance y un final reconocible, va a su
nota y no a la lista de trabajo.

---

## Estado de la auditoría

```
S-003 (delta sync)   Health 88.9  ·  Risk 100  ·  Confidence 87.0  ·  Clase B
```

Los cuatro hallazgos que la bajaron están **cerrados**, así que el próximo `resume PTSA` debería
subirla. Sigue pendiente de medir **D1 al 100 % y D5**, que exigen una base **con historia** — es
trabajo PTSA y vive en `PTSA/PENDIENTES.md`.

## Siguiente

1. **`git push origin master`**.
2. **`resume PTSA`** cuando quieras — con los cuatro hallazgos cerrados, los scores suben.
3. **H-005**: cuando haya proveedor.
