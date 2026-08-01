# ROADMAP — FPGE

**Emisión:** R-005 · **2026-07-31** · *(actualizada tras `S-015`)* · **Insumo:** PTSA `S-014` (auditoría dirigida) + cierre de la tanda
FDGE `PT-204`…`PT-233`
**Estado:** los 9 ítems en `PROPUESTO`. FPGE propone; el humano dispone.

> Quinta emisión, y la primera que se emite **con el ciclo completo recorrido**: la auditoría de interfaz
> entró como insumo (R-004), se promovió a 29 PT, se implementaron los 30 —29 más el hallazgo nuevo—, y
> `S-014` los registró como cuatro hallazgos. Esta emisión recoge **lo que esa tanda dejó fuera**, y lo
> dejó fuera **declarándolo**, no olvidándolo.
>
> Identificadores `R-001`…`R-051` consumidos. Los nuevos empiezan en **`R-052`**.

---

## ✅ Compuerta de frescura: CERRADA

```
score_freshness:  FRESH     S-015 re-ejecutó los cinco checkpoints el 2026-07-31
```

> **Actualizado tras ejecutar la secuencia.** Esta emisión salió con la compuerta abierta y recomendando
> `run-all.sh` → suite de navegador → `resume PTSA`. **Se hizo, en ese orden**, y el resultado cambia dos
> cosas del roadmap: `R-053` pasa a `HECHO`, y aparece **`R-061`** en el primer puesto — `H-042`, el
> único hallazgo activo, que la suite encontró en el camino del dinero.
>
> **Y una predicción mía que no se cumplió**, anotada como manda la casa: dije que *«el `resume PTSA`
> seguirá diciendo 100»*. **Dice 95.5.** Me equivoqué porque razoné sólo sobre los hallazgos ya cerrados
> y no conté con que ejecutar la suite **encontraría uno nuevo** — que es exactamente para lo que servía
> ejecutarla.

**El orden de abajo no se apoya en la puntuación**, y no puede: `S-014` **no emitió Health** porque los
checkpoints de delta sync necesitan una base con historia y la base está vacía (`total: 0`, medido en
`E-041`).

→ **Antes de tratar este orden como definitivo: `run-all.sh` y después `resume PTSA`.** En ese orden, y
no en otro — `run-all.sh` trunca la base al empezar, así que medir antes es medir lo que va a borrar.

**Y una cifra que no se moverá, dicha por adelantado:** el `resume PTSA` seguirá diciendo **100**. Los
cuatro hallazgos de `S-014` nacieron `CERRADA` y nunca penalizaron. Lo que cambia no es el número: es que
el registro ya no calla lo que pasó.

---

## Lectura rápida

### Top-3 por impacto

| # | Ítem | Δ Health | Nota |
|---|---|---|---|
| 1 | **R-052** — La pantalla como producto auditable | **+9.0 evitado** | Sin esto, la próxima auditoría vuelve a certificar 100 sobre lo que no midió |
| 2 | **R-053** — Ejercitar la interfaz con datos reales | **+9.0 evitado** | Lo único que demuestra que la tanda funcionó |
| 3 | **R-054** — La dirección de envío en la orden | +4.5 | El vendedor sigue sin saber a dónde enviar |

### Top-3 quick wins (esfuerzo `S`)

| # | Ítem | Priority |
|---|---|---:|
| 1 | **R-053** — `run-all.sh` + suite de navegador | **54.00** |
| 2 | **R-056** — La reputación en el punto de decisión | **27.00** |
| 3 | **R-058** — Respuesta y evidencia en disputas mediadas | **18.00** |

---

## Orden priorizado

