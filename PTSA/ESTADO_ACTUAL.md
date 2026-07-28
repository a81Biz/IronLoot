# ESTADO ACTUAL — PTSA V3
**Última actualización**: 2026-07-27 | **Sesión**: S-002 + PT-127..PT-131

---

## Estado del Sistema

```
Sistema:        IronLoot Auction Platform v1.0.0
Fase actual:    CERTIFICADO — Clase A   (recuperada desde B)
Health:         92.5 / 100      (76.0 tras la auditoria -> 92.5 tras las correcciones)
Risk:           72 / 100        CRITICO
Confidence:     90.0 / 100      ALTA
Freshness:      FRESH
Productos:      11 VALIDADO · 1 IDENTIFICADO
```

## Qué cambió, y por qué

La auditoría S-002 encontró que **el camino de este entorno a cualquier otro no se había recorrido
nunca**: esquema, pipeline e imagen, los tres rotos. Cuatro PT lo han recorrido.

| | Antes | Ahora |
|---|--:|--:|
| D1 Dominio | 85 | **85** |
| D2 Arquitectura | 40 | **90** |
| D3 Observabilidad | 100 | **100** |
| D4 Documental | 85 | **100** |

```
Health = (85×0.30) + (90×0.30) + (100×0.30) + (100×0.10) = 92.5   → Clase A
Risk   = min(100, 18 × 4) = 72                                     Risk_bruto = 6+6+6
```

## Hallazgos

| ID | Dim | Sev | Estado | Riesgo |
|---|:--|:--|---|--:|
| **H-005** | D1 | ALTA | **ABIERTA** — nadie ha decidido quién emite la factura | 6 |
| **H-017** | D2 | ALTA | **CORREGIDA_PARCIAL** — 3 de 4 imágenes arrancan; la del API no | 6 |
| **H-018** | D2 | MEDIA | **ABIERTA** (nuevo) — el depósito devuelve 500 con referencia desconocida | 6 |
| H-014 | D2 | CRITICA | CORREGIDA (PT-127) — verificado: drift 0, sondas 4/4, `reference` UNIQUE | — |
| H-015 | D2 | ALTA | CORREGIDA (PT-128) — verificado: la suite termina sola en 13,2 s | — |
| H-016 | D4 | ALTA | CORREGIDA (PT-130) — verificado: guarda en verde y probada al revés | — |
| H-001…H-013 | — | — | CERRADA con validación humana previa | — |

**Ninguno lo cerró el agente** (`[R44]`). Tres esperan validación humana.

## Lo que queda

1. **H-018** — el 500 del depósito. Necesita su propio Proposal Gate.
2. **H-017** — el quinto bloqueo de la imagen del API: el motor de Prisma no carga pese a estar en
   la imagen. Descartado que falte y que sea caché de capas.
3. **PT-131** — 42 tests e2e prueban un contrato que ya no existe. Abierto en STATE 1-3, esperando
   Gate. Hasta que se haga, `test-integration` queda **rojo**.
4. **H-005** — decisión de negocio y fiscal. Tres opciones en F-1 § U-005.

## Mecanismos nuevos, que es lo que impide que esto vuelva

| Control | Dónde |
|---|---|
| `audit:schema` — deriva del esquema | `ci.yml: schema-drift`, **sin `needs`** |
| `audit:observability` — D3 | `ci.yml: observabilidad`, **sin `needs`** |
| Esquema por migración en el arranque | `entrypoint.dev.sh` — y si falla, el arranque falla |
| El job de integración aplica el esquema | `ci.yml: test-integration` — verifica PT-127 en cada push |
| Guarda de coherencia documentación↔código | `coherencia-documentacion-codigo.spec.ts` |
| Guarda del healthcheck de las imágenes | `healthcheck-apunta-a-ruta-real.spec.ts` |

**Los tres controles se probaron en los dos sentidos.** Y uno cazó un error del propio agente
mientras se escribía: `silent_failure_count` subió a 27 y el checkpoint D3 lo cantó.
