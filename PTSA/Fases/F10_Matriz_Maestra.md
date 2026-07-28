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

---

## Update U-006 — S-002 (2026-07-27): matriz ejecutiva

```
Sistema:        IronLoot Auction Platform v1.0.0
Health:         81.5 / 100      Clase B
Risk:           100 / 100       CRÍTICO (saturado desde 32 brutos)
Confidence:     90.0 / 100      ALTA
Freshness:      FRESH
Productos:      11 VALIDADO · 1 IDENTIFICADO
Agua Potable:   NO activada (D1 = 85)
```

### Matriz por producto

| ID | Producto | Criticidad | Estado | D1 | D2 | Hallazgos | Impacto de negocio |
|---|---|:--|---|:--|:--|---|---|
| P-001 | Bid | CRÍTICA | VALIDADO | ✅ | ✅ | — | Puja correcta con retención de fondos |
| P-002 | AuctionClose | CRÍTICA | VALIDADO | ✅ | ✅ | — | Cierre, ganador, pedido y avisos |
| P-003 | Order | ALTA | VALIDADO | ✅ | ✅ | — | Registro comercial de la venta |
| P-004 | Payment | CRÍTICA | VALIDADO | ✅ | ✅ | — | Depósito acreditado, traza completa |
| P-005 | WalletTransaction | CRÍTICA | VALIDADO | ✅ | ✅ | — | Balance y fondos retenidos |
| P-006 | Dispute | ALTA | VALIDADO ⚠️ | ✅ | ✅ | — | Validado en DS-008; sin instancias hoy |
| P-007 | Notification | MEDIA | VALIDADO | ✅ | ✅ | — | Aviso al destinatario correcto |
| P-008 | JwtToken | ALTA | VALIDADO | ✅ | ✅ | — | Sesión emitida y verificada |
| P-009 | LedgerEntry | CRÍTICA | VALIDADO | ✅ | ✅ | — | Asiento inmutable que cuadra |
| P-010 | CommissionRecord | MEDIA | VALIDADO | ✅ | ✅ | — | Comisión calculada y registrada |
| P-011 | KycSubmission | ALTA | VALIDADO | ✅ | ✅ | — | Vendedor habilitado sólo con KYC |
| P-012 | CfdiRecord | BAJA | IDENTIFICADO | ⛔ | — | **H-005** | Sin facturación fiscal |

Los tres hallazgos nuevos son **sistémicos**: no se imputan a ningún producto (§13.7). Por eso la
columna de hallazgos está vacía salvo en P-012, y aun así D2 cae a 55.

### Prioridad de actuación (`[R41]`)

| # | Qué | Por qué primero |
|---|---|---|
| **1** | **H-015** — el job de CI | Riesgo 12, el más alto. Ocurre en cada push. Y es la red que dejaría ver lo demás |
| **2** | **H-014** — las migraciones | Riesgo 8, severidad CRITICA. Arreglarlo da además el paso de esquema que H-015 necesita |
| **3** | **H-005** — quién emite la factura | Riesgo 6. Bloquea P-012 y tapa D1 en 85. **Decisión de negocio, no técnica** |
| **4** | **H-016** — la documentación | Riesgo 6, corrección de minutos |

H-015 y H-014 se resuelven bien juntos: el paso de esquema que le falta al job es exactamente la
prueba de que las migraciones funcionan. Arreglar uno sin el otro deja el agujero abierto.

### Corrección — H-017 (mismo día)

```
Health:     77.0 / 100      Clase B
Risk:       100 / 100       CRÍTICO (saturado desde 38 brutos)
Confidence: 90.0 / 100      ALTA
D1 85 · D2 40 · D3 100 · D4 95
```

Prioridad de actuación, revisada:

| # | Qué | Por qué |
|---|---|---|
| **1** | **H-015** — el job de CI | Riesgo 12, el más alto. En cada push. Y es la red que dejaría ver los otros dos |
| **2** | **H-014** — las migraciones | CRITICA. El paso de esquema que H-015 necesita es su propia corrección |
| **3** | **H-017** — la imagen de producción | Se cierra sola en cuanto el pipeline construya y arranque la imagen una vez |
| **4** | **H-005** — quién emite la factura | Decisión de negocio. Bloquea P-012 y tapa D1 en 85 |
| **5** | **H-016** — la documentación | Minutos. Dos casos ya encontrados sin buscarlos |

**Los tres primeros son un solo trabajo.** Esquema, pipeline e imagen son las tres piezas del mismo
camino, y ese camino no se ha recorrido nunca. Recorrerlo una vez, de principio a fin, cierra los
tres y deja el mecanismo que impide que vuelvan.

### Segunda corrección — S-002-R2

```
Health:     76.0 / 100      Clase B
Risk:       100 / 100       CRÍTICO (saturado desde 41 brutos)
Confidence: 90.0 / 100      ALTA
D1 85 · D2 40 · D3 100 · D4 85
```

H-016 sube a ALTA (riesgo 9) y adelanta a H-005 y H-017 en el orden. Prioridad revisada:

| # | Qué | Riesgo |
|---|---|---|
| 1 | **H-015** — el job de CI | 12 CRÍTICO |
| 2 | **H-016** — la tabla de stack del TRD: 5/5 citas rotas, 3/5 versiones falsas | **9 ALTO** |
| 3 | **H-014** — las migraciones | 8 ALTO |
| 4 | **H-005** — quién emite la factura | 6 MEDIO |
| 5 | **H-017** — la imagen de producción | 6 MEDIO |

H-016 sube al segundo puesto **por riesgo**, no por esfuerzo: sigue siendo el más barato de los
cinco. Es un buen primer paso mientras se decide el resto.