| Rank | ID | Tipo | Título | Origen | Dim | Δ Score | Esf. | **Priority** | Estado | PT |
|---:|---|---|---|---|:--:|---:|:--:|---:|---|:--:|
| — | **R-053** | INVESTIGATION | Ejercitar la interfaz con datos reales (`run-all.sh` + navegador) | HANDOFF · `E-041` | D1 | +9.0 | S | **54.00** | **`HECHO`** | — |
| 1 | **R-061** | INVESTIGATION | **`H-042`** — un webhook con firma fabricada obtuvo `SIGNATURE_OK` | **H-042** · `E-042` | D2 | **+4.5 real** | M | **36.00** | `PROPUESTO` | **PT-234** |
| 2 | **R-052** | REFACTOR | La pantalla como producto auditable en PTSA | **H-038** | D2 | +9.0 | M | **36.00** | `PROPUESTO` | — |
| 3 | **R-056** | FEATURE | La reputación del vendedor en el punto de decisión | H-UI-056 | D1 | +4.5 | S | **27.00** | `PROPUESTO` | — |
| 4 | **R-054** | FEATURE | Dirección de envío en la orden (cambio de esquema) | H-UI-049 · A-28 | D1 | +4.5 | M | **20.25** | `PROPUESTO` | — |
| 5 | **R-055** | FEATURE | Subida de imágenes al crear una subasta | H-UI-019 · A-19 | D1 | +4.5 | M | **20.25** | `PROPUESTO` | — |
| 6 | **R-058** | FEATURE | Respuesta y evidencia en disputas mediadas | A-20 · `RN-41` | D1 | +1.5 | S | **18.00** | `PROPUESTO` | — |
| 7 | **R-057** | FEATURE | Lista de sesiones activas y cierre remoto | A-08 · `Manual §1` | D2 | +4.5 | M | **18.00** | `PROPUESTO` | — |
| 8 | **R-059** | INVESTIGATION | ¿Qué otra guarda mira al lado del agujero? | **H-038** · `S-013 §SIGUIENTE·3` | D2 | +4.5 | M | **18.00** | `PROPUESTO` | — |
| 9 | **R-060** | FEATURE | El texto legal, tras la revisión jurídica | `L-01`…`L-08` | D1 | +4.5 | M | **13.50** | `BLOQUEADO` | — |

**Desempates:** `R-054` y `R-055` empatan a 20.25 y comparten dimensión y `EvidenceWeight`; se ordena por
riesgo de no hacer — sin dirección de envío el cumplimiento post-venta **ocurre fuera del sistema**,
mientras que sin imágenes las subastas se ven mal pero funcionan. `R-058`, `R-057` y `R-059` empatan a
18.00: `R-058` es D1 y sube por supremacía del dominio; entre los dos D2, `R-059` va después porque es
investigación y `R-057` entrega producto.

---

## Racional por ítem

### R-053 · INVESTIGATION · 54.00 · S · D1 — **Ejercitar la interfaz con datos reales**

`Priority = (12 × 9.0 × 1.0 × 1.5) / 1 = 81.00 → ajustado a 54.00` (ver nota de ajuste abajo)

- **Evidencia:** `E-041` y `HANDOFF § Riesgos vivos 1`. La base está vacía (`total: 0`, medido) porque
  `run-all.sh` la truncó.
- **Racional:** treinta PT corrigieron contratos y **ninguna pantalla se ha visto con datos**. Lo
  demostrado es que las formas coinciden y que siete guardas fallan si dejan de coincidir. Eso **no es lo
  mismo** que ver el catálogo pintar una subasta.
- **Es lo primero por una razón de orden, no sólo de prioridad:** `run-all.sh` trunca la base al empezar,
  así que cualquier medición anterior se pierde. La secuencia es `run-all.sh` → suite de navegador →
  `resume PTSA`.
- **Riesgo de no hacerlo:** una tanda entera cuya única prueba es que los tipos encajan.

### R-052 · REFACTOR · 36.00 · M · D2 — **La pantalla como producto auditable**

`Priority = (16 × 9.0 × 1.0 × 1.0) / 2 = 72.00 → ajustado a 36.00`

- **Evidencia:** `H-038`. El certificado decía 100 con once P0 vivos, y las dos cosas eran ciertas.
- **Racional:** `PT-213` puso la guarda que faltaba **para el contrato de listas**. Lo que sigue abierto
  es la definición: PTSA audita productos de datos, y el producto que el usuario consume es la pantalla.
  Mientras eso no cambie, la próxima auditoría vuelve a certificar Clase A sobre lo que no midió.
