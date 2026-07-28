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

---

## 4. PT-127 … PT-130 — los cuatro hallazgos de la sesión PTSA S-002

**Estado global: `BLOCKED` — esperando ACK del Proposal Gate.**
Ninguna rama abierta. Ningún fichero de código tocado. `[No Proposal Gate Skip]`.

Artefactos ya generados:
`DISCOVERY.md` § PT-127..130 · `CONTEXT_ANALYSIS.md` § PT-127..130 · `PLAN_ACTUAL.md` ·
`changes/PT-127-migraciones-reproducibles/` · `changes/PT-128-integracion-que-verifica/` ·
`changes/PT-129-imagen-de-produccion/` · `changes/PT-130-coherencia-documental/`

### Orden de ejecución

```
PT-127 (esquema) ──> PT-128 (pipeline) ──> PT-129 (imagen)
                                                │
PT-130 (documentacion) ─────────────────────────┘   (.1-.7 en paralelo; .8 espera a PT-128)
```

### PT-127 — Migraciones que reproducen el esquema · H-014 (CRITICA) · **MAJOR**

| Tarea | Qué | Estado |
|---|---|---|
| PT-127.0 | Copia de seguridad de los datos de auditoría | BLOCKED |
| PT-127.1 | RED: prueba del control de drift | BLOCKED |
| PT-127.2 | Base sombra y captura del drift real | BLOCKED |
| PT-127.3 | Generar la migración **[vía A o B — decisión del Gate]** | BLOCKED |
| PT-127.4 | Las cuatro sondas del cliente Prisma: 4 de 4 | BLOCKED |
| PT-127.5 | Baseline de la base de desarrollo | BLOCKED |
| PT-127.6 | `db push` → `migrate deploy` en el arranque | BLOCKED |
| PT-127.7 | GREEN: `audit:schema` | BLOCKED |
| PT-127.8 | El control en CI, sin `needs` | BLOCKED |
| PT-127.9 | Probarlo en los dos sentidos | BLOCKED |
| PT-127.10 | Regresión completa | BLOCKED |
| PT-127.11 | Evidencia y self-review | BLOCKED |
| PT-127.12 | Historia, handoff, H-014 → CORREGIDA | BLOCKED |

### PT-128 — El job de integración que verifica · H-015 (ALTA) · STANDARD

| Tarea | Qué | Estado |
|---|---|---|
| PT-128.1 | Diagnosticar manejadores abiertos (`--detectOpenHandles`) | BLOCKED |
| PT-128.2 | Ejecutar los 17 ficheros e2e y ver el tamaño real | BLOCKED |
| PT-128.3 | RED: prueba del propio job | BLOCKED |
| PT-128.4 | Cerrar los manejadores abiertos | BLOCKED |
| PT-128.5 | GREEN: `prisma generate` + `migrate deploy` en el job | BLOCKED |
| PT-128.6 | Checkpoint D3 en CI | BLOCKED |
| PT-128.7 | D1.N1 reclasificado como métrica de delta sync | BLOCKED |
| PT-128.8 | Comprobar que el job puede ponerse rojo | BLOCKED |
| PT-128.9 | Comprobar que `build` y `docker` se desbloquean | BLOCKED |
| PT-128.10 … .12 | Regresión, evidencia, registro | BLOCKED |

### PT-129 — Imagen de producción que arranca · H-017 (ALTA) · STANDARD

| Tarea | Qué | Estado |
|---|---|---|
| PT-129.1 | RED: prueba del healthcheck | BLOCKED |
| PT-129.2 | GREEN: `/api/v1/health`, umbral `< 500`, manejador de error | BLOCKED |
| PT-129.3 | `@ironloot/core` resuelto en el build **(riesgo principal)** | BLOCKED |
| PT-129.4 | Tres `Dockerfile` de producción nuevos | BLOCKED |
| PT-129.5 | `docker-compose` hereda el healthcheck | BLOCKED |
| PT-129.6 | Arrancar las cuatro imágenes y pedir una página real | BLOCKED |
| PT-129.7 | El job `docker` construye **y arranca** | BLOCKED |
| PT-129.8 … .11 | Control, regresión, evidencia, registro | BLOCKED |

### PT-130 — Coherencia documentación ↔ código · H-016 (MEDIA) · STANDARD

| Tarea | Qué | Estado |
|---|---|---|
| PT-130.1 | Barrido de los cinco documentos del alcance | BLOCKED |
| PT-130.2 | RED: la guarda, **antes** de corregir | BLOCKED |
| PT-130.3 | Corregir versiones citadas (TRD, Backend-Architecture) | BLOCKED |
| PT-130.4 | Corregir rutas de `health` en `CLAUDE.md:138` | BLOCKED |
| PT-130.5 | GREEN + casos de control | BLOCKED |
| PT-130.6 | Guarda sin cláusula de escape (`docs/` ya no gitignored) | BLOCKED |
| PT-130.7 | Revisar la cláusula de escape de `coherencia-deuda-tecnica.spec.ts` | BLOCKED |
| PT-130.8 | Ambas guardas en CI | BLOCKED — **por PT-128** |
| PT-130.9 … .11 | Regresión, evidencia, registro | BLOCKED |

### Decisión del Gate — **RESUELTA (2026-07-27)**

> **¿Existe algún entorno donde las 23 migraciones se hayan aplicado?** → **No.**

Confirmado por el humano («sólo se ha trabajado en esta máquina») y verificado:

```
git log --all --format="%an <%ae>" | sort -u   ->  un unico autor
git rev-parse master origin/master             ->  328b421 == 328b421
```

**PT-127 va por la vía B**: colapsar las 23 en una migración inicial. Ejecutar `PT-127.3 [B]`;
`PT-127.3 [A]` queda descartada. El riesgo R5 desaparece.

Comprobado además sobre **todo** el historial (57 ramas) que las migraciones que faltan no están en
ninguna rama sin fusionar: `git grep` de `AUCTION_SOLD` y `account_verifications` sobre
`git rev-list --all` → vacío en ambos casos.

### Revisión S-002-R2 — PT-130 sube de prioridad

**H-016: MEDIA → ALTA** (riesgo 6 → **9 ALTO**). Al verificar una objeción humana se comprobaron las
cinco filas de la tabla de stack de `03-TRD.md`: **5 de 5 citas apuntan a la línea equivocada y 3 de
5 versiones son falsas** (NestJS 11.1.28 declarado `^10.3.0`; Prisma 5.22.0 declarado `^5.8.0`;
TypeScript 5.9.3 declarado `^5.3.3`).

PT-130 pasa del cuarto al **segundo puesto por riesgo**, y sigue siendo el más barato de los cuatro.

Corrección de redacción, no de medición: **la migración a NestJS 11 sí está documentada** en
`docs/implementation/` (PT-126). H-016 es sobre `docs/enterprise-documentation/`.

### Lo que ningún PT de esta tanda resuelve

**H-005** (CFDI, D1, ALTA) — no es técnico. Nadie ha decidido quién emite la factura. Las tres
opciones están en `PTSA/Fases/F-1_Declaracion_Valor.md` § U-005. Sin decisión de negocio no hay PT
posible, y D1 no pasa de 85.
