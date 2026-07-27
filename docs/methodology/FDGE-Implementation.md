# FDGE-Implementation — Framework de Desarrollo Gobernado por Evidencia

> Responde: ¿Cómo se materializa el Framework de Desarrollo Gobernado por Evidencia (FDGE) dentro de un repositorio de software?
>
> Esta implementación materializa los principios del FDGE mediante artefactos persistentes, trazabilidad completa, evidencia verificable y validación gobernada.

---

# Objetivo de la Implementación

La implementación del FDGE tiene un único propósito:

**Convertir cada solicitud en un proceso trazable de comprensión, decisión, ejecución, evidencia y validación.**

El framework asume que:

* El agente actual no estará en la próxima sesión.
* La memoria conversacional es temporal.
* Toda decisión importante debe persistirse.
* Todo cambio debe ser justificable.
* Toda implementación debe ser verificable.
* Todo bug debe ser validado externamente antes de cerrarse.
* El punto más barato para detectar un error es antes de implementar.

---

# Estructura de Carpetas

```text
docs/
└── implementation/

    DISCOVERY.md          ← BUGs: observación → problema definido
    ENRICHMENT.md         ← FEATUREs: intención → especificación técnica
    REFACTOR_SCOPE.md     ← REFACTORs: idea → scope verificable

    CONTEXT_ANALYSIS.md

    SESSION_SUMMARY.md

    PLAN_ACTUAL.md        ← solo para TRIVIAL

    PENDING_TASKS.md

    HISTORY.log

    HANDOFF.md

    evidence/
    └── PT-XXX/
            screenshots/
            tests/
            logs/
            api/
            reports/
            self-review.md

changes/
└── PT-XXX-slug/          ← Proposal Package (STANDARD y MAJOR)
        design.md
        tasks.md
        spec-changes.md
        test-scenarios.md
        out-of-scope.md
```

---

# Artefactos de Entrada (Estado 1)

El primer artefacto que se genera depende del tipo de solicitud.
El tipo se confirma en Estado 3, pero la señal inicial orienta qué preguntas son útiles.

---

## DISCOVERY.md — Para BUGs

### Propósito

Convertir una observación de fallo en un problema definido y reproducible.

### Tipo

Append-only

### Contenido

```markdown
## PT-201

Date:
2026-06-18

Type:
BUG

Original Request:
"El formulario no guarda"

Expanded Analysis:

### Context

### Location

### Trigger Conditions

### Reproduction Steps

### Expected Result

### Current Result

### Impact

### Affected Users

### Initial Evidence

### Initial Hypotheses
```

### Regla

No puede existir estrategia sin descubrimiento previo.

---

## ENRICHMENT.md — Para FEATUREs / IMPLEMENTACIONEs

### Propósito

Transformar una intención vaga en una especificación técnica verificable antes de cualquier diseño.

Un feature request no se diagnostica. Se expande.

Si no puede completarse el enriquecimiento, la solicitud no está lista para planificarse.

### Tipo

Append-only

### Contenido

```markdown
## PT-202

Date:
2026-06-18

Type:
FEATURE

Original Request:
"Los usuarios necesitan exportar a PDF"

Enrichment:

### What it must do (functional description)

### Acceptance Criteria
- [ ] ...
- [ ] ...

### Test Scenarios

Happy path:
...

Edge cases:
...

Error cases:
...

### Technical Layers Affected
Backend:
Frontend:
API:
Database:
External Services:

### Contract Changes (API / schema / types)

### Non-Functional Requirements
Performance:
Security:
Accessibility:
Logging:

### Out of Scope
- ...
- ...
```

### Regla

Ningún FEATURE puede pasar a CONTEXT_ANALYSIS sin ENRICHMENT completado y sin criterios de aceptación explícitos.

---

## REFACTOR_SCOPE.md — Para REFACTORs

### Propósito

Definir con precisión qué cambia, qué no cambia, la motivación técnica y la barra de calidad.

### Tipo

Append-only

### Contenido

```markdown
## PT-203

Date:
2026-06-18

Type:
REFACTOR

Original Request:
"El módulo de pagos es difícil de mantener"

Scope:

### What changes internally

### What does NOT change (contracts, observable behavior, public interfaces)

### Technical motivation

### Quality bar
Coverage:
Cyclomatic complexity target:
Lines to remove:
Performance:

### Regression risk

### Tests that must exist before starting
```

