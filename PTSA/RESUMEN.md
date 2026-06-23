# PTSA V3 — RESUMEN DE AUDITORÍA
## IronLoot Auction Platform v1.0.0
**Sesión**: S-001 + DS-001 + DS-002 + DS-003 | **Fecha**: 2026-06-23 | **Tipo**: Primera Auditoría Completa + 3 Delta Syncs

---

## SCORES ACTUALES (DS-003) ★ CLASE A

| Métrica | S-001 | DS-001 | DS-002 | DS-003 | Estado |
|---|---|---|---|---|---|
| **Health Score** | 86.1 | 87.3 | 88.8 | **95.2 / 100** | ★ **Clase A** (cap eliminado — freshness KNOWN) |
| **Health Proyectado** | — | — | — | — | No aplica — ya en máximo alcanzable con H-005 abierta |
| **Risk Score** | 100 | 100 | 92 | **44 / 100** | MODERADO (solo H-005 + H-006 activos) |
| **Confidence** | 55 | 55 | 60 | **85 / 100** | ALTA — ambos blockers resueltos |
| **Clasificación** | C | C | C | **A** | Sin cap — freshness=KNOWN, BLQ-001 y BLQ-002 RESUELTOS |

---

## SCORES POR DIMENSIÓN (DS-003)

| Dimensión | S-001 | DS-001 | DS-002 | DS-003 | Cambio total | Hallazgos activos |
|---|---|---|---|---|---|---|
| D1 Domain Alignment | 70 | 70 | 70 | **85** | +15 | H-005 ABIERTA ALTA (único) |
| D2 Architectural Integrity | 84 | 88 | 93 | **99** | +15 | H-006 ABIERTA BAJA (único) |
| D3 Observability & Recovery | 100 | 100 | 100 | **100** | = | 0 hallazgos |
| D4 Documentary Fidelity | 99 | 99 | 99 | **100** | +1 | 0 hallazgos |

**Fórmula DS-003**: Health = (85×0.30)+(99×0.30)+(100×0.30)+(100×0.10) = **95.2**  
**Regla del Agua Potable**: D1 = 85 ≥ 60 → **NO ACTIVADA**  
**D5 Hallucination/Drift**: NO_APLICA (sistema determinista, sin LLM)  
**health_unstable**: false  
**Cap de freshness**: **ELIMINADO** — BLQ-001 y BLQ-002 resueltos, live verification completada

---

## HALLAZGOS — ESTADO FINAL (7)

### ALTAS (2)

| ID | Dim | Producto | Título | Estado | Resolución |
|---|---|---|---|---|---|
| H-001 | D1 | P-001 Bid | BidsService: EXTENSION_MS hardcoded 300s | **CLOSED** | PT-026, validado runtime 2026-06-23 |
| H-005 | D1 | P-009 CfdiRecord | CFDI/PAC integration es stub | **ABIERTA** | PT-027 BLOQUEADO — PAC SAT no seleccionado |

### MEDIAS (2)

| ID | Dim | Producto | Título | Estado | Resolución |
|---|---|---|---|---|---|
| H-002 | D2 | P-003 RateLimit | ThrottlerModule sin Redis storage | **CLOSED** | PT-030, refactor DONE 2026-06-23 |
| H-004 | D2 | P-005 Wallet | Withdraw: validación método comentada | **CLOSED** | PT-029, validado runtime 2026-06-23 |

### BAJAS (3)

| ID | Dim | Producto | Título | Estado | Resolución |
|---|---|---|---|---|---|
| H-003 | D2 | P-004 PaymentWebhook | PaymentsService Logger estándar | **CLOSED** | PT-031, validado runtime 2026-06-23 |
| H-006 | D2 | P-010 PageRenderSSR | CLIENT apiUrl expuesto al browser | **ABIERTA BAJA** | Monitorear — reclasificada DS-001 |
| H-007 | D4 | P-005 Wallet | PRD AC-3.2 incorrecto | **CLOSED** | PT-032, validado en docs 2026-06-23 |

**Resumen**: 5 CLOSED · 1 ABIERTA (ALTA, bloqueada) · 1 ABIERTA (BAJA, monitoreo)

---

## ESTADO FDGE FINAL

| PT | Tipo | Estado |
|---|---|---|
| PT-026 | BUG | **DONE** — validado runtime, H-001 CLOSED |
| PT-027 | FEATURE MAJOR | **BLOQUEADO** — PAC SAT no seleccionado |
| PT-028 | INVESTIGATION | **CLOSED** — H-006 reclasificada BAJA |
| PT-029 | BUG | **DONE** — validado runtime, H-004 CLOSED |
| PT-030 | REFACTOR | **DONE** — H-002 CLOSED |
| PT-031 | TRIVIAL | **DONE** — validado runtime, H-003 CLOSED |
| PT-032 | TRIVIAL | **DONE** — validado docs, H-007 CLOSED |

---

## VERIFICACIONES POSITIVAS ACUMULADAS

| Componente | Regla | Estado |
|---|---|---|
| WalletService.holdFunds() | CR-001, CR-003 — balance ≥ 0, atómico | ✅ |
| Todos los payment providers | CR-008 — HMAC antes de procesar webhook | ✅ |
| DisputesService | CR-007 — 14-day window via StateMachine | ✅ |
| AuthService | CR-013 — BANNED users blocked | ✅ |
| schema.prisma | CR-015 — Decimal no Float en financieros | ✅ |
| AuctionSchedulerService | Distributed lock Redis (no doble-close) | ✅ |
| WalletController.deposit() | CR-004 — amount match + status COMPLETED | ✅ |
| AuthService | CR-010 — 2FA verificado si habilitado | ✅ |
| CLIENT wallet pages | BFF — credentials: 'include' en fetch() | ✅ |
| WalletController.withdraw() | getUserPaymentMethod() activo — referenceId validada en DB | ✅ VALIDADO RUNTIME |
| BidsService.placeBid() | extensionMs lee AUCTION_SOFT_CLOSE_WINDOW_SEC desde SystemConfig | ✅ VALIDADO RUNTIME |
| AppModule ThrottlerModule | ThrottlerStorageRedisService configurado — Redis compartido | ✅ |
| PaymentsService webhooks | StructuredLogger con traceId — trazabilidad end-to-end | ✅ VALIDADO RUNTIME |

---

## LIMITACIONES DECLARADAS

| ID | Descripción | Estado DS-003 |
|---|---|---|
| BLQ-001 | Sin acceso a DB real | **RESUELTO** (db push 2026-06-23) |
| BLQ-002 | Sin acceso a logs en vivo | **RESUELTO** (H-003 validado runtime — logs JSON con traceId confirmados) |

---

## BLOQUEADOR ÚNICO RESTANTE

**H-005 / PT-027 — CFDI/PAC**: Compliance fiscal mexicano. Requiere selección de PAC certificado SAT (Finkok, SIFEI, Edicom u otro) y firma de contrato. Hasta que esto se defina, D1 permanece en 85 (no puede llegar a 100).

**Para alcanzar Health > 95.2**: Solo resolviendo H-005. Con H-005 CLOSED: D1=100 → Health = 100.

---

## PRÓXIMA AUDITORÍA

- **audit_due**: 2026-07-07
- **Acción**: DS-004 o S-002 completo tras selección de PAC (PT-027 desbloqueado)
- **Objetivo**: H-005 → Health 100 / Clase A sin restricciones
