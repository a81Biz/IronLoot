# PENDING_TASKS.md — IronLoot

**FDGE V3** · **Última actualización**: 2026-07-29 (PT-140 — reconstruido contra el código y contra
`HISTORY.log`, y ahora con guarda)

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

| Trabajo | Qué | Estado |
|---|---|---|
| **PT-141** | La documentación oficial única. `.A` (ADR-049, `CLAUDE.md`, las dos citas rotas a `PTSA/Motor-PTSA.md` y `PTSA/PTSA.md`) y `.B` (`[START FOUNDATION]`, ya desbloqueado) | Paquete escrito, sin empezar |
| **TD-016** | Nada comprueba vulnerabilidades de la **imagen base**. `audit:check` sólo mira npm. Ahora que las imágenes se construyen en CI (PT-147) es más barato de cerrar | Abierta |
| **F-136-A** | Documentos que citan evidencia que **no está en el repositorio**: de 162 ficheros de `evidence/`, 83 seguidos. `PENDING_TASKS` llegó a mandar leer `regresion.txt`, ausente | Sin PT |

### Menores, medidos y sin PT asignado

| Qué | Dónde salió |
|---|---|
| La guarda del contrato SSR↔API cubre **sólo CLIENT**; faltan ADMIN y BASE | S-002 |
| La suite QA corre sobre **HTTP**: lo que dependa de origen seguro no queda ejercido | S-002-V |
| `/api/v1/users/:id/ratings` exige sesión; la reputación es lo que se mira **antes** de registrarse | S-002-V. Decisión humana |
| `pages-moderation.js` usa `style.display` para su modal — funciona, pero es el patrón contra el que avisa RULE-19 | PT-139 |
| La imagen del API se lleva dependencias de desarrollo (541 MB) | S-002 |

### Bloqueado por algo externo — no se intenta

| Trabajo | Bloqueo |
|---|---|
| CFDI/PAC (TD-001, **H-005**) | Contratar un PAC certificado ante el SAT, y decidir **quién emite la factura** |
| Stripe y HeyBanco (TD-002) | Credenciales de ambas pasarelas |

---

## 2. Pendiente de validación humana

**El agente no cierra bugs.** Estos PT están terminados y esperan confirmación.

De sesiones anteriores:
`PT-067` · `PT-068` · `PT-073` · `PT-074` · `PT-075` · `PT-076` · `PT-085` · `PT-086` · `PT-087` ·
`PT-088` · `PT-089` · `PT-090` … `PT-104` · `PT-127` · `PT-128` · `PT-129` · `PT-130` · `PT-131` ·
`PT-133` · `PT-135`

De la tanda del 2026-07-28/29, con evidencia en `evidence/PT-XXX/medicion.md` y `self-review.md`:

| PT | Qué cerró |
|---|---|
| **PT-136** | El CI que no se había ejecutado **nunca** |
| **PT-137** | `REDIS_URL` como contrato único |
| **PT-138** | Las guardas y checkpoints, donde vive npm |
| **PT-139** | Dos controles muertos de ADMIN |
| **PT-140** | Este fichero, y su guarda |
| **PT-142** | La creación perezosa del monedero |
| **PT-143** | El aislamiento de la suite e2e |
| **PT-145** | Dos duplicados sin restricción |
| **PT-146** | Dos depósitos simultáneos, uno perdido |
| **PT-147** | Las imágenes, construidas y arrancadas |

`PT-035` espera además **validación visual**, que no es automatizable: su tarea `T-035.12` sigue en
`VALIDATION_PENDING` por eso.

---

## 3. Lo que este fichero ya no hace

**No duplica `HISTORY.log`.** Duplicarlo fue lo que produjo la divergencia que PT-090 corrigió y F-33
volvió a encontrar. Aquí sólo vive lo pendiente; lo terminado está allí, y una guarda comprueba que
los dos no se contradigan.
