# RELACIONES — Índice cache hallazgos ↔ evidencias ↔ productos
**PTSA V3 | Cache: se sobrescribe al reconstruir. `[R75]` — prevalecen los archivos individuales.**
**Última reconstrucción:** 2026-07-27 (S-002 — corrida completa F-1→F12)

> **Nota de reconstrucción.** La versión anterior era de S-001 (23-jun) y contradecía a los archivos
> de `Productos/`: numeraba P-006 como *Order*, P-007 como *DisputeRecord*, P-009 como *CfdiRecord*,
> y listaba productos que ya no existen (`RateLimitResponse`, `PageRenderSSR`, `CmsContent`).
> `[R75]` es explícito: mandan los archivos individuales. Esta tabla se ha reconstruido desde ellos.

## Hallazgos registrados (17 total · 5 activos)

| ID | Dim | Tipo | Sev | Estado | Producto | Evidencias | Riesgo | Sesión |
|:--:|:--:|:--|:--:|:--|:--:|:--:|:--:|:--:|
| H-001 | D1 | — | ALTA | CERRADA | P-001 | E-001, E-002 | — | S-001 |
| H-002 | D2 | — | MEDIA | CERRADA | — | E-003 | — | S-001 |
| H-003 | D2 | — | BAJA | CERRADA | P-004 | E-004 | — | S-001 |
| H-004 | D2 | — | MEDIA | CERRADA | P-005 | E-005 | — | S-001 |
| **H-005** | **D1** | DOMAIN_RULE | **ALTA** | **ABIERTA** | P-012 | E-007, E-009 | **6** MEDIO | S-001 |
| H-006 | D2 | — | MEDIA | CERRADA | — | E-006 | — | S-001 |
| H-007 | D4 | — | BAJA | CERRADA | P-005 | E-008 | — | S-001 |
| H-008 | D2 | TECHNICAL | ALTA | CERRADA | — | E-011 | — | DS-004 |
| H-009 | D4 | PROCESS | MEDIA | CERRADA | — | E-012 | — | DS-004 |
| H-010 | D1 | DOMAIN_RULE | ALTA | CERRADA | P-010 | E-013 | — | DS-006 |
| H-011 | D1 | DOMAIN_RULE | MEDIA | CERRADA | P-006 | E-014 | — | DS-006 |
| H-012 | D1 | DOMAIN_RULE | BAJA | CERRADA | P-007 | E-015 | — | DS-008 |
| H-013 | D2 | BUG | ALTA | CERRADA | P-002 | E-016 | — | DS-009 |
| **H-014** | **D2** | BUG | **CRITICA** | **ABIERTA** | sistémico | **E-017** | **8** ALTO | **S-002** |
| **H-015** | **D2** | BUG | **ALTA** | **ABIERTA** | sistémico | **E-018** | **12** CRÍTICO | **S-002** |
| **H-016** | **D4** | PROCESS | **ALTA** | **ABIERTA** | sistémico | **E-020** | **9** ALTO | **S-002** |
| **H-017** | **D2** | BUG | **ALTA** | **ABIERTA** | sistémico | **E-021** | **6** MEDIO | **S-002** |

**Activos:** 5 (H-005, H-014, H-015, H-016, H-017) · **Cerrados:** 12
**Risk_bruto** = 6 + 8 + 12 + 9 + 6 = **41** → `Risk_Score = min(100, 41×4)` = **100**

Ninguno de los cerrados lo cerró el agente: todos llevan validación humana previa
(`HISTORY.log`, «PT-114 … PT-122 — VALIDACION»).

> **Vocabulario inconsistente en el frontmatter.** H-001, H-003, H-004 y H-007 escriben
> `estado: CLOSED`; el resto usa `CERRADA`. §31.3 sólo define los estados en castellano. No se
> tocan —`[R67]`, no se sobrescriben hallazgos ajenos por cosmética— pero un lector automático
> que filtre por `CERRADA` se dejaría cuatro fuera. Anotado aquí para que la tabla no mienta.

---

## Evidencias registradas (20 · E-011 ausente del directorio)

