# AUDIT LOG — Registro inmutable de operaciones PTSA
**PTSA V3 | Solo append — nunca sobrescribir**
**Sistema:** IronLoot — Plataforma de Subastas (v1.0.0)

---

## 2026-06-23 — S-001 — Inicio de auditoría completa

- **Trigger:** `[START PTSA]` — primera auditoría del sistema
- **Acción:** Creación de estructura PTSA/ completa; inicio desde F-1
- **Fase completada:** F-1 (Declaración de Valor) → EN_PROGRESO
- **Evidencias creadas:** ninguna aún (F0 en progreso)
- **Hallazgos:** ninguno registrado aún
- **Scores:** no calculados (auditoría iniciada)
- **Productos actualizados:** ninguno aún
- **Freshness:** UNKNOWN (primera auditoría, sin baseline)
- **Contexto:** Foundation Protocol VALIDATED (2026-06-23). Sistema determinístico (no IA/LLM) — Nivel 4 y métricas LLM de D5 marcadas NO_APLICA.
- **Base:** docs/enterprise-documentation/ completa (18 documentos validados por el desarrollador)

## 2026-06-23 — DS-001 — Delta Sync post-FPGE + trivial fixes (PT-031, PT-032, PT-028)

- **Trigger:** `ACK a todos los PT` + implementación trivials PT-031, PT-032 + investigation PT-028
- **Acciones realizadas:**
  - H-003: ABIERTA → **CORREGIDA** (PT-031 commit `38864cd` — PaymentsService StructuredLogger DI)
  - H-006: MEDIA → **BAJA** (PT-028 investigation: `credentials: 'include'` confirmado en deposit.html y withdraw.html)
  - H-007: ABIERTA → **CORREGIDA** (PT-032 — PRD AC-3.2 corregido en docs/enterprise-documentation/02-PRD.md)
  - PT-028 CLOSED: Investigation completa, H1 confirmada, sin trabajo adicional requerido
  - lint-staged fix: `npm run lint -- --fix` → `eslint --fix` en src/api/package.json (commit `38864cd`)
- **Score delta:**
  - D2: 84 → 88 (+4 por H-006 reclasificación MEDIA→BAJA)
  - D4: 99 (sin cambio hasta H-007 CLOSED)
  - Health: 86.1 → 87.3 (projected 87.7 si CORREGIDAS validadas)
- **FDGE STATE 2 completado:** PT-026, PT-029, PT-030 — aguardando Proposal Gate ACK
- **FDGE STATE 2 bloqueado:** PT-027 (PAC no seleccionado)
- **Pendiente validación humana:** H-003 (runtime), H-007 (PRD texto)

## 2026-06-23 — S-001 — Cierre de auditoría completa F-1→F12

- **Fases completadas:** F-1, F0, F1, F2, F3, F3.5, F4 (milestone central), F5, F6, F7, F8, F9, F10, F11, F12
- **Evidencias creadas:** E-001 a E-008 (8 evidencias)
- **Hallazgos registrados:** H-001 a H-007 (7 hallazgos — 2 ALTAS, 3 MEDIAS, 2 BAJAS)
- **Productos auditados:** 12/12 (P-001 a P-012, todos en estado AUDITADO)
- **Scores finales:**
  - D1=70, D2=84, D3=100, D4=99
  - Health=86.1 / Clasificación=C (cap freshness UNKNOWN)
  - Risk=100 (CRÍTICO) / Confidence=55 (BAJA)
- **Limitaciones activas:** BLQ-001 (sin DB live), BLQ-002 (sin logs live)
- **Regla del Agua Potable:** NO ACTIVADA (D1=70 ≥ 60)
- **Freshness:** UNKNOWN → próxima auditoría debe resolver a KNOWN
- **audit_due:** 2026-07-07 (productos CRÍTICOS)

## 2026-06-23 — DS-002 — Delta Sync post PT-026 + PT-029 + PT-030 implementation

- **Trigger:** `status FPGE` → confirmación usuario → DS-002
- **Hallazgos actualizados:**
  - H-001: ABIERTA → CORREGIDA (PT-026 branch listo, VALIDATION_PENDING)
  - H-002: ABIERTA → CERRADA (PT-030 DONE — refactor, 145/145 tests)
  - H-004: ABIERTA → CORREGIDA (PT-029 branch listo, VALIDATION_PENDING)
- **Scores:**
  - D1: 70 (sin cambio — H-001 CORREGIDA penalty permanece hasta validación humana)
  - D2: 88 → 93 (+5 — H-002 CERRADA, penalización -5 eliminada)
  - D3: 100 (sin cambio)
  - D4: 99 (sin cambio)
  - Health: 87.3 → 88.8 (+1.5)
  - Risk: 100 → 92 (H-001/H-004 CORREGIDAS reducen probabilidad; H-005 sigue siendo driver)
  - Confidence: 55 → 60 (BLQ-001 resuelto — DB access confirmado via db push)
- **BLQ-001 RESUELTO:** `prisma db push` ejecutado exitosamente — DB real accesible
- **BLQ-002:** Activo — logs en vivo no verificados → freshness=UNKNOWN cap permanece
- **Clasificación:** C (cap freshness) | Sin cap: B (88.8 ≥ 75)
- **Proyectado:** Health → 90.3 (Clase A) si H-001/003/004/007 validados → CLOSED + BLQ-002 resuelto

## 2026-06-23 — DS-003 — Delta Sync: cierre de H-001, H-003, H-004, H-007 por validación humana

- **Trigger:** Developer confirma `H-007 VALIDADO, H-004 VALIDADO, H-003 VALIDADO, H-001 VALIDADO`
- **Hallazgos cerrados:**
  - H-001 CLOSED: soft-close extension validada en runtime (BidsService usa SystemConfig)
  - H-003 CLOSED: logs JSON con traceId verificados en terminal — **BLQ-002 RESUELTO**
  - H-004 CLOSED: withdraw 400 con referenceId desconocida confirmado en runtime
  - H-007 CLOSED: PRD AC-3.2 texto correcto confirmado en docs
- **Scores DS-003:**
  - D1: 70 → 85 (+15, H-001 cerrada)
  - D2: 93 → 99 (+6, H-003 y H-004 cerradas)
  - D3: 100
  - D4: 99 → 100 (+1, H-007 cerrada)
  - Health: 88.8 → **95.2** (+6.4)
  - Risk: 92 → **44** (MODERADO)
  - Confidence: 60 → **85**
- **BLQ-001:** RESUELTO (DS-002)
- **BLQ-002:** **RESUELTO** (DS-003 — H-003 runtime validation)
- **Cap de freshness:** **ELIMINADO** — ambos blockers resueltos
- **Clasificación:** C → **A** ★ (primera certificación Clase A)
- **Único hallazgo bloqueante restante:** H-005 ABIERTA ALTA (CFDI/PAC — decisión de negocio)

---

## DS-004 — Delta Sync (2026-07-27)

**Disparador**: 34 días y 20 PT (PT-090…PT-109) desde DS-003. `audit_due` vencido en los cinco
productos CRÍTICOS.

