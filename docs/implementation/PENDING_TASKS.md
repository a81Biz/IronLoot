# PENDING_TASKS.md — IronLoot

**FDGE V3** · **Última actualización**: 2026-07-29 (PT-169)

---

## Esperando validación humana

`[R44]` y STATE 6 prohíben al agente cerrar bugs. **Estos esperan tu palabra, no trabajo:**

| PT | Qué es | Evidencia |
|---|---|---|
| **PT-166** | El techo de memoria de la suite: 2 GB + `--max-old-space-size=1536`. `npx jest` sin flags vuelve a pasar | `evidence/PT-166/` |
| **PT-167** | El comando de TLS que no existía: se declara el servicio `nginx-tls` con su perfil | `evidence/PT-167/` |
| **PT-168** | Los derivados de PTSA declaraban activos cuatro hallazgos cerrados | `evidence/PT-168/` |
| **PT-169** | El rastro de trabajo tenía huecos: PT-167 sin entrada, PT-166 sin evidencia | `evidence/PT-169/` |
| **PT-170** | Dos hallazgos citaban carpetas de evidencia inexistentes | `evidence/PT-170/` |

Los de la misma tanda que aún no han aterrizado —**PT-171** (`ND-002`/`ND-003` contradicen al código) y
**PT-172** (el aviso de Jest en cada corrida)— **añaden aquí su fila al cerrar, con su evidencia**. No se
cita por adelantado: una cita a evidencia que todavía no existe es exactamente lo que PT-170 vino a
quitar, y la guarda de RULE-31 la caza — como hizo con esta tabla.

**PT-166 y PT-167 estuvieron fuera de esta lista, y ése fue el defecto F-167-F.** El cierre en bloque
con VoBo enumeraba PT-148…165; PT-166 entró después y PT-167 no tenía ni entrada, mientras este fichero
afirmaba *«Nada más está pendiente»*. Lo vigila ahora `rastro-de-trabajo-completo.spec.ts`
(**RULE-34**).

---

## Bloqueado por un tercero

| Trabajo | Qué falta | Quién |
|---|---|---|
| **H-005 — la facturación fiscal (CFDI)** | **Contratar un PAC** certificado ante el SAT, y **decidir quién emite la factura**. Sin proveedor no hay nada que implementar | Negocio + fiscal |

Los tres modelos posibles, con sus consecuencias técnicas medidas, están en
[`evidence/PT-155/hallazgos.md`](evidence/PT-155/hallazgos.md). Dos cosas de ahí que conviene tener
presentes cuando llegue el proveedor:

- **La opción C es subconjunto de la B.** Si la decisión tarda, C no cierra puertas. Al revés no: B
  exige datos fiscales y una autorización legal que **no se pueden pedir retroactivamente** a quien
  ya vendió.
- **La elección decide, sin querer, si el timbrado entra en el camino del dinero.** En B entra; en A
  y C no. Este repositorio ya sabe lo que cuesta poner algo frágil en la ruta de un pago (ADR-038).

Mientras tanto `H-005` sigue `ABIERTA`, mantiene **D1 en 85** y deja `P-012 (CfdiRecord)` en
`IDENTIFICADO`. Es el **único hallazgo PTSA activo del sistema**.

**Bloqueado por lo mismo**: TD-001 (CFDI/PAC). Y TD-002 (Stripe y HeyBanco) espera credenciales de
ambas pasarelas — también un tercero, también fuera del repositorio.

---

## Y una cosa que sólo puede disparar el humano

**`resume PTSA`.** Los scores de S-003 están superados: se midieron con cinco hallazgos activos y hoy
hay uno. `freshness = STALE`, 25 commits desde `d260c80`. PT-168 dejó el cálculo a la vista y **no lo
emitió a propósito** — PTSA no se auto-activa.

---

## Lo que sí está cerrado

Los once PT de la tanda del 28/29, los quince de FPGE-003, los tres del cierre (PT-163/164/165) y los
cuatro hallazgos de auditoría (H-021…H-024), todos con VoBo humano el 2026-07-29. Detalle en
`HISTORY.log`, que es append-only y manda para lo terminado.

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

## Lo que ya no está aquí, y por qué

Este fichero llegó a listar seis «pendientes con dueño claro» que **no eran trabajo pendiente**. Eran
observaciones, notas de alcance y trabajo de otro marco. Listarlos aquí hacía crecer la lista mientras
el trabajo se cerraba — que es justo lo contrario de lo que este registro existe para mostrar.

| Lo que decía | Dónde está ahora |
|---|---|
| Triar el inventario de la imagen base | **Hecho.** 17 entradas con motivo en `base-image-baseline.json`; TD-016 cerrada |
| Los 304 MB de `node_modules` de producción | **Hecho.** PT-164: 548 → 450 MB y 14 → 2 vulnerabilidades |
| `test:guardas` sin mecanismo | **Hecho.** RULE-32 y su guarda |
| Medir D1 y D5 completos | **Es trabajo PTSA, no FDGE.** Vive en `PTSA/PENDIENTES.md`, que es quien manda para esa clase |
| Activar el TLS local | **No es una tarea: es un paso operativo.** Documentado en `src/nginx/tls/README.md`; requiere confiar un certificado en la máquina |
| RULE-30 sólo mira ADMIN | **No es una tarea: es una nota de alcance**, y vive dentro de la propia regla |

**La regla que sale de esto:** *una observación no es un pendiente.* Si no tiene dueño, alcance y un
final reconocible, va a la nota que le corresponde — no a la lista de trabajo.
