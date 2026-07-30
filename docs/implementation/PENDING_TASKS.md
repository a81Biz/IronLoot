# PENDING_TASKS.md — IronLoot

**FDGE V3** · **Última actualización**: 2026-07-30 (PT-195 — dos guardas que llevaban tiempo en rojo)

---

## Esperando validación humana: **PT-195**

**PT-181 … PT-185 cerrados con VoBo humano** el 2026-07-29 (*«cierra los PT con mi VoBo»*), con lo que **los
veintiocho PT de la jornada quedan cerrados**: PT-158 … PT-185.

**PT-191 cerrado con VoBo humano** el 2026-07-30, con constancia en `HISTORY.log` (RULE-37).
**PT-192 cerrado con VoBo humano** el 2026-07-30, con constancia en `HISTORY.log` (RULE-37). Con él,
**los 144 PT del registro están cerrados**: el índice de estado dice **0 realmente abiertos**.

**PT-195** —dos guardas de documentación que llevaban tiempo en rojo mientras la suite se reportaba en
verde— queda en `VALIDATION_PENDING`: es un BUG y el agente no cierra bugs (FDGE STATE 6). Su evidencia
deja escrito lo que **no** se pudo determinar: desde cuándo fallaban.

**En curso**: **PT-194** (cablear el refresco de sesión, `TD-025`) en STATE 2, esperando ACK de la
estrategia. Cero líneas de `src/` tocadas.

**TD-024 cerrada** por PT-193 (ADR-058): 15 símbolos retirados, 8
conservados por ADR-033 y 2 que eran falsos positivos de medir por nombre. Queda deuda técnica en
**TD-002** y **TD-009** (terceros: credenciales y PAC) y **TD-025** (el refresco de sesión sin cablear
— la sesión efectiva del portal dura quince minutos).

---

## Hallazgos de auditoría: 35, todos `CERRADA`

| Hallazgo | Dim | PT | Cómo se comprobó |
|---|:--:|---|---|
| **H-029** | D2 | PT-182 | 7 casos: token basura rechazado, **y el timeout de Google también** |
| **H-030** | D1 | PT-182 | **En vivo** contra Mailhog: `1 → 2` correos |
| **H-031** | D2 | PT-182 | C7 **visto fallar** con la reserva del compose a `0` |
| **H-032** | D3 | PT-183 | **En vivo** con Mailhog parado: `200` con bandeja vacía → **500** |
| **H-033** | D3 | PT-183 | Medido: **121 s → ~5 s** |
| **H-034** | D3 | PT-184 | 7 casos, con **C1 y C2 vistos fallar** al devolver una llamada a su forma sin tope |
| **H-035** | D2 | PT-185 · **PT-186** | Reabierta: el primer cierre cubría el API y faltaban **6** reservas en BASE/CLIENT. Cerrada con los cuatro servicios cubiertos |
| **H-035** | D2 | PT-185 | La guarda nueva **vista acusar al fichero correcto, y sólo a ése**, antes del arreglo |

Los siete nacieron y murieron el 2026-07-29, **cada uno saliendo de comprobar el anterior**: H-032/H-033 al
verificar el cierre de H-030 —y uno desmiente parte de ese cierre, anotado sin reabrirlo (`[A6]`)—, H-034 al
aplicar al camino del dinero la recomendación de S-007, y **H-035 al cerrar la lista de terceros que dejó S-008**.
Los veintiocho anteriores estaban ya cerrados; detalle en `PTSA/RESUMEN.md` § S-009.

**H-005 (CFDI) está `CERRADA` como limitación declarada** por decisión del humano, con `F-1 § U-006`
enmendando la declaración de valor a la vez: el producto ya **no promete** emitir CFDI y `P-012` pasa a
`FUERA_DE_ALCANCE_V1`. **El sistema sigue sin emitir facturas** — el cierre es por el lado de la declaración,
y así está escrito. Si v1.1 lo vuelve a prometer, `P-012` vuelve y **H-005 se reabre con él**.

---

## Los cinco `AUD` que estaban abiertos: cerrados (PT-191)

