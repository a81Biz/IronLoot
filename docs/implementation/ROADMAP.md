# ROADMAP — FPGE

**Emisión:** R-004 · **2026-07-31** · **Insumo de evidencia:** **Auditoría integral de UI/UX, contenido y
coherencia de producto (2026-07-31)** — 62 hallazgos `H-UI-XXX`, 36 ausencias, 28 contradicciones
**Origen PTSA de referencia:** S-013 (2026-07-30, delta sync) · Health **100** / Clase **A** / Risk **0** /
Confidence **91.0** · `audit_commit` `98e445b`
**Estado:** los 29 **`APROBADO` por decisión humana el 2026-07-31** y **`PROMOVIDO`** a `PT-204`…`PT-232`.
FPGE propuso; el humano dispuso: *«pasa todas a aprobado y trabaja de forma automática promoviendo cada una
a su FPGE y comienza FDGE teniendo todos los ACK y VoBos necesarios hasta terminar»*. Esa frase es el ACK
del Proposal Gate y el VoBo anticipado de STATE 6 para la tanda entera (RULE-37: queda constancia de quién
autorizó y cuándo).

> Cuarta emisión. Los identificadores `R-001`…`R-022` están consumidos (emisiones R-001 a R-003, todos
> promovidos a `PT-026`…`PT-032` y `PT-148`…`PT-162`, todos cerrados). **Los nuevos empiezan en `R-023`.**
>
> **Esta corrida no nace de PTSA.** Por instrucción explícita, el insumo es la auditoría de interfaz del
> 2026-07-31, tratada *en lugar de* PTSA. Lo que eso cambia en el algoritmo está declarado abajo, factor a
> factor, y **no se disimula**: usar una fuente de evidencia distinta sin decirlo sería exactamente el
> defecto que este repositorio persigue desde H-016.

---

## ✅ Compuerta de frescura: CERRADA — y aun así hay que leer el párrafo siguiente

```
score_freshness:  FRESH     audit_commit 98e445b     commits_since_audit = 0 (efectivo)
```

**Verificado, no leído.** `git log 98e445b..HEAD` devuelve **un** commit (`3408f3c`) y toca cuatro ficheros,
los cuatro bajo `PTSA/**`, que `audit-scope.yaml` declara en `ignore_patterns`. La frescura que el artefacto
afirma es cierta.

### Y sin embargo el Health no puede ordenar esta lista

> **El certificado dice 100/100 con cero hallazgos activos. Esta auditoría encontró once defectos P0, entre
> ellos un catálogo público que no puede renderizar una sola subasta.**
>
> **Las dos afirmaciones son ciertas a la vez, y ése es el hallazgo de fondo de esta corrida.**

`audit-scope.yaml` **sí** incluye la interfaz — `src/apps/base/views/**/*.html`,
`src/apps/client/views/**/*.html` y los `src/**/*.ts` de los tres SSR están en `auditable_patterns` desde
S-001. El hueco no es de alcance de ficheros: es de **unidad de auditoría**.

PTSA audita **productos de datos** (`P-001`…`P-012`: la subasta, la orden, el pago) y mide D1 con
`audit:domain` **sobre la salida real en la base**. Las 14 reglas de dominio se cumplen sobre las filas.
Y se seguirían cumpliendo con el catálogo apagado, porque **ninguna de las 14 pregunta si el producto llega
a la pantalla del usuario**. La cobertura declarada `[A8]` dice «D1 100 % — 14 de 14 reglas medidas»; lo que
no dice es que el producto que el usuario consume es **la pantalla**, y ésa nunca se midió.

Consecuencias operativas de esto, que gobiernan cómo se lee todo lo de abajo:

1. **`ScoreImpact` es imputado, no medido.** Ninguno de estos 62 defectos está registrado como `H-XXX`, así
   que la penalización literalmente removida sería **0** para los 29 ítems y todo quedaría empatado. Se usa
   **penalización imputada** con la equivalencia declarada en «Cómo leer los números». Es el mismo recurso
   que FPGE-002 declaró como «penalización evitada» y FPGE-003 mantuvo: se nombra para que nadie lo
   confunda con una ganancia de Health real.
2. **Ejecutar estos PT NO subirá el Health de 100.** No se puede retirar una penalización que nunca se
   aplicó. Quien mire `score-history.json` dentro de un mes verá 100 antes y 100 después, y concluirá que la
   tanda no sirvió de nada. **Se dice aquí para que no se concluya eso.**
3. **Recomendación explícita al humano, fuera del algoritmo:** correr `audit PTSA` para registrar estos 62
   como hallazgos con su dimensión y severidad **antes** de cerrar la tanda. FPGE es de sólo lectura sobre
   PTSA y no puede hacerlo. Mientras no ocurra, la puntuación 100 seguirá siendo formalmente correcta y
   materialmente engañosa.
4. **`R-051` existe por esto** y es el único ítem que no corrige un síntoma: corrige el instrumento.

---

## Lectura rápida

### Top-3 por impacto (`delta_score`)

Siete ítems comparten el máximo (`Δ +9.0`, equivalente CRÍTICA). Se listan los tres de mayor `Priority`:

| # | Ítem | Δ Health (imputado) | Qué desbloquea |
|---|---|---|---|
| 1 | **R-023** — el contrato de forma de lista SSR↔API | **+9.0** | Cuatro pantallas permanentemente vacías, incluido el catálogo público |
| 2 | **R-024** — publicar una subasta | **+9.0** | La única vía de entrada de inventario al marketplace |
| 3 | **R-025** — el pendiente de liquidación llega a la interfaz | **+9.0** | El dinero del vendedor deja de ser invisible |

> **`R-027` comparte el mismo `Δ +9.0`** y es, en efecto de negocio, el mayor de los cuatro: es la cadena
> completa de cobro del vendedor. Sale 13.º porque su esfuerzo es **L** y el divisor lo penaliza. El
> algoritmo hace bien su trabajo —premia lo barato— y **se dice aparte que su valor real no es el 13.º**.

### Top-3 quick wins (esfuerzo `S`, mayor `Priority`)

| # | Ítem | Priority |
|---|---|---:|
| 1 | **R-023** | **216.00** |
| 2 | **R-024** | **216.00** |
| 3 | **R-025** | **216.00** |

**Coinciden con el Top de impacto, y eso es información, no un defecto de la lista:** los tres defectos más
graves del producto se arreglan tocando pocas líneas. Como esa coincidencia deja la segunda lista sin
utilidad de decisión, van también **los tres quick wins siguientes**:

| # | Ítem | Priority |
|---|---|---:|
| 4 | **R-026** — el registro alcanzable desde el detalle público | **162.00** |
| 5 | **R-030** — la portada dice lo que el sistema hace | **81.00** |
| 6 | **R-036** — la puja informa su mínimo, su reloj y su estado | **81.00** |

### El dato que ordena la conversación

**De los once P0, siete son la misma clase de fallo:** la interfaz y el API tienen contratos distintos, y
la interfaz **siempre** resuelve la discrepancia pintando un estado vacío tranquilizador. El producto no
puede distinguir «no hay datos» de «el contrato está roto», y en cada ocasión le cuenta al usuario lo
primero. `R-023` es cuatro de esos siete, y cuesta `S`.

---

## Orden priorizado