| Paso | Qué se hizo | Resultado |
|---|---|---|
| F11 | Delta contra `audit-scope.yaml` | **177 commits, 286 ficheros** en alcance |
| R34 | Revalidación de evidencias de hallazgos activos | E-007 **STALE** (`HANDOFF.md` reescrito) → recapturada como **E-009** |
| F6 | Domain Acid Test Nivel 1 **sobre la BD real** | **11 de 12 invariantes cumplen**; el 12.º es CFDI (H-005) → **E-010** |
| F5 | D2: esquema real, índices, dependencias | 33 tablas = 33 modelos; `payments_reference_key` presente; **71 vulnerabilidades** → **E-011**, **H-008** |
| F8 | D3: traza de pagos real | 9 pasos, 30 eventos, **0 credenciales filtradas**, 4 entradas redactadas y **nombradas** |
| F7 | D4: fidelidad documental | Las correcciones de PT-109 se sostienen; **los 5 documentos del alcance están fuera de git** → **E-012**, **H-009** |
| F9/F10 | Consolidación y scoring | Health **90.5**, Risk **92**, Confidence **62.8** → **Clase B** |

**Hallazgos nuevos**: H-008 (D2, ALTA), H-009 (D4, MEDIA).
**Hallazgos revisados**: H-005 (evidencia recapturada; sigue ABIERTA y bloqueada).
**Hallazgos cerrados**: ninguno. *El agente no cierra hallazgos.*

**Evidencias nuevas**: E-009, E-010, E-011, E-012. Ninguna evidencia previa se sobrescribió (A6).

---

## DS-005 — Delta Sync tras atender los hallazgos (2026-07-27)

**Disparador**: ciclos FDGE completos sobre los hallazgos de DS-004 (PT-110 … PT-113).

| Hallazgo | Antes | Después | PT |
|---|---|---|---|
| **H-008** D2 ALTA | 71 avisos, `engine.io` alcanzable sin autenticar | **CORREGIDA_PARCIAL** — 63 avisos, vector cerrado, cotas en los dos gateways | PT-110 |
| **H-009** D4 MEDIA | 5 documentos del alcance fuera de git | **CORREGIDA** — 238 ficheros de decisión dentro, 2658 artefactos fuera | PT-112 |
| **H-005** D1 ALTA | «bloqueada por contratar un PAC» | **ABIERTA, causa raíz corregida**: el bloqueo es una decisión de dominio sin tomar | PT-113 |

**Hallazgos nuevos, los tres encontrados al trabajar los anteriores:**

| | |
|---|---|
| **F-38** | El contenedor de ADMIN **no compilaba desde PT-101**: `TS6059`, los tests fuera de `rootDir`. 21 checks en rojo. Sobrevivió tres semanas porque `deleteOutDir: false` (PT-094) servía un `dist` viejo — el arreglo de una avería tapaba otra |
| **F-39** | Las sesiones de ADMIN **nunca llegaron a Redis**. `connect-redis@9` no tiene `default`; el `catch` caía a memoria anunciando «Redis unavailable» con Redis sano. Y al corregirlo apareció el segundo: v9 habla el dialecto de `node-redis`, no el de `ioredis` — cada escritura fallaba con `ERR syntax error` mientras el arranque anunciaba éxito |
| **F-40** | H-005 estaba mal caracterizada |

**Scores**: Health **94.0** (era 90.5) · Risk **40** (era 92) · Confidence **63.4** · Clase **B**.

El Confidence apenas se mueve: este delta **atendió hallazgos, no amplió cobertura**. Sigue al 50 %
y la frescura STALE, y por eso la clase no sube a A pese al Health.

**Ningún hallazgo se cerró.** El agente no cierra hallazgos.

---

## DS-006 — Ampliación de cobertura (2026-07-27)

**Disparador**: los seis productos que DS-004 y DS-005 dejaron sin auditar. Era lo único que podía
mover el Confidence.

### Lo que se hizo

Domain Acid Test sobre la **salida real en base de datos** (`[R55]`) de **11 de los 12 productos**.
Para P-006 no había instancias: se **generó una disputa real por la API** en vez de declararlo «sin
datos».

| Producto | Resultado |
|---|---|
| P-001 · P-002 · P-003 · P-004 · P-005 · P-007 · P-008 · P-009 · P-011 | **Todos los invariantes cumplen** |
| **P-006** | 7/7 en el Acid Test — pero destapó **H-011** |
| **P-010** | **VIOLADO**: el producto no se genera nunca → **H-010** |
| P-012 | Sin instancias (H-005, bloqueado) |

**Los 12 productos salen de `BORRADOR`**, donde llevaban desde el 23-jun: 10 a `IDENTIFICADO`,
P-010 a `REQUIERE_REVISION`.

### Hallazgos nuevos

**H-010 (D1, ALTA)** — `commission_records` tiene **0 filas** mientras el ledger registra **95.00
MXN** de `FEE_PLATFORM` cobrados. `CommissionsService.calculateForOrder()` es el único sitio que
crea el registro y **no lo invoca nadie en producción**: sus tres referencias están en los tests.
El dinero se cobra; la contabilidad no lo ve. El informe financiero del panel lee esa tabla vacía.

**H-011 (D1, MEDIA)** — `CR-007` dice «14 días desde la entrega» y el código mide desde
`updatedAt`: `orders` **no tiene** `delivered_at`, ni en Prisma ni en la BD, y dos `as any` hacen
que el acceso compile y devuelva `undefined`. Cualquier modificación del pedido **reinicia la
ventana**.

### Scores

| | DS-005 | **DS-006** |
|---|--:|--:|
| Health | 94.0 | **88.0** |
| D1 | 85 | **65** |
| Risk | 40 | **100** |
| Confidence | 63.4 | **93.4** |
| Freshness | STALE | **FRESH** |
| Clase | B | **B** |

**El sistema no ha empeorado: la auditoría ha empezado a mirar.** El Confidence sube 30 puntos
porque la cobertura pasa del 50 % al 92 % y la frescura a FRESH. El Health baja porque auditar de
verdad encontró dos productos que no cumplen.

> ⚠️ **D1 = 65 está a 5 puntos de la Regla del Agua Potable.** Un solo hallazgo ALTA más en D1 lo
> deja en 50, y entonces el Health se capa a 50: **Clase F**, con la técnica intacta.

**Ningún hallazgo cerrado.** El agente no cierra hallazgos.

---

## DS-007 — Tras atender los hallazgos de DS-006 (2026-07-27)

**Disparador**: ciclos FDGE completos sobre H-010, H-011 y TD-015 (PT-114, PT-115, PT-116).

| Hallazgo | Resultado | PT |
|---|---|---|
| **H-010** | **CORREGIDA** — el registro de comisión existe y coincide al céntimo con el asiento | PT-114 |
| **H-011** | **CORREGIDA** — la ventana se cuenta desde `shipments.delivered_at`; los `as any` fuera | PT-115 |
| **H-008** | Sigue CORREGIDA_PARCIAL — **63 → 27 avisos**, de 3 críticos a 1 | PT-116 |
| **P-010** | `REQUIERE_REVISION` → `IDENTIFICADO`, con evidencia post-fix observada en la BD | PT-114 |

**Ningún hallazgo nuevo.** Es la primera sesión desde DS-004 que no destapa uno.

### Scores

| | DS-006 | **DS-007** |
|---|--:|--:|
| Health | 88.0 | **94.0** |
| D1 | 65 | **85** |
| Risk | 100 | **40** |
| Confidence | 93.4 | **93.9** |
| Clase | B | **A — sin cap** |

**Es la primera Clase A que se sostiene.** DS-003 emitió A con Confidence 85, que por §15.6 no
alcanzaba; DS-004 y DS-005 fueron B por ese mismo cap. Esta lo es con cobertura del 92 % y frescura
FRESH: el número alto viene de haber mirado.

