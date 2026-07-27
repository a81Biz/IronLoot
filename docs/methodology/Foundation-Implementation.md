# Foundation-Implementation — Protocolo de Ingeniería Inversa

> Responde: **¿Cómo se ejecuta el Foundation Protocol en un repositorio?**
> Método (filosofía y reglas): [Foundation-Protocol.md](Foundation-Protocol.md)
> Marcos que lo consumen: [FDGE-Implementation.md](FDGE-Implementation.md) · [FPGE-Implementation.md](FPGE-Implementation.md) · [PTSA/PTSA-V3-Especificacion-Oficial.md](PTSA/PTSA-V3-Especificacion-Oficial.md)

---

## Trigger oficial

```
[START FOUNDATION]
```

O con scope personalizado:

```
[START FOUNDATION] scope: src/ + docker-compose.yml + migrations/
```

Si no se especifica scope, el agente analiza desde la raíz del repositorio, priorizando `src/`, archivos de configuración y migraciones. Excluye: `node_modules/`, `dist/`, `build/`, `venv/`, `.git/`, archivos binarios.

---

## Estructura de salida

```
docs/
└── enterprise-documentation/
    ├── README.md
    ├── 01-Platform-Overview.md
    ├── 02-PRD.md
    ├── 03-TRD.md
    ├── 04-App-Flow.md
    ├── 05-UIUX-Brief.md          ← solo si existe frontend
    ├── 06-Backend-Architecture.md
    ├── 07-Database-Architecture.md ← solo si existe BD
    ├── 08-API-Catalog.md           ← solo si existe API HTTP
    ├── 09-Security-Architecture.md
    ├── 10-Technical-Debt.md
    ├── 11-Conventions.md
    └── inventory/
        ├── routes.md
        ├── endpoints.md
        ├── entities.md
        ├── components.md
        ├── services.md
        └── integrations.md
```

**Regla:** si el directorio ya existe, los documentos se SOBRESCRIBEN completamente con el contenido actualizado. No se hace merge. Una re-ejecución es siempre una fotografía fresca.

---

## El proceso paso a paso

### Fase 0 — Reconnaissance (antes de escribir nada)

```
[0.1] Leer el scope completo ANTES de escribir cualquier documento.
      Esta fase no produce output — produce comprensión.

[0.2] Leer en este orden:
      1. README.md raíz (si existe)
      2. CLAUDE.md (si existe) — intención declarada del proyecto
      3. package.json / go.mod / requirements.txt / Cargo.toml → stack
      4. docker-compose.yml / Dockerfile → infraestructura
      5. .env.example → variables de entorno
      6. Archivos de migración o schema de BD → modelo de datos
      7. Entry points: src/index.ts, main.go, app.py, etc.
      8. Estructura de carpetas completa (sin leer cada archivo)
      9. Archivos de rutas / controllers
      10. Archivos de tests (para entender comportamiento esperado)

[0.3] Identificar qué documentos condicionales aplican:
      ¿Hay frontend? → generará 05-UIUX-Brief.md
      ¿Hay BD / migraciones? → generará 07-Database-Architecture.md
      ¿Hay API HTTP? → generará 08-API-Catalog.md

[0.4] Identificar si existen microsites o módulos independientes
      → cada uno puede requerir su propia subcarpeta en inventory/
```

Solo al completar la Fase 0 se empieza a escribir.

---

### Fase 1 — Documentos de contexto

Generados primero porque los demás los referencian.

#### 01-Platform-Overview.md

Fuentes: README, CLAUDE.md, docker-compose.yml, entry points.

```markdown
# 01 — Platform Overview

## Executive Summary
[Qué es el sistema en 2-3 oraciones. Sin inventar — solo lo que el código demuestra.]

## Vision
[Si está declarada en README/CLAUDE.md, citar. Si no está declarada, indicar "No declarada".]

## System Architecture Overview
[Diagrama ASCII o Mermaid del sistema real, derivado de docker-compose.yml y entry points]

## Key Components Detected
[Tabla: componente | tecnología | puerto | responsabilidad]

## Key Architectural Decisions
[Decisiones de diseño evidentes en el código — no especuladas]

## Global Risks
[Riesgos evidentes: sin CI/CD, sin tests, sin logs, etc.]
```

#### 02-PRD.md

Fuentes: README, CLAUDE.md, rutas, modelos de dominio, tests.

```markdown
# 02 — PRD (Product Requirements Document)

## Problem Statement
[Problema que el sistema resuelve, derivado del dominio del código]

## Solution
[Cómo lo resuelve, a nivel funcional]

## Users
[Actores detectados: roles en BD, tipos de auth, personas mencionadas en código/docs]

## Core Use Cases
[Casos de uso principales derivados de las rutas y servicios existentes]

## Business Rules
[Reglas de negocio detectadas en el código: validaciones, state machines, restricciones]

## Out of Scope (detected)
[Qué NO hace el sistema aunque podría esperarse que lo hiciera]
```

#### 03-TRD.md

Fuentes: package.json, docker-compose.yml, .env.example, lockfiles.