| Rank | ID | Tipo | Título | Origen (hallazgos) | Dim | Δ Score | Esf. | **Priority** | Estado | PT |
|---:|---|---|---|---|:--:|---:|:--:|---:|---|:--:|
| 1 | **R-023** | BUG | El contrato de forma de lista SSR↔API, con guarda que lo vigile | H-UI-001·002·003·004 | D1 | +9.0 | S | **216.00** | `PROMOVIDO` | **PT-204** |
| 2 | **R-024** | FEATURE | Publicar (y cancelar) una subasta desde el portal | H-UI-007 | D1 | +9.0 | S | **216.00** | `PROMOVIDO` | **PT-205** |
| 3 | **R-025** | BUG | El saldo pendiente de liquidación llega a la interfaz | H-UI-011 | D1 | +9.0 | S | **216.00** | `PROMOVIDO` | **PT-206** |
| 4 | **R-026** | BUG | El registro alcanzable desde el detalle público | H-UI-009 | D1 | +9.0 | S | **162.00** | `PROMOVIDO` | **PT-207** |
| 5 | **R-030** | BUG | La portada dice lo que el sistema hace | H-UI-027·028·041 | D1 | +4.5 | S | **81.00** | `PROMOVIDO` | **PT-208** |
| 6 | **R-028** | FEATURE | El catálogo como superficie de búsqueda: filtros, orden, total, paginación | H-UI-010·042·043·051 | D1 | +9.0 | M | **81.00** | `PROMOVIDO` | **PT-209** |
| 7 | **R-036** | BUG | La puja informa su mínimo, su reloj y su estado | H-UI-020·048·050 | D1 | +4.5 | S | **81.00** | `PROMOVIDO` | **PT-210** |
| 8 | **R-040** | BUG | Contraste y distinción visual: precio, prosa legal, enlaces | H-UI-033·034·035 | D1 | +4.5 | S | **81.00** | `PROMOVIDO` | **PT-211** |
| 9 | **R-032** | BUG | Estados, badges y fechas en el idioma del usuario | H-UI-037·038·045·052 | D1 | +4.5 | S | **81.00** | `PROMOVIDO` | **PT-212** |
| 10 | **R-051** | INVESTIGATION | El alcance de auditoría alcanza al producto que el usuario recibe | meta — S-013 §SIGUIENTE·3 | D2 | +9.0 | M | **72.00** | `PROMOVIDO` | **PT-213** |
| 11 | **R-038** | BUG | Reenvío de la verificación de correo | H-UI-025 | D1 | +4.5 | S | **60.75** | `PROMOVIDO` | **PT-214** |
| 12 | **R-034** | FEATURE | La watchlist se puede alimentar y vaciar | H-UI-017 | D1 | +4.5 | S | **60.75** | `PROMOVIDO` | **PT-215** |
| 13 | **R-027** | FEATURE | Cadena de cobro del vendedor: KYC, método de pago, verificación, solicitud, cola admin | H-UI-005·006·008·026 | D1 | +9.0 | L | **54.00** | `PROMOVIDO` | **PT-216** |
| 14 | **R-044** | FEATURE | Notificaciones accionables: leídas y con destino | Ausencia A-17 | D1 | +4.5 | S | **54.00** | `PROMOVIDO` | **PT-217** |
| 15 | **R-049** | BUG | El backoffice deja de apuntar a `localhost` y afina sus rótulos | H-UI-040·060·061 | D2 | +4.5 | S | **54.00** | `PROMOVIDO` | **PT-218** |
| 16 | **R-031** | BUG | Los documentos legales y la interfaz dicen lo mismo | H-UI-029·030·031·032 | D1 | +4.5 | M | **40.50** | `PROMOVIDO` | **PT-219** |
| 17 | **R-035** | FEATURE | Abrir y seguir una disputa sin teclear un UUID | H-UI-021 | D1 | +4.5 | M | **40.50** | `PROMOVIDO` | **PT-220** |
| 18 | **R-029** | FEATURE | Datos de decisión del lote: cuenta atrás, imágenes, número de pujas | H-UI-018·019 | D1 | +4.5 | M | **40.50** | `PROMOVIDO` | **PT-221** |
| 19 | **R-039** | REFACTOR | Navegación: móvil, orientación y jerarquía | H-UI-012·013·014·015·053·054 | D1 | +4.5 | M | **40.50** | `PROMOVIDO` | **PT-222** |
| 20 | **R-042** | FEATURE | SEO y contenido indexable | H-UI-039·058·059 | D1 | +4.5 | M | **40.50** | `PROMOVIDO` | **PT-223** |
| 21 | **R-041** | BUG | Las dos páginas 404 vuelven al sistema de estilos real | H-UI-036·062 | D2 | +4.5 | S | **36.00** | `PROMOVIDO` | **PT-224** |
| 22 | **R-033** | FEATURE | Cerrar el bucle de reputación | H-UI-016·056 | D1 | +4.5 | M | **30.38** | `PROMOVIDO` | **PT-225** |
| 23 | **R-045** | FEATURE | Contenido institucional y de ayuda | Ausencias A-10·A-11 | D1 | +4.5 | M | **27.00** | `PROMOVIDO` | **PT-226** |
| 24 | **R-037** | FEATURE | Seguridad de la cuenta en el portal: 2FA, contraseña, sesiones, cierre real | H-UI-022·023·024 | D2 | +4.5 | M | **27.00** | `PROMOVIDO` | **PT-227** |
| 25 | **R-043** | BUG | El sistema dice lo que pasa: diagnóstico, estados y regiones vivas | H-UI-046·047 + A-31…A-36 | D3 | +4.5 | M | **27.00** | `PROMOVIDO` | **PT-228** |
| 26 | **R-048** | BUG | Historial financiero: paginación real y filtro de pagos | H-UI-044 | D1 | +1.5 | S | **13.50** | `PROMOVIDO` | **PT-229** |
| 27 | **R-046** | FEATURE | La orden como documento de cumplimiento: dirección y desglose | H-UI-049 + A-22·A-28 | D1 | +1.5 | M | **10.13** | `PROMOVIDO` | **PT-230** |
| 28 | **R-047** | FEATURE | El dashboard como panel de estado | H-UI-055 + A-26 | D1 | +1.5 | M | **9.00** | `PROMOVIDO` | **PT-231** |
| 29 | **R-050** | BUG | La documentación de producto refleja lo que esta auditoría midió | H-UI-057 + C-18·C-23·C-26·C-27 | D4 | +1.5 | M | **9.00** | `PROMOVIDO` | **PT-232** |

**Ningún tope silencioso: los 29 candidatos aparecen los 29.**

### Desempates aplicados, uno a uno

Cinco grupos empataron. La regla es: mayor `Priority` → **D1 antes que D2/D3/D4** → mayor riesgo de no
hacerlo → menor `id`. El tercer criterio no es numérico aquí (los tres de 216 comparten `EvidenceWeight`
16), así que se declara cualitativamente, como hizo FPGE-003 con R-018/R-014:

| Empate | Orden | Criterio |
|---|---|---|
| **216.00** — R-023, R-024, R-025 (los tres D1) | 023 → 024 → 025 | Riesgo: sin catálogo cae **el embudo entero**; sin publicar no entra inventario; el pendiente invisible daña la confianza pero el dinero está y es recuperable |
| **81.00** — R-030, R-028, R-036, R-040, R-032 (los cinco D1) | 030 → 028 → 036 → 040 → 032 | Riesgo: R-030 es el único con **exposición legal externa** e irreversible (publicidad de garantías no prestadas); luego descubrimiento, acción central, legibilidad del precio, comprensión del estado |
| **60.75** — R-038, R-034 (los dos D1) | 038 → 034 | Riesgo: una cuenta inutilizable **en el primer minuto de vida del usuario** pesa más que una lista de seguimiento vacía |
| **54.00** — R-027, R-044, R-049 | 027 → 044 → 049 | **Regla 2**: R-049 es D2 y baja al final del grupo. Entre los dos D1, riesgo: el vendedor no cobra ≫ no poder marcar leída una notificación |
| **27.00** — R-045, R-037, R-043 | 045 → 037 → 043 | **Regla 2**: R-045 es D1 y sube. Entre D2 y D3 el algoritmo no ordena; se aplica riesgo: seguridad de cuenta ≫ regiones vivas. **Ver la nota de abajo: aquí el algoritmo y yo no coincidimos, y manda el algoritmo** |
| **9.00** — R-047, R-050 | 047 → 050 | **Regla 2**: D1 antes que D4 |

---

## Lo que el algoritmo no sabe, y hay que decir aparte

**1. `R-027` vale más que su puesto 13.º.** Es la cadena completa de cobro del vendedor: KYC, alta de CLABE,
verificación de la cuenta, solicitud y cola de aprobación en el backoffice. Cinco pantallas que no existen,
sobre un endpoint deprecado que el formulario actual **no puede acertar nunca**. La fórmula lo castiga por
esfuerzo `L`, y hace bien: es caro. Pero *«el vendedor no puede cobrar»* no es un ítem más de la lista — es
la razón por la que un vendedor abandona una plataforma. **Si sólo se aprueba una cosa cara este ciclo, es
ésta.**

**2. `R-051` no corrige un síntoma: corrige el instrumento.** Sale 10.º con 72.00, y mientras no se haga,
**la próxima auditoría volverá a certificar 100 sin ver nada de esto**. Es literalmente la pregunta que la
propia S-013 dejó escrita en su §SIGUIENTE·3 — *«¿qué otra `RULE-NN` tiene guarda para la parte fácil de
medir y no para la que causó su incidente?… buscar guardas que miran al lado del agujero»*. Esta auditoría
la responde: `rutas-que-los-ssr-invocan.spec.ts` compara **rutas literales** (¿existe el endpoint?) y no
**formas de respuesta** (¿coincide lo que devuelve con lo que la plantilla lee?). La guarda está en verde y
cuatro pantallas están vacías.