**Lo único que separa al sistema de la certificación plena**: ningún producto llega a `VALIDADO`
porque las rúbricas no están definidas en F-1. Es trabajo de F12.

---

## DS-008 — Niveles 2 y 3, y las primeras transiciones a VALIDADO (2026-07-27)

**Disparador**: el humano pidió ver la validación en navegador antes de dar el visto bueno.

### Corrección de premisa

DS-006 y DS-007 declararon que **«las rúbricas no están definidas en F-1»**. Era **falso**. F-1 §5
las declara, y ya adaptadas a un sistema transaccional: *«la rúbrica es la correcta aplicación de
reglas de negocio y validaciones»*, con cinco bloques y vocabulario prohibido.

Lo que faltaba no era escribirlas: era **ejecutarlas y pesarlas**. Dos emisiones dieron por
bloqueado algo que sólo estaba sin hacer.

### Nivel 2 — `rubric_compliance_score = 100`

Once criterios derivados de F-1 §5, con pesos según lo que el dominio no puede permitirse.
**Los once cumplen** sobre salida real.

Tres se habían dado por buenos leyendo código; se rehicieron en vivo: `0` disputas fuera de plazo
en datos reales, la clave leída de `system_config`, y una petición de error devolviendo JSON con
`traceId` y **sin traza interna**.

### Nivel 3 — `cross_coherence_verified`

Diez parejas upstream→downstream. **Nueve limpias, una falló** → **H-012**: el aviso al vendedor
reutilizaba `AUCTION_WON` porque el catálogo no tenía `AUCTION_SOLD`.

**Corregido el mismo día** (PT-117), con migración comprobada aditiva.

### Validación en navegador

El informe financiero del panel —el consumidor que H-010 dejaba ciego— muestra ahora:

```
$458.9 Ventas totales · $95 Comisiones · $363.9 Ingreso neto
```

6/6 en el recorrido, cero violaciones de CSP.

### Transiciones

**Once de doce productos: `IDENTIFICADO` → `VALIDADO`**, con VoBo humano.

P-012 se queda en `IDENTIFICADO`: sin instancias, bloqueado por H-005.

### Scores

| | DS-007 | **DS-008** |
|---|--:|--:|
| Health | 94.0 | **94.0** |
| Risk | 40 | **40** |
| Confidence | 93.9 | **94.2** |
| Clase | A | **A** |
| Productos VALIDADO | 0 | **11** |

Los scores apenas se mueven porque no había nada roto que arreglar: lo que cambia es **qué se sabe
del sistema**. Es la primera sesión con productos en `VALIDADO` desde que existe la auditoría.

---

## DS-009 — El mecanismo que faltaba (2026-07-27)

**Disparador**: el trabajo pendiente que no depende del PAC.

| PT | Qué | Resultado |
|---|---|---|
| **PT-117** | Se le completó el **STATE 5** que me había saltado | Evidencia y self-review escritos |
| **PT-118** | El **checkpoint D2** que `audit-scope.yaml` declara desde el 23-jun y no existía | Corre en CI, probado en los dos sentidos |
| **PT-119** | Triaje de TD-015 | 27 → 26 avisos; una afirmación mía corregida |

### Lo que PT-118 arregla de verdad

No es una vulnerabilidad: es **la razón por la que H-008 llegó con 34 días de retraso**. Durante
cinco semanas la auditoría emitió D2 = 99 sobre un área que nadie miraba, porque el mecanismo que
debía mirarla estaba declarado y no existía.

Se compara contra una **línea base**, no contra un umbral: `--audit-level=high` fallaría desde el
primer día por los 12 ya triados, el CI quedaría rojo permanente, y alguien lo desactivaría. Así es
como muere un control — no se borra, se ignora hasta que estorba.

### Una corrección mía, en PT-119

TD-015 afirmaba que **los 13 paquetes exigían salto mayor**. Al medirlo de nuevo —después de que
PT-116 cambiara el árbol— `nodemailer` no: la app ya estaba en 9.0.3 y el aviso venía de una
**segunda copia en 8.0.5** anidada tres niveles abajo. Heredé el marco de un PT anterior sin
recomprobarlo. **Es lo mismo que F-33, en otro sitio.**

### Scores

Sin cambios: Health **94.0** · Risk **40** · Confidence **94.2** · Clase **A** · 11 productos
`VALIDADO`.

Los números no se mueven porque no había nada roto. Lo que cambia es que **la próxima vulnerabilidad
se verá el día que llegue**.

---

## S-002 — Corrida completa desde F-1 (2026-07-27)

**Disparador**: `[START PTSA]`. No un delta sync: el loop entero, contra un entorno vivo —BD, API,
ADMIN, BASE, CLIENT y nginx en marcha—.

### Lo que encontró que nueve sesiones no vieron

Dos hallazgos, y los dos por la misma razón: **estaban fuera del alcance**.

`auditable_patterns` cubría el código, el esquema, las migraciones, `docker-compose` y cinco
documentos. No cubría `.github/workflows/**` ni `src/api/scripts/**`. Ahí vivían los dos.

#### H-014 (CRITICA) — el esquema es correcto, el artefacto que lo construye no

`entrypoint.dev.sh:52` aplica el esquema con `prisma db push --accept-data-loss` en cada arranque.
`db push` no escribe `_prisma_migrations`, y esa tabla no existe en la base real. **Las 23
migraciones no se han ejecutado nunca.**

Aplicadas a una base sombra limpia producen otro esquema. El cliente Prisma contra esa base: 3 de 4
sondas fallan, una de ellas `payment_cycles`. Y `payments.reference` pierde la unicidad — la que
CLAUDE.md declara como garantía contra el asiento duplicado.

El `Dockerfile` de producción no aplica esquema alguno y `ci.yml` no tiene job de despliegue: **las
migraciones son el único camino que existe, y no funciona.**

#### H-015 (ALTA) — el job llamado «Integration Tests» no integra nada

Levanta Postgres y corre la suite e2e sin crear el esquema. Y la suite no cierra sus manejadores:
con esquema completo, `auth` pasa en 22 s pero sólo termina con `--forceExit`, que el script no
lleva. `build` y `docker` cuelgan de él y no se ejecutan.

Es el patrón de PT-118 repetido. Allí el mecanismo estaba declarado y no existía; aquí ni siquiera
estaba declarado.

#### H-016 (MEDIA) — la documentación se quedó en NestJS 10

`03-TRD.md:13` declara `^10.3.0` **citando `src/api/package.json:36`**. Los cuatro servicios están
en `^11.0.0` desde PT-126. La cita es lo que lo agrava: dato falso con referencia concreta.

### Lo que comprobó sano, ejecutándolo

`rubric_compliance_score = 100` sobre las 14 reglas contra salida real · coherencia inter-producto
5/5 · **0 avisos** de dependencias (TD-015 cerrado por PT-126) · typecheck limpio · 603 tests del
API y 134 de CORE en verde · 33 tablas con 17 columnas de dinero todas `numeric` y 0 float · traza
de 49 eventos con **0 credenciales** y 4 redacciones que nombran qué ocultaron · logs en vivo con
`traceId` extremo a extremo · D5 en verde por triplicado · 401 en los endpoints sensibles · los 5
`emit` de WebSocket a salas públicas de subasta.

**H-008 y H-009 quedan comprobados corregidos en la fuente real.**

### Correcciones al propio alcance

Añadidos `.github/workflows/**` y `src/api/scripts/**`. Cifras de `coverage_targets` recontadas:
declaraban 27 modelos, 12 migraciones y ~84 endpoints; son **33, 23 y 159**. Llevaban un mes sin
recontarse.

