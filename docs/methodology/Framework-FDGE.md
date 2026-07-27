# Framework de Desarrollo Gobernado por Evidencia (FDGE)

## Filosofía

El desarrollo de software asistido por IA presenta un problema fundamental:

> La IA puede implementar más rápido de lo que puede comprender.

Cuando esto ocurre, los errores dejan de ser fallos de programación y se convierten en fallos de interpretación.

La mayoría de regresiones, deuda técnica y soluciones incorrectas no nacen de código defectuoso.

Nacen porque se implementó una solución para un problema mal entendido.

Por esta razón el framework establece un principio central:

### Ninguna implementación puede comenzar antes de existir evidencia suficiente de comprensión.

Y ninguna tarea puede cerrarse antes de existir evidencia suficiente de validación.

---

# Principios Fundamentales

## 1. Discovery Before Design

La solicitud del usuario nunca se considera una especificación.

Es únicamente una señal inicial.

Toda solicitud debe expandirse hasta convertirse en un problema claramente definido.

---

## 2. Architecture Before Solution

Ninguna solución puede diseñarse sin comprender:

* dónde ocurre
* por qué ocurre
* qué componentes participan
* qué dependencias existen

Graphify y la documentación arquitectónica son fuentes obligatorias.

---

## 3. Evidence Before Action

Toda decisión técnica debe apoyarse en evidencia verificable.

Nunca en:

* memoria del agente
* intuición
* suposiciones
* contexto conversacional

---

## 4. Human Governance

La IA ejecuta.

El humano gobierna.

Las transiciones importantes requieren validación explícita.

---

## 5. Atomic Execution

La implementación nunca ocurre sobre problemas ambiguos.

Toda acción debe ser reducible a una unidad verificable.

---

## 6. Evidence After Execution

Toda modificación debe producir evidencia.

El código no es evidencia.

La ejecución verificable sí.

---

## 7. Session Independence

Ninguna sesión debe depender de la memoria del agente.

Todo conocimiento debe persistir en artefactos.

---

## 8. Minimal Intervention

Antes de cualquier acción, la pregunta es: ¿cuál es el punto más temprano donde puedo detectar que esto está mal?

El orden correcto de costo creciente es:

```
Enriquecimiento → Tests → Self-review → Revisión humana → Rework
```

Nunca ir al paso más caro si el problema puede detectarse en uno más barato.

Un request sin criterios de aceptación, sin escenarios de test y sin out-of-scope definido
no es una especificación. Es ruido con intención. Implementarlo es el desperdicio más caro del ciclo.

---

# Clasificación de Complejidad

Antes de recorrer los estados, toda solicitud se clasifica por complejidad.
La clasificación decide cuánto se puede condensar el recorrido — nunca qué se puede omitir.

| Complejidad | Ejemplos | Recorrido |
|:---|:---|:---|
| **TRIVIAL** | Typo, etiqueta, reemplazo de texto, ajuste CSS simple, contenido estático | Descubrimiento + verificación mínima de arquitectura + implementación + evidencia + persistencia. Estrategia y atomización se condensan en un bloque. |
| **STANDARD** | Bug típico, cambio CRUD, regla de negocio, validación | Recorrido completo. |
| **MAJOR** | Módulo nuevo, workflow nuevo, cambio arquitectónico, rediseño de BD, feature multi-componente | Recorrido completo + análisis de riesgo + análisis de regresión + revisión de arquitectura obligatorios. |

**Condensar no es colapsar.** En TRIVIAL los estados ocurren igual y se documentan igual;
solo se agrupan en menos bloques y menos gates de ACK. Omitir un estado —descubrimiento,
evidencia, validación o persistencia— está prohibido en cualquier complejidad.

---

# Investigation Gate

Si en cualquier punto previo a la estrategia se cumple alguna de estas condiciones:

* Causa raíz desconocida
* Impacto arquitectónico desconocido
* Dependencias desconocidas
* Confianza por debajo del 70% (Root Cause / Architecture / Solution)

El trabajo se reclasifica inmediatamente como **INVESTIGACIÓN**.

La planificación de implementación queda prohibida hasta que la investigación produzca
evidencia suficiente para elevar la confianza por encima del umbral. Una investigación se
cierra (`CLOSED`) cuando sus hallazgos están documentados — no produce código.

---

# Estados Cognitivos

## Estado 0 — Solicitud

Entrada:

```text
"el formulario falla"
"necesito que los usuarios puedan exportar a PDF"
"el módulo de pagos es difícil de mantener"
```