### Regla

Ningún REFACTOR puede iniciarse si no existe cobertura de tests sobre el código que cambiará.

---

# CONTEXT_ANALYSIS.md

### Propósito

Comprender la arquitectura real antes de diseñar.

### Tipo

Append-only

### Fuentes obligatorias

* Graphify
* Arquitectura
* PRD
* TRD
* Diagramas
* Código relacionado
* Historial de implementación

### Contenido

```markdown
## PT-201

Architecture Analysis

### Components

### Services

### Dependencies

### Data Flow

### Files Involved

### Risk Areas

### Potential Intervention Points

### Existing Constraints
```

### Regla

Ninguna estrategia puede generarse sin análisis arquitectónico.

---

# SESSION_SUMMARY.md

### Propósito

Registrar el estado operativo observado al inicio de cada sesión.

### Tipo

Append-only

### Contenido

```markdown
## Session 2026-06-18

Infrastructure Status

Docker:
...

Database:
...

Services:
...

Build:
...

Known Open Issues:
...

Environment Notes:
...
```

### Regla

Registrar únicamente hechos observados. Nunca suposiciones.

---

# Proposal Package — Para STANDARD y MAJOR

### Propósito

Consolidar todos los artefactos de planificación en una carpeta estructurada antes de abrir cualquier rama.

Es la fuente de verdad durante toda la implementación. Si algo no está aquí, no estaba planificado.

### Tipo

Sobreescribible durante planificación. Append-only (delta) durante implementación.

### Ubicación

```text
changes/[PT-ID]-[slug]/
```

### Estructura

```markdown
## design.md
Decisiones arquitectónicas, alternativas evaluadas, alternativas descartadas y justificaciones.

## tasks.md
Lista atómica de tareas en orden de ejecución.
Cada tarea: objetivo único, entrada, salida esperada, validación.

## spec-changes.md
Cambios en API (endpoints nuevos/modificados), schema, contratos, tipos, eventos.

## test-scenarios.md
Escenarios de test esperados tomados del Enriquecimiento.
Happy path, edge cases, error cases con criterios de aceptación.

## out-of-scope.md
Qué no entra en esta entrega. Explícito y acordado.
```

### Proposal Gate

Antes de abrir la rama, el humano valida el Proposal Package completo.

```text
Proposal Package generado
↓
[ACK HUMANO]
¿El paquete refleja correctamente lo que debe construirse?
↓
Solo tras ACK: git checkout -b [type]/[PT-ID]-[slug]
```

Si el humano rechaza o modifica la propuesta, se vuelve a estrategia o enriquecimiento.
Nunca se abre una rama sobre una propuesta no validada.

### Regla

Para TRIVIAL, `PLAN_ACTUAL.md` es suficiente. Para STANDARD y MAJOR, el Proposal Package reemplaza a PLAN_ACTUAL.md.

---

# PLAN_ACTUAL.md — Solo para TRIVIAL

### Propósito

Representar la estrategia activa aprobada en trabajos de baja complejidad.

### Tipo

Sobreescribible

### Contenido

```markdown
PT-201

Classification:
BUG / TRIVIAL

Objective:
...

Selected Solution:
...

Alternatives Evaluated:
...

Rejected Alternatives:
...

Dependencies:
...

Risks:
...

Success Criteria:
...
```

### Regla

Solo puede existir un plan activo. Para STANDARD y MAJOR usar Proposal Package.

---

# PENDING_TASKS.md

### Propósito

Transformar estrategia en ejecución atómica.

### Tipo

Sobreescribible

### Contenido

```markdown
PT-201.1

Objective:
Identify endpoint

Input:
Discovery + Context Analysis

Expected Output:
Validated endpoint

Validation:
Endpoint confirmed in code and network tab

Status:
PENDING
```

### Estados Permitidos

```text
PENDING
IN_PROGRESS
BLOCKED
DONE
VALIDATION_PENDING
CLOSED
```

### Regla

Toda tarea debe poseer objetivo único, entrada definida, salida definida y validación definida.

