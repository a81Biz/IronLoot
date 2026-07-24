# Resumen Ejecutivo — Auditoría Documental IronLoot (Fases 1–5)

| Metadato | Valor |
|---|---|
| **Fecha** | 2026-07-23 |
| **Alcance** | `docs/`, `PTSA/`, `changes/`, `src/` (api, base, client, admin, core), `prisma/`, `graphify-out/`, `docker-compose.yml`, `.env.example`, `src/nginx/` |
| **Método** | 6 agentes de reconocimiento paralelos → evidencia citada `archivo:línea` en `audit/raw/A..F` → síntesis en `audit/deliverables/` |
| **Regla de verdad** | La documentación existente es insumo; cada afirmación re-verificada contra el código. En conflicto **gana el código** + se registra hallazgo. |
| **Estado** | Fases 1–5 **COMPLETAS**. `docs-v2/` **NO generado** — pendiente de tu ACK. |

---

## 1. Qué se hizo (Fases 1–5)

- **Fase 1 — Inventario y clasificación:** ~110 archivos de documentación clasificados (`audit/raw/A-docs-inventory.md`).
- **Fase 2 — Mapa de conocimiento:** reglas, casos de uso, entidades, glosario y arquitectura repetidos, con conflictos citados.
- **Fase 3 — Código:** API (118 endpoints, 26 reglas de negocio, máquinas de estado), BD (24 modelos, 18 enums, 14 migraciones), 3 frontends, core + cobertura de pruebas.
- **Fase 4 — Graphify:** 1307 nodos, 2690 aristas, 65 comunidades; god-object `AdminController/Service` (80/72 aristas).
- **Fase 5 — Trazabilidad + Hallazgos:** matriz global (`02-Matriz-de-Trazabilidad.md`) y Registro de Hallazgos (`01-Registro-de-Hallazgos.md`).

## 2. Inventario documental (clasificación)

| Clasificación | Nº | Ejemplos |
|---|---|---|
| Oficial | 20 | `enterprise-documentation/01..11` + inventory + README + design |
| Referencia (meta) | 11 | `methodology/*`, CLAUDE.md |
| Auditoría | ~40 | PTSA (Fases, Hallazgos, Productos) |
| Trabajo | ~15 | `implementation/*`, `changes/PT-*` |
| Evidencia | ~15 | `evidence/PT-*`, PTSA `E-*` |
| Histórico | 4 | HISTORY.log, ROADMAP_HISTORY, CHANGELOG, score-history |
| Temporal | 3 | HANDOFF, ESTADO_ACTUAL, PENDIENTES |

**Duplicación redundante (consistente):** mapa de servicios ×4, rutas/páginas ×3, endpoints ×2, entidades/enums ×2. → candidata a fuente única en `docs-v2/`.

## 3. Hallazgos (36 total)

| Severidad | Nº | Los más importantes |
|---|---|---|
| **CRÍTICA** | 5 | Drift de migraciones (46%), puja rota en UI, escrituras CLIENT sin auth, admin con creds por defecto, doble comisión |
| **ALTA** | 11 | WS sin auth, ADMIN sin CSP/CSRF, moneda pagos USD, incremento de puja no aplicado, disputa no mueve dinero, admin salta FSM, use-cases core no cableados, commissions/refunds sin tests, contradicción CSRF, invariante held-funds en PTSA, CFDI no funcional |
| **MEDIA** | 13 | seed inexistente, crons de limpieza en conflicto, `UserPaymentMethod` sin documentar, tech-debt obsoleto, PTSA incoherente, conteo módulos, HeyBanco no documentado, tracking sobredimensionado, diagnostics, JWT compartido, SMTP duplicado, CI/husky, glosario inexistente |
| **BAJA** | 7 | convención JS inexistente, skew de estado FDGE, plantilla/enlaces muertos, versiones no unificadas, cookie vs JWT, acoplamiento cruzado |

Detalle completo con evidencia, impacto y recomendación en `01-Registro-de-Hallazgos.md`.

## 4. Contradicciones documentación ↔ código (destacadas)