Todavía no existe un problema definido.

Sólo existe una observación o intención.

---

## Estado 1 — Descubrimiento / Enriquecimiento

Este estado se bifurca según el tipo de trabajo detectado en la señal inicial.
El tipo no se confirma formalmente hasta Estado 3, pero la naturaleza de la solicitud
determina qué preguntas son útiles aquí.

---

### Estado 1-B — Descubrimiento (BUG)

Objetivo: transformar una observación de fallo en una definición precisa.

Responder:

#### Qué ocurre
#### Dónde ocurre
#### Cuándo ocurre
#### Cómo se reproduce
#### Qué debería pasar
#### Qué ocurre realmente
#### Impacto
#### Usuarios afectados
#### Evidencia inicial

**Salida:** Documento de Descubrimiento.

---

### Estado 1-E — Enriquecimiento (FEATURE / IMPLEMENTACIÓN)

Objetivo: transformar una intención vaga en una especificación técnica verificable.

Un feature request no se diagnostica — se expande.

Responder:

#### Qué debe hacer exactamente

Descripción funcional precisa de la capacidad a construir.

#### Criterios de aceptación

Lista explícita de condiciones que deben cumplirse para considerar el trabajo terminado.
Cada criterio debe ser verificable, no subjetivo.

```text
✓ El usuario puede exportar a PDF desde la vista de detalle
✓ El PDF incluye los campos: nombre, fecha, total
✓ El archivo se descarga con nombre [id]-[fecha].pdf
✓ Si el registro no existe, retorna 404 con mensaje en JSON
```

#### Escenarios de testing

Happy path, edge cases y casos de error anticipados.

```text
Happy path: usuario autenticado con registro válido → descarga PDF
Edge case: registro sin campos opcionales → PDF se genera sin esos campos
Error: usuario no autenticado → 401
Error: registro inexistente → 404
```

#### Capas técnicas afectadas

Backend, frontend, API, base de datos, servicios externos.

#### Cambios en contratos

APIs nuevas o modificadas, cambios de schema, eventos, tipos.

#### Requisitos no funcionales

Performance, seguridad, accesibilidad, logging, auditoría.

#### Out of scope

Qué no entra en esta entrega. Explícito y acordado.

```text
OUT: notificaciones por email al exportar
OUT: exportación en formato Excel
OUT: historial de exportaciones del usuario
```

**Salida:** Documento de Enriquecimiento (`ENRICHMENT.md`).

El enriquecimiento es el gate más barato del ciclo. Si no puede completarse,
la solicitud no está lista para diseñarse.

---

### Estado 1-R — Scope Definition (REFACTOR)

Objetivo: definir con precisión qué mejora, qué no cambia y cuál es la barra de calidad.

Responder:

#### Qué cambia internamente

Qué estructura, abstracción o patrón se modifica.

#### Qué no cambia

Contratos externos, comportamiento observable, interfaces públicas.

#### Motivación técnica

Por qué el estado actual es insostenible o subóptimo.

#### Barra de calidad

Métricas concretas que definen éxito: cobertura de tests, reducción de complejidad ciclomática,
tiempo de respuesta, líneas eliminadas, etc.

#### Riesgo de regresión

Qué puede romperse. Qué tests deben existir antes de empezar.

**Salida:** Documento de Scope (`REFACTOR_SCOPE.md`).

---

## Estado 2 — Comprensión Arquitectónica

Objetivo: entender el sistema antes de diseñar.

Obligatorio consultar:

### Graphify
### PRD
### TRD
### Arquitectura
### Documentación relevante

---

Responder:

### Componentes afectados
### Dependencias
### Flujo afectado
### Riesgos
### Posibles puntos de intervención

---

**Salida:** Mapa Arquitectónico del Problema.

---

## Estado 3 — Clasificación

El trabajo debe clasificarse obligatoriamente.

### Bug

Algo existente dejó de funcionar.

### Implementación

Algo nuevo debe construirse.

### Refactor

Mejora interna sin cambio de comportamiento observable.

### Investigación

Aún no existe causa conocida.

---

La clasificación determina el ciclo posterior.

---

## Estado 4 — Estrategia

Objetivo: diseñar el camino correcto.

Debe incluir:

### Alternativas consideradas
### Alternativas descartadas
### Riesgos
### Dependencias
### Criterios de éxito

---

**Salida:** Plan Estratégico.

---

## Estado 5 — Atomización y Proposal Package