| Hallazgo | Lo que decía el enunciado | Lo que había, medido |
|---|---|---|
| **AUD-027** | «dos rutas de config SMTP» | El panel tenía un **formulario completo** que guardaba y decía «guardado», y el mailer lee `MAIL_*` del entorno: **no configuraba nada** |
| **AUD-011** | «`admin.service.ts` no menciona `AuctionStateMachine`» | **Seis** operaciones escribiendo el estado a mano, dos sin llamar ni a `assertAuctionModifiable` — y **la máquina estaba incompleta** |
| **AUD-010** | «resolver una disputa no mueve dinero» | **Tres** defectos encadenados; cablear el primero sin los otros habría **impreso dinero** |
| **AUD-012** | «el VO `Money` no lo importa nadie» | **30 de 42** símbolos de `core` sin consumidor, y uno **mentía** sobre cómo se valida un IPN |
| **AUD-006** | «el WebSocket no autentica el handshake» | Cierto **y deliberado**; faltaba que fuera comprobable. Y había dos armas cargadas apuntándole, con cero llamantes |

**Recuento de la tabla de veredictos: 20 corregidos · 0 abiertos · 1 limitación declarada · 15 sin verificar.**

**No se promovieron a `H-XXX`**: meterlos en el score de Health sigue siendo tu decisión. Están en la tabla de
veredictos con su evidencia.

### Lo que esto contesta, que es la pregunta de fondo

*«¿Por qué siempre salen más casos?»* — **porque el enunciado de un hallazgo es su síntoma, no su tamaño.**
Los cinco se cerraron leyendo el código, no el enunciado, y los cinco resultaron ser otra cosa. Revisar «qué
falta» leyendo enunciados devuelve la lista de síntomas, y por eso nunca terminaba.

### Los 15 «sin verificar», medidos (PT-192)

**Diez ya estaban corregidos y nadie lo sabía. Cinco seguían abiertos.** Ése es el coste real de dejar
una casilla en «no lo sé»: no es sólo no arreglar, es **no saber qué está arreglado** — dos tercios de
la lista era trabajo hecho que seguía figurando como incógnita, y con ellos se arrastraba el único
grave.

**`AUD-015`** era una regla de dominio que decía lo contrario de lo que el sistema hace, **codificada
como CRÍTICA en el checkpoint D1.N1** y lista para acusar al sistema de un fallo inexistente. No saltó
porque ese checkpoint necesita una base con historia.

**Recuento final: 35 corregidos · 0 abiertos · 1 limitación declarada · 0 sin verificar.** La lista
tiene final.

---

## Lo que PT-188 deja escrito, y no es trabajo pendiente sino una debilidad conocida

**Cinco de los seis inventarios siguen sin guarda.** `endpoints.md` la tiene desde PT-188, en las dos
direcciones; `routes.md`, `entities.md`, `components.md`, `services.md` e `integrations.md` no. Hoy están al día
porque se midieron uno a uno — **nada lo mantiene**.

Se anota aquí y no en la lista de trabajo porque no tiene un final reconocible: no es «escribir cinco guardas», es
saber que lo que no se vigila se desvía. La prueba es que **el inventario de endpoints documentaba una ruta
fantasma meses después de que H-020 demostrara que no existe**.

**Y `docs-v2/1-negocio`, `2-producto`, `3-arquitectura` y `7-ux` no se contrastaron contra el código** en PT-188.
Se midió lo que la jornada tocaba.

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

**Deuda técnica abierta: 4 de 26** — con **TD-025** (PT-192): el refresco de sesión existe, tiene su cookie de 30 días y **no lo llama nadie**, así que la sesión efectiva del portal dura **quince minutos**. Cablearlo es trabajo de funcionalidad sobre autenticación, no un arreglo dentro de una medición.

**Las otras tres** — TD-002 (credenciales de terceros), TD-009 (riesgo aceptado por PT-080)
y **TD-024** (nueva, PT-191): `@ironloot/core` exporta **24 símbolos que nadie importa** — los puertos de una
arquitectura hexagonal cuyos adaptadores no se escribieron. **No se retiran porque hacerlo es abandonar
formalmente ese diseño, y eso pide una ADR.** Lo que ya está hecho es medirlo, y hay guarda para que no crezca.

---

## La auditoría, al día

**S-009 emitido** el 2026-07-29. `freshness = FRESH`, `commits_since_audit = 0`.

**Health 100 · Risk 0 · Confidence 91.0 · Clase A.** Los mismos por **quinta** vez — **y eso es el dato**: cuatro
intervalos, y en cada uno trabajo real (3 · 2 · 1 · 1). Siete defectos, todos cerrados antes de emitir. **La
estabilidad del 100 mide que se cierra lo que se encuentra, no que no haya nada que encontrar.**

**La lista de terceros queda cerrada**: la pasarela tenía el defecto, Redis tenía otro distinto y el
almacenamiento **no aplica** (es `writeFile` local).

**Ese pendiente se cerró en PT-186**: la guarda de reservas cubre ahora los cuatro servicios.

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
