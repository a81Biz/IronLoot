# Methodology Suite — Manual de Instrucciones

Esta suite define **cuatro componentes** que forman un ciclo gobernado de desarrollo de software con asistencia de IA. El objetivo es que ningún trabajo sea ambiguo, ninguna decisión sea invisible, y ningún artefacto quede sin trazabilidad.

---

## Índice

1. [Qué es cada componente](#1-qué-es-cada-componente)
2. [El ciclo completo](#2-el-ciclo-completo)
3. [Cómo adoptar la suite en un proyecto nuevo](#3-cómo-adoptar-la-suite-en-un-proyecto-nuevo)
4. [Foundation Protocol — Primer paso obligatorio](#4-foundation-protocol--primer-paso-obligatorio)
5. [FDGE — Cómo se trabaja en cada sesión](#5-fdge--cómo-se-trabaja-en-cada-sesión)
6. [PTSA — Cómo se pide una auditoría](#6-ptsa--cómo-se-pide-una-auditoría)
7. [FPGE — Cómo se genera el roadmap priorizado](#7-fpge--cómo-se-genera-el-roadmap-priorizado)
8. [Cómo se usan las instrucciones (instrucctions.md)](#8-cómo-se-usan-las-instrucciones-instrucctionsmd)
9. [Documentos de referencia](#9-documentos-de-referencia)

---

## 1. Qué es cada componente

| Componente | Pregunta que responde | Cuándo corre | Trigger |
|:---|:---|:---|:---|
| **Foundation Protocol** | ¿Qué hace el sistema ya construido, cómo está estructurado y qué reglas lo gobiernan? | Una vez por proyecto. Re-ejecutar en cambios arquitectónicos mayores. | `[START FOUNDATION]` |
| **FDGE** — Desarrollo Gobernado por Evidencia | ¿Cómo se entiende, ejecuta, evidencia y valida el trabajo de desarrollo? | Cada sesión de desarrollo. | Implícito (rige todo el trabajo) |
| **PTSA** — Auditoría y Certificación Continua | ¿Lo que se construyó es válido para el dominio de negocio declarado? | A demanda + delta sync después de cada ciclo FDGE. | `[START PTSA]` |
| **FPGE** — Priorización Gobernada por Evidencia | ¿Qué se construye a continuación, y por qué? | A demanda, antes de cada sprint o planeación. | `[START FPGE]` |

**Regla de dependencia:** Foundation Protocol debe existir antes de que cualquier otro componente opere. FDGE construye artefactos que PTSA audita. PTSA genera evidencia que FPGE prioriza. FPGE produce ítems aprobados que vuelven a FDGE.

---

## 2. El ciclo completo

```
[Foundation Protocol]  ← una vez, al inicio del proyecto
         ↓
     FDGE (construir)   ← cada sesión de desarrollo
         ↓
     PTSA (auditar)     ← a demanda, después de cada ciclo
         ↓
     FPGE (priorizar)   ← a demanda, antes de cada planeación
         ↓
     FDGE (siguiente ciclo) ← los ítems aprobados por FPGE entran como PT-XXX
```

En una línea:

```
[Foundation Protocol] → FDGE (build) → PTSA (audit) → FPGE (prioritize) → FDGE (build next) → …
```

---

## 3. Cómo adoptar la suite en un proyecto nuevo

Seguir este orden. Cada componente es útil por sí solo, pero el valor se multiplica al combinarlos.

### Paso 0 — Copiar los documentos de metodología

Copiar toda la carpeta `docs/methodology/` al proyecto destino. Incluye:

```
docs/methodology/
├── Foundation-Protocol.md
├── Foundation-Implementation.md
├── Framework-FDGE.md
├── FDGE-Implementation.md
├── instrucctions.md            ← prompts operativos listos para pegar
├── Framework-FPGE.md
├── FPGE-Implementation.md
├── Suite-CLAUDE-Template.md    ← texto listo para pegar en CLAUDE.md
└── PTSA/
    ├── PTSA-V3-Especificacion-Oficial.md
    ├── PTSA.md                 ← workspace de auditoría
    └── Motor-PTSA.md           ← manual operativo del agente auditor
```

### Paso 1 — Configurar CLAUDE.md

Copiar el contenido de `Suite-CLAUDE-Template.md` al `CLAUDE.md` del proyecto destino, **después** de las secciones específicas del proyecto (Project Overview, Architecture, Dev Commands).

El template incluye las cuatro secciones de reglas vinculantes: Foundation Protocol + FDGE + PTSA + FPGE.

**Única personalización requerida:** definir la F-1 (Declaración de Valor) en la sección PTSA del `CLAUDE.md`. Es lo único específico del dominio.

### Paso 2 — Crear la estructura de artefactos FDGE

```
docs/implementation/
├── HISTORY.log          ← append-only, registro de todos los PT-XXX
├── HANDOFF.md           ← estado actual del sistema (se sobrescribe)
├── DISCOVERY.md         ← artefacto de bugs/investigaciones
├── ENRICHMENT.md        ← artefacto de features
├── REFACTOR_SCOPE.md    ← artefacto de refactors
├── CONTEXT_ANALYSIS.md  ← análisis arquitectónico por PT
├── PENDING_TASKS.md     ← tareas en vuelo
├── PLAN_ACTUAL.md       ← estrategia activa (STATE 2) o plan trivial (STATE 1-EXPRESS)
└── evidence/
    └── PT-XXX/          ← evidencia por cada PT completado

changes/
└── PT-XXX-slug/         ← Proposal Package por cada PT
    ├── design.md
    ├── tasks.md
    ├── spec-changes.md
    ├── test-scenarios.md
    └── out-of-scope.md
```

### Paso 3 — Crear el workspace PTSA

```
PTSA/
├── PTSA.md              ← protocolo de trabajo de la auditoría
├── Motor-PTSA.md        ← manual operativo del agente
├── RESUMEN.md           ← resumen ejecutivo de la auditoría vigente
├── ESTADO_ACTUAL.md     ← estado operativo
├── AUDIT_LOG.md         ← log inmutable de operaciones
├── audit-scope.yaml     ← scope declarado
├── score-history.json   ← historial de scores
├── Hallazgos/           ← H-XXX.md por cada hallazgo
├── Evidencias/          ← evidencia por hallazgo
├── Productos/           ← P-XXX.md por cada producto auditado
└── Fases/               ← F-1 a F-5, artefactos de cada fase
```

### Paso 4 — Crear los artefactos FPGE

```
docs/implementation/
├── ROADMAP.md           ← roadmap priorizado vigente (se sobrescribe en cada corrida)
└── ROADMAP_HISTORY.log  ← append-only, una entrada por corrida y por promoción
```

### Paso 5 — Ejecutar Foundation Protocol

Antes de cualquier desarrollo, ejecutar `[START FOUNDATION]` para generar la documentación base. Ver sección 4.

---

## 4. Foundation Protocol — Primer paso obligatorio

El Foundation Protocol hace ingeniería inversa del repositorio y produce documentación verificada en `docs/enterprise-documentation/`. Sin ella, FDGE opera sobre suposiciones, PTSA no tiene convenciones contra qué auditar, y FPGE no puede estimar impacto real.

### Cuándo ejecutarlo

- Siempre que se adopte la suite en un proyecto por primera vez.
- Si `docs/enterprise-documentation/` no existe.
- Cuando cambia la arquitectura principal (nuevo servicio, nueva BD, nuevo patrón).
- Si han pasado más de 3 meses de desarrollo activo sin re-ejecución.
- Cuando FDGE o PTSA detectan discrepancias con la documentación existente.

### Cómo ejecutarlo

Pegar este trigger en la sesión:

```
[START FOUNDATION]
```

O con scope personalizado:

```
[START FOUNDATION] scope: src/ + docker-compose.yml + migrations/
```

El agente analiza el código fuente completo y genera los siguientes documentos en `docs/enterprise-documentation/`:

| # | Documento | Qué captura |
|:--|:---|:---|
| 01 | Platform Overview | Resumen ejecutivo, visión, diagrama de arquitectura |
| 02 | PRD | Problema, usuarios, casos de uso, reglas de negocio |
| 03 | TRD | Stack, infraestructura, variables de entorno, comandos |
| 04 | App Flow | Flujos end-to-end con diagramas Mermaid |
| 05 | UI/UX Brief | Solo si existe frontend |
| 06 | Backend Architecture | Servicios, rutas, middleware, patrones |
| 07 | Database Architecture | Solo si existe BD |
| 08 | API Catalog | Solo si existe API HTTP/REST/GraphQL |
| 09 | Security Architecture | Auth, autorización, CORS, riesgos |
| 10 | Technical Debt | Deuda conocida, riesgos, gaps |
| 11 | Conventions | **El más crítico.** Convenciones detectadas, reglas para el agente, restricciones. |
| inventory/ | Rutas, endpoints, entidades, componentes, servicios, integraciones | Referencia rápida |

**Principio clave:** todo hecho debe derivar del código fuente. Nada se inventa. Si algo no se puede verificar en el código, no va en la documentación — va en el documento de deuda técnica (10).

### Validación humana obligatoria

Cuando el agente termina, pegar:

```
[FOUNDATION VALIDATED]
```

**Antes** de validar, el desarrollador debe:
1. Leer el PRD generado y compararlo con la intención original del proyecto.
2. Leer el TRD y verificar que el stack documentado es correcto.
3. Registrar cualquier discrepancia en el documento 10 (Technical Debt).

**No iniciar FDGE hasta que se haya emitido `[FOUNDATION VALIDATED]`.**

---

## 5. FDGE — Cómo se trabaja en cada sesión

FDGE es el marco que rige cada sesión de desarrollo. No tiene un trigger de activación porque siempre está activo. El trabajo fluye a través de STATEs secuenciales y cada uno termina con un STOP: el agente no avanza sin ACK explícito del humano.

### El flujo de STATEs

```
STATE 0 (Context Refresh)
    ↓ ACK
STATE 1-B / 1-E / 1-R / 1-EXPRESS (según tipo de tarea)
    ↓ ACK
STATE 2 (Strategy)
    ↓ ACK
STATE 3 (Proposal Package)
    ↓ ACK — PROPOSAL GATE: única autorización para abrir rama e implementar
STATE 4 (Implementation)
    ↓ cuando todos los tests pasan
STATE 5 (Evidence & Self-Review)
    ↓ validación humana
STATE 6 (Validation Gate)
    ↓ ACK
STATE 7 (History & Handoff)
```

### Los prompts operativos

Los prompts exactos para cada STATE están en `instrucctions.md` (ver sección 8). Copiar y pegar el bloque del STATE que se quiere ejecutar.

### STATE 0 — Inicio de sesión

Siempre es el primer paso al abrir una nueva sesión. Reconstruye el contexto leyendo la documentación existente. No modifica nada.

```
(pegar el bloque STATE 0 de instrucctions.md)
```

### STATE 1 — Análisis inicial (según tipo de tarea)

Hay cuatro variantes según qué se va a hacer:

| Variante | Cuándo | Artefacto que produce |
|:---|:---|:---|
| **STATE 1-B** | Bug o investigación | `DISCOVERY.md` |
| **STATE 1-E** | Feature nuevo | `ENRICHMENT.md` |
| **STATE 1-R** | Refactor | `REFACTOR_SCOPE.md` |
| **STATE 1-EXPRESS** | Cambio trivial (TRIVIAL solo) | `PLAN_ACTUAL.md` (simplificado) |

El agente genera un identificador **PT-XXX** (secuencial respecto al último en `HISTORY.log`) y clasifica la complejidad: TRIVIAL · STANDARD · MAJOR.

**Si durante STATE 1-EXPRESS el agente detecta que la tarea es STANDARD o MAJOR: se detiene y reporta. La tarea debe reiniciarse con el STATE 1 correspondiente.**

### STATE 2 — Estrategia técnica

El agente diseña la solución completa: qué se hace, por qué, alternativas descartadas, riesgos, restricciones, criterios de éxito y análisis de regresión.

Output: `PLAN_ACTUAL.md` sobrescrito con la estrategia completa.

### STATE 3 — Proposal Package (GATE obligatorio)

El agente crea el Proposal Package en `changes/PT-XXX-slug/`:

- `design.md` — decisiones de arquitectura
- `tasks.md` — tareas atómicas con Input/Output/Validación
- `spec-changes.md` — cambios en PRD, TRD o API
- `test-scenarios.md` — escenarios que verifican los Acceptance Criteria
- `out-of-scope.md` — exclusiones explícitas

**STOP absoluto.** No se abre rama, no se toca código hasta que el humano apruebe el Proposal Package.

### STATE 4 — Implementación

Solo comienza con ACK al Proposal Package.

Orden estricto:
1. Crear la rama (`feature/PT-XXX-slug`, `fix/PT-XXX-slug`, `refactor/PT-XXX-slug`)
2. Escribir tests en RED (tests que fallan antes de escribir código)
3. Commit: `test: PT-XXX add failing tests`
4. Implementar hasta que los tests pasen (GREEN)
5. Commits atómicos: `feat:`, `fix:`, `refactor:`, `test:`, `docs:` — siempre con `PT-XXX`
6. Actualizar `tasks.md` a DONE

**Prohibido:** hacer commits WIP, mezclar cambios lógicos en un commit, tocar archivos fuera del scope de `tasks.md`.

### STATE 5 — Evidencia y Self-Review

El agente genera evidencia en `docs/implementation/evidence/PT-XXX/` y completa un self-review checklist:

- Todos los Acceptance Criteria verificados con evidencia
- Todos los test scenarios pasando
- Sin regresiones
- Conventions respetadas
- Sin debugging artifacts

**Si el self-review encuentra bloqueadores: se corrigen antes de presentar el trabajo al humano.**

### STATE 6 — Validation Gate

El cierre varía según el tipo:

| Tipo | Quién cierra | Estado final |
|:---|:---|:---|
| BUG | Humano (obligatorio) | VALIDATION_PENDING → CLOSED |
| FEATURE | Agente (si todos los AC pasan) | DONE |
| REFACTOR | Agente (si comportamiento preservado) | DONE |
| INVESTIGATION | Agente (si hallazgos documentados) | CLOSED |

**Los bugs no los puede cerrar el agente. Requieren confirmación humana explícita.**

### STATE 7 — History & Handoff

El agente registra el PT en `HISTORY.log` (append-only, nunca se edita) y sobrescribe `HANDOFF.md` con el estado actual del sistema.

Si durante el PT se crearon, movieron o eliminaron archivos: el agente notifica que se debe ejecutar `/graphify` para actualizar el grafo de dependencias.

---

## 6. PTSA — Cómo se pide una auditoría

PTSA audita los **productos generados** por el sistema (documentos, cursos, certificados, reportes — lo que el sistema entrega al usuario), no el código. Responde: ¿lo que produce el sistema es válido para el dominio declarado?

### Cuándo ejecutar una auditoría

- Después de un ciclo FDGE significativo (varios PT-XXX completados).
- Antes de una planeación con FPGE (para que el roadmap tenga datos frescos).
- Cuando haya cambios en prompts, modelos o esquema de datos.
- Cada 3 meses en proyectos activos.

### Cómo ejecutar una auditoría completa

Pegar en la sesión:

```
[START PTSA]
```

El agente corre las 5 fases de auditoría:

| Fase | Nombre | Qué hace |
|:--|:---|:---|
| F-1 | Declaración de Valor | Define el dominio, los productos a auditar y los criterios de validez. Se hace una vez; define todo lo demás. |
| F-2 | Reconocimiento | Mapea el sistema: productos, transformaciones, servicios, fuentes de datos. |
| F-3 | Auditoría por Dimensión | Evalúa 5 dimensiones: D1 Dominio, D2 Técnica, D3 Proceso, D4 Gobierno, D5 Operacional. |
| F-4 | Scoring & Certificación | Calcula Health Score (0-100), Risk Score, Confidence Score. Emite clasificación A/B/C/F. |
| F-5 | Hallazgos & Recomendaciones | Genera hallazgos H-XXX con severidad, impacto y recomendación. |

**Output de la auditoría:**
- `PTSA/RESUMEN.md` — resumen ejecutivo con Score y clasificación
- `PTSA/Hallazgos/H-XXX.md` — un archivo por hallazgo
- `PTSA/Productos/P-XXX.md` — estado de cada producto auditado
- `PTSA/score-history.json` — histórico de scores

### Delta sync (re-auditoría parcial)

Para re-auditar solo los productos afectados por un PT reciente, sin correr la auditoría completa:

```
resume PTSA
```

El agente compara el estado actual de los productos vs. el último snapshot y actualiza solo los hallazgos y scores afectados.

### Consultar el estado de la auditoría vigente

```
status PTSA
```

Reporta el Score actual, clasificación, hallazgos abiertos y freshness (cuándo fue la última auditoría).

---

## 7. FPGE — Cómo se genera el roadmap priorizado

FPGE lee los artefactos de FDGE (lo que se hizo) y de PTSA (lo que está roto) y produce un roadmap priorizado con evidencia trazable. No inventa ítems: solo ordena y justifica lo que ya existe como evidencia.

**FPGE no escribe en los artefactos de FDGE ni de PTSA.** Solo escribe `ROADMAP.md` y `ROADMAP_HISTORY.log`.

### Cuándo ejecutar FPGE

- Después de un delta sync de PTSA (el Score cambió, el orden puede cambiar).
- Al inicio de un sprint o planeación.
- Cuando `HANDOFF.md` acumula "recommended next actions" sin atender.

### Cómo ejecutar FPGE

```
[START FPGE]
```

El agente:
1. Verifica la frescura del Score de PTSA. Si es STALE: advierte que se recomienda un delta sync antes de tomar decisiones.
2. Lee toda la evidencia disponible: hallazgos PTSA activos, `HISTORY.log`, `HANDOFF.md`, `ENRICHMENT.md` (features especificados pero sin implementar), `REFACTOR_SCOPE.md` (refactors con scope definido).
3. Sintetiza candidatos R-XXX, uno por unidad de trabajo accionable.
4. Calcula Priority para cada candidato: `(EvidenceWeight × ScoreImpact × Urgency × DomainMultiplier) / Effort`
5. Sobrescribe `ROADMAP.md` con el ranking completo, Top-3 impacto y Top-3 quick wins.
6. **STOP.** No promueve nada sin aprobación humana.

### Aprobar ítems del roadmap

El humano revisa `ROADMAP.md` y para cada ítem decide: `APROBADO` / `DIFERIDO` / `DESCARTADO`.

Para promover un ítem aprobado a FDGE:

```
promote FPGE R-XXX
```

El agente:
- Asigna un PT-XXX nuevo.
- Entrega el ítem a FDGE STATE 1 con la evidencia de origen como contexto:
  - BUG → STATE 1-B
  - FEATURE → STATE 1-E
  - REFACTOR → STATE 1-R
  - INVESTIGATION → STATE 1-B (modo investigación)
- Registra la promoción en `ROADMAP_HISTORY.log`.

### Consultar el roadmap vigente

```
status FPGE
```

Reporta el ranking actual, estado de cada ítem y PT-XXX asignados, sin recalcular.

---

## 8. Cómo se usan las instrucciones (instrucctions.md)

`instrucctions.md` contiene los prompts operativos listos para copiar y pegar. Cada bloque corresponde a un STATE de FDGE. El flujo de uso es:

1. Abrir una nueva sesión con el agente.
2. Copiar el bloque **STATE 0** de `instrucctions.md` y pegarlo en la sesión.
3. El agente reconstruye el contexto y reporta el estado del sistema. **STOP.**
4. El humano decide qué hacer a continuación: bug, feature, refactor, o trivial.
5. Copiar el bloque del STATE 1 correspondiente (1-B, 1-E, 1-R, o 1-EXPRESS) y pegarlo.
6. El agente analiza y produce el artefacto del STATE 1. **STOP.**
7. El humano lee el artefacto, ajusta si es necesario, y responde con ACK explícito.
8. Continuar copiando y pegando el bloque del siguiente STATE y dando ACK en cada STOP.

**Regla fundamental:** el agente NO avanza de STATE sin ACK explícito del humano. Si el agente avanza sin ACK, está violando el protocolo.

**Copiar instrucctions.md al proyecto** en `docs/implementation/instrucctions.md` para tenerlo disponible dentro del repositorio sin salir de él.

### Referencia rápida de bloques

| Bloque | Cuándo copiarlo |
|:---|:---|
| STATE 0 | Siempre, al inicio de cada sesión |
| STATE 1-B | Hay un bug o se necesita investigar algo |
| STATE 1-E | Hay una nueva funcionalidad que implementar |
| STATE 1-R | Hay un refactor que hacer |
| STATE 1-EXPRESS | El cambio es pequeño, de complejidad TRIVIAL |
| STATE 2 | Después del ACK al STATE 1 (no aplica a EXPRESS) |
| STATE 3 | Después del ACK al STATE 2 |
| STATE 4 | Después del ACK al Proposal Package |
| STATE 5 | Cuando la implementación está terminada |
| STATE 6 | Después de la evidencia y el self-review |
| STATE 7 | Como paso final, para cerrar el ciclo |

---

## 9. Documentos de referencia

### Fuente de verdad del método

| Documento | Framework | Cubre |
|:---|:---|:---|
| [Foundation-Protocol.md](Foundation-Protocol.md) | Foundation | Filosofía: por qué primero, qué produce, criterios de compleción y fracaso. |
| [Foundation-Implementation.md](Foundation-Implementation.md) | Foundation | Proceso operativo: trigger, output, 5 fases, templates, regla de no inventar hechos. |
| [Framework-FDGE.md](Framework-FDGE.md) | FDGE | Filosofía, principios y el pipeline cognitivo de desarrollo gobernado. |
| [FDGE-Implementation.md](FDGE-Implementation.md) | FDGE | Artefactos, carpetas, workflow git, trazabilidad y validation gates. |
| [instrucctions.md](instrucctions.md) | FDGE | **Prompts operativos listos para pegar.** Copiar al proyecto en `docs/implementation/`. |
| [PTSA/PTSA-V3-Especificacion-Oficial.md](PTSA/PTSA-V3-Especificacion-Oficial.md) | PTSA | Estándar normativo completo: 5 dimensiones, scoring, fases, evidencia, plantillas. |
| [Framework-FPGE.md](Framework-FPGE.md) | FPGE | Filosofía, algoritmo de priorización y el contrato que cierra el loop. |
| [FPGE-Implementation.md](FPGE-Implementation.md) | FPGE | Artefactos, triggers, proceso paso a paso, schema del ROADMAP, portabilidad. |

### Template para copiar a CLAUDE.md

| Documento | Cubre |
|:---|:---|
| [Suite-CLAUDE-Template.md](Suite-CLAUDE-Template.md) | Las cuatro secciones de reglas vinculantes (Foundation + FDGE + PTSA + FPGE). Copiar al `CLAUDE.md` del proyecto destino, después de las secciones específicas del proyecto. La única personalización requerida es la F-1 de PTSA. |

---

## Por qué son cuatro componentes separados y no uno

- **PTSA debe poder auditar cualquier codebase**, FDGE-construido o no. Si PTSA dependiera de FDGE, no sería un auditor: sería un verificador de protocolo.
- **FDGE no puede tener lógica de auditoría embebida**: se volvería demasiado complejo para su función principal.
- **FPGE no puede estar fusionado**: la priorización invisible es exactamente el problema que resuelve. Al estar separada, toda decisión de roadmap es trazable y justificada.

Los tres nunca se fusionan. Se **componen**: FPGE lee FDGE y PTSA. La única escritura gobernada de FPGE hacia FDGE es la promoción de un R-XXX aprobado como PT-XXX.
