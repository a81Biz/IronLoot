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

---

## Update U-006 — S-002 (2026-07-27): consolidación de la corrida completa

### Hallazgos, estado tras S-002

| ID | Dim | Tipo | Sev | Estado | Pen. | Riesgo |
|---|:--|:--|:--|---|--:|--:|
| **H-014** | D2 | BUG | **CRITICA** | **ABIERTA** (nuevo) | 30 | 4×2 = **8** ALTO |
| **H-015** | D2 | BUG | ALTA | **ABIERTA** (nuevo) | 15 | 3×4 = **12** CRÍTICO |
| **H-016** | D4 | PROCESS | MEDIA | **ABIERTA** (nuevo) | 5 | 2×3 = **6** MEDIO |
| H-005 | D1 | DOMAIN_RULE | ALTA | ABIERTA | 15 | 2×3 = **6** MEDIO |
| H-008 | D2 | TECHNICAL | ALTA | CERRADA | — | — |
| H-009 | D4 | PROCESS | MEDIA | CERRADA | — | — |
| H-010 · H-011 · H-012 | D1 | DOMAIN_RULE | — | CERRADA | — | — |
| H-013 | D2 | BUG | ALTA | CERRADA | — | — |

**Ninguno se cerró en esta sesión.** Los tres nuevos son BUG/PROCESS abiertos; los cerrados lo
estaban ya con validación humana previa (HISTORY.log, «PT-114 … PT-122 — VALIDACION»).

### Criterio de «activo» aplicado — declarado, porque la especificación no lo fija

La especificación define «activo» para riesgo (§14, línea sobre riesgo residual) pero no para el
score dimensional. Se aplica el criterio que las sesiones anteriores de este repositorio ya venían
usando, y se deja escrito:

* `ABIERTA` → penaliza el score completo.
* `CORREGIDA_PARCIAL` → penaliza una fracción, declarada caso a caso.
* `CORREGIDA` / `VERIFICADA` → **no** penaliza el score; sí suma riesgo residual hasta
  `VERIFICADA`/`CERRADA` (§14, riesgo residual).
* `CERRADA` → no penaliza nada.

### Scores por dimensión

```
D1 = 100 − 15                = 85     (H-005)
D2 = 100 − 30 − 15           = 55     (H-014, H-015)
D3 = 100                     = 100    (sin hallazgos)
D4 = 100 − 5                 = 95     (H-016)
```

### Health

```
Health = (85 × 0.30) + (55 × 0.30) + (100 × 0.30) + (95 × 0.10)
       = 25.5 + 16.5 + 30.0 + 9.5
       = 81.5
```

**Regla del Agua Potable: NO activada.** D1 = 85 ≥ 60. Se dice explícitamente porque `[A4]` lo
exige: el dominio no está capando nada aquí. Lo que baja el Health es D2.

### Risk

```
Risk_bruto = 8 (H-014) + 12 (H-015) + 6 (H-016) + 6 (H-005) = 32
Risk_Score = min(100, 32 × 4) = 100
```

**Léase con cuidado.** §14.4 satura a los 25 puntos brutos, así que 32 y 80 dan el mismo 100. Aquí
«CRÍTICO» significa «por encima del umbral de saturación», no «lo peor imaginable». Los dos
contribuyentes grandes son H-015 (12, ocurre en cada push) y H-014 (8).

### Confidence

```
Confidence = 80×0.40 + 100×0.25 + 90×0.20 + 100×0.15 = 90.0
```

| Factor | Valor | Por qué |
|---|--:|---|
| `coverage` | 80 | 10 de 12 productos con salida real; esquema y superficie completos; F7 sólo parcial |
| `freshness` | 100 | verificado hoy, 0 commits desde la verificación |
| `evidence_validity` | 90 | evidencias nuevas de primera mano; E-015 sigue válida como captura pero no es reproducible (base reconstruida) |
| `autonomy` | 100 | shell, BD, logs y API en vivo; todo lo ejecutó el auditor |

### Clasificación

Health 81.5 → **Clase B** (75–89). Confidence 90 ≥ 90: no aplica la degradación de §15.6.
`health_unstable = false`. `freshness = FRESH`. **Sin cap adicional.**

### Corrección de esta misma consolidación — H-017

Al comprobar la salud del sistema al cierre de la sesión apareció un cuarto hallazgo: **H-017**
(D2, ALTA, penalización 15) — el healthcheck de la imagen de producción apunta a un 404, tres de
los cuatro servicios no tienen imagen de producción, y el job `docker` construye un fichero que no
existe. Evidencia E-021.

Los scores de arriba quedan sustituidos por estos:

```
D1 = 100 − 15                     = 85
D2 = 100 − 30 − 15 − 15           = 40      (H-014, H-015, H-017)
D3 = 100                          = 100
D4 = 100 − 5                      = 95

Health = (85×0.30)+(40×0.30)+(100×0.30)+(95×0.10)
       = 25.5 + 12.0 + 30.0 + 9.5
       = 77.0                     → Clase B (75–89), por poco

Risk_bruto = 6 (H-005) + 8 (H-014) + 12 (H-015) + 6 (H-016) + 6 (H-017) = 38
Risk_Score = min(100, 38 × 4) = 100
```

Regla del Agua Potable: sigue **NO** activada (D1 = 85). Confidence: **90.0**, sin cambio — el
hallazgo se encontró con las mismas fuentes y no altera cobertura, frescura, validez ni autonomía.

Se deja el cálculo anterior visible en vez de sobrescribirlo: `[A6]`, las revisiones se añaden.

### Segunda corrección — revisión S-002-R2 (H-016 de MEDIA a ALTA)

Una objeción humana llevó a verificar las cinco filas de la tabla de stack de `03-TRD.md`, no sólo
la de NestJS. **5 de 5 citas apuntan a la línea equivocada; 3 de 5 versiones son falsas.** El
mecanismo de verificabilidad del documento está muerto.

`H-016: MEDIA (5) → ALTA (15)`. Impacto 2→3. Riesgo 6 MEDIO → 9 ALTO.

Los cálculos anteriores quedan sustituidos por estos (se dejan visibles, `[A6]`):

```
D1 = 85 · D2 = 40 · D3 = 100 · D4 = 100 − 15 = 85

Health = (85×0.30)+(40×0.30)+(100×0.30)+(85×0.10)
       = 25.5 + 12.0 + 30.0 + 8.5 = 76.0          → Clase B

Risk_bruto = 6 (H-005) + 8 (H-014) + 12 (H-015) + 9 (H-016) + 6 (H-017) = 41
Risk_Score = min(100, 41 × 4) = 100               (saturado)

Confidence = 90.0                                  (sin cambio)
```

Y una corrección de redacción, no de medición: **la migración a NestJS 11 sí está documentada** en
`docs/implementation/` (PT-126). H-016 es sobre `docs/enterprise-documentation/`, corpus distinto.
E-020 estaba escrita de forma que podía leerse al revés.
