# PTSA V3 — RESUMEN DE AUDITORÍA
## IronLoot Auction Platform v1.0.0

**Sesión**: S-003 — **delta sync** (`resume PTSA`) | **Fecha**: 2026-07-29
**Disparador**: once PT fusionados (PT-136…PT-147) y 91 commits sin auditar
**auditoria_estado**: CERRADA_CON_HALLAZGOS

---

## SCORES — CLASE B

| Métrica | S-002-V (28-jul) | **S-003 (29-jul)** | Cambio |
|---|---|---|---|
| **Health Score** | 95.5 | **88.9 / 100** | −6.6 |
| **Risk Score** | 24 | **100 / 100** | +76 — saturado |
| **Confidence** | 95.0 | **87.0 / 100** | −8.0 |
| **Clasificación** | A | **B** | Bajada |

```
Health = (85×0.30) + (80×0.30) + (100×0.30) + (94×0.10) = 88.9
Risk   = min(100, 35 × 4) = 100         Risk_bruto = 6+9+8+4+8 = 35
Conf   = 70×0.40 + 100×0.25 + 95×0.20 + 100×0.15 = 87.0
```

**Regla del Agua Potable: NO activada.** D1 = 85 ≥ 60. Se dice explícitamente porque `[A4]` lo
exige: el dominio no está capando nada.

**§15.6 no ata**: exige Confidence ≥ 90 para clasificar A, y el Health ya cae en B por sí mismo.
`freshness = FRESH` → sin cap por frescura. `health_unstable = false` → sin cap por D5.

---

## SCORES POR DIMENSIÓN

| Dimensión | S-002-V | **S-003** | Hallazgos activos |
|---|---|---|---|
| D1 Alineación de Dominio | 85 | **85** | H-005 (ALTA) — CFDI sin decidir |
| D2 Integridad Arquitectónica | 100 | **80** | **H-021 (ALTA)** · **H-022 (MEDIA)** |
| D3 Observabilidad y Recuperación | 100 | **100** | ninguno |
| D4 Fidelidad Documental | 100 | **94** | **H-024 (MEDIA)** · **H-023 (BAJA)** |

**D5**: `SIN_DATOS` — no hay un solo ciclo de pago en la base. Alucinación y drift `NO_APLICA`
(sistema determinista). `health_unstable: false`.

---

## LO QUE ENCONTRÓ ESTA CORRIDA

Los cuatro hallazgos nuevos **no los trajeron los once PT**: los trajo *mirar*. Tres llevaban tiempo
ahí sin que ningún mecanismo los señalara. El cuarto lo introdujo la sesión anterior.

### El instrumento afirmaba haber medido lo que no miró (H-021, ALTA, D2)

`npm run audit:domain` cierra imprimiendo `cross_coherence_verified = true`. Ejecutado en el
contenedor, **las cinco comprobaciones devuelven `(ERR)`** y la línea sigue diciendo `true`. El
proceso sale con **código 0**.

Las cinco cubren dinero: importe del pedido contra precio final, comisión contra importe, registro de
comisión contra el asiento del ledger.

Lo grave no es que falle: es que **afirma sin haber medido**, dentro del instrumento que esta
auditoría usa para medir, y contra `[A1]`. Y escuece más porque el mismo script hace lo correcto tres
líneas antes: devuelve `rubric_compliance_score = null` y escribe *«Esto NO es un 100: es una
auditoria que no ha podido mirar»*. Alguien pensó este problema para el score y no lo aplicó a la
línea de al lado.

**Quinta aparición del patrón de la casa** —*un mecanismo que no se ejecuta no avisa de nada*—, aquí
agravada: no calla, **dice que sí**.

### Se corrigió uno de tres y nadie notó los otros dos (H-022, MEDIA, D2)

`audit:domain` y `audit:reliability` consultan con `execSync('docker exec … psql')`. Dentro del
contenedor no hay `docker`. PT-138 corrigió **exactamente esto** en el tercer script pasándolo a
`PrismaClient`; los otros dos se quedaron con la forma vieja. Desde el host funcionan — o sea que
quien siga la convención de CLAUDE.md («npm se ejecuta en el contenedor») obtiene `SIN_DATOS` y
ninguna pista de por qué. Los dos salen con **código 0**.

### El fichero que declara el alcance cita cuatro documentos que ya no están (H-024, MEDIA, D4)

`audit-scope.yaml` apunta a `02-PRD.md`, `03-TRD.md`, `09-Security-Architecture.md` y
`06-Backend-Architecture.md` bajo `docs/enterprise-documentation/`. **Los cuatro los archivó PT-141**
ayer, y ese PT no siguió esta cita — sí siguió las de `CLAUDE.md` y la guarda del TRD. Y el comentario
`# 23 migraciones — ninguna se ha ejecutado nunca` es falso por partida doble: son **2** y **las dos
están aplicadas**.

Se registra sin atenuantes. PTSA audita lo que FDGE produce, también cuando FDGE es el trabajo de
ayer y también cuando todo lo demás salió bien. Una auditoría que declara cubrir cuatro documentos
inexistentes declara una cobertura que no tiene, y `[A8]` hace de eso un requisito del score.

### El catálogo publica dos esquemas con un solo nombre (H-023, BAJA, D4)

