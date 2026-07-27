# FDGE — Prompts Operativos por STATE

> Copia y pega el bloque del STATE que quieras ejecutar.
> Cada STATE es secuencial y termina con STOP. No avances sin ACK explícito del humano.
>
> Referencia del método: `docs/methodology/Framework-FDGE.md`
> Referencia de implementación: `docs/methodology/FDGE-Implementation.md`

---

# STATE 0 — Context Refresh

He abierto una nueva sesión de trabajo.

Ejecuta EXCLUSIVAMENTE el STATE 0 (Context Refresh).

## Objetivo

Reconstruir el contexto operativo del proyecto sin realizar planificación, auditorías ni modificaciones.

## Contexto obligatorio

Lee en este orden:

1. `docs/enterprise-documentation/README.md` → índice de la documentación del sistema
2. `docs/implementation/HANDOFF.md` → estado actual del sistema y trabajo en curso
3. `docs/implementation/HISTORY.log` → últimas entradas (los 3 PTs más recientes)
4. El artefacto activo si existe: `DISCOVERY.md` · `ENRICHMENT.md` · `REFACTOR_SCOPE.md`
5. `docs/implementation/CONTEXT_ANALYSIS.md` → análisis arquitectónico vigente
6. `changes/` → si hay algún Proposal Package en vuelo

## REGLAS ESTRICTAS

1. Documentation-First — no inspecciones código fuente salvo que la documentación sea insuficiente.
2. NO diseñes estrategias.
3. NO generes tareas.
4. NO modifiques archivos.
5. NO ejecutes comandos.
6. NO avances automáticamente al STATE 1.

## Entregable

Proporciona únicamente un resumen ejecutivo con:

### Estado General
* Qué es el sistema (2 líneas).
* Estado arquitectónico actual.
* Principales dominios funcionales.

### Estado de la Sesión
* Último PT-XXX conocido.
* Último trabajo registrado.
* Rama activa (si existe).
* Riesgos abiertos e ítems en VALIDATION_PENDING.
* Pendientes conocidos.

### Contexto Recuperado
* Componentes más relevantes para la siguiente tarea.
* Restricciones arquitectónicas críticas (de `11-Conventions.md` o HANDOFF).
* Reglas hard de `11-Conventions.md` que apliquen al trabajo en curso.

### Nivel de Confianza
Alto / Medio / Bajo — según la completitud de la documentación encontrada.

## STOP

Detente inmediatamente después del resumen ejecutivo y espera instrucciones.

Opciones posibles:
* Iniciar STATE 1-B (BUG), STATE 1-E (FEATURE), STATE 1-R (REFACTOR) o STATE 1-EXPRESS (TRIVIAL).
* Solicitar información adicional.
* Finalizar la sesión.

---

# STATE 1-B — Discovery & Architecture (BUG / INVESTIGATION)

Ejecuta EXCLUSIVAMENTE el STATE 1-B (Discovery & Architecture) para el BUG o INVESTIGATION indicado.

## Contexto obligatorio

Antes de cualquier análisis consulta en este orden:

1. `docs/enterprise-documentation/01-Platform-Overview.md`
2. `docs/enterprise-documentation/06-Backend-Architecture.md`
3. `docs/enterprise-documentation/11-Conventions.md`
4. `docs/enterprise-documentation/02-PRD.md`
5. `docs/enterprise-documentation/03-TRD.md`
6. `docs/implementation/HANDOFF.md`
7. `docs/implementation/HISTORY.log` (entradas relacionadas)
8. `graphify-out/` (acoplamiento de los componentes afectados)

Solo consulta código fuente si la documentación no es suficiente.

## REGLAS ESTRICTAS

1. Genera un identificador nuevo: **PT-XXX** (secuencial respecto al último en HISTORY.log).
2. Clasifica complejidad: TRIVIAL · STANDARD · MAJOR.
3. Expande el reporte del bug:
   * **Qué** ocurre exactamente.
   * **Dónde** ocurre (componentes, archivos, líneas si es posible).
   * **Cuándo** ocurre (condiciones, flujos, pasos de reproducción).
   * **Cómo** se manifiesta (síntoma observable).
   * **Por qué** ocurre (hipótesis de causa raíz — con evidencia, no suposición).
