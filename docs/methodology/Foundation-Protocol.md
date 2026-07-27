# Foundation Protocol — Ingeniería Inversa de Proyecto

> **Posición:** prerequisito de la suite. Se ejecuta antes de que cualquier framework (FDGE, PTSA, FPGE) pueda operar sobre un proyecto real.
> **Implementación operativa:** [Foundation-Implementation.md](Foundation-Implementation.md)
> **Marcos que lo requieren:** [Framework-FDGE.md](Framework-FDGE.md) · [PTSA/PTSA-V3-Especificacion-Oficial.md](PTSA/PTSA-V3-Especificacion-Oficial.md) · [Framework-FPGE.md](Framework-FPGE.md)

---

## Problema que resuelve

Los tres frameworks de la suite asumen que existe documentación del sistema:

- FDGE State 2 obliga a consultar Graphify, arquitectura, PRD y TRD antes de cualquier implementación.
- PTSA audita contra un dominio definido y convenciones establecidas.
- FPGE prioriza con base en el impacto sobre el sistema real.

Si esa documentación no existe, los frameworks **no fallan explícitamente** — silencian el estado y actúan sobre suposiciones. El agente dice "revisé la arquitectura" sobre el vacío y sigue adelante. Esto produce implementaciones que no respetan el sistema: patrones mezclados, convenciones ignoradas, reglas de negocio violadas.

El Foundation Protocol resuelve esto antes de que el ciclo comience.

---

## Principio central

> **Todo hecho debe derivar del código fuente, las migraciones y los archivos de configuración. Nada se inventa.**

El Foundation Protocol es una auditoría de ingeniería inversa, no una sesión de diseño. Su trabajo es descubrir y documentar lo que ya existe — no proponer lo que debería existir. Las recomendaciones van en el documento de deuda técnica, claramente separadas de los hechos observados.

Este principio tiene una consecuencia directa para el usuario: los documentos generados son comparables con su modelo mental. Si un documento dice algo incorrecto o incompleto, eso revela una discrepancia real entre el código y la intención. Esa discrepancia es información valiosa.

---

## Lo que produce

El Foundation Protocol genera un paquete de documentación en `docs/enterprise-documentation/` que sirve simultáneamente a dos audiencias:

**Para el agente:** contexto verificable que alimenta FDGE State 2, PTSA y FPGE. Sin este paquete, esos frameworks operan en ciego.

**Para el desarrollador/usuario:** documentación legible del sistema real que puede contrastarse con la intención original. Permite detectar:
- Lo que el código hace vs. lo que se pensó que haría
- Convenciones que se aplican inconsistentemente
- Deuda técnica que no estaba registrada en ningún lugar
- Áreas sin documentar que necesitan definición antes de continuar

---

## Documentos generados

### Núcleo (siempre)

| # | Documento | Qué captura |
|:--|:----------|:------------|
| 01 | Platform Overview | Resumen ejecutivo, visión, diagrama de arquitectura, decisiones clave |
| 02 | PRD — Product Requirements | Problema que resuelve, usuarios, casos de uso, reglas de negocio |
| 03 | TRD — Technical Requirements | Stack completo, infraestructura, variables de entorno, comandos |
| 04 | App Flow | Flujos end-to-end con diagramas Mermaid |
| 06 | Backend Architecture | Servicios, rutas, middleware, patrones, entry points |
| 09 | Security Architecture | Auth, autorización, CORS, riesgos de seguridad |
| 10 | Technical Debt & Risks | Deuda técnica conocida, riesgos, gaps de documentación |
| 11 | Conventions | Convenciones de código detectadas, reglas para el agente, restricciones |

### Condicionales (si aplica)

| # | Documento | Condición |
|:--|:----------|:----------|
| 05 | UI/UX Brief | Si existe frontend |
| 07 | Database Architecture | Si existe base de datos |
| 08 | API Catalog | Si existe API HTTP/REST/GraphQL |

### Inventario (siempre)

Archivos de referencia rápida en `docs/enterprise-documentation/inventory/`:

