---
ptsa_version: 3.0
fase: F2
nombre: Alcance
estado: COMPLETADA
ultima_actualizacion: 2026-06-23
confidence: 95
sesion: S-001
---

# F2 — Alcance de Auditoría

**Sistema:** IronLoot v1.0.0  
**Fecha:** 2026-06-23  
**Referencia:** `PTSA/audit-scope.yaml`

---

## 1. ¿Qué está en alcance?

Esta auditoría cubre el sistema IronLoot en su totalidad, primera ejecución completa (sin baseline previo).

| Categoría | Cobertura objetivo | Justificación |
|:---|:---|:---|
| **Productos** | 12/12 (todos) | Primera auditoría — cobertura total exigida |
| **Endpoints REST** | ~84 (todos) | Verificación de reglas de negocio en controladores |
| **Servicios** | 33 (todos — 26 feature + 7 infra) | Trazabilidad completa |
| **Tablas BD** | 27 (todas) | Integridad de esquema y datos financieros |
| **Migraciones** | 12 (todas) | Confrontación con esquema real |
| **Templates** | 68 (todos) | Verificación de flujo de renderizado y exposición de datos |
| **Docs** | PRD, TRD, Security, Backend Architecture | Fidelidad documental crítica |

---

## 2. ¿Qué NO está en alcance?

| Excluido | Razón |
|:---|:---|
| `**/node_modules/**` | Dependencias externas — auditadas separadamente por vuln scanner |
| `**/dist/**` | Artefactos de build — derivados del código fuente |
| `**/*.test.ts` / `**/*.spec.ts` | Los tests son evidencia de D2, no producto auditable |
| `graphify-out/**` | Artefactos de análisis, no código de producción |
| `docs/methodology/**` | Documentación de metodología, no del producto |
| `docs/implementation/**` | Artefactos FDGE, no del producto |
| `changes/**` | Propuestas de implementación pendientes |
| Prompts LLM | NO_APLICA — sistema determinístico sin IA |
| Guardrails IA (Nivel 4) | NO_APLICA — sistema determinístico sin IA |

---

## 3. Cobertura objetivo por categoría

```yaml
coverage_targets:
  products: 12/12
  endpoints: ~84/84
  services: 33/33
  tables: 27/27
  migrations: 12/12
  templates: 68/68
  docs: [PRD, TRD, Security-Architecture, Backend-Architecture, CLAUDE.md]
```

---

## 4. Limitaciones declaradas

| ID | Limitación | Impacto en Confidence |
|:---|:---|:---|
| **LIM-001** | Sin acceso a BD real (BLQ-001) — F5 usará schema.prisma como segunda mano | Reduce `autonomy` en Confidence score |
| **LIM-002** | Sin logs en vivo (BLQ-002) — F8 basada en análisis de código de observabilidad | Reduce `autonomy` en Confidence score |
| **LIM-003** | Métricas D5 (Success/Retry/Failure Rate) no medibles sin runtime activo | D5 evaluada desde configuración, no desde datos reales |

Estas limitaciones reducen el factor `autonomy` del Confidence Score pero no bloquean la auditoría.

---

## Checklist F2 ✅

- [x] `auditable_patterns` declarados (en `audit-scope.yaml`)
- [x] `ignore_patterns` declarados
- [x] Cobertura objetivo por categoría declarada
- [x] Limitaciones de esta ejecución declaradas (LIM-001 a LIM-003)

**Estado: COMPLETADA** | Confidence: 95%

---

## Update U-006 — S-002 (2026-07-27): dos huecos del alcance, uno de ellos caro

### 1. `.github/workflows/**` no estaba en el alcance

`auditable_patterns` cubre el código, el esquema, las migraciones, la infraestructura de
`docker-compose` y cinco documentos. **No cubre el pipeline.** Por eso H-015 —un job de CI que no
puede terminar en verde y que bloquea `build` y `docker`— no lo encontró ninguna de las nueve
sesiones anteriores.

Es exactamente lo que PT-118 dejó escrito sobre H-008: un área que nadie mira acaba dando por
cubierto lo que no lo está. Allí el mecanismo estaba declarado y no existía; aquí ni siquiera
estaba declarado.

**Se añade `.github/workflows/**` a `auditable_patterns`.**

### 2. `src/api/scripts/*.sh` tampoco

El fichero que aplica el esquema de la base en cada arranque —`entrypoint.dev.sh`— estaba fuera del
alcance. Es la causa directa de H-014. **Se añade `src/api/scripts/**`.**

### 3. Las cifras de `coverage_targets` estaban viejas

Declaraban 27 modelos, 12 migraciones y ~84 endpoints. El recuento real (F0, U-006) da 33, 23 y
159. Se corrigen. Los objetivos siguen siendo `all`; lo que cambia es contra qué se mide ese `all`.

### Lo que sigue fuera, a propósito

`node_modules`, `dist`, ficheros de prueba, `graphify-out`, `docs/methodology`,
`docs/implementation`, `PTSA/**` y `changes/**`. Sin cambios.