4. Documenta:
   * Comportamiento esperado.
   * Comportamiento actual.
   * Usuarios afectados.
   * Impacto de negocio.
5. Consulta Graphify para identificar acoplamiento y radio de impacto.
6. Identifica: componentes afectados · servicios · dependencias · flujos de datos · riesgos · restricciones.
7. Registra nivel de confianza:
   * Root Cause Confidence: __%
   * Architecture Confidence: __%
   * Solution Confidence: __%

## Investigation Gate

Si alguna de estas condiciones existe:
* Causa raíz desconocida.
* Impacto arquitectónico desconocido.
* Dependencias no mapeadas.
* Cualquier confianza por debajo del 70%.

→ Clasifica como INVESTIGATION inmediatamente. La planificación de implementación queda prohibida hasta que la investigación concluya.

## PROHIBIDO

* Diseñar soluciones.
* Modificar código.
* Crear ramas.
* Ejecutar comandos.
* Avanzar al STATE 2.

## Output

Append a `docs/implementation/DISCOVERY.md`:

```
## PT-XXX — [Título breve]
Fecha: YYYY-MM-DD
Tipo: BUG | INVESTIGATION
Complejidad: TRIVIAL | STANDARD | MAJOR

### Expansión
Qué: ...
Dónde: ...
Cuándo: ...
Cómo: ...
Por qué (hipótesis): ...

### Comportamiento esperado
...

### Comportamiento actual
...

### Impacto
Usuarios afectados: ...
Impacto de negocio: ...

### Componentes afectados
...

### Acoplamiento (Graphify)
...

### Nivel de Confianza
Root Cause: __% | Architecture: __% | Solution: __%

### Estado
DISCOVERY_PENDING
```

Append a `docs/implementation/CONTEXT_ANALYSIS.md` con el análisis arquitectónico de este PT.

## STOP

Detente inmediatamente y espera ACK explícito del humano antes de continuar.

---

# STATE 1-E — Enrichment & Architecture (FEATURE)

Ejecuta EXCLUSIVAMENTE el STATE 1-E (Enrichment & Architecture) para el FEATURE indicado.

## Contexto obligatorio

Antes de cualquier análisis consulta en este orden:

1. `docs/enterprise-documentation/02-PRD.md` (casos de uso existentes, usuarios)
2. `docs/enterprise-documentation/06-Backend-Architecture.md`
3. `docs/enterprise-documentation/11-Conventions.md`
4. `docs/enterprise-documentation/01-Platform-Overview.md`
5. `docs/enterprise-documentation/03-TRD.md`
6. `docs/enterprise-documentation/08-API-Catalog.md` (si existe y aplica)
7. `docs/implementation/HANDOFF.md`
8. `graphify-out/` (componentes que el feature tocará)

## REGLAS ESTRICTAS

1. Genera un identificador nuevo: **PT-XXX** (secuencial respecto al último en HISTORY.log).
2. Clasifica complejidad: TRIVIAL · STANDARD · MAJOR.
3. Enriquece la solicitud con:

   **Acceptance Criteria** — lista de criterios medibles y verificables. Cada criterio debe poder responderse con ✓/✗. No se acepta "funciona correctamente"; sí se acepta "El endpoint POST /items retorna 201 con el ID creado cuando el payload es válido".

   **Test Scenarios** — escenarios concretos que cubran:
   * Happy path (flujo ideal).
   * Edge cases (casos límite).
   * Failure cases (errores esperados y cómo los maneja el sistema).

   **NFRs** — restricciones no funcionales: rendimiento, seguridad, accesibilidad, compatibilidad.

   **Out-of-scope** — lista explícita de lo que este PT NO cubre aunque esté relacionado.

4. Consulta Graphify para identificar puntos de integración y componentes afectados.
5. Documenta: componentes tocados · impacto en modelo de datos · riesgos · dependencias · nivel de confianza.

Una solicitud de feature sin Acceptance Criteria, Test Scenarios y Out-of-scope no es una especificación.
Implementarla sin enriquecer primero produce el rework más caro del ciclo.