### Una salvedad sobre P-006

Llegó a VALIDADO en DS-008 con E-015, observada sobre disputas reales. La base se reconstruyó
después: hoy `disputes` tiene 0 filas. La evidencia sigue siendo válida como captura; **no es
reproducible hoy**. No se degrada el estado, pero no es lo mismo y queda dicho.

### Scores

| | DS-009 | **S-002** |
|---|--:|--:|
| Health | 94.0 | **81.5** |
| Risk | 40 | **100** (saturado desde 32 brutos) |
| Confidence | 94.2 | **90.0** |
| Clase | A | **B** |

D1 = 85 · **D2 = 55** · D3 = 100 · D4 = 95. Agua Potable **no** activada.

**Lo que saca al sistema de la Clase A no es el dominio: es el camino al despliegue.** Cerrar H-014
y H-015 devuelve el Health a 95.0 y la A, con H-005 todavía abierto.

### Evidencias y hallazgos nuevos

E-017 · E-018 · E-019 · E-020 · H-014 · H-015 · H-016.

### Entorno

Se crearon tres bases de prueba (`ptsa_shadow`, `ptsa_ci`, `ptsa_e2e`) y **se eliminaron al cerrar**.
`ironloot_db` no se tocó: ninguna escritura, sólo consultas.

### Corrección de la propia sesión — H-017, encontrado al cierre

Comprobando la salud del sistema al terminar apareció un cuarto hallazgo, en el mismo hueco de
alcance que los otros dos:

**H-017 (D2, ALTA)** — el healthcheck de `src/api/Dockerfile:60` pide `/health`, que devuelve
**404** (el prefijo global es `/api`; la ruta real es `/api/v1/health`). Un contenedor de producción
quedaría `unhealthy` para siempre con la aplicación funcionando. El healthcheck de `docker-compose`
sí está corregido: se arregló ahí y no en la imagen. Además, ADMIN, BASE y CLIENT no tienen
`Dockerfile` de producción, y el job `docker` de CI construye `./Dockerfile`, que no existe.
Evidencia **E-021**.

Y un segundo caso de H-016, encontrado sin buscarlo: `CLAUDE.md:138` documenta `/health` y
`/health/detailed`. Ninguna existe. No sube la severidad; sí convierte un descuido en un patrón.

Se añadieron también `**/Dockerfile` y `**/Dockerfile.dev` al alcance.

**Scores finales de S-002** (los de arriba quedan sustituidos; se dejan visibles por `[A6]`):

| | DS-009 | **S-002** |
|---|--:|--:|
| Health | 94.0 | **77.0** |
| Risk | 40 | **100** (saturado desde 38 brutos) |
| Confidence | 94.2 | **90.0** |
| Clase | A | **B** |

D1 = 85 · **D2 = 40** · D3 = 100 · D4 = 95. Agua Potable **no** activada.

**Los tres hallazgos D2 son el mismo camino visto desde tres sitios**: esquema (H-014), pipeline
(H-015) e imagen (H-017). Recorrer ese camino una vez, de principio a fin, los cierra los tres.
Health proyectado con los tres cerrados: **95.0**, Clase A, con H-005 todavía abierto.

### Revisión S-002-R2 — una objeción humana, una corrección mía y un hallazgo mayor

**Disparador**: *«sólo se ha trabajado en esta máquina, revisa los commits y las ramas… no puede ser
que la migración no esté documentada. Se migró NestJS 11.1.28 / Express 5.2.1 y debería estar
documentado»*.

#### 1. La objeción era correcta. Corrección de redacción en E-020 y H-016

**La migración a NestJS 11 está documentada, y bien.** PT-126 dejó `REFACTOR_SCOPE.md` (STATE 1-R
completo, con la autorización humana citada literalmente), `CONTEXT_ANALYSIS.md`, entrada detallada
en `HISTORY.log` —incluidos los cuatro defectos latentes que la migración destapó— y `HANDOFF.md`.

E-020 se redactó de forma que podía leerse como «la migración no se documentó». No es lo que se
midió. Son **dos corpus distintos**:

```
docs/implementation/            FDGE — el registro del trabajo        ACTUALIZADO por PT-126
docs/enterprise-documentation/  Foundation Protocol — la referencia   NO actualizado
```

Versiones exactas incorporadas: **NestJS 11.1.28 · Express 5.2.1**, leídas del contenedor. E-020
citaba `^11.0.0`, que es el rango declarado, no la versión resuelta.

#### 2. Verificando las migraciones sobre TODO el historial

`git log --all --diff-filter=A -- 'src/api/prisma/migrations/*'` sobre las **57 ramas** del
repositorio: 23 migraciones, la última `20260726100000_pt086_payment_trace`.

```
git grep -l "AUCTION_SOLD"          $(git rev-list --all) -- 'src/api/prisma/migrations/*'  -> vacio
git grep -l "account_verifications" $(git rev-list --all) -- 'src/api/prisma/migrations/*'  -> vacio
```

**Ningún commit de ninguna rama** tiene esas migraciones. H-014 se confirma sobre el historial
completo, no sólo sobre `master`.

#### 3. La pregunta del Proposal Gate queda resuelta

```
git log --all --format="%an <%ae>" | sort -u   ->  Alberto Martinez <alberto@a81.biz>   (unico)
git rev-parse master origin/master             ->  328b421  ==  328b421
```

Un solo autor, una sola máquina, `master` local idéntico a `origin/master`. **No existe ningún
entorno donde las 23 migraciones se hayan aplicado.** PT-127 puede ir por la **vía B** (colapsar en
una migración inicial), que era la recomendada.

#### 4. Y al comprobar la cita del TRD apareció el hallazgo mayor

Se verificaron las **cinco** filas de la tabla de stack de `03-TRD.md`, no sólo la de NestJS:

```
5 de 5 citas       ->  apuntan a la linea EQUIVOCADA
3 de 5 versiones   ->  son FALSAS
    NestJS      declarado ^10.3.0   real 11.1.28
    Prisma      declarado ^5.8.0    real 5.22.0
    TypeScript  declarado ^5.3.3    real 5.9.3
```

`package.json:36` —la línea que el TRD cita para NestJS— contiene `},`. Las líneas se desplazaron
según crecía el fichero y nadie las siguió.

No es «una fila vieja». Es que **el mecanismo de verificabilidad del documento está muerto**: la
columna de fuente existe para poder comprobar cada afirmación y no permite comprobar ninguna. Un
documento sin citas se lee con desconfianza; uno con citas rotas se lee con confianza y es falso.

**H-016: MEDIA (5) → ALTA (15).** Impacto 2→3. Riesgo 6 MEDIO → **9 ALTO**.

Detalle que conviene no perder: ocho líneas más abajo, el **mismo** `03-TRD.md` dice
`Health check path: GET /api/v1/health` y acierta — contradiciendo a `CLAUDE.md:138`. El dato bueno
ya está en el repositorio, en el mismo fichero que el malo.

#### Scores tras la revisión

```
D4 = 100 − 15 = 85                                  (era 95)
Health = (85×0.30)+(40×0.30)+(100×0.30)+(85×0.10) = 76.0    (era 77.0)  ->  Clase B
Risk_bruto = 6+8+12+9+6 = 41  ->  Risk = 100        (saturado, sin cambio)
Confidence = 90.0                                    (sin cambio)
```

Cerrar los tres hallazgos D2 devuelve el Health a **94.0**; cerrando además H-016, **95.5**. Clase A
en ambos casos.