**3. `R-023` y `R-051` son el mismo defecto en dos capas.** R-023 arregla los cuatro consumidores; R-051
impide que vuelva. Y hay un detalle que los une y que conviene no perder: **el normalizador correcto ya
existe** (`toItems`, en `src/apps/client/src/common/bff/list-view.ts`), **tiene su propia prueba**
(`list-view.spec.ts`), y **tres rutas del mismo fichero lo usan**. Lo que falta no es la función: es que
nada comprueba que los consumidores la usen. **Si se aprueba R-023, aprobar R-051 con él.**

**4. Donde el algoritmo y yo no coincidimos, y gana el algoritmo.** En el empate de 27.00, la regla de
supremacía del dominio pone «centro de ayuda y contenido institucional» (R-045, D1) por encima de «2FA,
cambio de contraseña y cierre de sesión real» (R-037, D2). Mi criterio diría lo contrario. **Se deja el
orden que da la regla** —es lo que la hace reproducible— y se anota aquí que R-037 tiene un riesgo real
mayor que su puesto: hoy, quien active 2FA por cualquier vía **queda bloqueado de forma permanente**, y
«Salir» deja viva una cookie de refresco durante siete días.

**5. Orden de ejecución ≠ orden de prioridad.** Cuatro dependencias reales:
- **R-023 antes que R-028, R-029 y R-042.** No tiene sentido ordenar, filtrar, ilustrar o indexar un
  catálogo que todavía no puede pintar una fila.
- **R-024 antes que R-029.** Sin poder publicar no hay subastas cuyas imágenes y cuenta atrás mostrar.
- **R-027 en un solo PT, no en cinco.** Sus cinco pantallas son una cadena de puertas: entregar tres de
  cinco deja al vendedor exactamente igual de bloqueado, con tres pantallas nuevas que no sirven para nada.
- **R-031 espera a la revisión jurídica** de los ocho riesgos `L-01`…`L-08`. La parte de interfaz
  (consentimiento en el registro, enlaces legales, exportación de datos) puede adelantarse; el **texto** de
  los documentos, no.

**6. Una advertencia sobre R-028 que es decisión de producto, no de ingeniería.** El catálogo ofrece cinco
categorías, el diseño oficial dibuja ocho, y **el modelo de datos no tiene ninguna**. R-028 no puede
empezar hasta que alguien decida cuál de las tres taxonomías es la buena. Lo mismo con el filtro
«Cerradas»: hoy el API prohíbe por diseño exponer subastas cerradas al público, así que ofrecerlo exige
decidir antes si el histórico es público.

---

## Racional por ítem

### R-023 · BUG · Priority 216.00 · Esfuerzo S · D1 · `H-UI-001·002·003·004`

**Cuatro pantallas permanentemente vacías por un contrato de forma que nadie vigila.**

`Priority = (16 × 9.0 × 1.0 × 1.5) / 1 = 216.00`

- **Evidencia:** sondeo en ejecución — `GET /api/v1/auctions?status=ACTIVE&limit=6` devuelve
  `{"data":[],"total":0,"page":1,"limit":6}`: **no existe la clave `items`**. El SSR público lee
  `data?.items` (catálogo) y `auctions.length` sobre un objeto (portada). `/notifications` y `/disputes`
  devuelven arrays planos y sus plantillas iteran `.items`.
- **Racional:** el fallo es indistinguible de un estado vacío legítimo. No hay error, no hay log, no hay
  nada rojo. Cuatro superficies —la vitrina pública, la portada, el reenganche del comprador y el
  seguimiento de conflictos— llevan quién sabe cuánto tiempo diciéndole al usuario «no hay nada».
- **Lo que lo hace `S`:** el normalizador **ya está escrito y probado** (`toItems` + `list-view.spec.ts`),
  y tres rutas del mismo controlador lo usan. Son cuatro llamadas y un mapeo en la portada.
- **Alcance obligatorio del PT:** incluir la tabla «Subastas activas» del dashboard, que falla por lo
  mismo (`auctions.items` sobre `{data,…}`), y **la guarda** que impida la reaparición (ver R-051).
- **Riesgo de no hacerlo:** el producto no tiene vitrina. Todo lo demás de este roadmap se construye sobre
  un catálogo que no muestra nada.
- **Definición de hecho:** con datos en la base, `/`, `/auctions`, `/notifications`, `/disputes` y el
  dashboard renderizan filas; una prueba falla si un consumidor SSR lee una clave que el API no emite.

### R-024 · FEATURE · Priority 216.00 · Esfuerzo S · D1 · `H-UI-007`

**No existe ninguna acción «Publicar» en todo el portal.**

`Priority = (16 × 9.0 × 1.0 × 1.5) / 1 = 216.00`

- **Evidencia:** `grep -rn "publish"` sobre `src/apps/client/views` y `public/js` → **0 resultados**.
  `seller/auctions.html` sólo emite «Editar» sobre un `DRAFT`. El endpoint existe y **la suite de QA lo
  invoca por `fetch` desde la consola del navegador**, no por interfaz (`10-bootstrap.js:196`).
- **Racional:** el vendedor completa onboarding, rellena el formulario, ve su subasta listada, y no tiene
  forma de ponerla en venta. Es la transición que convierte trabajo en inventario y **no está expuesta**.
  Que la suite de QA la invoque a mano es lo que permitió que nadie lo notara: los flujos automatizados
  publican, los humanos no pueden.
- **Alcance:** publicar, **cancelar** (`A-14`, hoy tampoco existe) y representar el estado
  `PENDING_MODERATION` que `RN-12` puede producir.
- **Riesgo de no hacerlo:** no entra oferta al catálogo por vía normal. Junto con R-023, el marketplace no
  tiene ni entrada de inventario ni salida a vitrina.
- **Referencia:** `RN-11`, `RN-12`, `Manual de Usuario §4` paso 2.

### R-025 · BUG · Priority 216.00 · Esfuerzo S · D1 · `H-UI-011`

**El BFF recibe el saldo pendiente del vendedor y lo tira antes de la plantilla.**

`Priority = (16 × 9.0 × 1.0 × 1.5) / 1 = 216.00`

- **Evidencia:** `GET /wallet/balance` devuelve `{available, held, pending, currency, isActive}`
  (`wallet.controller.ts:50-56`, con el DTO documentado como *«PT-071 — ventas sin liquidar (holdback)»*).
  La interfaz `WalletBalanceRaw` del BFF declara **cuatro** campos y `mapWalletBalance` construye el objeto
  **sin `pending`**.
- **Racional:** el vendedor vende, el neto entra correctamente a `pendingBalance`, y **ninguna pantalla lo
  muestra**. Lo que sí muestra —«Fondos retenidos en ofertas»— es `heldFunds`, que es dinero del comprador
  bloqueado por pujas: dos conceptos distintos y el que falta es el suyo. En una plataforma cuya propuesta
  declarada es «custodia segura» y «transparencia total», ocultar dinero custodiado es el peor fallo de
  confianza posible.
- **Alcance:** añadir `pending` al mapeador, una tercera métrica en `/wallet` y en el dashboard, y **la
  fecha de liberación** (`shipment.deliveredAt` + 72 h, o el vencimiento de los 14 días), que es la
  pregunta que el vendedor se hará inmediatamente después (`A-21`).
- **Riesgo de no hacerlo:** indistinguible de un pago perdido.
- **Referencia:** `RN-64`, `Manual de Usuario §4`.

### R-026 · BUG · Priority 162.00 · Esfuerzo S · D1 · `H-UI-009`

**«¿No tienes cuenta? Regístrate gratis» apunta a `CLIENT/auth/register`, que devuelve 404.**

`Priority = (12 × 9.0 × 1.0 × 1.5) / 1 = 162.00`

- **Evidencia:** sondeo en ejecución: `GET http://localhost:5175/auth/register` → **404**. El registro vive
  en BASE (`base/src/app.controller.ts:100`); el portal privado sólo declara `/auth/logout`.
- **Racional:** es el CTA de conversión en la única página donde el visitante anónimo ya ha demostrado
  interés por un lote concreto. Aterriza en un 404, **en un dominio distinto**, y ese 404 además está sin
  estilos (ver R-041).
- **`EvidenceWeight` 12 y no 16:** probabilidad 3 — afecta a quien pulse ese enlace secundario, no a todo
  visitante en el camino principal (el CTA de la cabecera sí funciona).
