# ESTADO ACTUAL — PTSA V3
**Última actualización**: 2026-07-29 | **Sesión**: S-004 (delta sync)

---

## Estado del Sistema

```
Sistema:        IronLoot Auction Platform v1.0.0
Fase actual:    CERTIFICADO — Clase B
Health:         89.5 / 100      (88.9 -> 89.5)
Risk:           100 / 100       SATURADO por un punto — por certeza, no por gravedad (ver nota)
Confidence:     83.6 / 100      (87.0 -> 83.6) la baja la cobertura, no la evidencia
Freshness:      FRESH           medido el 2026-07-29 en HEAD, commits_since_audit = 0
Cobertura:      PARCIAL         D2/D3/D4 al 100 % · D1 al 7 % · D5 al 0 %
```

**Regla del Agua Potable: NO activada** — D1 = 85 ≥ 60. Se dice porque `[A4]` lo exige.

**Por qué no es Clase A**, que es la pregunta natural con un Health de 89.5: hacen falta Health ≥ 90 **y**
Confidence ≥ 90 (§15.6). Falta medio punto de Health y **6.4 de Confianza**, y la Confianza la hunde la
cobertura de D1 — la base está vacía.

---

## Dimensiones

| Dim | Score | Estado | Penaliza hoy |
|---|---:|---|---|
| D1 Alineación de Dominio | 85 | Estable | H-005 |
| D2 Integridad Arquitectónica | **85** | **Mejora (+5)** | H-025 |
| D3 Observabilidad y Recuperación | **95** | **Regresión (−5)** | H-026 |
| D4 Fidelidad Documental | **100** | **Mejora (+6)** | — |
| D5 Fiabilidad Operacional | `SIN_DATOS` | No medible hoy | — |

**D4 vuelve a 100** porque PT-168…PT-172 cerraron los cinco defectos de registro que encontró la revisión
de coherencia. **D2 sube 5** —se retiran H-021 y H-022— y **baja 15 otra vez** por H-025, que es el mismo
patrón en el mismo fichero. **D3 baja 5** por H-026, que no es nuevo en el código: es nuevo en haberlo
mirado.

---

## Hallazgos activos: 3

| ID | Dim | Sev | Título | `audit_due` |
|---|:--:|---|---|---|
| **H-025** | D2 | ALTA | `cross_coherence_verified = verificado` sobre una base con cero filas | 2026-09-27 |
| **H-005** | D1 | ALTA | CFDI/PAC sin integrar — quién emite la factura | 2026-08-22 |
| **H-026** | D3 | MEDIA | El endpoint de diagnóstico dice «degraded» siempre; Redis no se puede observar | 2026-10-29 |

**Cerrados**: 23 (H-001 … H-004, H-006 … H-024). Ninguno reabierto en esta corrida.

**Los dos nuevos son corregibles y no dependen de nadie de fuera.** H-005 sí: necesita un PAC y una
decisión fiscal.

---

## Los cuatro de S-003, verificados en fuente real

No se leyeron los cierres: se ejecutaron.

| Hallazgo | PT | Comprobación ejecutada | Resultado |
|---|---|---|---|
| **H-021** | PT-149 | `audit:domain` en el contenedor | `verificado`, 5/5 medidas, exit 0 |
| **H-021** | PT-149 | el mismo con `DATABASE_URL` inalcanzable | `sin_datos` + *«NO es un aprobado»* + **exit 1** |
| **H-022** | PT-153 | `audit:domain` y `audit:reliability` dentro del contenedor | los dos corren; sin `docker: not found` |
| **H-023** | PT-162 | `docker logs \| grep "Duplicate DTO"` | **0** ocurrencias |
| **H-024** | PT-157 | `alcance-de-auditoria-existe.spec.ts` (RULE-28) | verde |
| **H-014** | PT-127 | `_prisma_migrations` + `audit:schema` con base sombra | 2 migraciones aplicadas **y reproducen el modelo** |

Evidencia: `E-029`, `E-030`, `E-031` y `docs/implementation/evidence/PT-168/`.

---

## Productos: 12

`VALIDADO` **11** · `IDENTIFICADO` **1** (P-012 `CfdiRecord`, bloqueado por H-005).

**Ninguno cambia de estado.** `[A6]` protege la validación observada en E-025; que hoy no haya datos para
revalidarlos no los degrada, pero tampoco cuenta como cobertura de S-004.

---

## Por qué el Risk marca 100

`Risk = min(100, Risk_bruto × 4)` con `Risk_bruto = 26`. Se satura a partir de 25: lo hace **por un
punto**.

**Lo empuja la certeza, no la gravedad.** Los tres son deterministas —el veredicto sale verde en cada
corrida sobre la base vacía, el endpoint dice `degraded` en cada consulta, el CFDI no se emite nunca—.
Dos son ALTA, **ninguno es CRÍTICA**. Un Risk saturado así no es el mismo que uno saturado por dos
CRÍTICAS, y por eso se explica al lado en vez de reportarlo a secas.

---

## Qué falta medir, y por qué

| Qué | Bloqueo |
|---|---|
| **D1 completo** (13 de 14 reglas sin datos) | La base está **vacía**: 0 usuarios, subastas, pujas, pedidos, pagos |
| **D5** (Success / Retry / Failure) | Cero ciclos de pago que evaluar |
| **`trace_completeness`** | Cero ciclos liquidados |

**La cobertura de D1 empeoró respecto a S-003** —de 7 reglas medidas a 1— y la causa no es el código:
otro reseteo dejó la base a cero. Es la única razón de que la Confianza baje en una corrida que cerró
cuatro hallazgos.

**El impedimento técnico no existe desde PT-153**: los dos checkpoints corren donde vive npm. Lo que
falta son **datos**.

**La salida, y su ventana:** una corrida `run-all.sh` genera salida real y **hay que medir D1 y D5
inmediatamente después**. `run-all.sh` trunca la base al empezar, y es lo que se llevó la salida de S-002
y la de S-003. Dos veces es un patrón, no un accidente.

---

## Siguiente

1. **H-025 y H-026 a FDGE.** Corregibles, sin dependencias externas. H-025 es ALTA y está dentro del
   instrumento que esta auditoría usa para medir.
2. **`run-all.sh` y medir D1/D5 justo después.** Es lo único que sube la Confianza.
3. **H-005** — decisión de negocio y fiscal. Ningún PT puede cerrarlo.

> **Este fichero es un derivado.** Manda `PTSA/Hallazgos/H-XXX.md`. Lo vigila
> `estado-de-hallazgos-coherente.spec.ts` (**RULE-33**), escrita en PT-168 porque este derivado declaró
> activos cuatro hallazgos cerrados durante una jornada entera sin que nada protestara.