## PROHIBIDO

* Diseñar la solución técnica.
* Crear el Proposal Package.
* Modificar código.
* Crear ramas.
* Avanzar al STATE 2.

## Output

Crear o sobrescribir `docs/implementation/ENRICHMENT.md`:

```
## PT-XXX — [Título del feature]
Fecha: YYYY-MM-DD
Complejidad: TRIVIAL | STANDARD | MAJOR

### Solicitud original
[Texto exacto del usuario]

### Acceptance Criteria
- [ ] AC-01: ...
- [ ] AC-02: ...
- [ ] AC-03: ...

### Test Scenarios
#### Happy Path
- TS-01: ...

#### Edge Cases
- TS-02: ...

#### Failure Cases
- TS-03: ...

### NFRs
- Rendimiento: ...
- Seguridad: ...

### Out-of-scope (este PT NO cubre)
- ...
- ...

### Componentes afectados
...

### Impacto en modelo de datos
...

### Riesgos
...

### Nivel de Confianza
Architecture: __% | Implementation: __%

### Estado
ENRICHMENT_PENDING
```

Append a `docs/implementation/CONTEXT_ANALYSIS.md` con el análisis arquitectónico de este PT.

## STOP

Detente inmediatamente y espera ACK explícito del humano antes de continuar.

---

# STATE 1-R — Scope & Architecture (REFACTOR)

Ejecuta EXCLUSIVAMENTE el STATE 1-R (Scope & Architecture) para el REFACTOR indicado.

## Contexto obligatorio

Antes de cualquier análisis consulta en este orden:

1. `docs/enterprise-documentation/06-Backend-Architecture.md`
2. `docs/enterprise-documentation/11-Conventions.md`
3. `docs/enterprise-documentation/01-Platform-Overview.md`
4. `docs/enterprise-documentation/03-TRD.md`
5. `docs/implementation/HANDOFF.md`
6. `docs/implementation/HISTORY.log` (refactors anteriores relacionados)
7. `graphify-out/` (acoplamiento del área a refactorizar)

## REGLAS ESTRICTAS

1. Genera un identificador nuevo: **PT-XXX** (secuencial respecto al último en HISTORY.log).
2. Clasifica complejidad: TRIVIAL · STANDARD · MAJOR.
3. Define el scope con precisión:

   **Qué cambia** — lista de archivos, módulos, patrones o estructuras que se modifican.

   **Qué NO cambia** — límite explícito del refactor. Todo lo que está fuera de esta lista no se toca.

   **Barra de calidad** — el umbral medible que demuestra que el refactor está completo.
   Ejemplo: "cobertura de tests ≥ 80% en el módulo refactorizado" o "0 cualquier uso del patrón X detectado por grep".

   **Riesgo de regresión** — comportamientos que deben preservarse exactamente. Cada uno necesita un test que lo certifique antes de empezar.

4. Consulta Graphify para mapear el acoplamiento: qué depende del área a refactorizar.
5. Documenta: cobertura de tests actual vs requerida · estrategia de rollback · breaking changes posibles.

## PROHIBIDO

* Diseñar la implementación técnica del refactor.
* Modificar código.
* Crear ramas.
* Avanzar al STATE 2.

## Output

Crear o sobrescribir `docs/implementation/REFACTOR_SCOPE.md`:

```
## PT-XXX — [Título del refactor]
Fecha: YYYY-MM-DD
Complejidad: TRIVIAL | STANDARD | MAJOR

### Motivación
[Por qué es necesario este refactor]

### Qué cambia
- Archivo/módulo/patrón A: [qué cambia exactamente]
- Archivo/módulo/patrón B: ...

### Qué NO cambia (límite explícito)
- ...
- ...

### Barra de calidad
[Umbral medible que certifica que el refactor terminó]

### Riesgo de regresión
Comportamientos a preservar:
- RC-01: [comportamiento] → Test: [cómo se verifica]
- RC-02: ...

### Acoplamiento (Graphify)
Componentes que dependen del área afectada: ...

### Cobertura de tests actual
[X%] en [módulo]. Requerido: [Y%] antes de empezar.

### Estrategia de rollback
...

### Nivel de Confianza
Architecture: __% | Regression risk: __%

### Estado
SCOPE_PENDING
```