- **Riesgo de no hacerlo:** pérdida directa de registros en el punto de máxima intención de compra.

### R-030 · BUG · Priority 81.00 · Esfuerzo S · D1 · `H-UI-027·028·041`

**La portada afirma tres cosas que el sistema no hace, y cierra con un formulario que no envía a nadie.**

`Priority = (12 × 4.5 × 1.0 × 1.5) / 1 = 81.00`

- **Evidencia:** (a) *«Socios y aliados estratégicos: PayPal, Mercado Pago, **DHL, FedEx**»* contra `RN-35`,
  que dice literalmente *«**Sin integración de transportista real**: `carrier`/`trackingNumber` son campos
  manuales»*. (b) *«entrega garantizada»* y *«Tus fondos quedan retenidos hasta confirmar la entrega»*
  contra `RN-30` (al ganador se le **captura** al cierre) y `RN-64` (lo retenido tras la entrega es el neto
  **del vendedor**). (c) `<form action="#" method="post">` en un sitio cuyo propio `main.ts:57` declara
  *«BASE has no SSR POST routes»*, sin JS asociado, sin consentimiento y sin enlace a la privacidad.
- **Racional:** es el texto que más gente lee y el que peor resiste el contraste con las reglas. Describe
  al comprador una protección tipo escrow que **no recibe**, y usa marcas de terceros para afirmar alianzas
  inexistentes.
- **Además:** el diseño oficial (`docs/design/Index.png §8`) especifica esa sección como **certificaciones
  y auditoras** (KPMG, ISO 27001, McAfee), no transportistas; y §9 especifica un **CTA final de registro**,
  no una captura de correos.
- **Riesgo de no hacerlo:** exposición legal externa (publicidad de garantías no prestadas, uso de marca
  ajena en falsa asociación) e irreversible: lo que se publicó, se publicó.

### R-028 · FEATURE · Priority 81.00 · Esfuerzo M · D1 · `H-UI-010·042·043·051`

**Seis controles de filtrado que responden al clic y no producen ningún efecto.**

`Priority = (12 × 9.0 × 1.0 × 1.5) / 2 = 81.00`

- **Evidencia:** el SSR lee `page` y `q`; `auctions.findAll` acepta `status`, `sellerId`, `page`, `limit`,
  `mine`, `currentUserId`. **`q`, `category`, `minPrice`, `maxPrice`, `verified` y `sort` no los lee nadie.**
  El modelo `Auction` **no tiene campo `category`**. `total` se obtiene y se descarta: el contador muestra
  el tamaño de la página. «Siguiente» aparece con la heurística `length >= 12` sobre un `limit` real de 10.
- **Racional:** el usuario cambia un filtro, obtiene lo mismo, y concluye que **no hay resultados que
  cumplan su criterio** — cuando lo que ocurre es que el criterio se descarta. Es peor que no ofrecer
  filtros. `PRD RF-10` declara la búsqueda **✅ Operable**.
- **Bloqueo declarado:** requiere dos decisiones de producto antes de empezar (taxonomía de categorías;
  si el histórico de cerradas es público). Ver «Lo que el algoritmo no sabe · 6».
- **Referencia:** `PRD RF-10`, `docs/design/list.png §4-5-7`.

### R-036 · BUG · Priority 81.00 · Esfuerzo S · D1 · `H-UI-020·048·050`

**El formulario de puja no dice cuál es la puja mínima, y el portal decide por su cuenta quién gana.**

`Priority = (12 × 4.5 × 1.0 × 1.5) / 1 = 81.00`

- **Evidencia:** `<input min="0">` contra `RN-14`, que exige `> currentPrice + AUCTION_MIN_INCREMENT_AMOUNT`
  (10 MXN, aplicado en `bids.service.ts:92-98`). El BFF deriva `isWinning` comparando importes
  (`Number(bid.amount) === Number(bid.auction?.currentPrice)`) y **el propio fichero documenta que el API no
  provee ese flag**. Y el CTA «Pujar ahora» sólo se emite si `status == 'ACTIVE'`, cuando `RN-16` dice que
  el API acepta **`PUBLISHED` y `ACTIVE`** y `RN-18` que **la primera puja fuerza `ACTIVE`**.
- **Racional:** tres formas del mismo problema — la interfaz no refleja la regla que gobierna la acción
  central del producto. Prevención de errores ausente en algo con contrapartida económica inmediata
  (pujar retiene fondos), descubierta por rechazo, en un contexto de urgencia de 120 segundos. Y la
  restricción del CTA **bloquea la primera puja de toda subasta publicada**.
- **Alcance:** mínimo calculado y prellenado, explicación del soft-close, estado de puja declarado por el
  API, CTA alineado con `RN-16`.

### R-040 · BUG · Priority 81.00 · Esfuerzo S · D1 · `H-UI-033·034·035`

**El precio actual, dato central del producto, está a 2,56:1.**

`Priority = (12 × 4.5 × 1.0 × 1.5) / 1 = 81.00`

- **Evidencia (medida, no estimada):** `#C89B3C` sobre `#FFFFFF` = **2,56:1**; sobre `#F6F6F6` = **2,37:1**.
  WCAG 2.1 AA exige 4,5:1 (normal) y 3:1 (grande). `.price-value` es 2 rem/700 —texto grande— y **también
  falla**. `.prose p` (`#6B7280` sobre `#F6F6F6`) = **4,47:1**, por debajo de 4,5 — y es el cuerpo íntegro
  de los términos y la privacidad. `a { color: inherit; text-decoration: none }` sin regla `.prose a`: los
  dos `mailto:` de `/contact`, que son la función completa de esa página, no se distinguen del texto.
- **Racional:** son umbrales objetivos incumplidos, no criterios de gusto. Un precio mal leído en un
  sistema financiero es una puja equivocada.
- **Nota de marca:** el uso del oro es **coherente** con `docs/design/Modo_Luz.md` (secundario, «valor y
  jerarquía»). Lo que falta es una variante del token con contraste suficiente sobre claro —
  `--cl-gold-dark` (`#a8832e`) tampoco llega: ≈3,6:1.

### R-032 · BUG · Priority 81.00 · Esfuerzo S · D1 · `H-UI-037·038·045·052`

**El portal muestra constantes técnicas en inglés donde el FAQ promete español.**

`Priority = (12 × 4.5 × 1.0 × 1.5) / 1 = 81.00`

- **Evidencia:** `PAID`, `SHIPPED`, `REFUNDED`, `DRAFT`, `OPEN`, `IN_MEDIATION`, `DEBIT_ORDER`,
  `CREDIT_SALE` impresos crudos en órdenes, ganadas, pedidos, disputas, subastas e historial.
  `docs-v2/7-ux/FAQ-y-Mensajes.md §3` fija las etiquetas en español para las cinco entidades. Los badges
  usan `badge-info` (azul) para **todos** los estados de orden y subasta y `badge-warning` para **todos**
  los de disputa, teniendo el sistema definidas `success/warning/danger/info/gold/muted`. Las fechas salen
  en ISO con milisegundos. Y el mismo concepto tiene tres nombres: oferta/puja, Órdenes/Pedidos,
  Wallet/Watchlist en inglés, IronLoot/Iron Loot.
- **Racional:** hay un contrato terminológico documentado y la interfaz emite el identificador interno.
  `DEBIT_ORDER` no significa nada para el usuario a quien pertenece ese dinero. Y una escala semántica de
  color definida y no usada convierte una tabla de veinte órdenes en veinte celdas que hay que leer.
- **Dato de apoyo:** el sitio público **sí** traduce («Activa», «Próxima», «Cerrada»). La traducción existe
  y no se aplica donde importa.

### R-051 · INVESTIGATION · Priority 72.00 · Esfuerzo M · D2 · meta

**El instrumento certificó Health 100 con once P0 vivos en la interfaz.**

`Priority = (16 × 9.0 × 1.0 × 1.0) / 2 = 72.00`

- **Evidencia:** S-013 (2026-07-30): Health 100/100, D1 100 con cobertura declarada 100 % («14 de 14
  reglas medidas»), 0 hallazgos activos. Esta auditoría, un día después y sin un solo commit de código
  intermedio: 62 hallazgos, 11 P0. `audit-scope.yaml` **incluye** las vistas y los `src/**/*.ts` de los
  tres SSR desde S-001.
