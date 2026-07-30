# PENDING_TASKS.md — IronLoot

**FDGE V3** · **Última actualización**: 2026-07-29 (cierre con VoBo de PT-166…PT-172)

---

## Esperando validación humana

`[R44]` y STATE 6 prohíben al agente cerrar bugs. **Cuatro esperan tu palabra, no trabajo:**

| PT | Qué es | Evidencia |
|---|---|---|
| **PT-177** | El veredicto de coherencia declara su denominador (**H-025**) | `evidence/PT-177/` |
| **PT-178** | Redis observable, y la salud sin depender del limitador (**H-026**) | `evidence/PT-178/` |
| **PT-179** | Un 4xx de la pasarela no es avería nuestra (F-176-C) | `evidence/PT-179/` |
| **PT-180** | Una tasa sobre dos casos no es veredicto (**H-028**) + dos `catch` mudos míos | `evidence/PT-180/` |

Los cuatro **verificados ejecutando**, no leyendo. Los hallazgos que cierran ya están `CERRADA` por tu
instrucción de antemano: *«si hay un hallazgo nuevo lo tratas hasta cerrarlo»*.

---

## Cero trabajo FDGE pendiente aparte de eso

**Los catorce PT que esperaban validación se cerraron con VoBo humano el 2026-07-29**: PT-166 … PT-179.
Detalle en `HISTORY.log` § «CIERRE CON VoBo HUMANO — PT-166 … PT-179 y H-025 / H-026 / H-027».

**Y los tres hallazgos corregibles están `CERRADA`**, cada uno verificado **ejecutando**:

| Hallazgo | PT | Cómo se comprobó |
|---|---|---|
| **H-025** | PT-177 | El veredicto dice `0 de 1`, marca `sin filas que comparar` y sale con **1** |
| **H-026** | PT-178 | En vivo: Redis en pie → `healthy`; Redis parado → `unhealthy` + «PING sin respuesta en 2000 ms» |
| **H-027** | PT-176 | En vivo: diez fases sin salida → diez `*** FALLO / NO EJECUTADA ***` y exit 1 |

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
`IDENTIFICADO`. **Es el único hallazgo activo del sistema**, y el único que ningún PT puede cerrar: los
otros tres se corrigieron y se cerraron el 2026-07-29.

**Las dos vías de cierre, y las dos son tuyas:**

1. **Decidir el modelo fiscal** (A, B o C de `evidence/PT-155/hallazgos.md`). Con la decisión tomada, lo
   implementable se implementa y H-005 queda reducida a «esperando credenciales del PAC», que es TD-002 y
   ya está registrado así.
2. **Aceptarlo como limitación declarada de v1.0.** Es una decisión legítima —el PRD ya lo lleva en
   Out-of-Scope— y cierra el hallazgo por decisión, no por código.

**Lo que no se puede hacer es cerrarlo escribiendo código**, y por eso sigue abierto: no hay
implementación que sustituya a un proveedor certificado ante el SAT.

**Bloqueado por lo mismo**: TD-001 (CFDI/PAC). Y TD-002 (Stripe y HeyBanco) espera credenciales de
ambas pasarelas — también un tercero, también fuera del repositorio.

---

## La auditoría, al día

**`resume PTSA` ejecutado (S-004) y medición dirigida hecha (S-004-M)**, las dos el 2026-07-29.
`freshness = FRESH`, `commits_since_audit = 0`.

**Health 88.0 · Risk 100 · Confidence 97.9 · Clase B.** La Confianza subió 14.3 puntos porque
`run-all.sh` generó salida real y **se midió en la misma sesión**: D1 pasó de 1 a **12 de 14** reglas
—las 12 cumplen— y **D5 se midió por primera vez** (Success 100 %, Retry 0 %, Failure 0 %, sobre 3
ciclos). Por primera vez la clase no la limita la cobertura sino los defectos: faltan **2 puntos de
Health**.

**Queda un hueco de medición, y no se cierra con otra corrida igual:** `R-5.1a` y `R-5.1d` exigen una
subasta en `CLOSED`, y la suite no espera los 120 s de la ventana de cierre. Ampliarla es la tarea de la
tabla de arriba.

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