Append a `docs/implementation/CONTEXT_ANALYSIS.md` con el análisis arquitectónico de este PT.

## STOP

Detente inmediatamente y espera ACK explícito del humano antes de continuar.

---

# STATE 1-EXPRESS — TRIVIAL

Ejecuta EXCLUSIVAMENTE el STATE 1-EXPRESS para la tarea TRIVIAL indicada.

STATE 1-EXPRESS condensa STATE 1 + STATE 2 + STATE 3 en un único bloque con un ACK unificado.
Solo aplica para TRIVIAL. Si durante el análisis detectas que la tarea es STANDARD o MAJOR, detente
y reporta — la tarea debe reiniciarse con el STATE 1 correspondiente.

## Contexto obligatorio

1. `docs/enterprise-documentation/11-Conventions.md` (naming, estructura, reglas hard)
2. `docs/implementation/HANDOFF.md`
3. El archivo o componente específico afectado

## REGLAS ESTRICTAS

1. Genera un identificador nuevo: **PT-XXX**.
2. Clasifica como TRIVIAL (si no es TRIVIAL, detente).
3. En un único bloque documenta en `docs/implementation/PLAN_ACTUAL.md`:
   * Qué es exactamente.
   * Archivos afectados.
   * Cambio propuesto (2-3 líneas).
   * Verificación: cómo se comprueba que está hecho.
4. No se requiere Proposal Package completo.
5. No se requieren tests nuevos si el cambio no toca lógica.

## PROHIBIDO

* Modificar código antes del ACK.
* Crear ramas antes del ACK.

## STOP

Presenta el plan resumido y espera ACK explícito del humano.

Tras el ACK: implementa directamente, genera evidencia mínima (screenshot o log de verificación),
registra en HISTORY.log con Delta "según plan", actualiza HANDOFF.md.

---

# STATE 2 — Classification & Strategy

ACK al STATE 1. Avanza EXCLUSIVAMENTE al STATE 2 (Classification & Strategy).

## Contexto obligatorio

1. El artefacto activo del PT: `DISCOVERY.md` · `ENRICHMENT.md` · `REFACTOR_SCOPE.md`
2. `docs/enterprise-documentation/06-Backend-Architecture.md`
3. `docs/enterprise-documentation/11-Conventions.md`
4. `docs/enterprise-documentation/02-PRD.md`
5. `docs/enterprise-documentation/03-TRD.md`
6. `docs/implementation/HANDOFF.md`
7. `graphify-out/` (dependencias del área de cambio)

## REGLAS ESTRICTAS

1. Clasifica formalmente el PT: BUG · FEATURE · REFACTOR · INVESTIGATION.
2. Diseña la estrategia técnica. Secciones obligatorias:
   * **Objetivo** — qué se consigue al terminar.
   * **Solución propuesta** — descripción técnica de qué se hace.
   * **Alternativas consideradas** — al menos 1 alternativa evaluada.
   * **Alternativas rechazadas** — por qué se descartaron.
   * **Dependencias** — qué debe existir o estar resuelto primero.
   * **Riesgos** — qué puede ir mal.
   * **Restricciones** — límites arquitectónicos o de negocio (citar `11-Conventions.md` si aplica).
   * **Criterios de éxito** — cómo se sabe que está terminado (deben derivar de los Acceptance Criteria del ENRICHMENT si es FEATURE).
3. Análisis de regresión obligatorio:
   * Qué puede romperse.
   * Workflows afectados.
   * Servicios afectados.
   * APIs afectadas.
   * Flujos de UI afectados.
   * Riesgos de integridad de datos.
4. Auto-revisión antes de presentar:
   * Buscar contradicciones con la arquitectura.
   * Buscar dependencias faltantes.
   * Evaluar alternativas adicionales.
   * Verificar que no viola ninguna regla de `11-Conventions.md`.

## PROHIBIDO

* Crear el Proposal Package.
* Modificar código.
* Crear ramas.
* Ejecutar comandos.

## Output

Sobrescribir `docs/implementation/PLAN_ACTUAL.md` con la estrategia completa.