- **Racional:** el hueco no es de alcance de ficheros, es de **unidad de auditoría**. PTSA mide productos
  de datos sobre la salida real en la base; las 14 reglas de dominio se cumplen sobre las filas **y se
  seguirían cumpliendo con el catálogo apagado**, porque ninguna pregunta si el producto llega a la
  pantalla. `[A8]` hace de la cobertura declarada un requisito del score, y la cobertura declarada dice
  100 % sobre una definición de producto que excluye lo que el usuario ve.
- **Y ya estaba anotado:** S-013 §SIGUIENTE·3 dejó escrita la pregunta —*«¿qué otra `RULE-NN` tiene guarda
  para la parte fácil de medir y no para la que causó su incidente?… buscar guardas que miran al lado del
  agujero»*—. `rutas-que-los-ssr-invocan.spec.ts` (PT-132, ampliada por PT-148) compara **rutas literales**:
  comprueba que el endpoint exista, no que la forma de la respuesta coincida con lo que la plantilla lee.
  La guarda está verde y cuatro pantallas están vacías. **La auditoría formuló la pregunta y ésta es la
  respuesta.**
- **Alcance sugerido (a definir en STATE 1-B):** ¿la unidad de auditoría incorpora un producto «pantalla»?
  ¿un checkpoint que renderice las rutas SSR contra datos reales y falle si una lista queda vacía teniendo
  filas en la base? ¿una guarda de **forma** de respuesta, no sólo de existencia de ruta?
- **Riesgo de no hacerlo:** la próxima auditoría vuelve a emitir Clase A sobre un producto con el escaparate
  apagado. Es la familia H-014/H-015/H-017 aplicada al propio instrumento: *un mecanismo que no mide donde
  duele no avisa de nada*.

### R-038 · BUG · Priority 60.75 · Esfuerzo S · D1 · `H-UI-025`

**«Revisa tu correo» enuncia el modo de fallo y no ofrece la salida.**

`Priority = (9 × 4.5 × 1.0 × 1.5) / 1 = 60.75`

- **Evidencia:** la pantalla dice *«¿No lo ves? Revisa la carpeta de spam. El enlace expira en 24 horas»* y
  su único botón es «Volver a inicio de sesión». `FAQ-y-Mensajes §2` prescribe, ante `USER_NOT_VERIFIED`:
  *«Revisa tu correo / **reenvía verificación**»*. El backend lo implementa (RULE-36 nombra el reenvío como
  llamante que propaga).
- **Racional:** cuenta creada e inutilizable en el primer minuto, con `RN-03`/`BC-06` haciendo la
  verificación obligatoria. La pantalla reconoce que el correo puede no llegar y no hace nada al respecto.

### R-034 · FEATURE · Priority 60.75 · Esfuerzo S · D1 · `H-UI-017`

**La watchlist no se puede alimentar ni vaciar.**

`Priority = (9 × 4.5 × 1.0 × 1.5) / 1 = 60.75`

- **Evidencia:** `grep -rn "watchlist"` en plantillas y JS de ambos sitios devuelve **sólo** el enlace del
  menú y la propia página de listado. Los endpoints existen (`addToWatchlist`, borrado).
  `docs/design/list.png §6` dibuja el botón corazón en la esquina de **cada tarjeta**.
- **Racional:** una pantalla cuyo contenido no puede originarse mostrará siempre su estado vacío, ocupando
  jerarquía de menú sin poder aportar nada. Y se pierde el mecanismo natural de volver a una subasta que
  aún no ha cerrado — en un producto donde el momento de la puja decide la venta.

### R-027 · FEATURE MAJOR · Priority 54.00 · Esfuerzo L · D1 · `H-UI-005·006·008·026`

**El vendedor no puede cobrar, y ninguna de las cuatro puertas tiene interfaz.**

`Priority = (16 × 9.0 × 1.0 × 1.5) / 4 = 54.00`

- **Evidencia:** el formulario envía `{amount, account}`; `WithdrawDto` exige `referenceId` y el
  `ValidationPipe` corre con `whitelist: true, forbidNonWhitelisted: true` — **400 garantizado**. El
  endpoint es compat deprecado (`@ApiOperation({summary: 'Deprecated — use POST /wallet/withdrawals'})`) y
  mapea `paymentMethodId: dto.referenceId` → `undefined`. El JS **descarta la respuesta del servidor**:
  `res.ok ? 'Solicitud de retiro enviada.' : 'Error al procesar.'`, sin `try/catch`.
  `grep -i kyc` en todo el portal → **una línea**, un texto informativo. `grep -rn "withdraw"` en todo
  ADMIN (`src` + `views`) → **0 resultados**.
- **Racional:** `withdrawals.request` tiene cuatro puertas —KYC `APPROVED`, método de pago existente,
  método `isVerified`, saldo y límite diario— con cuatro mensajes accionables distintos. El usuario recibe
  siempre la misma cadena inútil. Y **tres de las cuatro puertas no tienen ninguna pantalla por la que
  pasar**: no hay envío de documentos KYC, ni alta de CLABE con titular, ni confirmación del código de
  verificación. El backoffice, además, **no tiene la cola de aprobación** que su propio manual describe en
  cinco pasos con pantalla (`Manual-de-Administrador §3.6`).
- **Alcance (un solo PT, no cinco):** las cinco pantallas más la migración al endpoint vigente más la
  propagación del diagnóstico. Entregar tres de cinco deja al vendedor igual de bloqueado.
- **Incluye `H-UI-026`:** el onboarding declara *«¡Cuenta de vendedor activada!»* sin haber pedido un solo
  documento, cuando `enable-seller` exige KYC `APPROVED`.
- **Referencia:** `RN-62`, `RN-63`, `RN-65`, `RN-66`, `Manual de Usuario §4`, `Manual-de-Administrador §3.6`.

### R-044 · FEATURE · Priority 54.00 · Esfuerzo S · D1 · Ausencia `A-17`

**Las notificaciones no se pueden marcar leídas ni llevan a ninguna parte.**

`Priority = (8 × 4.5 × 1.0 × 1.5) / 1 = 54.00`

- **Evidencia:** la plantilla distingue leída/no leída **sólo por color**, no hay acción de marcado, no hay
  contador en la barra lateral y ninguna notificación enlaza a la subasta u orden que la originó. El API
  expone `getUnreadCount` y el marcado; nadie los usa.
- **Racional:** depende de R-023 para ser siquiera visible. Una vez lo sea, una lista de la que no se puede
  salir hacia el objeto que la motivó rompe el bucle de reenganche que `RN-23` existe para crear.

### R-049 · BUG · Priority 54.00 · Esfuerzo S · D2 · `H-UI-040·060·061`

**El backoffice enlaza al sitio público con `http://localhost:5174` fijo, en las 28 pantallas.**

`Priority = (12 × 4.5 × 1.0 × 1.0) / 1 = 54.00`

- **Evidencia:** `<a href="http://localhost:5174" target="_blank">Ver sitio</a>` en `layouts/admin.html`,
  sin `rel="noopener noreferrer"`. `CLAUDE.md` (PT-088) dice literalmente: *«**Nunca escribir un
  `localhost:<puerto>` en una URL que salga del sistema**»*, con `PUBLIC_SCHEME`/`PUBLIC_DOMAIN` como
  fuente única.
- **Racional:** viola una regla explícita del proyecto y en cualquier entorno que no sea la máquina del
  desarrollador el enlace no abre nada. Se acompaña del rótulo «Pasarelas» apuntando a `/settings`
  conviviendo con «Config. Plataforma» → `/configuration/platform`: dos criterios de nombrado distintos
  para lo mismo.

### R-031 · BUG · Priority 40.50 · Esfuerzo M · D1 · `H-UI-029·030·031·032`

**Los documentos legales publicados describen funcionalidades que la interfaz no tiene.**

`Priority = (12 × 4.5 × 1.0 × 1.5) / 2 = 40.50`

- **Evidencia:** (a) la privacidad promete exportar y eliminar datos *«desde la configuración de tu
  cuenta»*; esa pantalla tiene **dos casillas de notificación por correo**. (b) los términos remiten a
  *«las tarifas actuales… en tu panel de vendedor»*; el panel no muestra ninguna comisión, y `RN-31` hace
  la tasa **configurable por vendedor** (cada uno puede tener una distinta y ninguno puede consultarla).
  (c) el registro no presenta ni enlaza términos ni aviso de privacidad, y no recoge acto afirmativo —
  mientras el onboarding de vendedor **sí** tiene casilla explícita: dos criterios en el mismo producto.
  (d) la privacidad no menciona **cookies** en ningún punto (con `COOKIE_DOMAIN` compartido entre
  subdominios y tipografías servidas desde Google en toda página pública) y enumera dos procesadores de
  pago cuando el sistema puede ofrecer cuatro (`STRIPE`, `HEY_BANCO` en `PROVIDER_LABELS`; AUD-023).