| Archivo | Contenido |
|:--------|:----------|
| `routes.md` | Todas las rutas registradas |
| `endpoints.md` | Catálogo completo de endpoints |
| `entities.md` | Entidades de dominio y su representación en BD |
| `components.md` | Componentes frontend (si aplica) |
| `services.md` | Servicios y helpers backend |
| `integrations.md` | Servicios externos integrados |

### README del paquete

`docs/enterprise-documentation/README.md` — índice del paquete con fecha de generación y scope de análisis.

---

## El documento 11 — Conventions

Este documento no tiene equivalente en documentación técnica tradicional. Es el más crítico para la suite.

Captura lo que el agente necesita saber para no romper el sistema:

### Convenciones de código detectadas
- Estructura de carpetas y su lógica
- Naming: archivos, clases, funciones, variables, tablas, columnas
- Patrones arquitectónicos en uso (BFF, modules, phases, etc.)
- Convenciones de tests: ubicación, naming, tipo

### Reglas para el agente
Restricciones explícitas extraídas del código real:
- Archivos que no deben modificarse sin análisis completo
- Patrones que son el "único válido" en este proyecto
- Antipatrones detectados que deben evitarse
- Dependencias críticas y sus contratos

### Restricciones conocidas
Limitaciones técnicas o de negocio que el agente debe respetar siempre:
- Límites de la infraestructura
- Reglas de dominio que no son negociables
- Compatibilidades hacia atrás que deben preservarse

---

## Cuándo ejecutarse

### Primera vez
Antes de adoptar cualquier framework en un proyecto nuevo o existente.
Si no existe `docs/enterprise-documentation/`, el Foundation Protocol debe ejecutarse antes de la primera sesión FDGE.

### Re-ejecución
El Foundation Protocol no es un documento vivo — es una fotografía del sistema en un momento dado. Debe re-ejecutarse cuando:

- Cambia la arquitectura principal (nuevo servicio, nueva BD, nuevo patrón)
- Se agrega un módulo mayor
- Han pasado más de 3 meses de desarrollo activo sin re-ejecución
- PTSA o FDGE detectan discrepancias con la documentación existente

### Actualizaciones parciales
Entre re-ejecuciones completas, el documento 11 (Conventions) puede actualizarse de forma incremental a medida que FDGE descubre nuevas reglas durante el desarrollo. Esto es normal y deseable.

---

## Posición en el ciclo completo

```
[Foundation Protocol]  ← ejecutar primero, una vez por proyecto
        ↓
    FDGE (construir)   ← State 2 lee enterprise-documentation/
        ↓
    PTSA (auditar)     ← audita contra PRD/TRD/Conventions
        ↓
    FPGE (priorizar)   ← estima impacto con arquitectura conocida
        ↓
    FDGE (siguiente ciclo)
```

Sin Foundation Protocol, los tres frameworks operan sobre suposiciones en lugar de evidencia. Contradicen su propio principio central: Evidence Before Action.

---

## Criterios de compleción

El Foundation Protocol está completo cuando:

1. Todos los documentos del núcleo existen en `docs/enterprise-documentation/`.
2. Cada hecho cita su fuente (archivo, línea o comando que lo evidencia).
3. El documento 11 (Conventions) incluye al menos: estructura de carpetas, naming conventions, y al menos 3 reglas para el agente.
4. El README del paquete registra la fecha de generación y el scope analizado.
5. El desarrollador/usuario ha leído y validado el PRD y el TRD contra su intención original.
6. Las discrepancias encontradas están registradas en el documento 10 (Technical Debt).

El punto 5 es el único que requiere acción humana. El agente genera; el humano valida.

---

## Criterios de fracaso

### Invented Facts
Documentar algo no verificado en el código. Cualquier afirmación que no pueda trazarse a una fuente concreta es inválida.

### Incomplete Conventions
El documento 11 existe pero está vacío o tiene menos de 3 reglas detectadas. Indica que el análisis del código fue superficial.

### No Human Review
El paquete se generó pero el desarrollador no comparó el PRD/TRD con su intención. Sin esa comparación, las discrepancias no se detectan.

### Stale Documentation
El paquete tiene más de 3 meses en un proyecto activo sin re-ejecución. La arquitectura habrá divergido y el agente operará sobre un mapa desactualizado.