| ID | Tipo | Origen | Validez | Sesión |
|:--:|:--|:--|:--:|:--:|
| E-001 | codigo | `bids.service.ts` | VIGENTE | S-001 |
| E-002 | codigo | `auction-scheduler.service.ts` | VIGENTE | S-001 |
| E-003 | codigo | `app.module.ts` | VIGENTE | S-001 |
| E-004 | codigo | `payments.service.ts` | VIGENTE | S-001 |
| E-005 | codigo | `wallet.controller.ts` | VIGENTE | S-001 |
| E-006 | codigo | `client/src/app.controller.ts` | VIGENTE | S-001 |
| E-007 | configuracion | `10-Technical-Debt.md` + docs | VIGENTE | S-001 |
| E-008 | documentacion | `02-PRD.md` | VIGENTE | S-001 |
| E-009 | codigo | `modules/cfdi/` + enterprise-documentation | VIGENTE | DS-004 |
| E-010 | salida_real | `ironloot_db` — productos de la corrida QA | ⚠️ base reconstruida | DS-004 |
| E-012 | configuracion | `.gitignore` + `audit-scope.yaml` | VIGENTE | DS-004 |
| E-013 | salida_real | `ironloot_db` + `commissions/` | ⚠️ base reconstruida | DS-006 |
| E-014 | codigo | `disputes.service.ts:49-53` | VIGENTE | DS-006 |
| E-015 | salida_real | `notifications` + `NotificationType` | ⚠️ base reconstruida | DS-008 |
| E-016 | EJECUCION | curl contra el API + lectura de código | VIGENTE | DS-009 |
| **E-017** | EJECUCION | psql + `migrate deploy` sobre base sombra + cliente Prisma | VIGENTE | **S-002** |
| **E-018** | EJECUCION | `ci.yml` + reproducción del job en contenedor | VIGENTE | **S-002** |
| **E-019** | EJECUCION | los cuatro checkpoints + psql + logs en vivo | VIGENTE | **S-002** |
| **E-020** | DOCUMENTACION | enterprise-documentation contra los `package.json` | VIGENTE | **S-002** |
| **E-021** | EJECUCION | Dockerfiles + curl contra el API + `ci.yml` | VIGENTE | **S-002** |

> **⚠️ base reconstruida** — E-010, E-013 y E-015 se capturaron sobre datos que hoy no están:
> `ironloot_db` se reconstruyó (`_prisma_migrations` no existe, `disputes` = 0). Siguen siendo
> capturas válidas de lo que se observó; **no son reproducibles hoy**. Afecta a la validación de
> P-006 (ver F3, U-006).
>
> **E-011 no está en `Evidencias/`** aunque `F5_Tecnica.md` y H-008 la citan. H-008 está CERRADA y
> su objeto (71 vulnerabilidades) se comprobó resuelto de forma independiente en S-002 —0 avisos—,
> así que no se reabre nada; queda anotada la ausencia.

---

## Productos (12) — desde `Productos/P-XXX.md`

| ID | Nombre | Clase | Criticidad | Estado | Hallazgos |
|:--:|:--|:--:|:--:|:--:|:--:|
| P-001 | Bid — Puja colocada | primario | CRÍTICA | VALIDADO | — |
| P-002 | Auction Close — Cierre de subasta | primario | CRÍTICA | VALIDADO | — |
| P-003 | Order — Pedido creado | primario | ALTA | VALIDADO | — |
| P-004 | Payment — Pago procesado | primario | CRÍTICA | VALIDADO | — |
| P-005 | Wallet Transaction | primario | CRÍTICA | VALIDADO | — |
| P-006 | Dispute — Disputa gestionada | primario | ALTA | VALIDADO ⚠️ | — |
| P-007 | Notification — Notificación entregada | primario | MEDIA | VALIDADO | — |
| P-008 | JWT Authentication Token | primario | ALTA | VALIDADO | — |
| P-009 | Ledger Entry | secundario | CRÍTICA | VALIDADO | — |
| P-010 | Commission Record | secundario | MEDIA | VALIDADO | — |
| P-011 | KYC Submission | primario | ALTA | VALIDADO | — |
| P-012 | CFDI Record — Registro fiscal | secundario | BAJA | IDENTIFICADO | **H-005** |

⚠️ **P-006**: validado en DS-008 con evidencia hoy no reproducible. Ver F3, U-006.

H-014, H-015, H-016 y H-017 son **sistémicos** (`producto_id: null`, §13.7): penalizan su dimensión sin
imputarse a producto. Por eso la columna de hallazgos está casi vacía, D2 vale 40 y D4 vale 85.
