# PENDING_TASKS.md — IronLoot

**FDGE V3** · **Última actualización**: 2026-07-27 (PT-090 — reconstruido contra el código)

> **Por qué se reconstruyó.** Llevaba congelado desde el 2026-07-25 con 14 PT posteriores sin
> reflejar, y marcaba `PENDING` cuatro trabajos que estaban implementados. Un registro que miente
> hace que se priorice mal. Cada estado de abajo se comprobó **contra el código**, no contra otro
> documento. La versión anterior se conserva en `archive/PENDING_TASKS-2026-07-25.md`.

---

## 1. Trabajo realmente pendiente

El orden y el detalle viven en **`MATRIZ-DEUDA-TECNICA.md`**, que es el documento que manda.
Aquí solo el índice.

> **Actualizado por PT-103 (2026-07-27).** Los quince PT de la matriz estan implementados; lo que
> queda es validacion humana (seccion 2). Este indice llevaba nueve trabajos como `PENDING` que ya
> estaban hechos — el mismo desfase que F-33 encontro en el registro de deuda, en otro fichero.

| PT | Qué | Estado |
|---|---|---|
| **PT-104** | `QA-PP-09` mide un delta de saldo que otra fase puede tocar (F-35) | PENDING |
| **TD-014** | `style-src 'unsafe-inline'` sigue en los tres sitios | PENDING |
| — | *Nada mas pendiente de implementar.* Lo demas espera validacion (§2) | — |

### Bloqueado por algo externo — no se intenta

| Trabajo | Bloqueo |
|---|---|
| CFDI/PAC (TD-001, H-005, R-002) | Contratar un PAC certificado ante el SAT |
| Stripe y HeyBanco (TD-002) | Credenciales de ambas pasarelas |

---

## 2. Pendiente de validación humana

**El agente no cierra bugs.** Estos PT están terminados y esperan confirmación:

`PT-067` · `PT-068` · `PT-073` · `PT-074` · `PT-075` · `PT-085` · `PT-086` · `PT-087` · `PT-088` · `PT-089`

Y los quince de la matriz, con su guia en `VALIDACION-PT-090-101.md`:

`PT-090` · `PT-091` · `PT-092` · `PT-093` · `PT-094` · `PT-095` · `PT-096` · `PT-097` · `PT-098` ·
`PT-099` · `PT-100` · `PT-101` · `PT-102` · `PT-103`

> **PT-090** y **PT-096** estuvieron bloqueados por F-33 y F-34; PT-103 y PT-102 los desbloquean.
> **PT-098** vuelve a ser demostrable en cuanto se valide PT-102.

`PT-035` (design system) espera además **validación visual**, que no es automatizable: su tarea
`T-035.12` sigue en `VALIDATION_PENDING` por eso.

---

## 3. Corregido en PT-090 — figuraba pendiente y no lo estaba

| Decía | Realidad, con su prueba |
|---|---|
| `PT-026` PENDING — soft-close hardcodeado | **Hecho.** `bids.service.ts:112` calcula `extensionMs` desde `SystemConfigService`, inyectado en `:38` |
| `PT-029` PENDING — falta `UserPaymentMethod` | **Hecho.** El modelo existe en `schema.prisma`; `withdrawals.service.ts:36-37` valida el método |
| `PT-030` PENDING — throttler en memoria | **Hecho.** `app.module.ts:86` usa `ThrottlerStorageRedisService` |
| `PT-076` PENDING — PayPal Orders v2 | **Hecho y verificado** contra el sandbox real (fase QA 71, 17/17) |
| `PT-082/083/084` PENDING | **Hechos**, en `HISTORY.log` con estado DONE |

Ninguna rama quedó sin fusionar: comprobado con `git branch --no-merged master` (vacío).

---

## 4. Histórico

El registro de los PT terminados vive en **`HISTORY.log`**, que es append-only y es la fuente de
verdad. Este fichero **no lo duplica**: duplicarlo fue justamente lo que produjo la divergencia
que PT-090 corrige.