---

# Git Workflow

### Convención de ramas

```text
feature/PT-042-user-pdf-export
fix/PT-043-login-redirect-loop
refactor/PT-044-payment-service-split
```

La rama identifica el PT y el slug del Proposal Package. Se abre únicamente tras el Proposal Gate.

### Orden de ejecución obligatorio

El orden produce commits limpios y detecta errores en el punto más barato.

```text
1. git checkout -b [type]/[PT-ID]-[slug]

2. TESTS — escribir primero, todos en rojo
   Si no puedes escribir el test, no entendiste el requisito.
   Commit: test: PT-042 add failing tests for pdf export

3. DOCUMENTATION — stubs antes del contenido
   Commit: docs: PT-042 add documentation stubs for pdf export

4. CODE — implementar hasta que los tests pasen
   Commits atómicos por unidad lógica.
   Commit: feat: PT-042 implement pdf generation service
   Commit: feat: PT-042 add pdf export controller and route

5. TESTING REPORT — ejecutar suite completa, capturar resultado
   Commit: test: PT-042 update testing report, all passing

6. PROPOSAL UPDATE — registrar delta real vs planificado en changes/PT-042/
   Commit: docs: PT-042 update proposal with actual vs planned delta
```

### Commits atómicos

Incorrecto:
```text
git commit -m "fix stuff"
git commit -m "more changes"
git commit -m "final"
```

Correcto:
```text
git commit -m "test: PT-042 add failing tests for PDF export endpoint"
git commit -m "feat: PT-042 implement PDF generation service"
git commit -m "feat: PT-042 add PDF export controller and route"
git commit -m "test: PT-042 all tests passing, update report"
```

### Regla

Nunca un commit "big bang" al final. Cada commit es una unidad lógica verificable y trazable al PT.

---

# HISTORY.log

### Propósito

Registro histórico permanente de todas las actividades.

### Tipo

Append-only

### Formato

```markdown
## 2026-06-18

Sprint S-021

### PT-201

Type:
BUG

Status:
VALIDATION_PENDING

Objective:
...

Branch:
fix/PT-201-form-save-failure

Files Modified:
...

Root Cause:
...

Fix:
...

Delta (real vs planned):
...

Evidence:
docs/implementation/evidence/PT-201/

Related Tasks:
PT-201.1
PT-201.2
PT-201.3
```

### Regla

Nunca eliminar entradas históricas. Nunca reescribir entradas anteriores.

---

# HANDOFF.md

### Propósito

Representar el estado actual del proyecto para la próxima sesión.

### Tipo

Sobreescribible

### Contenido

```markdown
# HANDOFF

Last Update:
2026-06-18

System Status:
...

Active Branch:
...

Completed Implementations:
...

Pending Validations:
...

Open Investigations:
...

Known Risks:
...

Recommended Next Actions:
...
```

### Regla

Debe reflejar exclusivamente el estado actual. No funciona como historial.

---

# Sistema PT

## Identificador

```text
PT-XXX
```

### Reglas

* Monotónico
* Nunca reutilizable
* Permanente
* Independiente del sprint

---

# Clasificación Obligatoria

Cada PT debe pertenecer a una categoría.

## BUG

Funcionalidad existente que dejó de comportarse correctamente.

## FEATURE

Nueva funcionalidad. Requiere ENRICHMENT.md antes de planificarse.

## REFACTOR

Cambio interno sin modificación funcional. Requiere REFACTOR_SCOPE.md antes de planificarse.

## INVESTIGATION

Problema sin causa raíz conocida. No produce código. Se cierra con hallazgos documentados.

---

# Estados del Trabajo

## PENDING — Aún no inicia.
## IN_PROGRESS — Actualmente ejecutándose.
## BLOCKED — Existe impedimento.
## DONE — Implementación finalizada (FEATURE / REFACTOR).
## VALIDATION_PENDING — Esperando validación humana (BUG).
## CLOSED — Validación completada.

---

# Evidencia

## Principio

Código no es evidencia. La ejecución verificable es evidencia.

## Estructura

```text
evidence/
└── PT-201/
        screenshots/
        tests/
        logs/
        api/
        reports/
        self-review.md    ← checklist de self-review completado
```

