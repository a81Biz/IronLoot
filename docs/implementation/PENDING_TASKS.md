# PENDING_TASKS.md — IronLoot

**FDGE V3** · **Última actualización**: 2026-07-29 (tanda FPGE-003 completada: PT-148…PT-162)
Reconstruido en PT-140 contra el código y contra `HISTORY.log`, y con guarda desde entonces.

> **Por qué se reconstruyó, otra vez.** PT-090 ya lo reconstruyó una vez y F-33 encontró que había
> vuelto a mentir **tres PT después**. La diferencia esta vez no es el barrido: es que
> `coherencia-de-registros.spec.ts` lo vigila. Un registro corregido a mano vuelve a desviarse; uno
> con guarda, no.
>
> Lo que decía y no era cierto está en `archive/PENDING_TASKS-2026-07-28.md`.

---

## Dónde vive un pendiente

**Cada clase tiene un registro que manda. Los demás son derivados y no se editan a mano.**

| Clase | Manda | Derivados |
|---|---|---|
| Trabajo FDGE pendiente o en curso | **este fichero** | `HANDOFF.md` |
| Trabajo terminado | **`HISTORY.log`** — append-only | todo lo demás |
| Deuda técnica | **`10-Technical-Debt.md`** (`TD-XXX`) | `MATRIZ-DEUDA-TECNICA.md` |
| Hallazgos de auditoría | **`PTSA/Hallazgos/H-XXX.md`** | `ESTADO_ACTUAL.md`, `RESUMEN.md` |
| Bloqueantes de auditoría | **`PTSA/PENDIENTES.md`** — un solo bloque vivo | — |
| Priorización | **`ROADMAP.md`** | — |

**Histórico explícito** — se leen, no se actualizan: `FDGE_HALLAZGOS_TRACKER.md`,
`MATRIZ-HALLAZGOS-*.md`, `docs-v2/Informe-Remediacion.md`.

---

## 1. Trabajo pendiente de implementar

**La tanda FPGE-003 (PT-148…PT-162) está hecha.** Doce ejecutados, dos bloqueados por decisión
externa, uno medido y revertido con motivo. Detalle en `HISTORY.log`.

### Esperando una decisión tuya — no es trabajo pendiente, es decisión pendiente

| Qué | Quién decide | Dónde está preparado |
|---|---|---|
| **PT-156** — ¿`/users/:id/ratings` público? Tres alternativas con criterios | Producto | `ENRICHMENT.md` |
| **H-005 / PT-155** — ¿quién emite la factura? Tres modelos con sus consecuencias técnicas | Negocio + fiscal | `evidence/PT-155/hallazgos.md` |
| **PT-141.B** — `[START FOUNDATION]`. Ahora con RULE-29 protegiendo ADR-049 | Tú | — |

### Pendiente de hacer, con dueño claro

| Qué | Nota |
|---|---|
| **Triar el inventario de la imagen base** | PT-150 construyó el escáner y la línea base nace **vacía**. La primera corrida en CI producirá el inventario real (2 críticas y 23 altas según el IDE) y hay que triarlo o corregirlo |
| **Medir D1 y D5 completos** | Exigen base **con historia**. Secuencia: `run-all.sh` → medir **inmediatamente después**, antes de que otro reseteo se la lleve |
| **Los 304 MB de `node_modules` de producción** | Hallazgo nuevo de PT-161: es ahí donde está el peso, no en las dependencias de desarrollo. Otra investigación |
| **Activar y ejercer el TLS local** | PT-158 dejó la configuración lista y **nadie la ha ejercido**. Requiere confiar el certificado (acción sobre la máquina) |
| **`test:guardas` no tiene mecanismo** | Sus patrones pueden dejar de casar en silencio, como pasó al renombrar un fichero en PT-148. Detectado a mano, sin guarda |
| **RULE-30 sólo mira ADMIN** | BASE y CLIENT no usan `data-accion` hoy; si empiezan, la guarda no avisará de que no los mira |

### Bloqueado por algo externo — no se intenta

| Trabajo | Bloqueo |
|---|---|
| CFDI/PAC (TD-001, **H-005**) | Contratar un PAC ante el SAT, y la decisión de PT-155 |
| Stripe y HeyBanco (TD-002) | Credenciales de ambas pasarelas |

---

## 2. Pendiente de validación humana

**El agente no cierra bugs.** Estos PT están terminados y esperan confirmación.

De sesiones anteriores:
`PT-067` · `PT-068` · `PT-073` · `PT-074` · `PT-075` · `PT-076` · `PT-085` · `PT-086` · `PT-087` ·
`PT-088` · `PT-089` · `PT-090` … `PT-104` · `PT-127` · `PT-128` · `PT-129` · `PT-130` · `PT-131` ·
`PT-133` · `PT-135`

**Cerrados el 2026-07-29 con VoBo humano** — la tanda del 2026-07-28/29, los once:

`PT-136` · `PT-137` · `PT-138` · `PT-139` · `PT-142` · `PT-143` · `PT-145` · `PT-146` · `PT-147`
→ **`CLOSED`** (los nueve BUG, validados por el humano; FDGE no deja que los cierre el agente)

`PT-140` · `PT-141` → **`DONE`** (los dos REFACTOR: comportamiento preservado y evidencia)

Registro del cierre en `HISTORY.log`, entrada «PT-136 … PT-147 — VALIDACION HUMANA».

`PT-035` espera además **validación visual**, que no es automatizable: su tarea `T-035.12` sigue en
`VALIDATION_PENDING` por eso.

---

## 3. Lo que este fichero ya no hace

**No duplica `HISTORY.log`.** Duplicarlo fue lo que produjo la divergencia que PT-090 corrigió y F-33
volvió a encontrar. Aquí sólo vive lo pendiente; lo terminado está allí, y una guarda comprueba que
los dos no se contradigan.
