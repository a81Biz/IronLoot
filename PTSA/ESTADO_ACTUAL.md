# ESTADO ACTUAL — PTSA V3
**Última actualización**: 2026-07-28 | **Sesión**: S-002 + PT-127…PT-134

---

## Estado del Sistema

```
Sistema:        IronLoot Auction Platform v1.0.0
Fase actual:    CERTIFICADO — Clase A
Health:         95.5 / 100      (76.0 tras la auditoria -> 95.5 tras el ciclo completo)
Risk:           24 / 100        CONTROLADO
Confidence:     95.0 / 100      ALTA
Freshness:      FRESH
Productos:      11 VALIDADO · 1 IDENTIFICADO
```

```
D1 = 100 − 15 (H-005)  =  85          D2 = 100          D3 = 100          D4 = 100

Health = (85×0.30) + (100×0.30) + (100×0.30) + (100×0.10) = 95.5
Risk   = min(100, 6 × 4) = 24                  Risk_bruto = 6 (H-005, unico activo)
```

## Un solo hallazgo abierto en todo el sistema

**H-005** — nadie ha decidido quién emite la factura. Las tres opciones están en F-1 § U-005.
Es lo único que mantiene D1 en 85 y bloquea P-012, y **ningún PT puede resolverlo**: es una
decisión de negocio y fiscal.

## Hallazgos

| ID | Dim | Estado |
|---|:--|---|
| **H-005** | D1 | **ABIERTA** — decisión de negocio pendiente |
| H-014 · H-015 · H-016 · H-017 · H-018 · H-019 · H-020 | — | **CERRADA** con VoBo humano (2026-07-28) |
| H-001 … H-013 | — | CERRADA en sesiones anteriores |

## Validación por navegador — `E-025`

```
Suite QA completa            127 comprobaciones · 0 fallos
  · cobro REAL en Mercado Pago con traza de 7 pasos y 0 credenciales filtradas
  · orden REAL aprobada en el checkout de PayPal
  · retiro real: KYC → CLABE → holdback → aprobación admin → PAID → rechazo reintegra
  · Firefox y WebKit además de Chromium
Validación dirigida            9 comprobaciones · 0 fallos
```

**La suite corrió después de retirar los endpoints legados.** Que el cobro real pase entero es la
prueba de que se retiró la puerta que sobraba y no la que se usa.

## El camino al despliegue, recorrido entero

| | |
|---|---|
| **Esquema** | Las migraciones reproducen `schema.prisma`; `audit:schema` lo vigila en CI |
| **Pipeline** | El job aplica el esquema y la suite e2e pasa entera — **16/16 suites, 77 tests** |
| **Imagen** | Las cuatro imágenes de producción arrancan y llegan a `healthy` |
| **Unitarias** | 666 (API) + 134 (CORE) |
| **Navegador** | 127 + 9 comprobaciones sobre el stack real |

## Once mecanismos nuevos, todos probados en los dos sentidos

`audit:schema` · `audit:observability` en CI · esquema por migración en el arranque · el job de
integración verifica las migraciones · coherencia documentación↔código · healthcheck de las
imágenes · **contrato CLIENT↔API (SSR y JS de navegador)** · `PATCH` parcial no borra ·
subasta válida según el DTO de hoy · **endpoints legados retirados** · guardas de deuda y CSP
heredadas.

Tres cazaron errores del propio agente mientras se escribían.
