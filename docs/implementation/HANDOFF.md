# HANDOFF — estado actual

**FDGE V3** · **2026-07-29** · Este fichero se **sobrescribe**: es el estado de ahora, no la
historia. La historia está en `HISTORY.log`, que es append-only.

**Rama**: `master`. Once PT fusionados el 2026-07-28/29 —**PT-136, 137, 138, 139, 140, 141, 142, 143,
145, 146, 147**— y **los once cerrados el 2026-07-29 con VoBo humano**: los nueve BUG a `CLOSED`, los
dos REFACTOR a `DONE`.

**Cero ramas sin fusionar** (comprobado: `git branch --no-merged master` vacío, 82 ramas locales todas
ya en master). **`master` va 10 commits por delante de `origin`** — listo para `git push origin master`,
sin empujar todavía.

**Pruebas**: **1039** unitarias en verde — API **786** (102 suites) · CORE **134** · CLIENT **103** ·
ADMIN **13** · BASE **3**. Medidas una a una el 2026-07-29, no arrastradas.

> El total anterior era **944**. Los 95 nuevos son las guardas de esta tanda: RULE-16, RULE-17,
> RULE-19, RULE-20, RULE-22, RULE-23, RULE-26, RULE-27 y las tres e2e de concurrencia.

**Plataforma**: NestJS **11.1.28** · Express **5.2.1** en los cuatro servicios.

---

## Estado del sistema

| | |
|---|---|
| CI | **8 jobs, todos verdes, y se ejecuta.** Hasta PT-136 la tubería **no se había ejecutado nunca** |
| Imágenes Docker | Las cuatro se construyen **y se arrancan** en CI (PT-147) |
| Documentación oficial | **`docs-v2/`** (ADR-049). `docs/enterprise-documentation/` queda acotado al contrato de agente |
| Reglas duras | **24** `RULE-NN`, y una guarda que impide citar una que no exista (RULE-27) |
| Registros de trabajo | Con tabla de precedencia y guarda (PT-140). Antes: doce sitios, ninguno declarando cuál mandaba |

## De qué trataba esta tanda

La pregunta que la abrió fue *«se han realizado ya varias fases y al parecer siempre quedan cosas por
hacer y nunca se cierran completo»*. La respuesta resultó ser **estructural, no de disciplina**:

1. **Un pendiente podía vivir en doce registros y ninguno declaraba cuál mandaba.** De los doce, uno
   solo tenía guarda. Lo cierra PT-140, que escribió además la tabla de precedencia.
2. **FPGE no se había vuelto a ejecutar desde S-001.** El bucle `FDGE → PTSA → FPGE → FDGE` estaba
   roto en su tercer eslabón: nadie decidía qué venía después, así que todo seguía «pendiente».

Y por debajo, un patrón que apareció **cuatro veces**:

> **Un mecanismo que no se ejecuta no avisa de nada.**

La tubería que nunca corrió (PT-136) · el job saltado que contaba como éxito (PT-147) · `SIN_DATOS`
saliendo con código 0 (PT-138) · el job de observabilidad aprobando sin base de datos que medir
(PT-137). Es ahora RULE-26.

**Lo más grave que se encontró**: seis depósitos simultáneos dejaban el saldo en **100 de 600**, con
los seis asientos escritos y ninguno cuadrando (PT-146). Se midieron **cero** descuadres
preexistentes en la base de datos real.

## Auditoría — S-003 (delta sync, 2026-07-29)

```
Health  95.5 -> 88.9     Clase A -> B
Risk      24 -> 100      saturado por CERTEZA, no por gravedad
Confid. 95.0 -> 87.0     la baja la cobertura, no la evidencia
```

**Cuatro hallazgos nuevos, y no los trajeron los once PT: los trajo mirar.**

| ID | Dim | Sev | Qué |
|---|:--:|---|---|
| **H-021** | D2 | ALTA | `audit:domain` imprime `cross_coherence_verified = true` con las **cinco** comprobaciones en `(ERR)`, y sale con código 0 |
| **H-022** | D2 | MEDIA | Los dos checkpoints de delta sync usan `docker exec psql` y no hay `docker` en el contenedor |
| **H-024** | D4 | MEDIA | `audit-scope.yaml` cita cuatro documentos que **archivó PT-141**, y describe mal las migraciones |
| **H-023** | D4 | BAJA | `UserResponseDto` publicado con dos esquemas distintos |

**Cobertura declarada PARCIAL**: D2/D3/D4 al 100 %, **D1 al 50 %**, **D5 al 0 %**. La base está casi
vacía porque un reseteo se llevó la salida real de S-002. Eso es lo que baja Confidence, y declararlo
es el punto — `[A8]` no admite un score sin cobertura declarada.

**H-014 quedó verificado en la fuente real**: las dos migraciones aplicadas, sin rollback. Ya no se
sostiene en el testimonio del PT que lo corrigió.

## Qué falta, y por qué no se hizo

| Trabajo | Estado |
|---|---|
| **PT-141.B** — `[START FOUNDATION]` | Desbloqueado: los cuatro prerrequisitos cerrados y el protocolo ya acotado a lo que debe generar. **Decisión del humano cuándo ejecutarlo** |
| **TD-016** — escáner de la imagen base | Abierta. Más barata ahora que las imágenes se construyen en CI |
| **F-136-A** — evidencia no seguida por git | 79 de 162 ficheros. Documentos que citan lo que no está en el repositorio |
| **H-005** — quién emite la factura | **Decisión de negocio.** Ningún PT la resuelve |
| **PT-035** — `T-035.12` | Validación **visual**, no automatizable |
| **H-021 · H-022 · H-023 · H-024** | Abiertos desde S-003. `[R44]`: el agente no cierra hallazgos |
| **D1 y D5 completos** | Requieren una base **con historia**. Ver riesgos |

## Riesgos vivos

- **La ventana para medir D1 y D5 es estrecha.** `run-all.sh` genera salida real y **trunca la base al
  empezar**: es lo que se llevó la salida de S-002 y por qué D1 sólo pudo medir 7 de 14 reglas. Hay que
  medir **justo después** de una corrida por navegador. Y no se medirá bien mientras H-022 siga
  abierto.
- **`archive/` es citado por registros históricos** (`PTSA/Evidencias/`, `changes/`). Se archivó en
  vez de borrarse justamente por eso —la inmutabilidad auditable `[A6]` no permite dejar una
  evidencia sin fuente—, pero quien siga una cita antigua tiene que saber bajar un directorio. Está
  dicho en los dos README.
- **Un `[START FOUNDATION]` descuidado deshace ADR-049.** El protocolo lo advierte en su propio texto
  y en el README, pero es prosa: **nada mecánico lo impide**.
- **La suite del API no cabe en el contenedor con los workers por defecto.** Tres suites mueren por
  SIGKILL (OOM) con `--maxWorkers=2`; con `--runInBand` pasa entera. En CI no ocurre. No es un
  defecto del código, pero sí una trampa para quien la ejecute en local y lea «4 failed».

## Siguiente acción recomendada

**Ejecutar FPGE** (`[START FPGE]`). Es el eslabón que llevaba roto desde S-001, y ahora tiene con qué
trabajar: `HISTORY.log` al día, `PENDING_TASKS.md` con guarda, once PT con evidencia y los hallazgos
PTSA que quedan abiertos. Sin él, la siguiente sesión vuelve a decidir por intuición qué toca — que
es exactamente cómo se llegó aquí.