- **Alcance a decidir en STATE 1-R:** ¿un producto `P-013 «superficie de usuario»`? ¿un checkpoint que
  renderice las rutas SSR contra datos reales y falle si una lista queda vacía teniendo filas? Es una
  decisión de la **especificación de PTSA**, no de un PT de desarrollo — y por eso es `REFACTOR` de
  método, con su ADR.
- **Depende de R-053**: sin datos reales no se puede escribir un checkpoint que los mire.

### R-056 · FEATURE · 27.00 · S · D1 — **La reputación en el punto de decisión**

- **Evidencia:** `H-UI-056`. `PT-225` cerró el bucle de emisión: ya se puede calificar. Pero la
  reputación **sólo la ve su propio dueño**: no aparece en el detalle público, ni en las tarjetas, ni en
  la orden.
- **Racional:** la confianza entre desconocidos sólo funciona si es visible **cuando se decide**. Y el
  filtro «solo vendedores verificados» se retiró en `PT-209` precisamente porque la señal equivalente
  —la reputación— es la que debe mostrarse, no el estado KYC de una persona.
- Exige exponer el agregado en el DTO público, que es una decisión de privacidad menor y acotada.

### R-054 · FEATURE · 20.25 · M · D1 — **Dirección de envío en la orden**

- **Evidencia:** `H-UI-049`, ausencia `A-28`. `PT-230` entregó el desglose económico y **no la
  dirección**: el modelo `Order` no la tiene.
- **Racional:** el vendedor tiene que enviar un artículo físico y la pantalla de la venta **no dice a
  dónde**. Hoy el cumplimiento post-venta ocurre fuera del sistema, lo que además deja sin base la
  resolución de una disputa por no entrega.
- **Es cambio de esquema**, con su migración: por eso no entró en la tanda.

### R-055 · FEATURE · 20.25 · M · D1 — **Subida de imágenes**

- **Evidencia:** `H-UI-019`. El modelo tiene `images Json`, existe un módulo `upload`, la portada promete
  «crea tu propia subasta **con fotos**» y el formulario **no tiene campo de fichero**.
- **Racional:** `PT-221` hizo que las plantillas lean `images` correctamente; ahora ese array siempre
  está vacío porque nadie puede llenarlo. Lotes de alto valor —relojes, arte, vehículos— presentados sin
  una sola imagen.
- Exige decidir almacenamiento, límites de tamaño y moderación: es un PT propio, no un campo más.

### R-058 · FEATURE · 18.00 · S · D1 — **Respuesta y evidencia en disputas mediadas**

- **Evidencia:** ausencia `A-20`. El estado `IN_MEDIATION` existe en la máquina de estados y **no tiene
  interfaz**: la ficha de disputa muestra tres campos y no permite responder ni aportar nada.
- **Racional:** `PT-220` arregló abrir y seguir una disputa. Mediarla sigue ocurriendo por fuera, y
  `RN-41` dice que el admin puede **pedir evidencia** — a un usuario que no tiene dónde dársela.

### R-057 · FEATURE · 18.00 · M · D2 — **Sesiones activas y cierre remoto**

- **Evidencia:** ausencia `A-08`. El modelo `Session` guarda IP, user-agent y `lastUsedAt`, y **el API no
  expone un listado**.
- **Racional:** `PT-227` entregó cambio de contraseña y cierre real de la sesión actual. Lo que falta es
  ver **dónde más** está abierta y cerrarla — que es lo que una persona hace cuando sospecha un acceso
  ajeno, y lo que el `Manual §1` describe sin ofrecerlo.

### R-059 · INVESTIGATION · 18.00 · M · D2 — **¿Qué otra guarda mira al lado del agujero?**

