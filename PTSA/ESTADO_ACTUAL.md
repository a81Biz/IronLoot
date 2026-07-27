# ESTADO ACTUAL — PTSA V3
**Última actualización**: 2026-07-27 | **Sesión**: DS-006 — ampliación de cobertura

---

## Estado del Sistema

```
Sistema:        IronLoot Auction Platform v1.0.0
Fase actual:    CERTIFICADO — Clase B
Health:         88.0 / 100     (DS-005: 94.0)
Risk:           100 / 100      (DS-005: 40)   ALTO
Confidence:     93.4 / 100     (DS-005: 63.4) ALTA
Freshness:      FRESH          (era STALE)
Clasificación:  B
```

## Dimensiones

| | DS-005 | **DS-006** | Hallazgos activos |
|---|--:|--:|---|
| D1 Dominio | 85 | **65** | H-005, **H-010**, **H-011** |
| D2 Arquitectura | 95 | **95** | H-008 (CORREGIDA_PARCIAL) |
| D3 Observabilidad | 100 | **100** | — |
| D4 Documental | 100 | **100** | — |

> ⚠️ **D1 = 65 está a 5 puntos del cap.** La Regla del Agua Potable se activa por debajo de 60: un
> solo hallazgo ALTA más en D1 lo deja en 50 y el Health se capa a 50 — **Clase F con la técnica
> intacta**. Es el margen más estrecho que ha tenido este sistema.

## Lo que cambió, y por qué no es lo que parece

**El sistema no ha empeorado. La auditoría ha empezado a mirar.**

- **Confidence sube 30 puntos** (63.4 → 93.4): la cobertura pasa del 50 % al **92 %** —11 de 12
  productos con su salida real auditada— y la frescura de STALE a **FRESH**.
- **Health baja 6** (94.0 → 88.0): auditar de verdad encontró **dos productos que no cumplen**.
- **Risk sube a 100**: tres hallazgos D1 activos, uno de ellos con probabilidad 4 porque ocurre
  siempre.

Es la primera emisión en la que el Confidence es alto **y** honesto: hasta ahora el número era bajo
porque no se había mirado, no porque el sistema fuera dudoso.

## Hallazgos activos

| ID | Dim | Sev | Qué | Estado |
|---|:--|:--|---|---|
| **H-010** | D1 | ALTA | La comisión se cobra (95 MXN en ledger) pero **nunca se registra**: 0 filas en `commission_records`. El informe financiero está ciego a los ingresos | **ABIERTA** (nuevo) |
| **H-005** | D1 | ALTA | CFDI: el bloqueo no es el PAC, es que nadie ha decidido quién emite | ABIERTA |
| **H-011** | D1 | MEDIA | La ventana de disputa se mide desde `updatedAt`, no desde la entrega. Cualquier modificación la reinicia | **ABIERTA** (nuevo) |
| **H-008** | D2 | — | 71 → 63 avisos; vector sin autenticar cerrado | CORREGIDA_PARCIAL |
| **H-009** | D4 | — | Documentación crítica versionada | CORREGIDA |

**Ninguno cerrado.** El agente no cierra hallazgos.

## Productos

**Los 12 salen de `BORRADOR`**, donde llevaban desde el 23-jun.

| Estado | Productos |
|---|---|
| `IDENTIFICADO` | P-001, P-002, P-003, P-004, P-005, P-006, P-007, P-008, P-009, P-011, P-012 |
| `REQUIERE_REVISION` | **P-010** — el producto no se genera |

**Ninguno llega a `VALIDADO`**, y el motivo es concreto: `[R38]` exige `rubric = 100`, y **las
rúbricas no están definidas en F-1**. Sólo hay reglas `CR-XXX` sueltas. Declarar `VALIDADO` sin
rúbrica sería inventarse el número — `[R39]` lo prohíbe expresamente.

Definirlas es trabajo de **F12 (Gobernanza de Dominio)**.

## Siguiente acción

1. **H-010** es el más barato de los tres D1 y el que más sube el Health: invocar
   `calculateForOrder()` donde ya se asienta el `FEE_PLATFORM`.
2. **H-011**: decidir si el negocio mide desde la entrega. Si sí, añadir `delivered_at` y quitar
   los `as any`.
3. **H-005**: sigue esperando la decisión sobre quién emite la factura.
4. **F12**: definir las rúbricas, que es lo único que permite llegar a `VALIDADO`.
