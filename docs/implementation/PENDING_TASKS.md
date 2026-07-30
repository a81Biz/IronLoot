# PENDING_TASKS.md — IronLoot

**FDGE V3** · **Última actualización**: 2026-07-29 (cierre con VoBo de PT-181 … PT-184)

---

## Esperando validación humana: nada

**PT-181 … PT-184 cerrados con VoBo humano** el 2026-07-29 (*«cierra los PT con mi VoBo»*), con lo que **los
veintisiete PT de la jornada quedan cerrados**: PT-158 … PT-184.

**Cero trabajo FDGE pendiente.**

---

## Hallazgos de auditoría: 34, todos `CERRADA`

| Hallazgo | Dim | PT | Cómo se comprobó |
|---|:--:|---|---|
| **H-029** | D2 | PT-182 | 7 casos: token basura rechazado, **y el timeout de Google también** |
| **H-030** | D1 | PT-182 | **En vivo** contra Mailhog: `1 → 2` correos |
| **H-031** | D2 | PT-182 | C7 **visto fallar** con la reserva del compose a `0` |
| **H-032** | D3 | PT-183 | **En vivo** con Mailhog parado: `200` con bandeja vacía → **500** |
| **H-033** | D3 | PT-183 | Medido: **121 s → ~5 s** |
| **H-034** | D3 | PT-184 | 7 casos, con **C1 y C2 vistos fallar** al devolver una llamada a su forma sin tope |

Los seis nacieron y murieron el 2026-07-29, **cada uno saliendo de comprobar el anterior**: H-032/H-033 al
verificar el cierre de H-030 —y uno desmiente parte de ese cierre, anotado sin reabrirlo (`[A6]`)— y H-034 al
aplicar al camino del dinero la recomendación que dejó S-007. Los veintiocho anteriores estaban ya cerrados;
detalle en `PTSA/RESUMEN.md` § S-008.

**H-005 (CFDI) está `CERRADA` como limitación declarada** por decisión del humano, con `F-1 § U-006`
enmendando la declaración de valor a la vez: el producto ya **no promete** emitir CFDI y `P-012` pasa a
`FUERA_DE_ALCANCE_V1`. **El sistema sigue sin emitir facturas** — el cierre es por el lado de la declaración,
y así está escrito. Si v1.1 lo vuelve a prometer, `P-012` vuelve y **H-005 se reabre con él**.

---

## Bloqueado por un tercero

| Trabajo | Qué falta | Quién |
|---|---|---|
| **Facturación fiscal (CFDI)** | Contratar un **PAC** certificado ante el SAT y decidir **quién emite**. Sin proveedor no hay nada que implementar | Negocio + fiscal |
| **Stripe y HeyBanco** (TD-002) | **Credenciales**. El código de los adaptadores existe | Negocio |

Los tres modelos fiscales posibles, con sus consecuencias técnicas medidas, están en
[`evidence/PT-155/hallazgos.md`](evidence/PT-155/hallazgos.md). Dos cosas que conviene tener presentes cuando
llegue el proveedor:

- **La opción C es subconjunto de la B.** Si la decisión tarda, C no cierra puertas. Al revés no: B exige datos
  fiscales y una autorización legal que **no se pueden pedir retroactivamente** a quien ya vendió.
- **La elección decide, sin querer, si el timbrado entra en el camino del dinero.** En B entra; en A y C no.
  Este repositorio ya sabe lo que cuesta poner algo frágil en la ruta de un pago (ADR-038).

**Deuda técnica abierta: 2 de 24** — TD-002 (credenciales de terceros) y TD-009 (riesgo aceptado por PT-080).

---

## La auditoría, al día

**S-008 emitido** el 2026-07-29. `freshness = FRESH`, `commits_since_audit = 0`.

**Health 100 · Risk 0 · Confidence 91.0 · Clase A.** Los mismos por **cuarta** vez — **y eso es el dato**: en cada
intervalo apareció trabajo real (tres hallazgos, luego dos, luego uno), y todos se cerraron antes de emitir. **La
estabilidad del 100 mide que se cierra lo que se encuentra, no que no haya nada que encontrar.**

**Y queda una tarea de auditoría con nombre**: mirar los **dos terceros que faltan** —Redis y el almacenamiento de
ficheros—. La recomendación acertó con el primero de los tres a la primera, así que no conviene darlos por
buenos. Con Redis, además, el fallo se puede **medir** parándolo, como en PT-178.

**Lo único que falta medir es D5, y no lo cierra otra corrida igual:** hacen falta **20 ciclos de pago
resueltos** y hay **2**. Con `>= 95 %` para verde, un solo fallo entre `n` cumple `(n−1)/n >= 0.95` sólo si
`n >= 20` — por debajo, la métrica **no puede expresar «bien»** (H-028). Por eso la cobertura de D5 es 0 % y la
Confianza está a **un punto** del umbral de Clase A.

Es trabajo PTSA, no FDGE: vive en `PTSA/PENDIENTES.md`, que es quien manda para esa clase.

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

**Histórico explícito** — se leen, no se actualizan: `FDGE_HALLAZGOS_TRACKER.md`, `MATRIZ-HALLAZGOS-*.md`,
`docs-v2/Informe-Remediacion.md`.

---

## Lo que ya no está aquí, y por qué

Este fichero llegó a listar seis «pendientes con dueño claro» que **no eran trabajo pendiente**. Eran
observaciones, notas de alcance y trabajo de otro marco. Listarlos aquí hacía crecer la lista mientras el
trabajo se cerraba — que es justo lo contrario de lo que este registro existe para mostrar.

| Lo que decía | Dónde está ahora |
|---|---|
| Triar el inventario de la imagen base | **Hecho.** 17 entradas con motivo en `base-image-baseline.json`; TD-016 cerrada |
| Los 304 MB de `node_modules` de producción | **Hecho.** PT-164: 548 → 450 MB y 14 → 2 vulnerabilidades |
| `test:guardas` sin mecanismo | **Hecho.** RULE-32 y su guarda |
| Medir D1 y D5 completos | **Es trabajo PTSA, no FDGE.** Vive en `PTSA/PENDIENTES.md` |
| Activar el TLS local | **No es una tarea: es un paso operativo.** Documentado en `src/nginx/tls/README.md`; requiere confiar un certificado en la máquina |
| RULE-30 sólo mira ADMIN | **No es una tarea: es una nota de alcance**, y vive dentro de la propia regla |

**La regla que sale de esto:** *una observación no es un pendiente.* Si no tiene dueño, alcance y un final
reconocible, va a la nota que le corresponde — no a la lista de trabajo.