#### Lo que sigue sin medirse

`02-PRD.md`, `09-Security-Architecture.md` y el resto de `03-TRD.md` y `06-Backend-Architecture.md`
**siguen sin barrer**. La severidad se sube por lo comprobado, no por lo sospechado.

---

## S-002-V — Validación por navegador y cierre (2026-07-28)

**Disparador**: instrucción del humano — *«retira los endpoints, abre un navegador y valida los
hallazgos completos»*.

### PT-133 — Los endpoints legados, retirados

`POST /wallet/deposit` y `POST /payments/checkout` no los invocaba **ningún** cliente: el único
llamante en todo `src/` eran sus propios tests. El depósito real es `POST /payments/initiate`,
documentado en `docs-v2/4-ingenieria/Catalogo-de-API.md`.

Se retiran en vez de corregirse porque `/wallet/deposit` **acreditaba dinero** a partir de un
`referenceId` elegido por el cliente. Superficie que mueve saldo, sin uso, sin cobertura y sin
mantenimiento. **Cierra H-018 de raíz**, que es mejor que pulir el manejo de errores de una puerta
que sobra. Queda escrito en **ADR-047**.

`WalletService.deposit()` **se conserva** — es lo que usa `creditWallet` en la vía real. Hay un caso
de prueba (AC-06) que lo fija, porque confundir el endpoint con el servicio habría roto el depósito
de verdad mientras se retiraba el que nadie usa.

### La validación, sobre la fuente real

```
Suite QA completa (Playwright, stack en Docker)   127 comprobaciones · 0 fallos
Validación dirigida de hallazgos                    9 comprobaciones · 0 fallos
```

**La suite corrió DESPUÉS de la retirada**, y el cobro real por Mercado Pago pasó entero: orden
aprobada en la pasarela, monedero acreditado por el importe exacto, traza de 7 pasos en orden, cero
credenciales persistidas, y la reentrega sin acreditar de nuevo. Es la prueba de que se retiró la
puerta que sobraba y no la que se usa.

También pasó el retiro real completo —KYC, CLABE, holdback, aprobación de admin, PAID, y el rechazo
reintegrando— y los recorridos en Firefox y WebKit.

### Lo que la validación encontró de paso

57 de 57 pantallas con errores de consola. Mirado uno a uno: **98 son la advertencia de COOP sobre
HTTP** —los navegadores la ignoran sin TLS, y el entorno de desarrollo no lo tiene—, tres 404 y un
401 son **casos que la propia suite provoca a propósito**, y queda uno real y cosmético: ADMIN no
tiene `favicon.ico`. Anotado en `PENDIENTES`; no merece hallazgo.

### Cierre

**Siete hallazgos a `CERRADA`** con VoBo humano: H-014, H-015, H-016, H-017, H-018, H-019, H-020.
`[R44]` reserva ese cierre a la persona, y su instrucción queda citada en cada ficha.

| | S-002 | **S-002-V** |
|---|--:|--:|
| Health | 76.0 | **95.5** |
| Risk | 100 | **24** |
| Confidence | 90.0 | **95.0** |
| Clase | B | **A** |

D1 = 85 · **D2 = 100** · D3 = 100 · D4 = 100.

**Queda un único hallazgo activo en todo el sistema: H-005** — quién emite la factura. Es una
decisión de negocio y fiscal, y ningún PT puede tomarla.

---

## S-003 — Delta sync · 2026-07-29

**Disparador:** `resume PTSA` del humano. Motivo: 91 commits y once PT fusionados (PT-136…PT-147)
desde S-002-V, con `score_freshness` STALE. Lo habia señalado la compuerta de frescura de FPGE-002
esa misma mañana.

**Alcance del delta:** 28 ficheros dentro de `auditable_patterns` — 15 en `src/api/src/`, 3 en
`scripts/` y `.github/workflows/`, seis Dockerfiles y `docker-compose.yml`.

**Ejecutado por el auditor (`[A5]`), no pedido al humano:**

| Checkpoint | Resultado |
|---|---|
| `audit:schema` (D2) | OK — las migraciones reproducen `schema.prisma` |
| `audit:check` (D2) | OK — 0 avisos, linea base vacia sin novedades |
| `audit:observability` (D3) | OK — 25 = 25 silencios, sin nuevos. `trace_completeness` SIN CICLOS |
| `audit:domain` (D1.N1) | **FALLA en contenedor y sale con 0.** Desde host: 7 de 14 reglas, score 100 |
| `audit:reliability` (D5) | **FALLA en contenedor y sale con 0.** Desde host: SIN_DATOS |

Ademas, por consulta directa: esquema real (33 tablas, `_prisma_migrations`), volumen de datos,
invariante ledger-vs-saldo, integridad de la traza, logs vivos (24 h) y las tres tablas de auditoria.

**Evidencias nuevas:** E-026 (los cinco checkpoints), E-027 (esquema y datos reales), E-028 (logs).

**Hallazgos nuevos:** H-021 (D2 ALTA), H-022 (D2 MEDIA), H-023 (D4 BAJA), H-024 (D4 MEDIA).
Ninguno cerrado por el agente — `[R44]`.

**H-014 verificado en fuente real.** Era el CRITICO de S-002. `_prisma_migrations` existe con las dos
migraciones aplicadas y sin rollback. Deja de sostenerse en el testimonio del PT que lo corrigio.

**Un hallazgo falso, descartado antes de escribirlo.** 12 eventos de traza sin ciclo parecian
integridad rota; los doce tienen `cycle_id` NULL y la FK es `ON DELETE SET NULL` sobre columna
opcional. Huerfanos reales: 0. Queda constancia porque el `LEFT JOIN … IS NULL` inicial habria
producido un hallazgo grave y falso.

**Scores:** Health 95.5 -> **88.9** · Risk 24 -> **100** (saturado por certeza, no por gravedad) ·
Confidence 95.0 -> **87.0** (la baja la cobertura: D1 al 50 %, D5 al 0 %) · Clase A -> **B**.

**Cobertura declarada PARCIAL** (`[A8]`): la base esta casi vacia —4 usuarios, 0 subastas, 0 pedidos,
0 ciclos— porque un reseteo se llevo la salida real de S-002. No es un defecto; es la razon por la
que D1 se mide a medias y D5 no se mide.

**Autoinculpacion registrada:** H-024 lo introdujo PT-141 al archivar los nueve documentos sin
seguir la cita de `audit-scope.yaml`. Se registra sin atenuantes: PTSA audita lo que FDGE produce,
tambien cuando FDGE es el trabajo de ayer.

**Estado de la corrida:** CERRADA_CON_HALLAZGOS.

---

## Correccion de los cuatro hallazgos de S-003 — 2026-07-29

**Disparador:** la tanda FDGE PT-148…PT-162 (FPGE-003), autorizada por el humano en bloque.

| Hallazgo | Estado | PT | Verificacion |
|---|---|---|---|
| **H-021** (D2 ALTA) | `CORREGIDA` | PT-149 | Con base alcanzable `verificado` + exit 0; con `DATABASE_URL` envenenada `sin_datos` + **exit 1** |
| **H-022** (D2 MEDIA) | `CORREGIDA` | PT-153 | Los dos checkpoints corren **dentro del contenedor** y devuelven datos reales |
| **H-023** (D4 BAJA) | `CORREGIDA` | PT-162 | `UserResponseDto` de auth renombrado; el `warn` de arranque desaparece |
| **H-024** (D4 MEDIA) | `CORREGIDA` | PT-157 | Las seis rutas del alcance existen; RULE-28 lo vigila |
| **H-005** (D1 ALTA) | **sigue `ABIERTA`** | PT-155 | Investigacion cerrada; la decision es de negocio y fiscal |