- **Racional:** PTSA define su propósito como probar que los productos son *«**legalmente**, operativa y
  semánticamente válidos»*. Un documento vinculante que describe una pantalla que no existe es un fallo de
  validez legal del producto, no una errata.
- **Dependencia declarada:** la parte de **interfaz** (consentimiento en el registro, enlaces legales,
  sección de datos personales en configuración, mostrar tarifas) puede ejecutarse ya. El **texto** de los
  documentos y los ocho riesgos `L-01`…`L-08` **esperan revisión jurídica** — que no es trabajo FDGE.

### R-035 · FEATURE · Priority 40.50 · Esfuerzo M · D1 · `H-UI-021`

**Abrir una disputa exige teclear un UUID a mano.**

`Priority = (12 × 4.5 × 1.0 × 1.5) / 2 = 40.50`

- **Evidencia:** campo obligatorio *«ID de la orden — placeholder: UUID de la orden»*, `input` de texto
  libre. La plantilla acepta `?orderId=` y **ninguna pantalla genera ese enlace**. El detalle de orden no
  menciona disputas. La ficha de disputa muestra tres campos y no permite responder ni aportar evidencia,
  pese a existir el estado `IN_MEDIATION`.
- **Racional:** se pide un dato de máquina en el peor momento posible —cuando el usuario ya tiene un
  problema con su compra— y no se comunica ninguna de las cuatro precondiciones de `RN-40` (plazo de 14
  días restante, una por orden, estados admitidos, sólo participante).
- **Depende de R-023** para que la lista deje de estar vacía.

### R-029 · FEATURE · Priority 40.50 · Esfuerzo M · D1 · `H-UI-018·019`

**El detalle público no muestra cuándo cierra, ni imágenes, ni cuántas pujas hay — y no se pueden subir fotos.**

`Priority = (12 × 4.5 × 1.0 × 1.5) / 2 = 40.50`

- **Evidencia:** las plantillas leen `auction.imageUrl`, `auction.endDate` y `auction.totalBids`; el DTO
  expone `images` (array), `endsAt` y **no expone recuento de pujas**. Los tres condicionales son siempre
  falsos: nunca hay imagen, nunca aparece «Cierra:», y el panel dice siempre «Sin ofertas aún». Y el
  formulario de creación **no tiene ningún campo de fichero**, pese a que el modelo tiene
  `images Json @default("[]")`, existe un módulo `upload` y la propia portada promete *«crea tu propia
  subasta **con fotos**»*.
- **Racional:** el tiempo restante es la variable que produce la puja; el recuento es la prueba social que
  la valida. `list.png §6` especifica ambos, más imagen y badge de categoría. El detalle **privado** sí
  tiene cuenta atrás: la información existe y se muestra sólo a quien ya está dentro.
- **Depende de R-023 y R-024.**

### R-039 · REFACTOR · Priority 40.50 · Esfuerzo M · D1 · `H-UI-012·013·014·015·053·054`

**Debajo de 640 px el sitio público se queda sin menú, y el portal nunca dice dónde estás.**

`Priority = (12 × 4.5 × 1.0 × 1.5) / 2 = 40.50`

- **Evidencia:** `@media (max-width: 640px) { .nav-links { display: none } }` sin ningún control de
  sustitución en el marcado. `.nav-item.active` **está definida en `client.css` y ninguna plantilla la
  aplica** (`grep active` en `client/views` y `public/js` → 0), mientras ADMIN sí resuelve el estado activo
  en sus 20 entradas. Sin breadcrumbs en ninguna de las 27 pantallas. La barra lateral tiene una sola
  entrada «Wallet» para cinco operaciones, `/payments` no está enlazada desde ninguna parte, y la sección
  «Vendedor» se muestra a todos sin consultar `isSeller`. En móvil los rótulos «Comprador»/«Vendedor» se
  ocultan y quedan 16 enlaces planos por encima del contenido de cada página.
- **Racional:** ocultar navegación en móvil sin patrón de sustitución rompe un patrón establecido; una
  regla CSS muerta es orientación que alguien diseñó y nadie conectó. La herramienta interna está mejor
  orientada que el producto de cara al cliente.

### R-042 · FEATURE · Priority 40.50 · Esfuerzo M · D1 · `H-UI-039·058·059`

**El sitio público no tiene metadatos ni URLs indexables.**

`Priority = (12 × 4.5 × 1.0 × 1.5) / 2 = 40.50`

- **Evidencia:** `grep -rn "og:|canonical|robots|twitter:"` en `base/views` → **0**. `base/public/` contiene
  `css, favicon.svg, images, js` — sin `robots.txt` ni `sitemap.xml`. El bloque `meta_description` **nunca
  se sobrescribe**: las 15 páginas comparten la misma descripción. Las URLs de subasta usan el UUID pese a
  que el modelo tiene `slug @unique` y el DTO lo expone. Y el pie enlaza `/static/terms` mientras `/terms`
  existe como 301 hacia esa misma variante.
- **Racional:** el descubrimiento orgánico es el canal natural de un marketplace de lotes únicos. Sin OG,
  cada subasta compartida aparece sin título ni imagen. **Y el API tiene un módulo `seo` sin controlador y
  ADMIN una pantalla «SEO — metadatos por página» cuyo efecto sobre BASE es nulo.**

### R-041 · BUG · Priority 36.00 · Esfuerzo S · D2 · `H-UI-036·062`

**Las dos páginas 404 usan clases de una librería que el proyecto no incluye.**

`Priority = (8 × 4.5 × 1.0 × 1.0) / 1 = 36.00`

- **Evidencia:** comprobado clase por clase — `hero`, `min-h-screen`, `bg-base-200`, `max-w-md`, `text-5xl`,
  `py-6`, `font-bold`, `text-4xl`, `text-error`, `mb-4`, `p-5`, `text-xl`: **0 coincidencias** en `base.css`
  (1.182 líneas) y **0** en `client.css` (805). Residuo de DaisyUI, retirado por ADR-002 (`PRD §4`).
- **Racional:** la pantalla de error aparece rota justo cuando el usuario ya está desorientado, sugiriendo
  un fallo grave del sitio y no una URL incorrecta. Se acompaña de la limpieza del logo SVG duplicado en
  ocho plantillas con colores literales fuera del sistema de tokens.

### R-033 · FEATURE · Priority 30.38 · Esfuerzo M · D1 · `H-UI-016·056`

**No existe forma de calificar, y la reputación sólo la ve su propio dueño.**

`Priority = (9 × 4.5 × 1.0 × 1.5) / 2 = 30.38`

- **Evidencia:** `grep -rn "rating"` en plantillas y JS del portal → **0 resultados**. `/reputation` muestra
  dos promedios y nada más: sin número de valoraciones, sin comentarios, sin contraparte. Y la reputación
  **no aparece en ninguna otra pantalla**: ni en el detalle público, ni en las tarjetas, ni en la orden.
- **Racional:** `RN-43` y `RF-51` están implementados en el API. La pantalla que exhibe reputación **no
  puede alimentarse por ningún camino**, así que mostrará «Sin calificaciones» indefinidamente. Y la
  confianza entre desconocidos sólo funciona si es visible **en el momento de decidir** — nota además que
  el filtro «Solo verificados» del catálogo presupone que esa señal se muestra en algún sitio.

### R-045 · FEATURE · Priority 27.00 · Esfuerzo M · D1 · Ausencias `A-10·A-11`

**No existe ninguna vía de autoservicio de ayuda en todo el producto.**

`Priority = (8 × 4.5 × 1.0 × 1.5) / 2 = 27.00`

- **Evidencia:** `docs/design/Index.png §10` y `list.png §9` especifican **Centro de ayuda, Guías, Blog,
  Preguntas frecuentes, Tarifas, Seguridad, Trabaja con nosotros, Prensa**, más teléfono, horario,
  dirección y redes. El pie real tiene seis enlaces, dos de los cuales —«Cómo funciona» y «Acerca de»—
  apuntan **al mismo destino**, y la columna «Soporte» no contiene ningún recurso de soporte. El menú
  principal especificado tiene cinco entradas (Subastas, Cómo funciona, Categorías, Empresas, Recursos);
  el real tiene dos.
- **Racional:** existe un FAQ escrito y mantenido (`docs-v2/7-ux/FAQ-y-Mensajes.md`) que **no se publica en
  ninguna parte**. El usuario que necesita ayuda tiene un `mailto:` invisible (ver R-040) y nada más.

