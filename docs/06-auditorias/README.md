# 06 - Auditorías

Esta sección contiene el **historial de auditorías técnicas** del proyecto IronLoot.

Las auditorías se realizan periódicamente para verificar la calidad del código, la cobertura de tests, la documentación y el cumplimiento de estándares.

---

## Historial de Auditorías

| Versión | Fecha | Calificación | Estado |
|---------|-------|--------------|--------|
| [v0.1.1](./audit-v0.1.1.md) | 2026-01-06 | 9.1/10 | ✅ Aprobada |

---

## Metodología

Cada auditoría evalúa las siguientes áreas:

| Área | Peso | Descripción |
|------|------|-------------|
| Arquitectura | 15% | Estructura de módulos, separación de responsabilidades |
| Código | 20% | Calidad, consistencia, errores |
| Tests | 20% | Cobertura unitaria y E2E |
| Observabilidad | 10% | Logging, métricas, trazabilidad |
| Documentación | 15% | README, docs internos, API docs |
| DevOps | 10% | CI/CD, Docker, deployment |
| Seguridad | 10% | Autenticación, autorización, headers |

---

## Proceso de Auditoría

1. **Extracción**: Se obtiene la última versión del código
2. **Análisis estático**: Revisión de estructura, imports, dependencias
3. **Verificación de tests**: Ejecución y cobertura
4. **Revisión de documentación**: Completitud y actualización
5. **Checklist de seguridad**: Headers, auth, rate limiting
6. **Generación de informe**: Documento con hallazgos y recomendaciones

---

## Convención de Nombres

```
audit-v{VERSION}.md
```

Ejemplo: `audit-v0.1.1.md`, `audit-v0.2.0.md`

---

## Relación con Versionado

La versión de la auditoría corresponde a la versión del proyecto en `package.json` al momento de realizar la auditoría.

Cuando una auditoría detecta issues críticos, estos deben resolverse antes de incrementar la versión del proyecto.