**Ninguno pasa a `CERRADA`.** `[R44]` reserva el cierre a una persona que haya visto la evidencia, y
que el humano autorizara trabajar en autonomia no cambia quien valida. Los scores de S-003 siguen
vigentes hasta el proximo delta sync.

**Nota sobre H-024:** lo introdujo PT-141 y lo corrige PT-157, los dos del mismo dia. Al corregirlo
aparecio una **segunda lista** con las mismas rutas archivadas, que la correccion a mano no habria
visto: es la justificacion entera de que el PT llevara guarda (RULE-28) y no solo una correccion.

**Nota sobre H-021:** la correccion aplica al veredicto de coherencia el mismo criterio de tres
estados que `puntuar()` ya usaba veinte lineas mas arriba en el mismo fichero. El problema estaba
pensado; no se habia trasladado.

**Pendiente de medir, sin cambios:** D1 al 50 % y D5 al 0 %. Siguen exigiendo una base **con
historia**. PT-153 quita el impedimento tecnico —los checkpoints ya corren donde toca— pero la
ventana sigue estrecha: `run-all.sh` genera la salida real y trunca la base al empezar.

---

## S-004 — Delta sync (`resume PTSA`) — 2026-07-29

**Disparador:** peticion explicita del humano tras dar VoBo a PT-166…PT-172. **32 commits** y
**veinticinco PT** (PT-148…PT-172) desde el ultimo delta sync (`d260c80`).

**Los cinco checkpoints, ejecutados dentro del contenedor** (posible desde PT-153):

| Checkpoint | Resultado |
|---|---|
| `audit:check` (D2) | **0** avisos. Linea base vacia, sin novedades |
| `audit:schema` (D2) | **FALLA** con P1003 (base sombra inexistente) → creada a mano → **OK: las migraciones reproducen `schema.prisma`** |
| `audit:observability` (D3) | `silent_failure_count = 25` == linea base. **Sin silencios nuevos tras 25 PT** |
| `audit:domain` (D1.N1) | `rubric = 100` con **1 de 14** reglas medidas · `cross_coherence_verified = verificado` **sobre cero filas** |
| `audit:reliability` (D5) | `SIN_DATOS` — cero ciclos de pago |

Ademas, por consulta directa: esquema real (33 tablas + `_prisma_migrations`, 2 migraciones aplicadas sin
rollback), volumen de datos, endpoints de salud en vivo y logs persistidos (537 `request_logs`).

**Evidencias nuevas:** E-029 (los cinco checkpoints), E-030 (la base real contada), E-031 (la salud leida
en vivo).

**Hallazgos nuevos:** **H-025** (D2 ALTA) y **H-026** (D3 MEDIA). Ninguno cerrado por el agente —
`[R44]`.

**Los cuatro de S-003 verificados en fuente real, no por testimonio.** H-021: el veredicto da
`verificado` con 5/5 y **sale con 1** con la base inalcanzable. H-022: los dos checkpoints corren dentro
del contenedor. H-023: **0** ocurrencias del `warn` de DTO duplicado. H-024: RULE-28 en verde. Y **H-014
gana una garantia**: `audit:schema` confirma que las dos migraciones **reproducen** el modelo, no solo
que estan aplicadas.

**H-025 es la sexta aparicion del patron de la casa, y la mas incomoda:** el veredicto de coherencia sale
`verificado` con la base **vacia**, porque las cinco consultas corren limpias y devuelven «0
incoherencias» cuando no hay una sola fila que comparar. PT-149 arreglo el caso «no pude conectar» y dejo
el caso «no habia datos» — corregir el caso y no la clase. Y el propio docstring de
`veredictoCoherencia()` **declara la proteccion que el codigo no implementa**. Las cinco comprobaciones
cubren dinero: **es lo que esta corrida habria concluido** si no se hubiera cruzado con el conteo de
filas de E-030. Agravante: cuanto mas vacia esta la base, mas verde sale.

**Un hallazgo falso, descartado antes de escribirlo.** `relation "ledger_entries" does not exist` — la
tabla se llama `ledger`. Sobre una tabla de contabilidad eso tiene la forma exacta de un hallazgo grave;
se comprobo en `information_schema` antes de concluir nada. Es la disciplina con la que S-003 descarto
los doce eventos de traza «huerfanos».

**Un fallo de checkpoint que NO es hallazgo, y se dice por que.** `audit:schema` fallo con P1003 y **se
comporto bien**: no dijo OK, nombro la causa y salio con 1. El job `schema-drift` de CI **crea la base
sombra explicitamente** (lo descubrio PT-136 ejecutando, tras un comentario que afirmaba lo contrario).
El checkpoint funciona donde esta declarado; falta esa base en el entorno local.

**Scores:** Health 88.9 -> **89.5** · Risk 100 -> **100** (saturado **por un punto**: `Risk_bruto = 26`)
· Confidence 87.0 -> **83.6** · Clase **B** -> **B**.

**Por que no es Clase A con 89.5 de Health:** §15.6 exige Health >= 90 **y** Confidence >= 90. Falta
medio punto de Health y 6.4 de Confianza.

**Cobertura declarada PARCIAL** (`[A8]`): D2/D3/D4 al 100 %, **D1 al 7 %** (1 de 14 reglas) y D5 al 0 %.
**D1 empeoro respecto a S-003** —eran 7 de 14— y la causa no es el codigo: **otro reseteo dejo la base a
cero usuarios**. Es la unica razon de que la Confianza baje en una corrida que cerro cuatro hallazgos.

**Lo que S-004 confirma sobre la tanda PT-168…PT-172:** D4 vuelve a **100**. Los cinco defectos que
cerro esa tanda no los trajo ningun PT ni ningun mecanismo: los trajo la revision de coherencia que
pidio el humano. El codigo estaba bien; lo que mentia era lo que el repositorio decia de si mismo.

**Estado de la corrida:** CERRADA_CON_HALLAZGOS.

---

## S-004-M — Medicion dirigida D1 + D5 — 2026-07-29

**Disparador:** peticion explicita del humano — *«correr ya run-all.sh y medir D1/D5 en la misma sesion»*.
No es un delta sync nuevo: es **cerrar el hueco de cobertura** que S-004 declaro, sobre el mismo HEAD.

**Por que la misma sesion, y no la siguiente.** `run-all.sh` **trunca la base al empezar**. La salida real
de S-002 y la de S-003 se perdieron por medir despues; **dos veces es un patron, no un accidente**. Esta
vez se midio a continuacion, sin cortar. No hizo falta copia previa: la base estaba a cero usuarios
(E-030), asi que el TRUNCATE no se llevo nada.

**La corrida:** 176 checks PASS en nueve fases — incluidas la puja en vivo en dos navegadores (F-34), el
retiro real del vendedor y **un pago real por Mercado Pago con su traza completa de siete eventos**.

**Salida generada:** 3 usuarios · 1 subasta · 3 pujas · 1 pago · **3 ciclos de pago** · **12 asientos del
ledger** · 19 eventos de traza · 2 retiros. Pedidos: 0.

**D1 — de 1 regla medida a 12.** Las **12 CUMPLEN**, `rubric_compliance_score = 100`. Y las que miden
dinero de verdad cumplen **sobre salida real**: el invariante ledger-vs-saldo (`CR-003`, peso 25), el
deposito contra el pago del proveedor (`CR-004`), la no-duplicacion (`R-5.1c`, peso 25) y la puerta de KYC
(`R-5.3b`).

