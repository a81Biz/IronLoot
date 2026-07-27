# ESTADO ACTUAL — PTSA V3
**Última actualización**: 2026-07-27 | **Sesión**: DS-008 — primeras transiciones a VALIDADO

---

## Estado del Sistema

```
Sistema:        IronLoot Auction Platform v1.0.0
Fase actual:    CERTIFICADO — Clase A
Health:         94.0 / 100
Risk:           40 / 100    MODERADO
Confidence:     94.2 / 100  ALTA
Freshness:      FRESH
Productos:      11 de 12 VALIDADOS
```

## Productos

| Estado | Productos |
|---|---|
| **`VALIDADO`** | P-001 · P-002 · P-003 · P-004 · P-005 · P-006 · P-007 · P-008 · P-009 · P-010 · P-011 |
| `IDENTIFICADO` | **P-012** CfdiRecord — sin instancias, bloqueado por H-005 |

`[R38]` exige `rubric = 100` ∧ `¬drift` ∧ `cross_coherence`. Los tres verificados sobre **salida
real**: consultas contra la base con los productos que dejó una corrida completa —dos pagos por
pasarelas de verdad, una subasta que el cron cerró solo, una disputa creada por la API—.

`[R39]` prohíbe llegar por inferencia. Ninguno llegó así.

## Dimensiones

| | Score | Hallazgo activo |
|---|--:|---|
| D1 Dominio | 85 | H-005 — CFDI |
| D2 Arquitectura | 95 | H-008 — CORREGIDA_PARCIAL |
| D3 Observabilidad | 100 | — |
| D4 Documental | 100 | — |

## Hallazgos

| ID | Dim | Estado |
|---|:--|---|
| **H-005** | D1 | **ABIERTA** — el bloqueo no es el PAC: nadie ha decidido quién emite la factura |
| H-008 | D2 | CORREGIDA_PARCIAL — 71 → 27 avisos |
| H-009 | D4 | CORREGIDA |
| H-010 | D1 | CORREGIDA |
| H-011 | D1 | CORREGIDA |
| H-012 | D1 | CORREGIDA — detectado y corregido el mismo día |

**Ninguno cerrado por el agente.** Cinco corregidos esperan validación humana.

## Lo que queda

**Una sola cosa bloquea la certificación plena**: H-005, y no por el PAC sino porque **nadie ha
decidido quién emite la factura**. Las tres opciones están escritas en F-1 § U-005 con lo que exige
cada una.

Con esa decisión: se amplía `CfdiData`, se capturan los datos fiscales, se contrata el PAC, y P-012
puede generarse. Sin ella, ese producto no existe y D1 no pasa de 85.

## Deuda técnica abierta

**TD-015** — 27 avisos que exigen saltos mayores sobre Express (`body-parser` 1→2,
`path-to-regexp` 3→8) o sobre `@nestjs/core`. Es trabajo de plataforma, no de parcheo.