## STOP

Detente inmediatamente y espera ACK explícito del humano antes de continuar.

---

# STATE 3 — Atomic Planning & Proposal Package

ACK al STATE 2. Avanza EXCLUSIVAMENTE al STATE 3 (Atomic Planning & Proposal Package).

## Contexto obligatorio

1. `docs/implementation/PLAN_ACTUAL.md` (estrategia aprobada)
2. El artefacto activo: `ENRICHMENT.md` · `DISCOVERY.md` · `REFACTOR_SCOPE.md`
3. `docs/enterprise-documentation/11-Conventions.md` (naming de archivos, branches, commits)
4. `docs/implementation/HISTORY.log` (último PT-XXX para número de rama)

## REGLAS ESTRICTAS

1. Crea el Proposal Package completo en `changes/[PT-XXX]-[slug]/`:

   **`design.md`** — decisiones de arquitectura y su justificación. Por qué esta solución y no otra.

   **`tasks.md`** — lista atómica de tareas. Cada tarea:
   ```
   PT-XXX.1
   Objetivo:    [qué logra esta tarea]
   Input:       [qué necesita]
   Output:      [qué produce]
   Validación:  [cómo se verifica]
   Status:      PENDING
   ```

   **`spec-changes.md`** — cambios en especificación que este PT introduce (PRD, TRD, API, modelo de datos).

   **`test-scenarios.md`** — escenarios de test que verifican los Acceptance Criteria. Para FEATURE: derivar directamente de `ENRICHMENT.md`. Para BUG: el escenario que reproduce el bug debe estar en RED antes del fix.

   **`out-of-scope.md`** — exclusiones explícitas para este PT.

2. Actualiza `docs/implementation/PENDING_TASKS.md` con las tareas del PT-XXX.
3. Propone nombre de rama:
   * BUG → `fix/PT-XXX-slug`
   * FEATURE → `feature/PT-XXX-slug`
   * REFACTOR → `refactor/PT-XXX-slug`
   * INVESTIGATION → `investigate/PT-XXX-slug`

## PROPOSAL GATE — STOP ABSOLUTO

**No se crea ninguna rama. No se modifica ningún archivo de código fuente. No comienza la implementación.**

Espera ACK explícito del humano sobre el Proposal Package completo.

El ACK del Proposal Package es el único evento que autoriza abrir la rama y comenzar el STATE 4.

---

# STATE 4 — Implementation

ACK al Proposal Package. Avanza EXCLUSIVAMENTE al STATE 4 (Implementation).

## Contexto obligatorio

Antes de modificar cualquier archivo de código:

1. `changes/[PT-XXX]-[slug]/design.md`
2. `changes/[PT-XXX]-[slug]/tasks.md`
3. `changes/[PT-XXX]-[slug]/test-scenarios.md`
4. `docs/enterprise-documentation/11-Conventions.md`
5. `graphify-out/` (dependencias de los archivos que vas a tocar)
6. El artefacto activo: `ENRICHMENT.md` · `DISCOVERY.md` · `REFACTOR_SCOPE.md`

## ORDEN DE EJECUCIÓN (estricto)

### 1. Crear la rama

```
feature/PT-XXX-slug
fix/PT-XXX-slug
refactor/PT-XXX-slug
investigate/PT-XXX-slug
```

### 2. Escribir tests PRIMERO (RED)

Los tests deben existir y fallar antes de escribir una sola línea de código de implementación.
Derivar los casos de `changes/[PT-XXX]-[slug]/test-scenarios.md`.
Hacer commit: `test: PT-XXX add failing tests for [descripción]`

### 3. Actualizar documentación in-code (si aplica)

JSDoc, typedoc, comentarios de arquitectura si el cambio los invalida.
Hacer commit: `docs: PT-XXX update [qué se documentó]`

### 4. Implementar código hasta que los tests pasen (GREEN)

Ejecutar tareas en el orden de `tasks.md`.
Actualizar status en `tasks.md` a medida que se completan.

### 5. Ejecutar testing report completo

* Tests unitarios: todos verdes.
* Tests de integración: sin regresiones.
* Cobertura: no baja respecto a la línea base.
* Lint: sin errores nuevos.