1. **CSRF**: CLAUDE.md + CHANGELOG afirman doble-cookie; `09-Security` lo niega; ADMIN no tiene ninguno (AUD-014).
2. **Puja en tiempo real**: descrita como capacidad; no hay UI ni cliente WS (AUD-002).
3. **Comisión configurable**: descrita; el cobro real usa 10% fijo (AUD-005).
4. **Moneda MXN global**: `payments.currency` default DB sigue `USD` (AUD-008).
5. **Incremento de puja**: config existe; el código no lo aplica (AUD-009).
6. **Carrier tracking**: descrito como integración; es captura manual (AUD-024).
7. **Proveedores de pago**: doc dice 2 (PayPal+MP); el código tiene 3 (+HeyBanco) (AUD-023).
8. **Modelo de datos**: la doc de BD no refleja `UserPaymentMethod` ni el estado real (db push) (AUD-001/019).

## 5. Contradicciones internas de la documentación

- PTSA usa los mismos IDs `CR-002`/`CR-009` para reglas distintas en `F-1` vs `F6` (AUD-021).
- `F-1` conserva la invariante de fondos retenidos que PT-032 ya corrigió (AUD-015).
- `10-Technical-Debt` lista como abiertos ítems ya resueltos (AUD-020).
- Skew de estado entre `DISCOVERY`, `HISTORY`, `PENDING_TASKS`; CHANGELOG parado en 0.5.1 (AUD-031).

## 6. Qué falta / debe consolidarse en `docs-v2/`

- **Glosario único** (no existe hoy) y **Catálogo Maestro de Reglas** (hoy disperso ×4).
- **Modelo Maestro de Dominio** y **Catálogo de Casos de Uso** como fuente única.
- **Master Test Plan** (no existe) con la matriz requisito↔prueba y las brechas (commissions/refunds/frontend = 0 tests).
- **Manual de Usuario/Administrador** (no existen) — incluyendo el proceso manual de reembolso de disputas.
- Reconciliar la doc de BD con el esquema real y el estado de migraciones.

---

## 7. Propuesta de estructura `docs-v2/` (para tu ACK)

Organizada por responsabilidad organizacional (no por orden de escritura). Cada documento llevará cabecera con Origen/Fuente/Fecha/Documentos usados/Código usado/Nivel de confianza.

```
docs-v2/
├── README.md                         (índice + fecha + alcance + estado oficial)
├── 1-negocio/                        BRD, PRD, objetivos, alcance, stakeholders, KPIs,
│                                     restricciones, modelo operativo, roadmap, riesgos
├── 2-producto/                       casos de uso, user story mapping, escenarios,
│                                     matriz actor×caso, modelo funcional, reglas funcionales
├── 3-arquitectura/                   SAD, C4 (context/container/component/deployment),
│                                     DDD/bounded contexts, modelo de dominio, ADRs
├── 4-ingenieria/                     SDD, modelo de datos, OpenAPI/endpoints, secuencias,
│                                     migraciones, variables, integraciones, convenciones
├── 5-qa/                             Master Test Plan, matriz requisito×prueba, cobertura,
│                                     defectos (→ Registro de Hallazgos), cobertura faltante
├── 6-devops/                         despliegue, Docker, env, nginx, CI/CD, backups,
│                                     observabilidad, release notes, checklist
├── 7-ux/                             Manual de Usuario, Manual de Administrador, FAQ, flujos
└── transversal/
    ├── Diccionario-Maestro.md
    ├── Catalogo-Maestro-de-Reglas.md
    ├── Modelo-Maestro-de-Dominio.md
    ├── Catalogo-Maestro-de-Casos-de-Uso.md
    ├── Matriz-Global-de-Trazabilidad.md   (evoluciona la de esta auditoría)
    ├── Registro-Maestro-de-ADR.md
    └── Registro-de-Hallazgos.md            (hereda 01-Registro-de-Hallazgos.md)
```

**Reglas de generación acordadas:** `docs/` permanece intacto; `docs-v2/` es la única fuente oficial; nada se inventa; cada afirmación cita evidencia; el código gana en conflictos.

---

## 8. Decisión requerida

**STOP — Fases 1–5 completas.** Para pasar a la reconstrucción necesito tu **ACK**. Confírmame:

1. ¿Apruebas la **estructura `docs-v2/`** de la sección 7 (o ajustes)?
2. ¿Los hallazgos van **documentados como estado real** en `docs-v2/` (deuda/gaps) **sin corregir código** en esta fase? (recomendado: la auditoría documenta; los fixes se gobiernan luego por FDGE)
3. ¿Prefieres que genere `docs-v2/` **por área** (checkpoint tras cada una) o **de una pasada** con revisión final?

Al recibir tu ACK comienzo la Fase de Reconstrucción.