### R-037 · FEATURE · Priority 27.00 · Esfuerzo M · D2 · `H-UI-022·023·024`

**Con 2FA activado no se puede entrar; y «Salir» no cierra la sesión.**

`Priority = (12 × 4.5 × 1.0 × 1.0) / 2 = 27.00`

- **Evidencia:** el login tiene correo y contraseña; el API, si `isTwoFactorEnabled`, lanza
  `ValidationException('2FA code required')` y el JS lo pinta como error **sin ofrecer un segundo paso**.
  `grep -i "2fa|totp"` en plantillas y JS de BASE y CLIENT → **0**: tampoco hay forma de activarlo, pese a
  existir `/auth/2fa/generate` y `/2fa/enable` y a que `PRD RF-02` lo declara ✅. No hay cambio de
  contraseña autenticado ni gestión de sesiones, mientras el `Manual de Usuario §1` instruye
  explícitamente *«si no fuiste tú, **cambia la contraseña**»*. Y `logout()` borra **sólo** `access_token`,
  cuando el guard del mismo servicio hace lo contrario y explica por qué: *«Borra **las dos** cookies…
  Dejar la de refresco sería dejar una llave muerta»*.
- **Racional:** la misma decisión de seguridad está tomada de dos formas contradictorias en el mismo
  servicio, y la que ejecuta el usuario es la insegura. Quien active 2FA queda **bloqueado de forma
  permanente**, sin vía de recuperación desde la interfaz.
- **Ver «Lo que el algoritmo no sabe · 4»:** su riesgo real es mayor que su puesto 24.º.

### R-043 · BUG · Priority 27.00 · Esfuerzo M · D3 · `H-UI-046·047` + `A-31…A-36`

**El sistema no dice lo que pasa: ni durante, ni al fallar, ni a quien no puede ver la pantalla.**

`Priority = (12 × 4.5 × 1.0 × 1.0) / 2 = 27.00`

- **Evidencia:** ningún formulario deshabilita su botón durante el envío ni muestra estado de carga —
  **salvo uno**: `pages-orders-detail.js` hace `boton.disabled = true` y `window.confirm` antes de una
  acción con consecuencia económica. Existe el estándar interno y se aplica en uno de doce ficheros.
  Ningún contenedor de mensaje (`#loginError`, `#depositError`, `#withdrawMsg`, `#bidMsg`, …) declara
  `role="alert"`, `role="status"` ni `aria-live`. Y no existen pantallas ni estados para carga, error de
  servidor, sin permisos (403 diferenciado del 404), sesión expirada, conflicto ni «procesando» prolongado.
- **Racional:** es la dimensión D3 aplicada a la interfaz. El usuario no puede observar qué ocurrió, igual
  que un `catch` mudo impide al operador observar por qué falló. Consecuencia inmediata: doble depósito o
  doble solicitud de retiro por doble clic.
- **Nota:** el mensaje genérico del retiro (*«Error al procesar»*) se corrige en **R-027**, no aquí.

### R-048 · BUG · Priority 13.50 · Esfuerzo S · D1 · `H-UI-044`

**El historial no pagina y «Mis pagos» no filtra: los dos parámetros se descartan.**

`Priority = (6 × 1.5 × 1.0 × 1.5) / 1 = 13.50`

- **Evidencia:** el portal llama `/wallet/history?page=N` y `?types=DEBIT_ORDER,CREDIT_SALE`, pero
  `getHistory` acepta **sólo `limit`**. Ninguna plantilla ofrece controles de paginación.
- **Racional:** «Mis pagos» promete una vista filtrada y muestra el ledger completo, duplicando
  «Historial»; y el historial se trunca en silencio. En un sistema cuyo valor declarado es la trazabilidad
  financiera, el usuario no puede auditar sus propios movimientos antiguos.

### R-046 · FEATURE · Priority 10.13 · Esfuerzo M · D1 · `H-UI-049` + `A-22·A-28`

**La orden no dice a dónde enviar ni qué se descontó.**

`Priority = (9 × 1.5 × 1.0 × 1.5) / 2 = 10.13`

- **Evidencia:** el detalle muestra subasta, monto total, vendedor y fecha. Sin dirección de entrega, sin
  comisión, sin neto, sin contacto de la contraparte — cuando `RN-56` exige dirección/ciudad/país al
  vendedor y `RN-31` fija una comisión que los términos declaran consultable en el panel.
- **Racional:** el vendedor debe enviar un artículo físico y la pantalla de la venta no dice a dónde; el
  cumplimiento post-venta se resuelve fuera del sistema. **Es la mitad de implementación de `H-UI-032`**,
  cuya mitad legal vive en R-031.

### R-047 · FEATURE · Priority 9.00 · Esfuerzo M · D1 · `H-UI-055` + `A-26`

**El dashboard no responde «¿qué necesita mi atención?».**

`Priority = (8 × 1.5 × 1.0 × 1.5) / 2 = 9.00`

- **Evidencia:** dos cifras y tres botones. No indica si el correo está verificado, si el usuario es
  vendedor, si el KYC está pendiente, si hay notificaciones sin leer, órdenes esperando acción o pujas
  ganando. **El controlador sí obtiene `profile` y `bids`, y la plantilla no los usa.**
- **Racional:** es la pantalla de aterrizaje del portal, y obliga a recorrer 16 secciones para descubrir si
  algo requiere acción. Depende de R-023 (su tabla de subastas activas falla por el mismo contrato) y gana
  sentido después de R-025 y R-027.

### R-050 · BUG · Priority 9.00 · Esfuerzo M · D4 · `H-UI-057` + `C-18·C-23·C-26·C-27`

**La documentación de producto respalda como operativo justo lo que esta auditoría demostró roto.**

`Priority = (12 × 1.5 × 1.0 × 1.0) / 2 = 9.00`

- **Evidencia:** `PRD §2 RF-10` declara «Listar subastas activas (público, paginado, **búsqueda**)»
  **✅ Operable**, citando `app.controller.ts:48` — esa línea pertenece al método `contact()`; el listado
  está en la 67. Y `RF-11` afirma que el CTA «Pujar ahora» *«enlaza a una ruta inexistente»* mientras
  `RF-20`, tres líneas después, declara `AUD-002` corregido: **el documento se contradice dentro de la
  misma sección**. El `Manual de Usuario §3` sitúa el retiro en `/wallet/withdrawals`, ruta que no existe
  (la real es `/wallet/withdraw`). Y los diseños oficiales (`Index.png`, `list.png`) cotizan en **USD**
  contra `BC-01`/`RN-27` (MXN único) y especifican un filtro de **ubicación** que el modelo `Auction` no
  tiene.
- **Racional:** es la familia H-016 exacta —*«un documento con citas rotas se lee con confianza y es
  falso»*—, y aquí la cita rota **avala como operativa** una capacidad inexistente. Al corregir hay que
  **reescribir la frase, no el símbolo** (RULE-38): cambiar ✅ por ⚠️ dejando el texto produce una línea
  que se contradice a sí misma.
- **Alcance:** corregir citas y estados en `PRD`, `Manual de Usuario` y `Manual de Administrador`; decidir
  si los diseños oficiales se corrigen o se declaran superados.

---

## Cobertura — nada queda suelto

**Requisito explícito de esta corrida: los 62 hallazgos, las 36 ausencias y las 28 contradicciones tienen
ítem asignado. Se declara la trazabilidad completa para que sea comprobable, no afirmable.**

### Los 62 hallazgos `H-UI-XXX` → ítem

| Hallazgos | Ítem | | Hallazgos | Ítem |
|---|---|---|---|---|
| 001 · 002 · 003 · 004 | **R-023** | | 033 · 034 · 035 | **R-040** |
| 005 · 006 · 008 · 026 | **R-027** | | 036 · 062 | **R-041** |
| 007 | **R-024** | | 037 · 038 · 045 · 052 | **R-032** |
| 009 | **R-026** | | 039 · 058 · 059 | **R-042** |
| 010 · 042 · 043 · 051 | **R-028** | | 040 · 060 · 061 | **R-049** |
| 011 | **R-025** | | 041 | **R-030** |
| 012 · 013 · 014 · 015 · 053 · 054 | **R-039** | | 044 | **R-048** |
| 016 · 056 | **R-033** | | 046 · 047 | **R-043** |
| 017 | **R-034** | | 048 · 050 | **R-036** |
| 018 · 019 | **R-029** | | 049 | **R-046** |
| 020 | **R-036** | | 055 | **R-047** |
| 021 | **R-035** | | 057 | **R-050** |
| 022 · 023 · 024 | **R-037** | | | |
| 025 | **R-038** | | | |
| 027 · 028 | **R-030** | | | |
| 029 · 030 · 031 · 032 | **R-031** | | | |