`UserResponseDto`, definido dos veces con formas distintas. Sale como `warn` **en cada arranque**, con
su propia fecha de caducidad puesta: *«will throw an error in the next major version»*. Pequeño hoy;
el día que alguien suba de mayor será «se rompió al actualizar» en vez de «lo sabíamos».

---

## LO QUE SE VERIFICÓ Y ESTÁ BIEN

`[A1]` obliga a sostener también lo que se afirma en verde.

**H-014 queda verificado en la fuente real.** Fue el CRÍTICO de S-002: la base se construía con
`db push` y `_prisma_migrations` **no existía**. Hoy:

```
20260727000000_initial_schema                        | aplicada | sin rollback
20260729020000_pt145_rating_unico_por_pedido_y_autor | aplicada | sin rollback
```

Dos en disco, dos aplicadas. Ya no es el testimonio del PT que lo corrigió: es observación directa.

**La invariante contable se cumple.** Dos monederos a 100.00 con un asiento cada uno,
`balance_before 0.00 → balance_after 100.00`. Saldo y asiento dicen lo mismo — la comprobación
pequeña pero directa de lo que arregló PT-146.

**D3 sigue en 100 con logs vivos detrás.** 4 780 líneas en 24 h, estructuradas, con `traceId` y
`isBusinessError`. 84 `error_events`, y **los 84 son de negocio**: 60 credenciales inválidas, 22
rate-limit, 2 no autorizado. **Cero no-de-negocio.** Los 22 × `429` demuestran que el rate limiting
*actúa*, no que está configurado.

**Un hallazgo falso, descartado antes de escribirlo.** La primera consulta dio 12 eventos de traza sin
ciclo, con `payment_cycles` a cero: parecía integridad rota. Los doce tienen `cycle_id` **nulo**, y la
FK es `ON DELETE SET NULL` sobre columna opcional — es **diseño**: la traza sobrevive al ciclo.
Huérfanos reales: **0**. Queda escrito porque el `LEFT JOIN … IS NULL` inicial habría producido un
hallazgo grave y falso.

---

## COBERTURA DECLARADA — por qué Confidence baja a 87

`[A8]`: ningún score vale sin cobertura declarada. **Ésta no es completa, y decirlo es el punto.**

| Dimensión | Cobertura | Cómo se midió |
|---|---:|---|
| D2 | 100 % | `audit:schema` + `audit:check` + esquema real por shell |
| D3 | 100 % | `audit:observability` + logs vivos + tablas de auditoría |
| D4 | 100 % | Rutas citadas comprobadas una a una |
| **D1** | **50 %** | 7 de 14 reglas. Las otras 7 no tienen datos que mirar |
| **D5** | **0 %** | No hay un solo ciclo de pago en la base |

**La causa es que la base está casi vacía**: 4 usuarios, 4 monederos, 2 asientos, y **cero** subastas,
pujas, pedidos, pagos y ciclos. La salida real que sostenía las validaciones de S-002 la consumió un
reseteo — `run-all.sh` trunca, y CLAUDE.md avisa de ello. No es un defecto: es la razón por la que D1
se mide a medias y D5 no se mide.

Las 7 reglas de D1 que **sí** se midieron pasaron todas: `rubric_compliance_score = 100` sobre ese
denominador reducido, que es lo que significa y no más.

Los 11 productos `VALIDADO` **conservan su estado**: `[A6]` y `[R39]` los validaron con evidencia
observada en su momento (E-025). No se revalidan ni se degradan por falta de datos hoy — pero tampoco
se cuentan como cobertura de esta corrida.

---

## SOBRE EL RISK 100

Es la salida honesta de la fórmula, y es engañosa si se lee sola. `Risk = min(100, 35 × 4)`: se
satura en 25 de riesgo bruto, y aquí hay 35.

**Lo que lo empuja es la certeza, no la gravedad.** Cuatro de los cinco hallazgos activos llevan
`probabilidad = 4` porque son deterministas: la ruta rota está rota siempre, el `warn` sale en cada
arranque, el checkpoint falla cada vez que se invoca desde el contenedor. Sólo uno es ALTA. Un Risk
saturado por tres MEDIA/BAJA ciertas no es el mismo Risk que uno saturado por dos CRÍTICAS.

Se reporta 100 porque es lo que dice la fórmula. Se explica porque reportarlo sin explicarlo sería tan
inútil como maquillarlo.

---

## CRITERIO DE COMPLECIÓN

La corrida está **cerrada**. Lo que queda abierto son los hallazgos, y los cierra quien corresponde:

- **H-021, H-022, H-023, H-024** — `ABIERTA`. `[R44]`: el agente no cierra hallazgos.
- **H-005** — sigue `ABIERTA`. Decisión de negocio y fiscal; ningún PT la resuelve.
- **D1 y D5 completos** — requieren un entorno **con historia**. La próxima corrida por navegador
  (`run-all.sh`) genera salida real: **medir antes de que otro reseteo se la lleve.**

`audit_due` de los nuevos: ALTA a 60 días → **2026-09-27** (H-021). MEDIA a 90 → **2026-10-27**
(H-022, H-024). BAJA a 180 → **2027-01-25** (H-023). H-005 conserva el suyo: **2026-08-22**.