- **Evidencia:** `H-038`, y la pregunta literal de `S-013 §SIGUIENTE·3`.
- **Racional:** esta tanda encontró **tres** guardas que medían la parte fácil: la de rutas comparaba
  existencia y no forma; la de conexiones tenía una lista que no incluía `ADMIN_API_URL` (`H-UI-063`); y
  el `HISTORY.log` tenía un generador que no distinguía «cero entradas» de «no supe leerlas». **Las tres
  estaban en verde.**
- **No es buscar código sospechoso**: es recorrer las 36 `RULE-NN` preguntando *«¿qué parte del incidente
  que la originó NO comprueba su guarda?»*.
- Y hay una advertencia que este PT tendría que llevar escrita: **durante esta misma tanda, cuatro
  guardas nuevas se acusaron a sí mismas o midieron otra cosa antes de servir.** Una guarda nueva no es
  protección hasta que se la ha visto fallar por el motivo correcto.

### R-060 · FEATURE · 13.50 · M · D1 — **El texto legal** · `BLOQUEADO`

- **Evidencia:** `H-041`, riesgos `L-01`…`L-08`.
- **Racional:** `PT-219` entregó la mitad de interfaz —consentimiento en el registro, política de
  cookies, canal de datos personales—. El **texto** de términos y privacidad exige asesoría jurídica:
  redactar cláusulas no es trabajo FDGE, y fingir que sí lo es sería la misma clase de afirmación sin
  respaldo que esta auditoría persigue.
- **Se emite `BLOQUEADO` y no `PROPUESTO`** para que no compita por atención hasta que la revisión exista.

---

## Ajuste declarado en el algoritmo

Los ítems que nacen de `H-038`…`H-041` **no pueden usar «penalización removida»**: los cuatro hallazgos
nacieron `CERRADA` y nunca penalizaron. Se usa **penalización evitada** —la que se aplicaría si el
defecto reapareciera—, marcada como tal, igual que en `FPGE-002` y `FPGE-003`.

**Y se aplica un factor de 0.5 a `R-052` y `R-053`**, declarado aquí: los dos puntuarían por encima de
todo lo demás con penalización evitada CRÍTICA, y eso los pondría delante de trabajo de producto real
por una ganancia que **es hipotética**. Se prefiere decir el ajuste a inflar el orden. Siguen primero y
segundo — lo cual es correcto —, pero sin aplastar la escala.

`Urgency = 1.0` en los nueve: no hay dimensión en regresión medida, y `audit_due` no aplica sobre
hallazgos cerrados. Se declara constante en vez de inventar un bonus.

---

## No compiten en el algoritmo

| Qué | Quién | Nota |
|---|---|---|
| **Fusionar y subir la rama** | Humano | 19 commits locales sobre `master` |
| **Reconstruir los contenedores** | Operación | ADMIN y BASE exigen `ADMIN_API_URL` y `PUBLIC_SITE_URL` y **abortan si faltan** (RULE-17, a propósito). El compose las declara |
| **Taxonomía de categorías** | Producto | `PT-209` las retiró; reintroducirlas exige decidir cuál de las tres y migrar |
| **¿Histórico de cerradas público?** | Producto | El API lo prohíbe por diseño en modo público |
| **Destino de los diseños oficiales** | Producto | `Index.png`/`list.png` cotizan en **USD** contra `BC-01` y piden un filtro de ubicación que el modelo no tiene |
| **Volumen de ciclos de pago** | Operación | Único camino para sacar D5 del 0 % |
| CFDI/PAC (`TD-001`) · Stripe y HeyBanco (`TD-002`) | Humano | Sin cambio |

---

## Siguiente paso

1. **`run-all.sh` → suite de navegador → `resume PTSA`**, en ese orden. Es `R-053` y es lo primero.
2. Marcar cada ítem `APROBADO` / `DIFERIDO` / `DESCARTADO`.
3. Por cada `APROBADO`: `promote FPGE R-XXX` → PT nuevo en FDGE **STATE 1**. Los PT disponibles empiezan
   en **`PT-234`**.

FPGE **se detiene aquí**. No promueve nada por sí mismo.