## Evidencia UI

Debe incluir: antes, después, flujo validado.

## Evidencia Backend

Debe incluir: resultados de pruebas, logs, casos ejecutados.

## Evidencia API

Debe incluir: request, response, resultado esperado.

## Evidencia Integración

Debe incluir: flujo completo, dependencias involucradas.

## Self-Review (self-review.md)

Completado por el agente antes de presentar el trabajo al humano.

```markdown
# Self-Review — PT-XXX

Date: ...

## Checklist

- [ ] Todos los criterios de aceptación del Enriquecimiento están satisfechos
- [ ] El código implementado corresponde al diseño del Proposal Package
- [ ] El delta real vs planificado está documentado en changes/PT-XXX/
- [ ] El testing report muestra cobertura adecuada para los escenarios definidos
- [ ] No hay problemas de seguridad evidentes (inyección, exposición de datos, auth)
- [ ] Los commits son atómicos y siguen la convención de nombres
- [ ] La documentación refleja el estado actual del código
- [ ] Ningún ítem del out-of-scope fue implementado accidentalmente

## Issues Found

(vacío si ninguno)

## Resolution

(vacío si ninguno)
```

El Self-Review no reemplaza la revisión humana. La prepara.

---

# Flujo Operativo Real

```text
Solicitud
↓
Estado 1 — bifurcado por tipo:
  BUG      → DISCOVERY.md
  FEATURE  → ENRICHMENT.md
  REFACTOR → REFACTOR_SCOPE.md
↓
CONTEXT_ANALYSIS.md
↓
SESSION_SUMMARY.md
↓
Clasificación + Estrategia:
  TRIVIAL          → PLAN_ACTUAL.md
  STANDARD / MAJOR → Proposal Package en changes/PT-XXX-slug/
↓
[ACK HUMANO — Proposal Gate]
↓
PENDING_TASKS.md
↓
IMPLEMENTATION con git workflow:
  branch → tests (rojo) → docs stubs → code → tests (verde)
  → testing report → proposal update → commits atómicos
↓
EVIDENCE (screenshots, tests, logs, api, reports)
↓
SELF-REVIEW (self-review.md en evidence/)
↓
VALIDATION:
  BUG      → VALIDATION_PENDING → usuario confirma → CLOSED
  FEATURE  → DONE
  REFACTOR → DONE
↓
HISTORY.log (append)
↓
HANDOFF.md (actualizar)
↓
Graphify (si cambió arquitectura o archivos)
```

---

# Diferenciación de Cierre

## BUG

```text
Implementación
↓
Evidencia
↓
Self-Review
↓
VALIDATION_PENDING
↓
Usuario valida
↓
CLOSED
```

El agente nunca cierra bugs. El usuario confirma.

---

## FEATURE

```text
Enrichment completado
↓
Proposal Package validado (ACK)
↓
Implementación (tests primero)
↓
Tests OK
↓
Self-Review OK
↓
Documentación OK
↓
DONE
```

---

## REFACTOR

```text
Scope definido
↓
Tests de regresión existentes
↓
Implementación
↓
Tests OK (misma cobertura o mayor)
↓
Self-Review OK (sin cambio de comportamiento observable)
↓
DONE
```

---

## INVESTIGATION

```text
Análisis
↓
Conclusión documentada
↓
Hallazgos en DISCOVERY.md o artefacto específico
↓
CLOSED
```

No produce código. Puede derivar en un nuevo PT de tipo BUG, FEATURE o REFACTOR.

---

# Entradas del Framework

Al inicio de cada sesión:

```text
CLAUDE.md
HANDOFF.md
HISTORY.log
DISCOVERY.md / ENRICHMENT.md / REFACTOR_SCOPE.md (el relevante)
CONTEXT_ANALYSIS.md
changes/PT-XXX-slug/ (si hay trabajo en curso)
Arquitectura
PRD
TRD
Graphify
Git Status (rama activa, commits pendientes)
```

---

# Salidas del Framework

Al finalizar una sesión:

