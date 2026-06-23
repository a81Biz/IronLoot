# F9 — Consolidación de Hallazgos

**Estado**: COMPLETADA  
**Fecha**: 2026-06-23  
**Sesión**: S-001

---

## Inventario de Hallazgos

| ID | Dimensión | Producto | Severidad | Penalización | Estado |
|---|---|---|---|---|---|
| H-001 | D1 | P-001 (Bid) | ALTA | -15 | ABIERTA |
| H-002 | D2 | P-003 (RateLimit) | MEDIA | -5 | ABIERTA |
| H-003 | D2 | P-004 (PaymentWebhook) | BAJA | -1 | ABIERTA |
| H-004 | D2 | P-005 (WalletTransaction) | MEDIA | -5 | ABIERTA |
| H-005 | D1 | P-009 (CfdiRecord) | ALTA | -15 | ABIERTA |
| H-006 | D2 | P-010 (PageRenderSSR) | MEDIA | -5 | ABIERTA |
| H-007 | D4 | P-005 (WalletTransaction) | BAJA | -1 | ABIERTA |

**Total hallazgos**: 7  
**Distribución**: D1: 2, D2: 4, D3: 0, D4: 1, D5: 0

---

## Cálculo de Scores por Dimensión

### D1 — Domain Alignment
```
100 - 15 (H-001) - 15 (H-005) = 70
```

### D2 — Architectural Integrity
```
100 - 5 (H-002) - 1 (H-003) - 5 (H-004) - 5 (H-006) = 84
```

### D3 — Observability & Recovery
```
100 (sin hallazgos en D3)
```

### D4 — Documentary Fidelity
```
100 - 1 (H-007) = 99
```

### D5 — Operational Reliability
```
NO_APLICA para hallucination/drift (sistema determinista)
D5 no aporta imputs cuantificables en esta auditoría
health_unstable = false
```

---

## Cálculo de Health Score

```
Health = (D1×0.30) + (D2×0.30) + (D3×0.30) + (D4×0.10)
       = (70×0.30) + (84×0.30) + (100×0.30) + (99×0.10)
       = 21.0 + 25.2 + 30.0 + 9.9
       = 86.1
```

**Regla del Agua Potable**: D1 = 70 ≥ 60 → **NO ACTIVADA**  
→ Health = **86.1**

---

## Cálculo de Risk Score

Risk bruto por hallazgo (Impacto × Probabilidad):
```
H-001: 3 × 3 = 9  (D1/Bid — soft-close hardcoded)
H-002: 2 × 2 = 4  (D2/Rate — in-memory throttler)
H-003: 1 × 2 = 2  (D2/Logger — payments no traceId)
H-004: 2 × 3 = 6  (D2/Wallet — withdraw mock)
H-005: 2 × 3 = 6  (D1/CFDI — compliance fiscal)
H-006: 2 × 2 = 4  (D2/SSR — apiUrl browser)
H-007: 1 × 1 = 1  (D4/Doc — PRD AC-3.2)

Risk_bruto = 9+4+2+6+6+4+1 = 32
Risk_Score = min(100, 32 × 4) = min(100, 128) = 100
```

**Risk Score = 100 → CRÍTICO**

*Nota: Risk_Score=100 refleja que la suma de riesgos acumulados supera el umbral máximo. El riesgo individual más alto es H-001 (9) y H-004/H-005 (6 c/u). No hay un único riesgo catastrófico sino acumulación de riesgos medios-altos.*

---

## Cálculo de Confidence Score

```
coverage       = 0.70  (sin DB en vivo ni logs en vivo — BLQ-001/BLQ-002)
freshness      = 0     (UNKNOWN — primera auditoría, sin historial)
evidence_validity = 0.85 (E-001 a E-008, código fuente directo, fingerprint estructural)
autonomy       = 0.70  (directamente leído del código, sin ejecución de diagnósticos en vivo)

Confidence = (0.70×0.40) + (0×0.25) + (0.85×0.20) + (0.70×0.15)
           = 0.28 + 0.00 + 0.17 + 0.105
           = 0.555
           = 55.5%
```

**Confidence = 55 → BAJA**

---

## Clasificación

```
Health = 86.1 → Clase B (75-89)
PERO: freshness = UNKNOWN → cap a Clase C
```

**Clasificación = C** (capada por freshness UNKNOWN según [R30])

---

## Top findings por impacto en Health

1. **H-001** (D1, -15pts): Soft-close hardcoded → mayor impacto unitario en D1 (30% peso)
2. **H-005** (D1, -15pts): CFDI stub → impacto equivalente a H-001 en D1
3. **H-002/H-004/H-006** (D2, -5pts c/u): Cluster de riesgos arquitecturales en D2

---

## Quick Wins (alto impacto / bajo esfuerzo)

1. **H-001**: 1 cambio en BidsService — leer config en lugar de constante literal. Recupera D1 hacia 85.
2. **H-003**: 1 línea en PaymentsService — cambiar import de Logger a StructuredLogger. Elimina finding D2.
3. **H-007**: 1 línea en PRD — corregir AC-3.2. Elimina finding D4.