### 6. Actualizar `changes/[PT-XXX]-[slug]/tasks.md`

Marcar todas las tareas como DONE.
Registrar en `design.md` cualquier decisión que cambió durante la implementación y por qué.

### 7. Commits atómicos (naming convention obligatorio)

```
feat: PT-XXX [descripción del cambio]
fix: PT-XXX [descripción del fix]
refactor: PT-XXX [descripción del refactor]
test: PT-XXX [descripción del test]
docs: PT-XXX [descripción de la documentación]
```

Un commit = un cambio lógico. Sin commits "WIP", "fix", "changes", "update".

## PROHIBIDO

* Escribir código antes de tener tests en RED.
* Hacer commits que mezclen múltiples cambios lógicos.
* Tocar archivos fuera del scope definido en `tasks.md` y `out-of-scope.md`.
* Actualizar HISTORY.log, HANDOFF.md o DISCOVERY/ENRICHMENT/REFACTOR_SCOPE durante este STATE.

## STOP

Detente cuando la implementación esté terminada (todos los tests en GREEN, commits hechos).
Reporta el estado: tests pasados, archivos modificados, commits realizados.
Espera la orden de avanzar al STATE 5.

---

# STATE 5 — Evidence & Self-Review

Avanza EXCLUSIVAMENTE al STATE 5 (Evidence Generation & Self-Review).

## Contexto obligatorio

1. `changes/[PT-XXX]-[slug]/test-scenarios.md`
2. `docs/implementation/ENRICHMENT.md` o `DISCOVERY.md` (Acceptance Criteria o expected behavior)
3. `docs/enterprise-documentation/11-Conventions.md`

## REGLAS ESTRICTAS

### 1. Generar evidencia

Directorio: `docs/implementation/evidence/PT-XXX/`

**Evidencia técnica** (según tipo de cambio):
* Resultados de tests (salida completa, no solo "pasó").
* Reporte de cobertura.
* Output de build.
* Verificación de BD (si aplica).
* Respuesta de API (si aplica).
* Logs relevantes.

**Evidencia funcional** (según tipo de cambio):
* Screenshots antes/después.
* Validación de flujo completo.
* Verificación de UI/navegación.

El código no es evidencia. La ejecución es evidencia.

### 2. Completar Self-Review

Antes de presentar el trabajo al humano, verifica cada ítem:

- [ ] Todos los Acceptance Criteria del ENRICHMENT.md verificados con evidencia?
- [ ] Todos los Test Scenarios del Proposal Package pasando?
- [ ] Sin efectos secundarios en componentes relacionados (verificado con tests de regresión)?
- [ ] Reglas de `11-Conventions.md` respetadas (naming, estructura, Hard Rules)?
- [ ] Commits atómicos, nombrados con convención y trazables al PT-XXX?
- [ ] Sin artifacts de debugging: console.log, código comentado, TODO sin registrar?
- [ ] Documentación actualizada si cambió una API pública o contrato?
- [ ] Proposal Package actualizado si hubo decisiones que cambiaron respecto al diseño?

### 3. Registrar Self-Review

Crear `docs/implementation/evidence/PT-XXX/self-review.md`:

```
## Self-Review PT-XXX — [Título]
Fecha: YYYY-MM-DD

### Checklist
- [x/] AC verificados con evidencia
- [x/] Test scenarios pasando
- [x/] Sin regresiones en componentes relacionados
- [x/] Conventions respetadas
- [x/] Commits atómicos y nombrados
- [x/] Sin debugging artifacts
- [x/] Documentación actualizada

### Decisiones tomadas durante implementación
[Si hubo cambios respecto al Proposal Package, registrar aquí con justificación]

### Estado
SELF_REVIEW_COMPLETE | SELF_REVIEW_BLOCKERS_FOUND
```

Si se encuentran bloqueadores en el Self-Review: corrígelos antes de continuar.
No presentar trabajo al humano con Self-Review en estado BLOCKERS_FOUND.

## PROHIBIDO

* Actualizar HISTORY.log.
* Actualizar HANDOFF.md.
* Cerrar el PT.

## STOP

