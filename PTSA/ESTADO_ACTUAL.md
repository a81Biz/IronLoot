# ESTADO ACTUAL — PTSA V3
**Última actualización**: 2026-07-29 | **Sesión**: S-004-M (medición dirigida D1 + D5, sobre S-004)

---

## Estado del Sistema

```
Sistema:        IronLoot Auction Platform v1.0.0
Fase actual:    CERTIFICADO — Clase B
Health:         88.0 / 100      (89.5 -> 88.0) baja por un hallazgo nuevo, no por una regresión
Risk:           100 / 100       SATURADO — por certeza, no por gravedad (ver nota)
Confidence:     97.9 / 100      (83.6 -> 97.9) SUBE 14.3 — se cerró el hueco de cobertura
Freshness:      FRESH           medido el 2026-07-29, commits_since_audit = 0
Cobertura:      CASI COMPLETA   D2/D3/D4/D5 al 100 % · D1 al 86 % (12 de 14 reglas)
```

**Regla del Agua Potable: NO activada** — D1 = 85 ≥ 60. Se dice porque `[A4]` lo exige.

**Por qué no es Clase A:** ahora **la Confianza ya no es el obstáculo** —97.9 supera de sobra el ≥ 90 de
§15.6—. Lo que falta son **2 puntos de Health**, y los tienen los cuatro hallazgos activos. Es la primera
vez que la clasificación depende sólo de defectos y no de lo que la auditoría no pudo mirar.

---

## Lo que hizo la medición dirigida

`run-all.sh` generó salida real y **D1, D5 y D3 se midieron en la misma sesión** — la ventana se había
cerrado dos veces (S-002, S-003) porque la suite trunca la base al empezar.

| | S-004 | **S-004-M** |
|---|---|---|
| Reglas de dominio medidas | 1 de 14 | **12 de 14, las 12 cumplen** |
| D5 (Success / Retry / Failure) | `SIN_DATOS` | **medido**: 100 % / 0 % / 0 % |
| `trace_completeness` | SIN CICLOS | **100 %** |
| Confianza | 83.6 | **97.9** |

Y encontró un defecto: **H-027**.

---

## Dimensiones

| Dim | Score | Estado | Penaliza hoy |
|---|---:|---|---|
| D1 Alineación de Dominio | 85 | Estable — pero ahora **medido al 86 %** | H-005 |
| D2 Integridad Arquitectónica | 85 | Estable | H-025 |
| D3 Observabilidad y Recuperación | **90** | **Regresión (−5)** | H-026, H-027 |
| D4 Fidelidad Documental | 100 | Estable | — |
| D5 Fiabilidad Operacional | **MEDIDO** | Success 100 % · Retry 0 % · Failure 0 % | — |

**D5 deja de ser `SIN_DATOS` por primera vez.** `health_unstable = false`, ahora **con datos detrás** y no
por ausencia de ellos. Muestra: 3 ciclos, 1 resuelto — se dice para que nadie lea el 100 % como una serie.

**D3 baja otros 5** por H-027, detectado al leer el resumen de la propia suite que generó los datos.

---

## Hallazgos activos: 4

| ID | Dim | Sev | Título | `audit_due` |
|---|:--:|---|---|---|
| **H-025** | D2 | ALTA | `cross_coherence_verified = verificado` sin comparar filas | 2026-09-27 |
| **H-005** | D1 | ALTA | CFDI/PAC sin integrar — quién emite la factura | 2026-08-22 |
| **H-026** | D3 | MEDIA | `/health/detailed` dice «degraded» siempre; Redis no se puede observar | 2026-10-29 |
| **H-027** | D3 | MEDIA | El `RESUMEN FINAL` de la suite QA omite la fase que falla | 2026-10-29 |

**Cerrados**: 23 (H-001 … H-004, H-006 … H-024).

**Tres de los cuatro son corregibles y no dependen de nadie de fuera.** H-005 sí: necesita un PAC y una
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

`Risk = min(100, Risk_bruto × 4)` con `Risk_bruto = 34`. Se satura a partir de 25.

**Lo empuja la certeza, no la gravedad.** Los cuatro son deterministas —el veredicto no distingue en
ninguna corrida, el endpoint dice `degraded` en cada consulta, el resumen omite cualquier fase que falle,
el CFDI no se emite nunca—. Dos son ALTA, dos MEDIA, **ninguno es CRÍTICA**. Un Risk saturado así no es el
mismo que uno saturado por dos CRÍTICAS, y por eso se explica al lado en vez de reportarlo a secas.

---

## Qué falta medir, y por qué

| Qué | Bloqueo |
|---|---|
| **`R-5.1a`** — toda subasta cerrada con pujas genera pedido | **0 subastas en `CLOSED`**: la suite no espera los 120 s de la ventana de cierre |
| **`R-5.1d`** — toda venta liquidada registra su comisión | Lo mismo: sin cierre no hay pedido, ni liquidación, ni comisión |

**Es el único hueco que queda en D1, y es de la suite, no del producto.** Las dos reglas salen `n/d`, no
`VIOLADA`: se comprobó que hay 0 subastas `CLOSED` antes de concluir nada.

**Con ellas se cubriría también** el pedido (P-003), la comisión (P-010) y las cuatro comprobaciones de
coherencia inter-producto que hoy comparan cero filas — que es la mitad de lo que hace grave a H-025.

**Lo que hace falta:** una corrida que **cierre una subasta**. Es una ampliación de la suite QA, no un
arreglo del sistema.

**Y la lección de la ventana, ya aplicada:** `run-all.sh` trunca la base al empezar. La salida de S-002 y
la de S-003 se perdieron por medir en la sesión siguiente. Esta vez se midió **a continuación, sin
cortar**, y de ahí vienen los 14.3 puntos de Confianza.

---

## Siguiente

1. **H-025, H-026 y H-027 a FDGE.** Los tres son corregibles y sin dependencias externas. H-025 es ALTA y
   está dentro del instrumento que esta auditoría usa para medir.
2. **Ampliar la suite para que cierre una subasta.** Cerraría el último hueco de D1 y daría filas reales a
   las cuatro comprobaciones de coherencia.
3. **H-005** — decisión de negocio y fiscal. Ningún PT puede cerrarlo.

> **Este fichero es un derivado.** Manda `PTSA/Hallazgos/H-XXX.md`. Lo vigila
> `estado-de-hallazgos-coherente.spec.ts` (**RULE-33**), escrita en PT-168 porque este derivado declaró
> activos cuatro hallazgos cerrados durante una jornada entera sin que nada protestara.
