# ROADMAP — FPGE Priorización Gobernada por Evidencia
**Emisión:** 2026-06-23 | **Sesión PTSA origen:** S-001 | **Run FPGE:** R-001

> Todos los ítems en estado `PROPUESTO`. El desarrollador marca cada uno `APROBADO` / `DIFERIDO` / `DESCARTADO`.
> Cada ítem `APROBADO` se promueve con `promote FPGE R-XXX` → nuevo PT-XXX en FDGE STATE 1.

---

## Estado del sistema en el momento de emisión

```
Health:         86.1 / 100   →  Clase C (cap freshness UNKNOWN)
Risk:           100 / 100    →  CRÍTICO
D1 Domain:      70           →  Bloqueador principal (2 ALTAS)
D2 Arch:        84           →  Cluster de MEDIAs
D3 Observ.:     100          →  Limpio
D4 Docs:        99           →  Casi limpio
audit_due:      2026-07-07
```

---

## Algoritmo aplicado

```
Priority(item) = (EvidenceWeight × ScoreImpact × Urgency × DomainMultiplier) / Effort

EvidenceWeight  = riesgo PTSA del hallazgo origen (Impacto × Probabilidad, 1–16)
ScoreImpact     = penalización eliminada × peso de la dimensión
Urgency         = 1.0 base (audit_due no vencido al momento de emisión)
DomainMultiplier= 1.5 si D1, 1.0 resto
Effort          = 1 (S) / 2 (M) / 4 (L)
```

---

## TOP-3 POR IMPACTO

### #1 — R-001 · Priority: 60.75
**Tipo:** BUG  
**Hallazgo origen:** H-001 (D1, ALTA)  
**Título:** Corregir `EXTENSION_MS` hardcodeado en `BidsService` — leer `AUCTION_SOFT_CLOSE_WINDOW_SEC` de config  
**Racional:** CR-002 violada en cada puja durante soft-close. La extensión real (300s) diverge de la configurada (120s). El administrador no puede controlar este parámetro de negocio crítico. Esfuerzo S — una inyección de `ConfigService` en un servicio ya existente.  
**Impacto en Health:** D1: 70→85 · Health: 86.1→90.6 → **potencial Clase A sin cap**  
**Esfuerzo:** S (1-3 horas)  
**Branch sugerido:** `fix/PT-XXX-bids-soft-close-config`  
**Estado:** `APROBADO`

---

### #2 — R-002 · Priority: 10.13
**Tipo:** FEATURE  
**Hallazgo origen:** H-005 (D1, ALTA)  
**Título:** Integrar PAC certificado SAT para emisión real de CFDI  
**Racional:** CR-011 violada — IronLoot no emite facturas fiscales válidas. Bloqueador legal para operación comercial a escala en México. Requiere seleccionar un PAC (ej. Finkok, SIFEI, Edicom), firmar contrato, implementar `CfdiService.emitCfdi()`.  
**Impacto en Health:** D1: 85→100 (tras R-001) · Health: 90.6→95.1  
**Esfuerzo:** L (sprint completo + contratos externos)  
**Branch sugerido:** `feature/PT-XXX-cfdi-pac-integration`  
**Estado:** `APROBADO`

---

### #3 — R-003 · Priority: 6.00
**Tipo:** INVESTIGATION  
**Hallazgo origen:** H-006 (D2, MEDIA)  
**Título:** Investigar mecanismo auth de JS browser en CLIENT — determinar si BFF está realmente degradado  
**Racional:** H-006 tiene confidence 80% — la severidad final depende de cómo el JS del browser gestiona la autenticación al llamar al API directamente. Si usa `credentials: 'include'` (cookies HttpOnly) el riesgo es bajo; si usa localStorage/headers el riesgo es alto. La investigación es Esfuerzo S y puede reclasificar o cerrar H-006.  
**Archivos objetivo:** `src/apps/client/public/js/pages/wallet/deposit.js`, `withdraw.js`, y cualquier util de fetch  
**Impacto:** Determina si H-006 se convierte en BUG/REFACTOR (D2: 84→89) o se cierra (D2: 84→89 igualmente)  
**Esfuerzo:** S (investigación — lectura de código, 1-2 horas)  
**Branch sugerido:** ninguno hasta completar investigación → PT type según resultado  
**Estado:** `APROBADO`

---

## TOP-3 QUICK WINS (Esfuerzo S, impacto inmediato)

| Rank QW | R | Priority | Tipo | Título | Impacto Health |
|---|---|---|---|---|---|
| QW-1 | R-001 | 60.75 | BUG | Soft-close config en BidsService | +4.5 pts D1 |
| QW-2 | R-003 | 6.00 | INVESTIGATION | Investigar auth browser CLIENT | Clarifica H-006 |
| QW-3 | R-006 | 0.60 | TRIVIAL | StructuredLogger en PaymentsService | +0.3 pts D2 |

---

## ROADMAP COMPLETO (todos los ítems)