```markdown
# 03 — TRD (Technical Requirements Document)

## Architecture Pattern
[Monolito / microservicios / monorepo / serverless — derivado de la estructura real]

## Tech Stack
### Backend
[Tabla: layer | technology | version | role]

### Frontend
[Tabla: layer | technology | version | role — omitir si no hay frontend]

### Infrastructure
[Tabla: component | image | version | role]

## Infrastructure Detail
[Diagrama de red si docker-compose define redes]

## Environment Variables
[Variables de .env.example con descripción de cada una]

## Development Commands
[Comandos de package.json / Makefile / scripts/ para dev, build, test, lint]

## Build & Deploy
[Proceso detectado: CI/CD si existe, build manual si no]

## Observability
[Logging, métricas, health endpoints detectados]
```

---

### Fase 2 — Documentos técnicos

#### 04-App-Flow.md

Fuentes: rutas, controllers, middleware, tests E2E.

```markdown
# 04 — App Flow

## Overview
[Flujo general de una sesión típica de usuario]

## Flow: [Nombre del flujo principal]
[Diagrama Mermaid secuencial]

## Authentication Flow
[Cómo entra un usuario: auth, tokens, sesiones]

## Error Flows
[Qué pasa en los casos de error principales]
```

#### 05-UIUX-Brief.md (condicional)

Fuentes: templates HTML, CSS, componentes frontend, archivos de assets.

```markdown
# 05 — UI/UX Brief

## Frontend Architecture
[Patrón detectado: SPA / SSR / MPA / templates / frameworks]

## Component Inventory
[Lista de componentes/vistas detectados]

## Design System Detected
[Colores, tipografía, utilidades CSS detectados en el código]

## Navigation Structure
[Mapa de navegación derivado de rutas y templates]

## Accessibility Notes
[Lo detectado: alt texts, ARIA, contraste — y lo que falta]
```

#### 06-Backend-Architecture.md

Fuentes: entry points, middleware, servicios, handlers, patrones.

```markdown
# 06 — Backend Architecture

## Entry Point
[Archivo y descripción]

## Middleware Chain
[Orden y responsabilidad de cada middleware]

## Router Map
[Árbol completo de rutas]

## Services
[Tabla: servicio | responsabilidad | dependencias]

## Patterns Detected
[Patrones arquitectónicos identificados con ejemplos del código]

## Shared Utilities
[Helpers, utils, core compartidos]
```

#### 07-Database-Architecture.md (condicional)

Fuentes: migraciones, schema Prisma / Drizzle / SQL, seeds.

```markdown
# 07 — Database Architecture

## Database Engine
[PostgreSQL / MySQL / SQLite / etc. — versión detectada]

## ORM / Query Builder
[Prisma / Drizzle / raw SQL / etc.]

## Schema Overview
[Diagrama ERD en Mermaid]

## Tables
[Por cada tabla: columnas, tipos, constraints, índices, relaciones]

## Migrations Strategy
[Cómo se gestionan las migraciones: archivos detectados, herramienta]

## Seeds
[Datos de seed detectados y su propósito]
```

#### 08-API-Catalog.md (condicional)

Fuentes: archivos de rutas, controllers, schemas de validación, OpenAPI si existe.

```markdown
# 08 — API Catalog

## Base URL
[Derivado de docker-compose / .env.example / README]

## Authentication
[Método y cómo se pasa en las requests]

## Endpoints
[Por cada endpoint: método | path | auth requerida | request body | response | notas]
```

#### 09-Security-Architecture.md

Fuentes: middleware de auth, CORS config, validaciones, .env.example.

```markdown
# 09 — Security Architecture

## Authentication
[Mecanismo: JWT / sessions / OAuth / API keys — con detalles del código]

## Authorization
[Roles, permisos, RLS si aplica]

## CORS
[Política detectada: orígenes permitidos, credenciales]

## Input Validation
[Dónde y cómo se valida el input: schemas, middleware]

## Known Security Risks
[Riesgos detectados: variables hardcodeadas, validaciones ausentes, endpoints sin auth]
```

#### 10-Technical-Debt.md

Fuentes: TODOs en el código, ausencia de tests, gaps detectados en el análisis.

```markdown
# 10 — Technical Debt & Risks

## Known Issues (from code comments)
[TODOs, HACKs, FIXMEs encontrados en el código]

## Missing Documentation
[Qué debería estar documentado y no está]

## Testing Gaps
[Áreas sin cobertura de tests detectadas]

## Infrastructure Risks
[Sin CI/CD, sin backups, dependencias desactualizadas, etc.]

## Remediation Recommendations
[Sugerencias priorizadas — claramente marcadas como recomendaciones, no hechos]
```

---

### Fase 3 — Conventions (el más crítico)

#### 11-Conventions.md

Este documento no describe el sistema — describe **cómo se espera que el agente opere sobre él**.

Fuentes: análisis del código existente para detectar patrones implícitos.