```text
Código actualizado (en rama correcta, commits atómicos)
DISCOVERY / ENRICHMENT / REFACTOR_SCOPE actualizado
CONTEXT_ANALYSIS actualizado
Proposal Package actualizado (delta real vs planificado)
PENDING_TASKS actualizado
Evidencias generadas
Self-Review completado
HISTORY.log actualizado (append)
HANDOFF.md actualizado
Graphify actualizado (si aplica)
```

---

# Criterios de Cumplimiento

Una sesión FDGE se considera correcta cuando:

* Existe el artefacto de entrada correcto según el tipo (DISCOVERY / ENRICHMENT / REFACTOR_SCOPE).
* Para FEATUREs: ENRICHMENT incluye criterios de aceptación, escenarios de test y out-of-scope.
* Para REFACTORs: REFACTOR_SCOPE incluye scope, barra de calidad y riesgo de regresión.
* Existe análisis arquitectónico documentado.
* Existe clasificación formal.
* Existe estrategia documentada (Proposal Package o PLAN_ACTUAL según complejidad).
* El Proposal Gate fue aprobado por el humano antes de abrir la rama.
* Los tests fueron escritos antes del código.
* Existe atomización completa.
* Existe evidencia verificable.
* Existe Self-Review completado y documentado.
* Los commits son atómicos, nombrados con convención y trazables al PT.
* Existe actualización de HISTORY.log.
* Existe actualización de HANDOFF.md.
* Los bugs permanecen en VALIDATION_PENDING hasta confirmación humana.

---

# Criterios de Incumplimiento

## Solution First

Diseñar antes de comprender.

---

## Architecture Blindness

Implementar sin Graphify ni arquitectura.

---

## Evidence Missing

No generar evidencia.

---

## Bug Auto-Close

Cerrar bugs sin validación humana.

---

## Memory Driven Development

Actuar desde memoria conversacional.

---

## Phase Collapse

Saltar estados del framework.

---

## Request Waste

Iniciar planificación o implementación sobre una solicitud sin enriquecer.

Un FEATURE sin criterios de aceptación, sin escenarios de test y sin out-of-scope no es una especificación.
Implementarlo sin enriquecer primero produce el rework más caro del ciclo.

---

## Dirty Commit History

Hacer commits "big bang" o con mensajes sin estructura.

Los commits son la trazabilidad del trabajo. Un historial limpio permite auditar, revertir y
entender sin necesidad de leer el chat. Un historial sucio destruye esa capacidad.

---

## Proposal Gate Skip

Abrir una rama sin ACK humano sobre el Proposal Package.

---

# Prompts Operativos

Los prompts copy-paste para cada STATE viven en `docs/methodology/instrucctions.md`.

Al adoptar FDGE en un proyecto nuevo, copia ese archivo a `docs/implementation/instrucctions.md`.
Cada STATE es un bloque independiente que el usuario pega como prompt para activar ese paso.

| STATE | Bloque | Trigger típico |
|:---|:---|:---|
| STATE 0 | Context Refresh | Inicio de sesión |
| STATE 1-B | Discovery & Architecture | `PT-XXX BUG: [descripción]` |
| STATE 1-E | Enrichment & Architecture | `PT-XXX FEATURE: [descripción]` |
| STATE 1-R | Scope & Architecture | `PT-XXX REFACTOR: [descripción]` |
| STATE 1-EXPRESS | TRIVIAL | `PT-XXX TRIVIAL: [descripción]` |
| STATE 2 | Classification & Strategy | ACK al STATE 1 |
| STATE 3 | Atomic Planning & Proposal Package | ACK al STATE 2 |
| STATE 4 | Implementation | ACK al Proposal Package |
| STATE 5 | Evidence & Self-Review | Implementación terminada |
| STATE 6 | Validation Gate | Evidence & Self-Review completos |
| STATE 7 | History & Handoff | Validación completada |

---

# Relación con Auditoría

La auditoría es un sistema independiente.

FDGE produce:

* Artefactos de entrada (DISCOVERY / ENRICHMENT / REFACTOR_SCOPE)
* Análisis arquitectónico
* Proposal Packages
* Planes y tareas
* Evidencias y testing reports
* Self-Reviews
* Resultados y deltas real vs planificado

La auditoría consume esos artefactos para validar calidad, cumplimiento y riesgo.

FDGE construye. La Auditoría verifica.