**Recuento: 62 / 62.** Ningún hallazgo sin ítem; ningún hallazgo en dos ítems como primario.

### Las 36 ausencias → ítem

| Ausencias | Ítem |
|---|---|
| A-01 KYC · A-02 CLABE · A-03 verificación de cuenta · A-04 listado de retiros · A-05 cola admin · A-27 límite diario y saldo | **R-027** |
| A-06 emitir calificación · A-25 reputación en el punto de decisión | **R-033** |
| A-07 gestión de 2FA · A-08 contraseña y sesiones | **R-037** |
| A-09 exportar/eliminar datos · A-12 política de cookies | **R-031** |
| A-10 ayuda, guías, blog, FAQ · A-11 Categorías y Empresas | **R-045** |
| A-13 publicar · A-14 cancelar subasta | **R-024** |
| A-15 alta y baja de watchlist | **R-034** |
| A-16 disputa desde la orden · A-20 mediación y evidencia | **R-035** |
| A-17 notificaciones leídas y con destino | **R-044** |
| A-18 reenvío de verificación | **R-038** |
| A-19 subir imágenes · A-23 cuenta atrás y nº de pujas | **R-029** |
| A-21 pendiente de liquidación y fecha | **R-025** |
| A-22 comisión y neto · A-28 dirección de envío | **R-046** |
| A-24 puja mínima y soft-close | **R-036** |
| A-26 estado de cuenta en el dashboard | **R-047** |
| A-29 total y contadores por filtro | **R-028** |
| A-30 barra de confianza y micro-sellos | **R-030** |
| A-31…A-36 estados de interfaz (carga, error, sin permisos, sesión expirada, conflicto, procesando) | **R-043** |

**Recuento: 36 / 36.**

### Las 28 contradicciones → ítem

| Contradicciones | Ítem |
|---|---|
| C-01 · C-02 formas de lista | **R-023** |
| C-03 `WithdrawDto` · C-04 cola de retiros · C-15 documentos KYC | **R-027** |
| C-05 `pending` descartado | **R-025** |
| C-06 `RN-35` transportistas · C-07 `RN-30`/`RN-64` custodia · C-24 certificaciones · C-25 CTA final | **R-030** |
| C-08 exportar datos · C-09 tarifas · C-10 HeyBanco | **R-031** |
| C-11 estados `FAQ §3` · C-12 diccionario | **R-032** |
| C-13 `RN-16` puja en `PUBLISHED` | **R-036** |
| C-14 `RN-11` publicar | **R-024** |
| C-16 2FA · C-17 cambio de contraseña · C-20 logout | **R-037** |
| C-18 ruta de retiro en el manual · C-26 USD en los diseños · C-27 filtro de ubicación | **R-050** |
| C-19 reenvío de verificación | **R-038** |
| C-21 `localhost` en ADMIN | **R-049** |
| C-22 DaisyUI vs ADR-002 | **R-041** |
| C-23 `PRD RF-10` (cita + búsqueda) | **R-050** + **R-028** |
| C-28 tres taxonomías de categorías | **R-028** + **R-050** |

**Recuento: 28 / 28.**

---

## No compiten en el algoritmo

| Qué | Quién | Nota |
|---|---|---|
| **`audit PTSA` — registrar los 62 como `H-XXX`** | Agente, a petición | FPGE es de sólo lectura sobre PTSA. Sin esto, el Health seguirá diciendo 100 y la mejora no será medible |
| **Revisión jurídica de `L-01`…`L-08`** | Humano / asesoría legal | Bloquea el **texto** de R-031, no su parte de interfaz |
| **Decidir la taxonomía de categorías** (8 del diseño · 5 del catálogo · 0 del modelo) | Humano | Precondición de R-028 |
| **Decidir si el histórico de subastas cerradas es público** | Humano | Precondición del filtro «Cerradas» en R-028 |
| **Decidir si los diseños oficiales se corrigen o se declaran superados** | Humano | Afecta al alcance de R-050 |
| **CFDI/PAC (`TD-001`) · Stripe y HeyBanco (`TD-002`)** | Humano | Contratos y credenciales externas. Sin cambio desde R-003 |
| **Volumen de ciclos de pago para D5** | Operación | Sigue siendo lo único que sube D5 del 0 % (S-013 §SIGUIENTE·1) |

**Trabajo FDGE en vuelo: ninguno.** `PENDING_TASKS.md` (2026-07-30) declara *«Cero trabajo FDGE
pendiente»* y el índice de estado de `HISTORY.log` dice **0 realmente abiertos** sobre 144+ PT. Los 15
ítems de R-003 se promovieron a `PT-148`…`PT-162` y están cerrados. **No hay solapamiento con esta
emisión**: ninguno de los 29 ítems duplica un Proposal Package existente en `changes/`.

---

## Cómo leer los números

`Priority = (EvidenceWeight × ScoreImpact × Urgency × DomainMultiplier) / Effort`

| Factor | De dónde sale en esta corrida |
|---|---|
| `EvidenceWeight` | **Impacto × Probabilidad**, escala PTSA 1–16, asignado por la rúbrica de abajo |
| `ScoreImpact` | **Penalización imputada** × peso de dimensión. `P0→CRÍTICA=30` · `P1→ALTA=15` · `P2→MEDIA=5` · `P3→BAJA=1`. Peso: D1/D2/D3 = 0.30 · D4 = 0.10 |
| `Urgency` | **1.0 en los 29.** No hay dimensión en regresión (D1–D4 estables en 100 desde S-009) ni ningún `audit_due` vencido (0 hallazgos activos). Se declara constante en vez de inventar un bonus |
| `DomainMultiplier` | **1.5** en D1 · 1.0 en el resto |
| `Effort` | S=1 · M=2 · L=4, estimado sobre el código leído en la auditoría |

### Rúbrica de `EvidenceWeight` — declarada para que sea reproducible

**Impacto:** `4` impide una capacidad central del negocio (descubrir, publicar, pujar, cobrar) ·
`3` la degrada gravemente o expone legalmente · `2` degrada una capacidad secundaria · `1` mantenimiento.

**Probabilidad:** `4` ocurre siempre, a todo usuario del camino principal de su rol · `3` ocurre a todo
usuario que llega a ese punto, fuera del camino principal · `2` a un subconjunto · `1` en condiciones
concretas.

### Rúbrica de dimensión — declarada por el mismo motivo

| Dim | Criterio aplicado |
|---|---|
| **D1** | La salida que el usuario recibe **no se produce** o **contradice** una `RN-XX` o la declaración de valor. Incluye la **validez legal** de los documentos publicados, porque PTSA define su propósito como probar que los productos son *«legalmente, operativa y semánticamente válidos»* |
| **D2** | Calidad interna, seguridad y consistencia del código sin pérdida directa de capacidad de usuario |
| **D3** | El sistema no permite **observar** qué ocurrió: sin diagnóstico, sin estado, sin anuncio |
| **D4** | Un documento del proyecto contradice la realidad del código |

**Lo que esta rúbrica produce, dicho por si incomoda:** 24 de 29 ítems caen en D1 y llevan multiplicador
1.5. No es un sesgo introducido para inflar la lista — es la consecuencia de auditar **la superficie donde
el producto se entrega**. Una auditoría de infraestructura habría dado el reparto contrario.

---

## Siguiente paso

1. Marcar cada ítem `APROBADO` / `DIFERIDO` / `DESCARTADO`.
2. Por cada `APROBADO`: `promote FPGE R-XXX` → PT nuevo en FDGE **STATE 1**
   (`BUG`→1-B · `FEATURE`→1-E · `REFACTOR`→1-R · `INVESTIGATION`→1-B modo investigación).
   Los PT disponibles empiezan en **`PT-204`** (último registrado: `PT-203`).
3. **Si se aprueba R-023, aprobar R-051 con él** — uno corrige los cuatro consumidores, el otro impide que
   vuelva, y sin el segundo la próxima auditoría vuelve a certificar 100 sobre un escaparate apagado.
4. **Antes de cerrar la tanda, correr `audit PTSA`** para que estos 62 existan como hallazgos y la mejora
   sea medible. Hoy no lo es.

FPGE **se detiene aquí**. No promueve nada por sí mismo.