```markdown
# 11 — Conventions (AI Agent Rules)

> Todo agente que trabaje sobre este proyecto DEBE leer este documento antes de modificar código.
> Generado: [fecha] | Revisión: [número]

## Folder Structure Convention
[Explicación de la lógica de la estructura de carpetas detectada]

| Folder | Purpose | Rule |
|--------|---------|------|
| ...    | ...     | ...  |

## Naming Conventions

### Files
[Patrón detectado: kebab-case, camelCase, etc. con ejemplos reales]

### Classes / Types
[Patrón detectado con ejemplos reales]

### Functions / Methods
[Patrón detectado con ejemplos reales]

### Database (tables, columns)
[Patrón detectado con ejemplos reales]

### Test files
[Patrón detectado: *.spec.ts, *.test.ts, __tests__/, etc.]

## Architectural Patterns in Use

[Por cada patrón detectado:]
### [Nombre del patrón]
**Descripción:** [qué es]
**Cómo se implementa aquí:** [con ejemplo real del código]
**Regla:** [qué debe hacer el agente para respetarlo]

## Hard Rules (No Exceptions)

[Lista de restricciones absolutas detectadas del código:]

### RULE-01: [Nombre]
**Descripción:** [qué no hacer]
**Por qué:** [evidencia en el código que lo justifica]
**Correcto:**
```code
[ejemplo correcto]
```
**Incorrecto:**
```code
[ejemplo incorrecto]
```

## Files Requiring Extra Care
[Archivos críticos que no deben modificarse sin análisis completo de impacto]

| File | Why Critical | Before Modifying |
|------|-------------|-----------------|
| ...  | ...         | ...             |

## Delta Log
[Actualizaciones incrementales tras la generación inicial]

| Date | Rule Added/Updated | Triggered By |
|------|-------------------|--------------|
| ...  | ...               | ...          |
```

---

### Fase 4 — Inventario

Archivos de referencia rápida. Generados de forma exhaustiva, sin análisis — solo listado.

#### inventory/routes.md
Todas las rutas del sistema con método, path y controller.

#### inventory/endpoints.md
Todos los endpoints API con firma completa.

#### inventory/entities.md
Todas las entidades de dominio y su representación en BD.

#### inventory/components.md
Todos los componentes/vistas frontend (si aplica).

#### inventory/services.md
Todos los servicios y helpers con su responsabilidad en una línea.

#### inventory/integrations.md
Todos los servicios externos: nombre, SDK, propósito, variables de entorno que usan.

---

### Fase 5 — README del paquete

```markdown
# [Project Name] — Enterprise Documentation

> Generated via reverse-engineering audit of the live repository.
> All facts derive from source code, migrations, and configuration files. Nothing is invented.

## Index
[Tabla de documentos con links]

## Generated
[Fecha] | Scope: [paths analizados]

## Validation Status
[Pendiente de revisión humana / Revisado por [quien] el [fecha]]
```

---

## Regla de citación de fuentes

Cada afirmación en los documentos debe poder trazarse a su fuente. El formato:

```markdown
El backend usa autenticación JWT con un token de vida de 7 días.
`src/api/src/modules/auth/auth.service.ts:47`
```

Si un hecho no puede citarse, no se documenta — se registra como "No determinado" en el documento 10.

---

## ACK humano post-generación

El Foundation Protocol no termina cuando el agente escribe los documentos.

Termina cuando el desarrollador valida:

```
[FOUNDATION VALIDATED]
PRD revisado: ✓ / ✗ [notas]
TRD revisado: ✓ / ✗ [notas]
Conventions revisado: ✓ / ✗ [notas]
Discrepancias encontradas: [lista o "ninguna"]
```

Solo tras este ACK, el proyecto está listo para adoptar FDGE, PTSA y FPGE.

Las discrepancias registradas en el ACK se convierten automáticamente en candidatos para el documento 10 (Technical Debt) y, eventualmente, en ítems de roadmap para FPGE.

---

## Portabilidad

El Foundation Protocol es completamente agnóstico al dominio y al stack. Para ejecutarlo en un proyecto nuevo:

1. Abrir una sesión de Claude Code en la raíz del repositorio.
2. Ejecutar `[START FOUNDATION]`.
3. El agente analiza, genera `docs/enterprise-documentation/`, y se detiene.
4. El desarrollador revisa y valida con `[FOUNDATION VALIDATED]`.
5. El proyecto está listo para FDGE.

No requiere configuración previa. El único prerequisito es tener código.

---

## Integración con Graphify

El Foundation Protocol y Graphify son complementarios, no redundantes:

| Herramienta | Captura | Formato |
|:---|:---|:---|
| **Graphify** | Relaciones entre archivos, comunidades de código, acoplamiento | Grafo interactivo + JSON |
| **Foundation Protocol** | Qué hace el sistema, cómo está construido, qué convenciones usa | Documentos Markdown legibles |

Orden recomendado: ejecutar Graphify primero (el agente puede usar el grafo como mapa durante la Fase 0), luego Foundation Protocol.

FDGE State 2 consume ambos: Graphify para navegar el código, Foundation docs para entender el contexto.
