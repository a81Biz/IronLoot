# ESTADO ACTUAL — PTSA V3
**Última actualización**: 2026-07-29 | **Sesión**: S-003 (delta sync)

---

## Estado del Sistema

```
Sistema:        IronLoot Auction Platform v1.0.0
Fase actual:    CERTIFICADO — Clase B
Health:         88.9 / 100      (95.5 -> 88.9 tras el delta sync)
Risk:           100 / 100       SATURADO — por certeza, no por gravedad (ver nota)
Confidence:     87.0 / 100      MEDIA-ALTA — la baja la cobertura, no la evidencia
Freshness:      FRESH           medido el 2026-07-29, commits_since_audit = 0
Cobertura:      PARCIAL         D2/D3/D4 al 100 % · D1 al 50 % · D5 al 0 %
```

**Regla del Agua Potable: NO activada** — D1 = 85 ≥ 60.

---

## Dimensiones

| Dim | Score | Estado | Activos |
|---|---:|---|---|
| D1 Alineación de Dominio | 85 | Estable | H-005 |
| D2 Integridad Arquitectónica | **80** | **Regresión (−20)** | H-021, H-022 |
| D3 Observabilidad y Recuperación | 100 | Estable | — |
| D4 Fidelidad Documental | **94** | **Regresión (−6)** | H-023, H-024 |
| D5 Fiabilidad Operacional | `SIN_DATOS` | No medible hoy | — |

**La regresión de D2 y D4 no la causaron los once PT.** La causaron cuatro defectos que ya estaban
—tres desde antes de esta tanda— y que nadie había mirado. La excepción es H-024, que lo introdujo
PT-141 al archivar los nueve documentos sin seguir esta cita.

---

## Hallazgos activos: 5

| ID | Dim | Sev | Título | `audit_due` |
|---|:--:|---|---|---|
| **H-021** | D2 | ALTA | `cross_coherence_verified = true` con las cinco comprobaciones en error | 2026-09-27 |
| **H-022** | D2 | MEDIA | Los dos checkpoints de delta sync no corren donde vive npm | 2026-10-27 |
| **H-024** | D4 | MEDIA | `audit-scope.yaml` cita cuatro documentos archivados y describe mal las migraciones | 2026-10-27 |
| **H-005** | D1 | ALTA | CFDI/PAC sin integrar — quién emite la factura | 2026-08-22 |
| **H-023** | D4 | BAJA | `UserResponseDto` duplicado en el catálogo OpenAPI | 2027-01-25 |

**Cerrados**: 20 (H-001 … H-020). Ninguno reabierto en esta corrida.

---

## Productos: 12

`VALIDADO` **11** · `IDENTIFICADO` **1** (P-012 `CfdiRecord`, bloqueado por H-005).

**Ninguno cambia de estado.** Se validaron con evidencia observada (E-025) y `[A6]` los protege; que
hoy no haya datos para revalidarlos no los degrada — pero tampoco cuenta como cobertura de S-003.

---

## Por qué el Risk marca 100

`Risk = min(100, Risk_bruto × 4)`, con `Risk_bruto = 35`. Se satura a partir de 25.

**Lo empuja la certeza, no la gravedad**: cuatro de los cinco activos tienen `probabilidad = 4`
porque son deterministas —la ruta rota está rota siempre, el `warn` sale en cada arranque, el
checkpoint falla cada vez que se le invoca desde el contenedor—. Sólo uno es ALTA además de cierto.

Un Risk saturado por tres MEDIA/BAJA ciertas no es el mismo que uno saturado por dos CRÍTICAS. Se
reporta como sale y se explica al lado.

---

## Qué falta medir, y por qué

| Qué | Bloqueo |
|---|---|
| **D1 completo** (7 de 14 reglas sin datos) | La base está casi vacía: 0 subastas, pujas, pedidos y pagos |
| **D5** (Success / Retry / Failure) | Cero ciclos de pago que evaluar |
| **`trace_completeness`** | Cero ciclos liquidados |

**Los tres tienen el mismo bloqueo y la misma salida:** una corrida por navegador (`run-all.sh`)
genera salida real. **Medir D1 y D5 inmediatamente después, antes de que otro reseteo se la lleve** —
`run-all.sh` trunca la base al empezar, y es lo que se llevó la salida de S-002.

Y no se medirá bien mientras H-022 siga abierto: los dos checkpoints que hacen esa medición no corren
en el contenedor.

---

## Siguiente

1. **Los cuatro hallazgos nuevos van a FPGE.** Cambian el orden de FPGE-002, emitido esta misma
   mañana con la compuerta de frescura activada precisamente para esto.
2. **VoBo humano** sobre los nueve PT en `VALIDATION_PENDING` (`[R44]`).
3. **H-005** — decisión de negocio. Sigue siendo el único hallazgo que ningún PT puede cerrar.
