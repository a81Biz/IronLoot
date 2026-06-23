# F10 — Matriz Ejecutiva

**Estado**: COMPLETADA  
**Fecha**: 2026-06-23  
**Sesión**: S-001 — Primera Auditoría PTSA

---

## Dashboard de Salud del Sistema

```
╔══════════════════════════════════════════════════════════════════════╗
║           IRONLOOT — PTSA V3 — PRIMERA AUDITORÍA                   ║
║           Fecha: 2026-06-23 | Sesión: S-001                        ║
╠══════════════════════════════════════════════════════════════════════╣
║  HEALTH SCORE     86.1 / 100    Clase C (cap por freshness)        ║
║  RISK SCORE       100 / 100     CRÍTICO                             ║
║  CONFIDENCE       55 / 100      BAJA                                ║
╠══════════════════════════════════════════════════════════════════════╣
║  D1 Domain        70            Hallazgos ALTAS: 2                  ║
║  D2 Architectural  84            Hallazgos: 1 MEDIA ×3 + 1 BAJA    ║
║  D3 Observability 100            Sin hallazgos                      ║
║  D4 Documentary    99            Hallazgos BAJAS: 1                 ║
╠══════════════════════════════════════════════════════════════════════╣
║  Regla Agua Potable: NO ACTIVADA (D1=70 ≥ 60)                      ║
║  health_unstable: false (sistema determinista — no LLM)             ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## Dimensiones — Detalle

| Dimensión | Score | Peso | Contribución | Estado |
|---|---|---|---|---|
| D1 Domain Alignment | 70 | 30% | 21.0 | AMARILLO — 2 ALTAS |
| D2 Architectural Integrity | 84 | 30% | 25.2 | AMARILLO — cluster de MEDIAS |
| D3 Observability & Recovery | 100 | 30% | 30.0 | VERDE |
| D4 Documentary Fidelity | 99 | 10% | 9.9 | VERDE |
| **HEALTH** | **86.1** | 100% | — | **C (cap freshness)** |

---

## Productos por Estado de Riesgo

| Producto | Criticidad | Hallazgos | Estado |
|---|---|---|---|
| P-001 Bid | CRÍTICA | H-001 | RIESGO-ALTO |
| P-002 AuctionResult | CRÍTICA | — | OK |
| P-004 PaymentWebhook | CRÍTICA | H-003 | RIESGO-BAJO |
| P-005 WalletTransaction | CRÍTICA | H-004, H-007 | RIESGO-MEDIO |
| P-008 AuthToken | CRÍTICA | — | OK |
| P-009 CfdiRecord | ALTA | H-005 | RIESGO-ALTO |
| P-003 RateLimitResponse | ALTA | H-002 | RIESGO-MEDIO |
| P-006 Order | ALTA | — | OK |
| P-010 PageRenderSSR | ALTA | H-006 | RIESGO-MEDIO (pendiente investigación) |
| P-007 DisputeRecord | MEDIA | — | OK |
| P-011 NotificationRecord | MEDIA | — | OK |
| P-012 CmsContent | BAJA | — | OK |

---

## Clasificación por Severidad de Hallazgos

### ALTAS (2)
| ID | Producto | Título breve |
|---|---|---|
| H-001 | P-001 Bid | Soft-close EXTENSION_MS hardcoded a 300s |
| H-005 | P-009 CfdiRecord | CFDI/PAC integration es stub — compliance fiscal |

### MEDIAS (3)
| ID | Producto | Título breve |
|---|---|---|
| H-002 | P-003 RateLimit | ThrottlerModule sin Redis storage |
| H-004 | P-005 WalletTransaction | Withdraw payment method validation comentada |
| H-006 | P-010 PageRenderSSR | CLIENT expone apiUrl al browser (BFF parcial) |

### BAJAS (2)
| ID | Producto | Título breve |
|---|---|---|
| H-003 | P-004 PaymentWebhook | PaymentsService usa Logger estándar |
| H-007 | P-005 WalletTransaction | PRD AC-3.2 documenta incorrectamente held funds |

---

## Análisis de Riesgo

**Risk Score = 100 (CRÍTICO)** — acumulación de riesgos, no un único riesgo catastrófico.

### Riesgos por probabilidad alta (Probabilidad ≥ 3):
- H-001: ocurre en CADA puja durante soft-close → impacto en core business en tiempo real
- H-004: ocurre en CADA retiro → validación de método de pago siempre omitida
- H-005: permanente hasta implementar PAC real → compliance fiscal bloqueado

### Riesgos de menor frecuencia pero importante severidad:
- H-002: se materializa al escalar horizontalmente
- H-006: depende de verificación de JS browser (confidence 80%)

---

## Recomendaciones Prioritarias

### Inmediatas (Sprints 1-2)

**R1 — Corregir H-001 (ALTA D1)**: Leer `AUCTION_SOFT_CLOSE_WINDOW_SEC` de config en `BidsService`. Esfuerzo S, impacto Health +4.5 (D1 sube de 70 a 85).

**R2 — Investigar y resolver H-006 (MEDIA D2)**: Auditar JS browser en `src/apps/client/public/js/pages/`. Si no usa cookies, migrar a proxy BFF.

**R3 — Resolver H-004 (MEDIA D2)**: Implementar `getUserPaymentMethod()` en `PaymentsService` y des-comentar validación en withdraw.

### Corto plazo (Sprint 3-4)

**R4 — Resolver H-002 (MEDIA D2)**: Migrar ThrottlerModule a Redis storage antes de escalar.

**R5 — Triviales H-003 y H-007**: Un commit cada uno — StructuredLogger en PaymentsService, corrección PRD AC-3.2.

### Largo plazo (Roadmap)

**R6 — H-005 (ALTA D1)**: Integración PAC/CFDI real — requiere contrato con PAC certificado SAT. Crítico antes de operación comercial a escala en México.

---

## Comparativa con Baseline

*Primera auditoría — sin baseline previo. Scores actuales constituyen el baseline.*

---

## Próxima Auditoría

**Recomendada para**: 2026-07-23 (30 días)  
**Trigger recomendado antes de 30 días si**:
- Se implementa H-001 (soft-close)
- Se resuelve H-004 (withdraw validation)
- Se escala a más de 1 instancia API

**Objetivo próxima auditoría**: Resolver fresshness=UNKNOWN → clasificación objetivo B (75-89).