Presenta el resumen de evidencia y Self-Review.
Espera la validación del humano (tipo BUG: espera confirmación específica; tipo FEATURE/REFACTOR: espera "ALL GREEN" o equivalente).

---

# STATE 6 — Validation Gate

Avanza EXCLUSIVAMENTE al STATE 6 (Validation Gate).

## Contexto obligatorio

1. `docs/implementation/evidence/PT-XXX/` (evidencia generada)
2. `docs/implementation/evidence/PT-XXX/self-review.md`
3. El artefacto activo del PT

## Cierre según tipo

### BUG

Estado requerido: **VALIDATION_PENDING**

El agente NO puede cerrar bugs. NO puede marcar CLOSED. La confirmación humana es obligatoria.

Flujo: Implementación → Evidencia → **VALIDATION_PENDING** → Validación humana → CLOSED.

Registra en `PENDING_TASKS.md` que el PT está en VALIDATION_PENDING con la evidencia lista.

### FEATURE

Puede marcarse **DONE** únicamente si:
* Todos los tests pasan.
* Evidencia existe y es verificable.
* Todos los Acceptance Criteria confirmados.

### REFACTOR

Puede marcarse **DONE** únicamente si:
* Comportamiento existente preservado (certificado por tests).
* Evidencia existe.
* Barra de calidad de `REFACTOR_SCOPE.md` alcanzada.

### INVESTIGATION

Puede marcarse **CLOSED** una vez que los hallazgos están documentados en `DISCOVERY.md` con conclusiones.

## STOP

Reporta el estado final del PT y espera orden de avanzar al STATE 7.
Para BUG en VALIDATION_PENDING: detente aquí hasta confirmación explícita del humano.

---

# STATE 7 — History & Handoff

Avanza EXCLUSIVAMENTE al STATE 7 (History & Handoff).

## Contexto obligatorio

1. `docs/implementation/HISTORY.log`
2. `docs/implementation/HANDOFF.md`
3. `changes/[PT-XXX]-[slug]/` (para registrar el delta real vs planificado)
4. El artefacto activo del PT

## REGLAS ESTRICTAS

### 1. Append a HISTORY.log

```
## PT-XXX — [Tipo]: [Título]
Fecha: YYYY-MM-DD
Status: DONE | VALIDATION_PENDING | CLOSED
Branch: [feature/fix/refactor/PT-XXX-slug]
Objetivo: [una línea]
Causa raíz: [solo para BUG]
Solución: [qué se hizo]
Archivos modificados:
  - [archivo 1]
  - [archivo 2]
Evidencia: docs/implementation/evidence/PT-XXX/
Delta (real vs planificado): [qué cambió respecto al Proposal Package y por qué. "Según plan" si no hubo desvíos]
PTSA: [H-XXX si este PT cierra un hallazgo de auditoría — omitir si no aplica]
```

HISTORY.log es append-only. Nunca se reescribe ni edita una entrada existente.

### 2. Sobrescribir HANDOFF.md

HANDOFF.md refleja el estado actual del sistema (no el histórico):

```
# HANDOFF — Estado actual
Actualizado: YYYY-MM-DD
Último PT: PT-XXX

## Rama activa
[nombre de rama o "ninguna"]

## Estado del sistema
[descripción breve del estado actual]

## Bugs abiertos (VALIDATION_PENDING)
- PT-XXX: [descripción] — esperando validación humana

## Validaciones pendientes
[lista]

## Investigaciones activas
[lista]

## Riesgos conocidos
[lista]

## Recommended next actions
1. [acción prioritaria]
2. ...
```

### 3. Graphify (condicional)

Si durante este PT se crearon, eliminaron, movieron o renombraron archivos:
Notifícalo explícitamente. El humano ejecutará `/graphify` para actualizar el grafo.

## PROHIBIDO

* Modificar entradas existentes de HISTORY.log.
* Eliminar entradas de HISTORY.log.
* Modificar código.

## STOP

Cierra el ciclo FDGE para PT-XXX.
Presenta el resumen: qué se hizo, estado final, si se necesita actualizar Graphify.
Espera instrucciones para el siguiente PT o para cerrar la sesión.
