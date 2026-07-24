# Roadmap y Riesgos de Negocio — IronLoot

| Metadato | Valor |
|---|---|
| **Origen** | Reconstrucción basada en evidencia (deriva del Registro de Hallazgos + ROADMAP/HANDOFF existentes) |
| **Fuente** | `transversal/Registro-de-Hallazgos.md`, `docs/implementation/ROADMAP.md`, `HANDOFF.md`, PTSA |
| **Fecha** | 2026-07-23 |
| **Documentos usados** | 10-Technical-Debt, ROADMAP, HANDOFF, PTSA RESUMEN |
| **Código usado** | (referencias vía hallazgos) |
| **Nivel de confianza** | Alto (riesgos derivados de hallazgos con evidencia); prioridad **Medio** (juicio de negocio) |

## 1. Roadmap propuesto (derivado de hallazgos)

Priorizado por impacto en la operación comercial. **Este roadmap propone; su promoción a trabajo se gobierna por FDGE/FPGE** (no auto-convierte hallazgos en tareas).

### Hito 0 — Operabilidad comercial (bloqueantes)
| # | Iniciativa | Hallazgo | Por qué primero |
|---|---|---|---|
| R-01 | Implementar UI de puja + cliente Socket.io en CLIENT | AUD-002 | Sin esto la característica central no es usable. |
| R-02 | Reparar autenticación de escrituras en CLIENT (proxy BFF) | AUD-003 | Depósito/retiro/crear subasta/disputa no funcionan desde la UI. |
| R-03 | Habilitar facturación CFDI (seleccionar PAC) | AUD-016 | Requisito legal para operar en México. |

### Hito 1 — Integridad financiera y de datos
| # | Iniciativa | Hallazgo |
|---|---|---|
| R-04 | Unificar mecanismo de comisión | AUD-005 |
| R-05 | Migración de reconciliación del esquema (11 tablas + enums) | AUD-001 |
| R-06 | Corregir default de moneda en `payments` | AUD-008 |
| R-07 | Cablear use-cases de core o retirar código muerto | AUD-012 |
| R-08 | Tests de commissions/refunds y cierre/settlement | AUD-013 |

### Hito 2 — Seguridad
| # | Iniciativa | Hallazgo |
|---|---|---|
| R-09 | Endurecer auth admin (sin creds default, throttle) | AUD-004 |
| R-10 | Añadir Helmet/CSP/CSRF a ADMIN | AUD-007 |
| R-11 | Autenticar gateways WebSocket | AUD-006 |
| R-12 | Definir y aplicar postura CSRF unificada | AUD-014 |

### Hito 3 — Reglas de dominio y consistencia
| # | Iniciativa | Hallazgo |
|---|---|---|
| R-13 | Aplicar incremento mínimo de puja | AUD-009 |
| R-14 | Automatizar/mover dinero en resolución de disputa | AUD-010 |
| R-15 | Enrutar mutaciones admin por las FSM | AUD-011 |
| R-16 | Unificar retención de audit (cron único) | AUD-018 |

### Hito 4 — Higiene documental y operativa
Resto de MEDIA/BAJA (AUD-019..036): documentar HeyBanco, unificar SMTP, corregir CI/husky, reconciliar convenciones, limpiar enlaces/código muerto.

## 2. Matriz de riesgos de negocio

Escala: Impacto (1-5) × Probabilidad (1-5).

| ID | Riesgo | Causa (hallazgo) | Imp | Prob | Nivel | Mitigación |
|---|---|---|:--:|:--:|---|---|
| RG-01 | La plataforma no puede cerrar una compra real (puja no usable). | AUD-002 | 5 | 5 | **Crítico** | R-01 |
| RG-02 | Operar sin facturación fiscal (ilegal en MX). | AUD-016 | 5 | 4 | **Crítico** | R-03 |
| RG-03 | Cobro de comisión incorrecto o doble. | AUD-005 | 4 | 4 | **Alto** | R-04, R-08 |
| RG-04 | Despliegue reproducible falla (media BD sin crear). | AUD-001 | 5 | 3 | **Alto** | R-05 |
| RG-05 | Compromiso del backoffice (creds default / sin CSRF). | AUD-004, AUD-007 | 5 | 3 | **Alto** | R-09, R-10 |
| RG-06 | Pérdida financiera por reembolso/comisión sin pruebas. | AUD-013 | 4 | 3 | **Alto** | R-08 |
| RG-07 | Fuga de flujo de pujas por WS sin auth. | AUD-006 | 3 | 3 | **Medio** | R-11 |
| RG-08 | Registros de auditoría truncados antes de tiempo. | AUD-018 | 3 | 3 | **Medio** | R-16 |
| RG-09 | Falsa confianza de calidad (tests de core no ejecutados en prod). | AUD-012 | 3 | 4 | **Medio** | R-07, R-08 |
| RG-10 | Inconsistencia de precio por incremento no aplicado. | AUD-009 | 2 | 3 | **Medio** | R-13 |
| RG-11 | Decisiones basadas en documentación obsoleta/contradictoria. | AUD-014, AUD-020, AUD-021 | 3 | 3 | **Medio** | docs-v2 + FDGE |

## 3. Recomendación de gobierno

1. Tratar RG-01/RG-02 como **bloqueantes de lanzamiento comercial**.
2. Promover R-01..R-03 a FDGE STATE 1 de inmediato (vía `promote FPGE`).
3. Re-auditar (PTSA delta sync) tras cada hito para actualizar el score y este roadmap.