Objetivo: convertir la estrategia en tareas ejecutables y consolidar todos los artefactos
de planificación en un paquete de propuesta antes de abrir cualquier rama.

Ninguna tarea debe contener múltiples objetivos.

---

Ejemplo:

Incorrecto:

```text
Corregir formulario
```

Correcto:

```text
Identificar endpoint
Validar payload
Corregir validación
Crear test
Ejecutar test
```

---

### Proposal Package

Para trabajos STANDARD y MAJOR, la atomización produce una carpeta de propuesta:

```
changes/[PT-ID]-[slug]/
  ├── design.md          ← decisiones arquitectónicas y alternativas descartadas
  ├── tasks.md           ← lista atómica de tareas con orden de ejecución
  ├── spec-changes.md    ← cambios en API, schema, contratos, tipos
  ├── test-scenarios.md  ← escenarios de test esperados (del Enriquecimiento)
  └── out-of-scope.md    ← qué no entra en esta entrega (del Enriquecimiento)
```

Para TRIVIAL, `PLAN_ACTUAL.md` es suficiente.

Esta carpeta es la fuente de verdad durante toda la implementación.
Si algo no está en ella, no estaba planificado.

---

### Proposal Gate — ACK humano obligatorio

Antes de abrir la rama, el humano valida el Proposal Package completo.

```text
Proposal Package generado
↓
[ACK HUMANO] — ¿El paquete refleja correctamente lo que debe construirse?
↓
Solo tras ACK: se abre la rama
```

Si el humano rechaza o modifica la propuesta, se vuelve a Estado 4 o Estado 1-E.
Nunca se abre una rama sobre una propuesta no validada.

Este gate es la inversión más eficiente del ciclo:
corregir una propuesta cuesta tokens. Corregir código implementado cuesta tiempo, tokens y contexto.

---

**Salida:** Proposal Package en `changes/[PT-ID]-[slug]/` + `PENDING_TASKS.md`.

---

## Estado 6 — Implementación con Git Workflow

Recién aquí se permite modificar código.

Antes de este punto:

```text
0 líneas modificadas
0 ramas abiertas
```

---

### Convención de ramas

```
feature/PT-042-user-pdf-export
fix/PT-043-login-redirect-loop
refactor/PT-044-payment-service-split
```

La rama identifica el PT y el slug del Proposal Package.

---

### Orden de ejecución dentro de la implementación

El orden no es sugerido. Es obligatorio. Produce commits limpios y detecta errores
en el punto más barato.

```
1. git checkout -b [type]/[PT-ID]-[slug]

2. TESTS — escribir primero, todos en rojo
   Si no puedes escribir el test, no entendiste el requisito.
   Commit: test: [PT-ID] add failing tests for [feature]

3. DOCUMENTATION — stubs y estructura antes del contenido
   Commit: docs: [PT-ID] add documentation stubs for [feature]

4. CODE — implementar hasta que los tests pasen
   Commits atómicos por unidad lógica, no "big bang" al final.
   Commit: feat/fix/refactor: [PT-ID] [descripción específica]

5. TESTING REPORT — ejecutar suite completa, capturar resultado
   Commit: test: [PT-ID] update testing report

6. PROPOSAL UPDATE — registrar delta real vs planificado en changes/[PT-ID]/
   Commit: docs: [PT-ID] update proposal with actual vs planned delta
```

---

### Commits atómicos

Cada commit representa una unidad de cambio verificable.

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

---

## Estado 7 — Evidencia

Toda implementación debe demostrar resultados.

---

### Backend

* tests
* logs
* respuestas

---

### API

* request
* response

---

### UI

* screenshots
* navegación

---

### Integración

* flujo completo

---

La evidencia debe almacenarse en `docs/implementation/evidence/PT-XXX/`.

---

## Estado 7.5 — Self-Review

Antes de presentar el trabajo al humano, el agente ejecuta una revisión estructurada.

El objetivo es filtrar lo que el agente puede detectar por sí mismo,
para que la revisión humana se concentre en decisiones de negocio y no en errores técnicos evitables.

---

### Checklist de Self-Review

```
□ ¿Todos los criterios de aceptación del Enriquecimiento están satisfechos?
□ ¿El código implementado corresponde al diseño del Proposal Package?
□ ¿El delta real vs planificado está documentado en changes/[PT-ID]/?
□ ¿El testing report muestra cobertura adecuada para los escenarios definidos?
□ ¿Hay problemas de seguridad evidentes? (inyección, exposición de datos, auth)
□ ¿Los commits son atómicos y siguen la convención de nombres?
□ ¿La documentación refleja el estado actual del código?
□ ¿Algún ítem del out-of-scope fue implementado accidentalmente?
```