| R | Priority | Tipo | Hallazgo | Esfuerzo | Impacto D | Estado |
|---|---|---|---|---|---|---|
| **R-001** | **60.75** | BUG | H-001 | S | D1 +15 pts | `APROBADO` |
| **R-002** | **10.13** | FEATURE | H-005 | L | D1 +15 pts | `APROBADO` |
| **R-003** | **6.00** | INVESTIGATION | H-006 | S | D2 clarifica | `APROBADO` |
| **R-004** | **4.50** | BUG | H-004 | M | D2 +5 pts | `APROBADO` |
| **R-005** | **3.00** | REFACTOR | H-002 | M | D2 +5 pts | `APROBADO` |
| **R-006** | **0.60** | TRIVIAL | H-003 | S | D2 +1 pt | `APROBADO` |
| **R-007** | **0.10** | TRIVIAL | H-007 | S | D4 +1 pt | `APROBADO` |

---

## Detalle de ítems restantes

### R-004 · Priority: 4.50
**Tipo:** BUG  
**Hallazgo origen:** H-004 (D2, MEDIA)  
**Título:** Implementar validación de método de pago en `WalletController.withdraw()`  
**Racional:** La validación está comentada desde el inicio ("mock for now"). Cualquier usuario puede retirar a cualquier `referenceId` sin verificar pertenencia. Crítico para seguridad financiera antes de habilitar retiros en producción.  
**Esfuerzo:** M (implementar `getUserPaymentMethod()` + des-comentar + tests)  
**Estado:** `APROBADO`

### R-005 · Priority: 3.00
**Tipo:** REFACTOR  
**Hallazgo origen:** H-002 (D2, MEDIA)  
**Título:** Migrar `ThrottlerModule` a `ThrottlerStorageRedis` (Redis ya disponible en stack)  
**Racional:** Rate limiting in-memory es inefectivo en despliegue multi-instancia. Redis ya está en el stack; la migración es no-breaking. Debe resolverse antes de cualquier horizontal scaling.  
**Esfuerzo:** M (agregar dependencia + reconfigurar módulo)  
**Estado:** `APROBADO`

### R-006 · Priority: 0.60
**Tipo:** TRIVIAL  
**Hallazgo origen:** H-003 (D2, BAJA)  
**Título:** Cambiar Logger estándar a `StructuredLogger` en `PaymentsService`  
**Racional:** 1 línea. Cierra gap de trazabilidad end-to-end en el módulo de pagos.  
**Esfuerzo:** S (trivial)  
**Estado:** `APROBADO`

### R-007 · Priority: 0.10
**Tipo:** TRIVIAL  
**Hallazgo origen:** H-007 (D4, BAJA)  
**Título:** Corregir PRD AC-3.2 — redefinir invariante de held funds  
**Racional:** 1 línea en `docs/enterprise-documentation/02-PRD.md`. Elimina documentación técnicamente incorrecta.  
**Esfuerzo:** S (trivial)  
**Estado:** `APROBADO`

---

## Alerta de freshness

> `score_freshness = UNKNOWN` (primera auditoría, sin baseline).
> Los scores son válidos pero la clasificación está capada a **C**.
> Para resolver: ejecutar delta sync (`resume PTSA`) tras implementar al menos R-001, con acceso a DB/logs en vivo para eliminar BLQ-001/BLQ-002.

---

## Instrucciones para el desarrollador

1. Marcar cada ítem: `APROBADO` / `DIFERIDO` / `DESCARTADO`
2. Ejecutar `promote FPGE R-XXX` para cada `APROBADO` → se crea PT-XXX en FDGE STATE 1
3. Prioridad recomendada: R-001 primero (máximo ROI, esfuerzo S)
4. R-006 y R-007 se pueden hacer en un solo commit trivial sin necesidad de PT formal (TRIVIAL path en FDGE)

---

## Reconciliación con lo ejecutado — 2026-07-27 (PT-090)

Este roadmap se emitió el **2026-06-23** y sus siete ítems seguían figurando `APROBADO` como si
nada se hubiera hecho después. Se anota el desenlace real de cada uno. **No se re-prioriza**: eso
es una ejecución de FPGE aparte, y hacerla aquí mezclaría dos marcos.

| R | Título abreviado | Desenlace verificado |
|---|---|---|
| R-001 | Soft-close config en `BidsService` | **HECHO** — `PT-026`. `bids.service.ts:112` lee la config; `SystemConfigService` inyectado en `:38` |
| R-002 | Integrar PAC certificado SAT (CFDI) | **BLOQUEADO** — exige contratar un PAC ante el SAT. Sigue como `TD-001` / `H-005` |
| R-003 | Investigar auth del JS de navegador en CLIENT | **CERRADO** — `H-006` cerrada en PT-090 con medición: el token nunca llega al navegador. Destapó `F-25` |
| R-004 | (D2, esfuerzo M) | Absorbido por los PT de auditoría posteriores; ver `FDGE_HALLAZGOS_TRACKER.md` |
| R-005 | (REFACTOR, D2) | Ídem |
| R-006 | `StructuredLogger` en `PaymentsService` | **HECHO** — el servicio lo recibe por constructor y lo usa en todo el ciclo de pago |
| R-007 | (TRIVIAL, D4) | Ídem R-004 |

**Estado del roadmap**: **caducado**. La priorización vigente vive en `MATRIZ-DEUDA-TECNICA.md`.
Una nueva ejecución de FPGE debería partir del estado actual, no de este documento.