Las dos `n/d` son **legitimas y comprobadas**: `R-5.1a` y `R-5.1d` exigen una subasta en `CLOSED` y hay
**0** —la suite no espera los 120 s de la ventana de cierre—. **No es una violacion de dominio**; es un
flujo que la suite no completa. Se verifico antes de concluir.

**D5 — MEDIDO POR PRIMERA VEZ en la historia de esta auditoria.** Success 100 % · Retry 0 % · Failure 0 %.
`health_unstable = false`, ahora **por datos y no por ausencia de ellos**. **Muestra: 3 ciclos, 1
resuelto** — se declara porque un 100 % sobre 1 caso no es una serie.

**D3 — `trace_completeness = 100 %`** (1 de 1 ciclos liquidados). `silent_failure_count = 25`, igual que la
linea base: veinticinco PT y ningun `catch` mudo nuevo.

**Hallazgo nuevo: H-027 (D3 MEDIA).** El `RESUMEN FINAL` de la suite **omite la fase que falla**. La
`Fase 71 — via garantizada de PayPal` se cayo con `TimeoutError` y el resumen listo **nueve fases, todas
PASS**, sin mencionarla: `run-all.sh:73-76` usa `[ -f "$f" ] && echo …`, asi que una fase sin `.json`
desaparece. El fallo lo causa la UI de sandbox de PayPal —un tercero, declarado como limite de cobertura—;
**el hallazgo es que el resumen no lo dice**. Septima aparicion del patron de la casa, esta vez por
**omision**: no miente, calla. Familia de H-015.

Lo que quedo sin ejercer es **la via garantizada de PayPal**, y es donde mas importa: en Orders v2 aprobar
**no mueve el dinero**, asi que su via garantizada **captura**.

**H-025 reforzado, no debilitado.** Con la base **poblada**, el veredicto sigue diciendo
`verificado · 5 de 5 medidas` y **cuatro de las cinco comprobaciones compararon CERO filas** (0 pedidos, 0
comisiones, 0 disputas; solo el tipo de aviso tenia 2). Es evidencia mas fuerte que la de E-029: alli la
base estaba vacia y podia parecer un limite del entorno.

**Evidencias nuevas:** E-032 (+ `E-032-salida-cruda.txt`).

**Scores:** Health 89.5 -> **88.0** · Risk **100** (bruto 34) · Confidence 83.6 -> **97.9** · Clase **B**.

**Las dos direcciones, dichas juntas porque asi se entiende:** la Confianza sube **14.3** porque se cerro
el hueco de cobertura, y el Health baja **1.5** porque la propia medicion encontro un defecto. **Es la
auditoria funcionando, no una regresion del sistema.**

**Y por primera vez §15.6 no ata:** Confidence 97.9 supera el >= 90 que exige para clasificar A. Lo que
falta son **2 puntos de Health**, y los tienen los cuatro hallazgos activos. **La clase ya depende solo de
defectos, no de lo que la auditoria no pudo mirar.**

**Estado de la corrida:** CERRADA_CON_HALLAZGOS.

---

## S-005 — Delta sync (`resume PTSA`) — 2026-07-29

**Disparador:** peticion del humano tras aceptar H-005 como limitacion declarada y cerrar los catorce PT de
la jornada.

**Los cinco checkpoints, sobre salida real** (3 usuarios · 1 subasta CLOSED · 1 pedido · 2 pagos · 3 ciclos
· 17 asientos · 1 comision · 1 envio):

| Checkpoint | Resultado |
|---|---|
| `audit:domain` (D1.N1) | **14 de 14 reglas CUMPLE**, `rubric = 100`. **Primera emision sin una sola `n/d`** |
| `audit:domain` (D1.N3) | `sin_datos`: 4 de 5 medidas, 1 sin filas (`0 disputas`). **H-025 funcionando** |
| `audit:schema` (D2) | OK — las migraciones reproducen `schema.prisma` |
| `audit:check` (D2) | 0 avisos, sin novedades |
| `audit:observability` (D3) | silencios **25 == linea base**; `trace_completeness` **100 %** |
| `audit:reliability` (D5) | `SIN_DATOS` **por muestra insuficiente**. `health_unstable = false` |

Y los endpoints de salud en vivo, **en los dos estados**: con Redis en pie `healthy` + `redis up`; con
Redis parado `unhealthy` + `redis down` + «PING sin respuesta en 2000 ms».

**Evidencia nueva:** E-033.

**Hallazgo nuevo, nacido y cerrado en esta corrida: H-028 (D3 MEDIA).** La primera medicion de D5 dio
`Success Rate 50 % ROJO` -> `health_unstable = true` -> **clase capada a B**. El sistema **no estaba
inestable**: el ciclo que uso la via garantizada la uso porque el sandbox de PayPal no notifico, que es lo
que PT-087 diseño. Con `n = 2` una tasa solo puede valer 0 %, 50 % o 100 % y el umbral verde es `>= 95`:
**un solo fallback fuerza ROJO por aritmetica**. Y al reves es peor — `1 de 1` daba `100 % VERDE`, que fue
la primera medicion de D5 de esta auditoria. `reliability-check.ts` **ya llevaba escrita esta leccion** por
PT-122, que corrigio **que** ciclos entran en el denominador; nadie miro **cuantos**. Corregido por PT-180
con `MUESTRA_MINIMA = 20`, **derivada de los umbrales del propio fichero** y no elegida.

**Y dos `catch` mudos mios, cazados por el checkpoint que existe para eso.** D3 dio **27** contra una linea
base de 25: dos `catch` nuevos en el JS del detalle de pedido, introducidos por PT-174 unas horas antes, que
avisaban a la persona y no dejaban rastro del error. Corregidos en PT-180.

**Hallazgos cerrados en esta corrida:** H-005 (por decision), H-025 (PT-177), H-026 (PT-178), H-028
(PT-180). Con H-027 (PT-176, de S-004-M), **el registro queda con 28 hallazgos y CERO activos**.

**H-005 se cerro por decision, no por codigo, y se deja dicho como se legitima:** un hallazgo que se cierra
«aceptandolo» sin mas vaciaria el score —bastaria aceptar todo para sacar un 100—. Aqui la aceptacion va
con **la enmienda de la declaracion de valor** (`F-1 § U-006`): el producto ya **no promete** emitir CFDI y
`P-012` pasa a `FUERA_DE_ALCANCE_V1`. El hueco que D1 mide se cierra **por el lado de la declaracion**, y
queda escrito que se cerro por ahi. **El sistema sigue sin emitir facturas.** Reapertura declarada: si v1.1
lo vuelve a prometer, `P-012` vuelve y H-005 se reabre con el.

**Scores:** Health 88.0 -> **100** · Risk 100 -> **0** · Confidence 97.9 -> **91.0** · Clase **B** -> **A**.

**Como hay que leer ese 100, y esto es parte de la emision:**

1. **Sube en parte porque el alcance se estrecho**, no solo porque se arreglara.
2. **La Confianza esta a UN punto del umbral de A** (91 contra 90). La baja **D5 al 0 %**: la fiabilidad
   operacional **no esta demostrada**. Hacen falta 20 ciclos resueltos y hay 2.
3. **Cero hallazgos activos es cero defectos CONOCIDOS.** Un dia de mirar y ejecutar produjo **ocho
   hallazgos**, cinco de ellos con meses en el codigo. Este `0` mide lo que se ha buscado.