Si algún punto falla, se corrige antes de pasar al Estado 8.

El Self-Review no reemplaza la revisión humana. La prepara.

---

**Salida:** Self-Review completado y documentado en evidencia.

---

## Estado 8 — Validación

Aquí el flujo se divide.

---

### Si es Bug

NO cerrar.

Esperar validación del usuario.

```text
Bug corregido
↓
Evidencia generada
↓
Self-Review completado
↓
Usuario confirma
↓
Cerrar
```

---

### Si es Implementación

Puede cerrarse técnicamente.

```text
Implementado
↓
Tests correctos
↓
Self-Review completado
↓
Documentado
↓
Cerrar
```

La validación funcional puede convertirse en una tarea posterior.

---

## Estado 9 — Persistencia

Objetivo: garantizar que el trabajo sobrevive a la sesión (principio 7 — Session Independence).

Ninguna tarea termina hasta que su conocimiento queda fuera del chat, en artefactos.

---

Acciones:

### Append a HISTORY.log

* identificador PT
* tipo
* estado
* causa raíz
* solución
* archivos modificados
* rama git
* ubicación de la evidencia
* delta real vs planificado (resumen de una línea)

HISTORY.log es append-only. Nunca se reescribe.

### Actualizar HANDOFF.md

* estado actual del sistema
* bugs abiertos
* validaciones pendientes
* investigaciones activas
* riesgos
* siguientes acciones recomendadas

HANDOFF.md representa únicamente el estado actual.

### Actualizar el grafo de conocimiento

Si se crearon, eliminaron o renombraron archivos, o cambió la arquitectura:
actualizar Graphify sobre `/src` (nunca sobre la raíz del repositorio).

### Archivar Proposal Package

Mover o marcar como `CLOSED` la carpeta `changes/[PT-ID]-[slug]/`
para que el historial de propuestas sea navegable.

---

**Salida:** Artefactos de persistencia actualizados.

Sin este estado, el trabajo existe pero no es recuperable por una sesión futura.

---

# Contrato de Evidencia

Una tarea no existe como completada hasta que existe evidencia.

Código sin evidencia:

```text
Estado = INCOMPLETO
```

---

Código con evidencia:

```text
Estado = IMPLEMENTADO
```

---

Código validado:

```text
Estado = CERRADO
```

---

## Vocabulario canónico de estados

Los estados informales del contrato anterior (INCOMPLETO / IMPLEMENTADO / CERRADO) son una
narrativa conceptual. Los **valores de estado canónicos** que se escriben en `PENDING_TASKS.md`,
`HISTORY.log` y `HANDOFF.md` son los definidos en CLAUDE.md:

`PENDING` · `IN_PROGRESS` · `BLOCKED` · `DONE` · `VALIDATION_PENDING` · `CLOSED`

Traducción entre ambos:

| Contrato conceptual | Estado canónico | Cuándo |
|:---|:---|:---|
| INCOMPLETO | `PENDING` / `IN_PROGRESS` / `BLOCKED` | Tarea sin evidencia suficiente |
| IMPLEMENTADO | `DONE` (FEATURE/REFACTOR) · `VALIDATION_PENDING` (BUG) | Con evidencia técnica; un bug NUNCA pasa directo a `DONE` |
| CERRADO | `CLOSED` | BUG tras validación humana · INVESTIGACIÓN tras documentar hallazgos |

Regla dura: un **BUG** nunca se marca `DONE` ni `CLOSED` por el agente. Pasa a
`VALIDATION_PENDING` y solo el humano lo lleva a `CLOSED`.

---

# Relación con Auditoría

La auditoría NO forma parte del framework.

La auditoría es externa.

La auditoría consume:

* descubrimientos y enriquecimientos
* proposal packages
* planes y tareas
* evidencias y testing reports
* resultados y deltas real vs planificado

El framework produce.

La auditoría verifica.

---

# Mapa a la Implementación

Este documento es la definición **conceptual** del método (estados cognitivos finos, Estado 0–9).
Su materialización operativa en este repositorio vive en dos archivos:

