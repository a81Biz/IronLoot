# ESTADO ACTUAL — PTSA V3
**Última actualización**: 2026-07-27 | **Sesión**: DS-007 — tras atender los hallazgos de DS-006

---

## Estado del Sistema

```
Sistema:        IronLoot Auction Platform v1.0.0
Fase actual:    CERTIFICADO — Clase A
Health:         94.0 / 100     (DS-006: 88.0)
Risk:           40 / 100       (DS-006: 100)   MODERADO
Confidence:     93.9 / 100     (DS-006: 93.4)  ALTA
Freshness:      FRESH
Clasificación:  A  —  sin cap
```

> **Es la primera Clase A que se sostiene.** DS-003 emitió A con Confidence 85, que por §15.6 no
> alcanzaba. Esta lo hace con **cobertura del 92 %** y frescura **FRESH**: el número alto viene de
> haber mirado, no de no haber mirado.

## Dimensiones

| | DS-006 | **DS-007** | Hallazgo activo |
|---|--:|--:|---|
| D1 Dominio | 65 | **85** | H-005 — CFDI |
| D2 Arquitectura | 95 | **95** | H-008 — CORREGIDA_PARCIAL |
| D3 Observabilidad | 100 | **100** | — |
| D4 Documental | 100 | **100** | — |

**D1 sube 20 puntos** y se aleja del cap: en DS-006 estaba a 5 puntos de la Regla del Agua Potable.

## Hallazgos

| ID | Dim | Estado | Qué |
|---|:--|---|---|
| **H-005** | D1 | **ABIERTA** | CFDI. El bloqueo no es el PAC: nadie ha decidido quién emite la factura (F-40). **Esperando decisión** |
| H-008 | D2 | CORREGIDA_PARCIAL | 71 → 27 avisos. Quedan 13 paquetes que exigen saltos mayores sobre Express o el framework (TD-015) |
| H-009 | D4 | CORREGIDA | Documentación crítica versionada |
| **H-010** | D1 | **CORREGIDA** | La comisión se registra: 95.00 MXN, coincidiendo al céntimo con el asiento |
| **H-011** | D1 | **CORREGIDA** | La ventana de disputa se cuenta desde `shipments.delivered_at` |

**Ninguno cerrado.** El agente no cierra hallazgos: los cuatro corregidos esperan validación humana.

## Productos

| Estado | Productos |
|---|---|
| `IDENTIFICADO` | Los **doce** |

P-010 subió de `REQUIERE_REVISION` con evidencia post-corrección **observada en la base** (`[R39]`):
se venció una subasta y el cron la cerró solo.

**Ninguno llega a `VALIDADO`**, y el motivo sigue siendo el mismo: `[R38]` exige `rubric = 100` y
**las rúbricas no están definidas en F-1**. Inventarse ese número es lo que `[R39]` prohíbe.

Es lo único que separa a este sistema de la certificación plena, y es trabajo de **F12**.

## Siguiente acción

1. **H-005** — sigue esperando la decisión sobre quién emite la factura. Es lo único que mueve D1.
2. **F12: definir las rúbricas.** Sin ellas ningún producto puede llegar a `VALIDADO`.
3. **TD-015** — los 27 avisos restantes exigen saltos mayores sobre Express (`body-parser` 1→2,
   `path-to-regexp` 3→8) o el propio `@nestjs/core`. Es un trabajo de plataforma, no de parcheo.
