# ESTADO ACTUAL — PTSA V3
**Última actualización**: 2026-07-29 | **Sesión origen de los scores**: S-003 (delta sync)
**Corregido por**: PT-168 — los cuatro hallazgos de S-003 pasaron a `CERRADA` y este derivado seguía
declarándolos activos.

---

## Estado del Sistema

```
Sistema:        IronLoot Auction Platform v1.0.0
Fase actual:    CERTIFICADO — Clase B (scores de S-003, PENDIENTES DE RECÁLCULO)
Health:         88.9 / 100      SUPERADO — se calculó con cinco hallazgos activos; hoy hay uno
Risk:           100 / 100       SUPERADO — Risk_bruto = 35 incluía los cuatro ya cerrados
Confidence:     87.0 / 100      la baja la cobertura, no la evidencia
Freshness:      STALE           medido el 2026-07-29 en d260c80, commits_since_audit = 25
Cobertura:      PARCIAL         D2/D3/D4 al 100 % · D1 al 50 % · D5 al 0 %
```

**Regla del Agua Potable: NO activada** — D1 = 85 ≥ 60. Se dice explícitamente porque `[A4]` lo exige.

### Por qué los scores dicen «SUPERADO» y no un número nuevo

Los cuatro hallazgos que hundieron D2 y D4 en S-003 están corregidos y `CERRADA`, **verificado
ejecutando** (ver abajo). Con eso, la aritmética de `[§Scoring]` daría D2 = 100, D4 = 100 y
`Risk_bruto = 6`.

**Ese número no se escribe aquí, y la razón importa.** Recalcular el Health es una **emisión** de
PTSA, y `CLAUDE.md` es terminante: *PTSA nunca se auto-activa* — `resume PTSA` es un disparador del
humano. Escribir «Health 95.5» sin que ningún instrumento lo haya emitido sería exactamente **H-021**:
afirmar un resultado que nadie midió, dentro del fichero que H-021 enseñó a desconfiar.

Así que se declara lo que es: **los scores de S-003 están superados y esperan el próximo delta sync.**
La frescura pasa a `STALE` por lo mismo — 25 commits después de la medición— y `[A7]` hace de eso un
cap sobre la clasificación, no un adorno.

---

## Dimensiones

| Dim | Score S-003 | Estado hoy | Activos |
|---|---:|---|---|
| D1 Alineación de Dominio | 85 | Estable | **H-005** |
| D2 Integridad Arquitectónica | 80 | **Penalización retirada** — H-021 y H-022 `CERRADA` | — |
| D3 Observabilidad y Recuperación | 100 | Estable | — |
| D4 Fidelidad Documental | 94 | **Penalización retirada** — H-023 y H-024 `CERRADA` | — |
| D5 Fiabilidad Operacional | `SIN_DATOS` | No medible hoy | — |

La regresión de D2 y D4 que S-003 midió era real: cuatro defectos que ya estaban y que ningún
mecanismo señalaba. **Los cuatro se corrigieron el mismo día** (PT-149, PT-153, PT-157, PT-162) y el
humano los cerró con VoBo explícito.

---

## Hallazgos activos: 1

| ID | Dim | Sev | Título | `audit_due` |
|---|:--:|---|---|---|
| **H-005** | D1 | ALTA | CFDI/PAC sin integrar — quién emite la factura | 2026-08-22 |

**Cerrados**: 23 (H-001 … H-004, H-006 … H-024). Ninguno reabierto.

**H-005 es el único hallazgo activo del sistema.** Requiere contratar un PAC ante el SAT y decidir el
modelo fiscal: **ningún PT puede cerrarlo**. Mantiene D1 en 85 y `P-012` en `IDENTIFICADO`. Los tres
modelos posibles, con sus consecuencias técnicas medidas, están en
`docs/implementation/evidence/PT-155/hallazgos.md`.

---

## Los cuatro de S-003, verificados en fuente real (PT-168)

No se leyeron los cierres: se ejecutaron.

| Hallazgo | PT | Comprobación ejecutada | Resultado |
|---|---|---|---|
| **H-021** | PT-149 | `audit:domain` en el contenedor | `cross_coherence_verified = verificado`, 5/5 medidas, exit 0 |
| **H-021** | PT-149 | el mismo con `DATABASE_URL` inalcanzable | `sin_datos` + *«NO es un aprobado»* + **exit 1** |
| **H-022** | PT-153 | `audit:domain` y `audit:reliability` dentro del contenedor | los dos corren; sin `docker: not found` |
| **H-023** | PT-162 | `docker logs ironloot-api \| grep "Duplicate DTO"` | **0** ocurrencias |
| **H-024** | PT-157 | `alcance-de-auditoria-existe.spec.ts` (RULE-28) | verde: las rutas del alcance existen |

Evidencia: `docs/implementation/evidence/PT-168/`.

---

## Productos: 12

`VALIDADO` **11** · `IDENTIFICADO` **1** (P-012 `CfdiRecord`, bloqueado por H-005).

**Ninguno cambia de estado.** Se validaron con evidencia observada (E-025) y `[A6]` los protege; que
hoy no haya datos para revalidarlos no los degrada — pero tampoco cuenta como cobertura nueva.

---

## Por qué el Risk de S-003 marcaba 100, y por qué ya no aplica

`Risk = min(100, Risk_bruto × 4)`, con `Risk_bruto = 35` en S-003. Se satura a partir de 25.

**Lo empujaba la certeza, no la gravedad**: cuatro de los cinco activos tenían `probabilidad = 4`
porque eran deterministas. Retirados los cuatro, queda **H-005** con `impacto 2 × probabilidad 3 = 6`,
que no satura nada.

Se deja escrito el cálculo, no el resultado: lo emite el próximo delta sync.

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

**El impedimento técnico ya no existe**: PT-153 cerró H-022 y los dos checkpoints corren donde vive
npm. Lo que queda es la ventana de datos, no la herramienta.

---

## Siguiente

1. **`resume PTSA`** — un delta sync que recalcule y emita. Es lo único que puede convertir «superado»
   en un número, y sólo lo dispara el humano. 25 commits sin auditar.
2. **H-005** — decisión de negocio y fiscal. Sigue siendo el único hallazgo que ningún PT puede cerrar.
3. **D1 y D5** — requieren una corrida `run-all.sh` y medir justo después.

> **Este fichero es un derivado.** Manda `PTSA/Hallazgos/H-XXX.md`. Lo vigila
> `estado-de-hallazgos-coherente.spec.ts` (**RULE-33**), escrita porque este derivado declaró activos
> cuatro hallazgos cerrados durante una jornada entera sin que nada protestara.