| Archivo | Rol |
|:---|:---|
| `CLAUDE.md` § "Operational Mode: FDGE" | Ruleset vinculante en vigor (autoridad operativa) |
| `docs/implementation/instrucctions.md` | Prompts copy-paste que ejecutan cada STATE, con sus gates de ACK |
| `docs/implementation/Implementation.md` | Referencia técnica del sistema (lo que el descubrimiento debe respetar) |

El recorrido operativo agrupa los estados cognitivos en **STATEs**. Esta es la equivalencia canónica:

| Estado cognitivo (este documento) | STATE operativo | Artefacto principal |
|:---|:---|:---|
| Estado 0 — Solicitud | *(entrada — implícito)* | — |
| Estado 1-B — Descubrimiento (BUG) | **STATE 1** — Discovery & Architecture | DISCOVERY.md, CONTEXT_ANALYSIS.md |
| Estado 1-E — Enriquecimiento (FEATURE) | **STATE 1** — Enrichment & Architecture | ENRICHMENT.md, CONTEXT_ANALYSIS.md |
| Estado 1-R — Scope Definition (REFACTOR) | **STATE 1** — Scope & Architecture | REFACTOR_SCOPE.md, CONTEXT_ANALYSIS.md |
| Estado 2 — Comprensión Arquitectónica | **STATE 1** (continúa) | SESSION_SUMMARY.md |
| Estado 3 — Clasificación + Estado 4 — Estrategia | **STATE 2** — Classification & Strategy | PLAN_ACTUAL.md |
| Estado 5 — Atomización + Proposal Package | **STATE 3** — Atomic Planning & Proposal | `changes/[PT-ID]/`, PENDING_TASKS.md |
| *(Proposal Gate — ACK humano)* | **[ACK]** | — |
| Estado 6 — Implementación (git workflow) | **STATE 4** — Implementation | Código en `src/`, commits atómicos |
| Estado 7 — Evidencia | **STATE 5** — Evidence Generation | `docs/implementation/evidence/PT-XXX/` |
| Estado 7.5 — Self-Review | **STATE 5** (cierre) | Self-Review checklist en evidencia |
| Estado 8 — Validación | **STATE 6** — Validation Gate | (cambio de estado de la tarea) |
| Estado 9 — Persistencia | **STATE 7** — History & Handoff | HISTORY.log, HANDOFF.md |

Agrupar varios estados cognitivos en un STATE operativo está permitido (es condensar).
Saltarse un estado cognitivo está prohibido (es colapsar). Ver CLAUDE.md § "No Phase Collapse".

Para TRIVIAL existe además el atajo **STATE 1-EXPRESS** (en `instrucctions.md`), que fusiona
STATE 2 y STATE 3 en un bloque y un solo ACK, sin omitir evidencia ni persistencia.

---

# Criterios de Éxito

* Toda solicitud fue expandida o enriquecida antes de diseñarse.
* Toda implementación tuvo análisis arquitectónico previo.
* Toda feature tuvo criterios de aceptación y out-of-scope definidos antes de planificarse.
* Toda tarea fue atomizada.
* Toda implementación comenzó con tests en rojo.
* Toda modificación produjo evidencia.
* Todo trabajo pasó Self-Review antes de revisión humana.
* Ningún bug fue cerrado sin validación del usuario.
* Toda implementación fue documentada.
* Los commits son atómicos, nombrados y trazables al PT.
* Cualquier sesión futura puede reconstruir completamente el trabajo realizado.

---

# Criterios de Fracaso

## Solution First

Diseñar antes de comprender.

---

## Architecture Blindness

Modificar código sin consultar Graphify ni arquitectura.

---

## Evidence Missing

Implementar sin demostrar.

---

## Bug Premature Closure

Cerrar bugs sin validación del usuario.

---

## Memory Driven Development

Actuar sobre recuerdos en lugar de evidencia.

---

## Phase Collapse

Saltar estados cognitivos.

---

## Request Waste

Iniciar el diseño o la implementación sobre una solicitud sin enriquecer.

Un request sin criterios de aceptación, sin escenarios de test y sin out-of-scope definido
no es una especificación. Implementarlo sin enriquecer primero es el desperdicio más caro del ciclo:
se construye rápido, se construye mal, y el costo de corregirlo es mayor que el costo de haber
enriquecido al inicio.

---

## Dirty Commit History

Hacer commits "big bang" o con mensajes sin estructura.

Los commits son la trazabilidad del trabajo. Un historial limpio permite auditar, revertir y
entender sin necesidad de leer el chat. Un historial sucio destruye esa capacidad.
