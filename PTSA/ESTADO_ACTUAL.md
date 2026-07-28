# ESTADO ACTUAL — PTSA V3
**Última actualización**: 2026-07-28 | **Sesión**: S-002 + PT-127…PT-132

---

## Estado del Sistema

```
Sistema:        IronLoot Auction Platform v1.0.0
Fase actual:    CERTIFICADO — Clase A
Health:         94.7 / 100      (76.0 tras la auditoria -> 94.7 tras las correcciones)
Risk:           32 / 100        CONTROLADO
Confidence:     92.0 / 100      ALTA
Freshness:      FRESH
Productos:      11 VALIDADO · 1 IDENTIFICADO
```

```
D1 = 100 − 15 (H-005)  =  85
D2 = 100 −  1 (H-018)  =  99
D3 = 100               = 100
D4 = 100               = 100

Health = (85×0.30)+(99×0.30)+(100×0.30)+(100×0.10) = 94.7
Risk   = min(100, 8 × 4) = 32          Risk_bruto = 6 (H-005) + 2 (H-018)
```

## El camino al despliegue, recorrido entero

Lo que la auditoría encontró fue que **nadie había recorrido nunca el camino de este entorno a
cualquier otro**. Ya está recorrido:

| | Estado |
|---|---|
| **Esquema** | Las migraciones reproducen `schema.prisma`. `audit:schema` lo vigila en CI |
| **Pipeline** | `test-integration` aplica el esquema y **la suite e2e pasa entera** |
| **Imagen** | Las cuatro imágenes de producción arrancan y llegan a `healthy` |
| **Suite e2e** | **16 de 16 suites · 77 tests** |
| **Unitarias** | 660 (API) + 134 (CORE) |

## Hallazgos

| ID | Dim | Sev | Estado |
|---|:--|:--|---|
| **H-005** | D1 | ALTA | **ABIERTA** — nadie ha decidido quién emite la factura |
| **H-018** | D2 | BAJA | **ABIERTA** — endpoint legado sin llamantes; riesgo 2 |
| H-014 | D2 | CRITICA | CORREGIDA (PT-127) |
| H-015 | D2 | ALTA | CORREGIDA (PT-128) |
| H-016 | D4 | ALTA | CORREGIDA (PT-130) |
| H-017 | D2 | ALTA | CORREGIDA (PT-129) |
| H-019 | D2 | ALTA | CORREGIDA (PT-132) |
| H-020 | D1 | ALTA | CORREGIDA (PT-132) |
| H-001…H-013 | — | — | CERRADA con validación humana |

**Seis esperan tu validación.** `[R44]` prohíbe al agente cerrar hallazgos BUG/DOMAIN.

## Lo que queda abierto, y qué necesita cada cosa

1. **H-005** — decisión de negocio y fiscal: quién emite la factura. Tres opciones en F-1 § U-005.
   Es lo único que mantiene D1 en 85, y **ningún PT puede resolverlo**.
2. **H-018** — `/wallet/deposit` y `/payments/checkout` son endpoints **legados sin llamantes**,
   superados por el ciclo de pago (PT-080/PT-087). La decisión no es corregirlos: es **retirarlos**.
   Es una decisión de arquitectura y merece su ADR.

## Los mecanismos que impiden que esto vuelva

| Control | Dónde | Probado al revés |
|---|---|---|
| `audit:schema` — deriva del esquema | `ci.yml: schema-drift`, sin `needs` | sí |
| `audit:observability` — D3 | `ci.yml: observabilidad`, sin `needs` | sí |
| Esquema por migración en el arranque | `entrypoint.dev.sh`; si falla, el arranque falla | sí |
| El job de integración aplica el esquema | verifica PT-127 en cada push | sí |
| Coherencia documentación↔código | `coherencia-documentacion-codigo.spec.ts` | sí |
| Healthcheck de las imágenes | `healthcheck-apunta-a-ruta-real.spec.ts` | sí |
| **Contrato CLIENT↔API** | `rutas-que-el-client-invoca.spec.ts` — SSR **y** JS de navegador | sí |
| **`PATCH` parcial no borra** | `ajustes-parciales.spec.ts` | sí |
| Subasta válida según el DTO de hoy | `auction-helper.spec.ts` | sí |

Dos de ellos cazaron errores del propio agente mientras se escribían: el checkpoint D3 delató dos
`catch` mudos, y dos guardas se acusaron a sí mismas leyendo sus propios comentarios.
