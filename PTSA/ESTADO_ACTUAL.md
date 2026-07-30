# ESTADO ACTUAL — PTSA V3
**Última actualización**: 2026-07-29 | **Sesión origen de los scores**: S-004-M
**Corregido por**: el cierre de H-025, H-026 y H-027 con VoBo humano — los scores quedan **superados**
hasta el próximo `resume PTSA`.

---

## Estado del Sistema

```
Sistema:        IronLoot Auction Platform v1.0.0
Fase actual:    CERTIFICADO — Clase B
Health:         88.0 / 100      SUPERADO — se midió con 4 hallazgos activos; hoy hay 1
Risk:           100 / 100       SUPERADO — Risk_bruto = 34 incluía los tres ya cerrados
Confidence:     97.9 / 100      (83.6 -> 97.9) se cerró el hueco de cobertura
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
| D1 Alineación de Dominio | 85 | Estable | H-005 |
| D2 Integridad Arquitectónica | 85 | **Penalización retirada** — H-025 `CERRADA` | — |
| D3 Observabilidad y Recuperación | 90 | **Penalizaciones retiradas** — H-026 y H-027 `CERRADA` | — |
| D4 Fidelidad Documental | 100 | Estable | — |
| D5 Fiabilidad Operacional | **MEDIDO** | Success 100 % · Retry 0 % · Failure 0 % | — |

**D5 deja de ser `SIN_DATOS` por primera vez.** `health_unstable = false`, ahora **con datos detrás** y no
por ausencia de ellos. Muestra: 3 ciclos, 1 resuelto — se dice para que nadie lea el 100 % como una serie.

**Los scores de D2 y D3 son los de S-004-M**, medidos cuando esos hallazgos estaban abiertos. Con las
penalizaciones retiradas la aritmética daría **D2 = 100 y D3 = 100**, y con ello Health = 95.5. **No se
escribe como resultado**: recalcular es una emisión de PTSA, y PTSA no se auto-activa.

---

## Hallazgos activos: 1

| ID | Dim | Sev | Título | `audit_due` |
|---|:--:|---|---|---|
| **H-005** | D1 | ALTA | CFDI/PAC sin integrar — quién emite la factura | 2026-08-22 |

**Cerrados**: 26 (H-001 … H-004, H-006 … H-027).

**H-005 es el único hallazgo activo del sistema**, y el único que **ningún PT puede cerrar**: necesita un
PAC certificado ante el SAT y una decisión fiscal. Las dos vías de cierre —decidir el modelo, o aceptarlo
como limitación declarada de v1.0— están en `docs/implementation/PENDING_TASKS.md`.

---

## Los tres que se cerraron el 2026-07-29, verificados ejecutando

| Hallazgo | PT | Cómo se comprobó |
|---|---|---|
| **H-025** (D2 ALTA) | PT-177 | El veredicto declara denominador: `0 de 1`, marca `sin filas que comparar` y **sale con 1** |
| **H-026** (D3 MEDIA) | PT-178 | En vivo: Redis en pie → `healthy`; parado → `unhealthy` + «PING sin respuesta en 2000 ms» |
| **H-027** (D3 MEDIA) | PT-176 | En vivo: diez fases sin salida → diez `*** FALLO / NO EJECUTADA ***` y exit 1 |

**Y PT-178 encontró un hallazgo dentro del hallazgo:** con Redis parado, `/health/detailed` **no
respondía** — el `ThrottlerGuard` es global y su almacén es Redis, así que toda petición consultaba Redis
antes de llegar al controlador. **El endpoint que existe para diagnosticar la caída era el que la caída
silenciaba.** Resuelto con `@SkipThrottle()`.

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

`Risk = min(100, Risk_bruto × 4)` con `Risk_bruto = 34` **en S-004-M**. Se satura a partir de 25.

**Ese 34 incluía los tres hallazgos ya cerrados** (12 + 8 + 8). Retirados, queda **H-005 con
`impacto 2 × probabilidad 3 = 6`**, que no satura nada. Se deja el cálculo escrito y **no el resultado**:
lo emite el próximo delta sync.

---

## Qué falta medir, y por qué

**El hueco que quedaba está cubierto.** `R-5.1a` y `R-5.1d` exigían una subasta en `CLOSED`, y la **fase
35** (PT-175) la cierra: en la corrida del 2026-07-29 se midieron las dos con datos reales —pedido 950.00,
comisión 95.00— y las **14 reglas** dieron `CUMPLE`.

Lo que queda por medir es de **volumen, no de mecanismo**: la muestra de D5 son 3 ciclos y 1 resuelto. Un
100 % sobre un caso no es una serie, y se dice para que nadie lo lea como tal.

**Y la lección de la ventana, ya aplicada:** `run-all.sh` trunca la base al empezar. La salida de S-002 y
la de S-003 se perdieron por medir en la sesión siguiente. Esta vez se midió **a continuación, sin
cortar**, y de ahí vienen los 14.3 puntos de Confianza.

---

## Siguiente

1. **`resume PTSA`** — un delta sync que recalcule y emita. Los scores de abajo se midieron con cuatro
   hallazgos activos y hoy hay **uno**. La aritmética daría D2 = 100 y D3 = 100. **No se escribe aquí**:
   recalcular es una emisión, y PTSA no se auto-activa. **Y es buen momento**: la base tiene salida real de
   la corrida del 2026-07-29, así que D1 y D5 se medirían con datos.
2. **H-005** — decisión de negocio y fiscal. Ningún PT puede cerrarlo. Sus dos vías de cierre están
   escritas en `PENDING_TASKS.md`.
3. **La suite ya cierra una subasta**: la fase 35 lo hace, y con ella `R-5.1a` y `R-5.1d` se midieron. El
   hueco de D1 que quedaba está cubierto.

> **Este fichero es un derivado.** Manda `PTSA/Hallazgos/H-XXX.md`. Lo vigila
> `estado-de-hallazgos-coherente.spec.ts` (**RULE-33**), escrita en PT-168 porque este derivado declaró
> activos cuatro hallazgos cerrados durante una jornada entera sin que nada protestara.