**Cobertura declarada** (`[A8]`): D1/D2/D3/D4 al **100 %** · **D5 al 0 %**. D1 llega al 100 por primera vez
gracias a la **fase 35** (PT-175), que cierra una subasta de verdad.

**Estado de la corrida:** CERRADA_SIN_HALLAZGOS_ACTIVOS.

---

## S-006 — 2026-07-29 — DELTA SYNC: tres controles que aparentaban estar puestos

**Disparador:** barrido dirigido tras el cierre de S-005, por instruccion del humano —*«revisa de nuevo que
falta»*, *«si hay un hallazgo nuevo lo tratas hasta cerrarlo»*, *«cierra los PT con mi VoBo»*.

**Que se busco:** no errores, **afirmaciones**. Guards que prometen verificar, respuestas que dicen «hecho»,
variables que declaran una espera. Salieron tres, y **ninguno fallaba** — por eso dos llevaban meses.

| Hallazgo | Dim | Sev | Que afirmaba | Que hacia |
|---|:--:|:--:|---|---|
| **H-029** | D2 | MEDIA | «verifica el captcha» | comprobaba que el token **existiera**; `"x"` pasaba |
| **H-030** | D1 | ALTA | «Verification email sent» | la llamada de envio estaba **comentada** |
| **H-031** | D2 | MEDIA | una espera de 72 h | reserva `:-0` en el compose: **sin espera** |

Las tres **CERRADA** en PT-182, con VoBo humano instruido de antemano, y verificadas **ejecutando**: 21 casos
verdes en tres guardas, el reenvio comprobado **en vivo contra Mailhog** (`1 -> 2` correos — la respuesta del
endpoint no es evidencia de nada, porque ya decia «enviado» cuando no enviaba) y **C7 visto fallar** con la
reserva devuelta a `:-0`.

**H-031 es mio y de hoy**: lo introdujo PT-174 unas horas antes para que la fase 35 de QA no esperase tres
dias. Se registra como hallazgo en vez de dejarlo en la prosa de una evidencia, porque **el recuento es lo que
se lee**.

**Scores:** Health **100** · Risk **0** · Confidence **91.0** · Clase **A**. Identicos a S-005.

**Y esa identidad es el dato de esta emision.** Entre las dos aparecieron tres hallazgos mas —uno ALTA en
D1—, se corrigieron y se cerraron; el numero no se movio. **Un 100 estable no significa que no haya pasado
nada.** Los tres avisos de S-005 siguen vigentes, y el tercero se refuerza: es la **tercera** emision
consecutiva en la que un barrido dirigido encuentra defectos que ninguna prueba senalaba.

**Dos guardas propias se pusieron en rojo durante la corrida, con razon:** RULE-33, porque `RESUMEN.md` y
`ESTADO_ACTUAL.md` anunciaban `0` hallazgos activos con dos abiertos en el registro; y RULE-20, porque la
carpeta de evidencia de PT-182 existia antes que su entrada en `HISTORY.log`. Las dos veces **el numero lo
corrigio el trabajo, no la guarda**.

**Cobertura declarada** (`[A8]`): sin cambios — D1/D2/D3/D4 al **100 %**, **D5 al 0 %**. Este delta sync no
amplia cobertura: confirma correcciones. La fiabilidad operacional **sigue sin demostrarse**: 2 ciclos
resueltos frente a los 20 que los umbrales exigen.

**Estado de la corrida:** CERRADA_SIN_HALLAZGOS_ACTIVOS — **31 hallazgos, todos CERRADA**.

---

## S-007 — 2026-07-29 — DELTA SYNC: los dos hallazgos que salieron de comprobar el cierre anterior

**Disparador:** barrido de la capa de correo al verificar el cierre de H-030, por la instruccion del humano
—*«si hay un hallazgo nuevo lo tratas hasta cerrarlo»*—.

**Y uno de los dos desmiente parte de ese cierre.** H-030 afirmaba que el reenvio de verificacion *«propaga el
fallo — un `catch` que se lo comiera reproduciria el defecto por otra via»*. **El `catch` existia**, una capa mas
abajo, dentro de `EmailService`.

Lo que se hizo mal es identificable: se comprobo **ejecutando** que el correo salia y se dio por bueno **por
lectura** que el fallo se propagaba. Una de las dos afirmaciones se ejecuto y la otra se supuso — y la supuesta
era la falsa. Es `[A1]` incumplido por el agente. **H-030 no se reabre** (lo que reclamaba esta cumplido y
verificado en vivo) pero queda anotado en su ficha: `[A6]`, la evidencia se revisa, no se reescribe.

| Hallazgo | Dim | Sev | Que pasaba |
|---|:--:|:--:|---|
| **H-032** | D3 | **ALTA** | `EmailService` absorbia el fallo y con el **tres capas de recuperacion**: el `catch` del worker de la cola, su contador de intentos y los reintentos de BullMQ. Un envio fallido marcaba el trabajo como **completado**. Familia de H-014/H-015/H-027 |
| **H-033** | D3 | MEDIA | El transporte no declaraba **ningun tope**: con el SMTP caido, el reenvio **y el registro** se colgaban **121 s**. Preexistente, tapado por H-032 — tras la espera se respondia `200` |

Las dos **CERRADA** en PT-183 y verificadas ejecutando: 13 casos nuevos, y **en vivo con Mailhog parado** el
reenvio pasa de `200 «Verification email sent»` con la bandeja vacia a **500 «Connection timeout»**, y de
**121 s** a **~5 s**.

**Tres cosas mas, todas propias:**

1. **Una prueba verde sostenia el defecto**: `should not throw when mailerService fails`, dos veces, en el mismo
   fichero que hasta PT-089 exigia la reserva `localhost:5174`. **Una prueba puede ser el mecanismo que mantiene
   vivo un defecto.**
2. **Los casos de control C4/C5/C6 no supieron fallar hasta la TERCERA version.** Las dos primeras pasaban con
   el defecto puesto. Detalle en `E-036`, y es incomodo porque *«una guarda que nadie ha visto fallar no es una
   guarda»* se escribio dos veces hoy en este mismo repositorio.
3. **El checkpoint D3 cazo, por tercera vez en la jornada, un `catch` mudo del dia**: el del guard de reCAPTCHA
   de PT-182, cuya justificacion escrita —«añadir el logger cambiaria su firma en todos los llamantes»— era
   **falsa**. Un guard recibe sus dependencias por inyeccion. 26 -> 25.

**RULE-36** nueva: *un servicio compartido no decide que hacen sus llamantes con un fallo.* Y el **Delta Log** de
las convenciones, que declaraba ser el registro incremental con **12 de 34** reglas, queda completo — con las 22
filas nuevas marcadas como reconstruidas desde `HISTORY.log`, porque su procedencia es mas debil.

**Scores:** Health **100** · Risk **0** · Confidence **91.0** · Clase **A**. Los mismos por tercera vez.

**La estabilidad de este 100 mide que se cierra lo que se encuentra, NO que no haya nada que encontrar.** Tres
emisiones consecutivas, y en cada intervalo un barrido dirigido encontro defectos que ninguna prueba senalaba.
La cobertura de dimension no cambia; lo que cambio es **lo que se ha mirado**: hoy, por primera vez, el camino
de **fallo** de la capa de correo. Ahi estaban los dos.

**Estado de la corrida:** CERRADA_SIN_HALLAZGOS_ACTIVOS — **33 hallazgos, todos CERRADA**.
