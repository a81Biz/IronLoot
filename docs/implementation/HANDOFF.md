# HANDOFF — estado actual

**FDGE V3** · **2026-07-29** · Se **sobrescribe**: es el estado de ahora, no la historia.

**Rama**: `master`, árbol limpio, cero ramas sin fusionar. **Sin subir a `origin`.**

**Pruebas**: **1134** unitarias en verde — API **881** (111 suites) · CORE **134** · CLIENT **103** ·
ADMIN **13** · BASE **3**. `test:guardas`: **17** suites / **183** pruebas.

**Reglas duras**: **33** `RULE-NN`. **Guardas de documentación**: **12** suites / **134** pruebas.

---

## Pendiente: tres hallazgos que corregir y una decisión de negocio

### Cerrado con VoBo humano

**PT-166 … PT-172 → `CLOSED`** el 2026-07-29, con VoBo explícito del humano. Cada uno con su evidencia
ejecutada bajo [`evidence/`](evidence/). **Cero trabajo FDGE pendiente.**

> **PT-166 y PT-167 no estaban en ninguna lista, y ése era el defecto.** El cierre en bloque anterior
> enumeró PT-148…165; PT-166 entró después y PT-167 **no tenía ni entrada en `HISTORY.log`** — sólo su
> mensaje de commit. Este fichero afirmaba «Nada más está pendiente» y era falso. Sin PT-169 no habría
> habido nada que validar, porque nada los nombraba. Lo vigila ahora **RULE-34**.

### Bloqueado por un tercero

**H-005 — la facturación fiscal.** Falta **contratar un PAC** ante el SAT y **decidir quién emite la
factura**. Sin proveedor no hay nada que implementar. Es el **único hallazgo que ningún PT puede cerrar**;
mantiene D1 en 85 y `P-012` en `IDENTIFICADO`. Los tres modelos, con sus consecuencias técnicas medidas, están en
`evidence/PT-155/hallazgos.md`.

### El `resume PTSA` — ejecutado, y encontró dos cosas

**S-004 emitido el 2026-07-29.** `freshness = FRESH`, `commits_since_audit = 0`.

| Métrica | S-003 | **S-004** |
|---|---|---|
| Health | 88.9 | **89.5** |
| Risk | 100 | **100** — saturado por un punto (`Risk_bruto` = 26) |
| Confidence | 87.0 | **83.6** |
| Clase | B | **B** |

**El Health apenas se movió aunque se cerraron cuatro hallazgos**, porque aparecieron dos:

- **H-025 (D2, ALTA)** — `cross_coherence_verified = verificado` **sobre una base con cero filas**. Las
  cinco comprobaciones cubren dinero y devuelven «0 incoherencias» porque no hay nada que comparar. Es
  H-021 con otra ropa: PT-149 arregló el caso «no pude conectar» y dejó el caso «no había datos», y el
  docstring **declara la protección que el código no implementa**.
- **H-026 (D3, MEDIA)** — `/health/detailed` dice `degraded` siempre y **una caída real de Redis diría lo
  mismo**. RULE-17 protegió el arranque; la degradación en caliente quedó sin cubrir.

**Y después se cerró el hueco de cobertura — S-004-M.** `run-all.sh` generó salida real y **se midió en la
misma sesión**, sin cortar:

| | S-004 | **S-004-M** |
|---|---|---|
| Reglas de dominio medidas | 1 de 14 | **12 de 14, las 12 cumplen** |
| D5 (Success / Retry / Failure) | `SIN_DATOS` | **medido**: 100 % / 0 % / 0 % |
| `trace_completeness` | SIN CICLOS | **100 %** |
| Confidence | 83.6 | **97.9** |
| Health | 89.5 | **88.0** |

**Health 88.0 y Confidence 97.9.** La Confianza sube 14.3 porque se cerró la cobertura; el Health baja 1.5
porque la propia medición encontró **H-027**. Es la auditoría funcionando, no una regresión.

**Y por primera vez §15.6 no ata:** la Confianza supera el ≥ 90 que exige para clasificar A. Lo que faltan
son **2 puntos de Health**, y los tienen los cuatro hallazgos. La clase ya depende sólo de defectos, no de
lo que la auditoría no pudo mirar.

- **H-027 (D3, MEDIA)** — el `RESUMEN FINAL` de la suite QA **omite la fase que falla**. La fase 71 (vía
  garantizada de PayPal) se cayó y el resumen listó nueve fases «todas PASS». Séptima aparición del patrón
  de la casa, por **omisión**: no miente, calla.

**Lo que la sesión demuestra sobre el método:** medir en la misma sesión que genera los datos vale 14.3
puntos de Confianza y permitió evaluar D5 por primera vez. Las dos veces anteriores se midió en la
siguiente y la salida ya no estaba.

**D4 vuelve a 100**: es lo que confirma que la tanda PT-168…PT-172 sirvió.

**Los tres hallazgos nuevos —H-025, H-026, H-027— no los cierra el agente** (`[R44]`) y **no están
corregidos**: son trabajo para el próximo ciclo FDGE, y **ninguno depende de terceros**. Manda
`PTSA/Hallazgos/H-XXX.md`; convertirlos en PT es decisión tuya.

**Hay además un cuarto pendiente que no es un hallazgo**: ampliar la suite QA para que **cierre una
subasta**. Es el único hueco que queda en D1 (`R-5.1a`, `R-5.1d`) y daría filas reales a las cuatro
comprobaciones de coherencia que hoy comparan cero — la mitad de lo que hace grave a H-025.

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
