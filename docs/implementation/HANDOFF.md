# HANDOFF — estado actual

**FDGE V3** · **2026-07-31** · Se **sobrescribe**: es el estado de ahora, no la historia. La historia
está en [`HISTORY.log`](HISTORY.log), que es append-only y la tiene íntegra con su fecha.

**Rama**: `fix/PT-204-contrato-forma-de-lista`, **13 commits locales sobre `master`**, sin fusionar y sin
subir. Es la tanda FPGE-004 en curso.

**Pruebas**: API `web-views` **64** (8 suites) · CLIENT **156** (13) · BASE **23** (4). *(Medido el
2026-07-31 tras cada commit. Sube desde 144/3 en CLIENT y 3/1 en BASE por las cinco guardas nuevas de la
tanda, no por trabajo de producto.)*

**Reglas duras**: **36** `RULE-NN`. **Guardas de documentación**: **20** suites.

**Hallazgos PTSA**: **37** registrados, **0** activos. **Deuda técnica**: **2** abiertas de **19** registradas.

**Estado de cada PT**: el **ÍNDICE DE ESTADO** al final de [`HISTORY.log`](HISTORY.log) — generado con
`npm run indice:estado`. **166 encabezados · 0 realmente abiertos.**

> **Aviso para quien regenere ese índice.** `HISTORY.log` tiene que estar en **LF**. Al anotar esta tanda
> lo convertí sin querer a CRLF y `indice-de-estado.ts` dejó de reconocer **las 166 entradas** —en
> JavaScript `.` no casa `\r`, así que su regex de encabezado falla en todas—. El generador escribió un
> índice de **0 encabezados** sin dar ningún error. Se detectó porque el número era absurdo, no porque
> algo fallara. Queda dicho aquí y en el bloque de VoBo de la tanda.

---

## Dónde está el trabajo: la tanda FPGE-004

Una **auditoría integral de UI/UX, contenido y coherencia de producto** (2026-07-31) encontró **62
hallazgos `H-UI-XXX`** —11 P0, 30 P1, 16 P2, 5 P3—, **36 ausencias** y **28 contradicciones**. FPGE los
priorizó en la emisión **R-004** (29 ítems, `R-023`…`R-051`) y el humano los aprobó y promovió **en
bloque** a `PT-204`…`PT-232`, con ACK del Proposal Gate y VoBo anticipado.

**Paquete de propuesta:** `changes/PT-204-232-tanda-fpge-004/`
**Tablero por tarea:** ese mismo directorio, `tasks.md` — **19 `DONE` · 31 `PENDING` · 2 `BLOCKED`**

### Lo que hay que saber antes de tocar nada

**El certificado PTSA dice 100/100 Clase A con cero hallazgos activos, y es formalmente correcto.** Esta
auditoría encontró once P0 el día siguiente, sin un commit de código intermedio. Las dos cosas conviven
porque **PTSA audita productos de datos**: mide D1 sobre la salida real en la base, y las 14 reglas de
dominio se cumplían sobre las filas **y se seguirían cumpliendo con el catálogo apagado**. Ninguna
pregunta si el producto llega a la pantalla.

**Consecuencia: cerrar estos PT no subirá el Health de 100.** No se retira una penalización que nunca se
aplicó. Quien mire `score-history.json` verá 100 antes y 100 después.
→ **Acción necesaria: `audit PTSA`** para registrar los 62 como `H-XXX`. FPGE es de sólo lectura sobre
PTSA y no puede hacerlo; sin ese sync, la mejora no es medible.

---

## Entregado en la rama: 11 PT · 21 de 62 hallazgos

| PT | Qué cierra | Hallazgos |
|---|---|---|
| **PT-204** | El contrato de forma de lista SSR↔API en **7** consumidores | H-UI-001·002·003·004 |
| **PT-213** | Guarda de **forma** de respuesta, no sólo de ruta | (meta) |
| **PT-206** | El saldo pendiente de liquidación llega a la interfaz | H-UI-011 |
| **PT-207** | El registro alcanzable desde el detalle público | H-UI-009 |
| **PT-208** | La portada deja de afirmar lo que el sistema no hace | H-UI-027·028·041 |
| **PT-211** | Contraste WCAG AA del precio y la prosa legal | H-UI-033·034·035 |
| **PT-212** | Estados, badges y fechas en español | H-UI-037·038·045·052 |
| **PT-218** | ADMIN sin `localhost` fijo | H-UI-040·060·061 |
| **PT-224** | Las dos 404 vuelven al sistema de estilos | H-UI-036·062 |
| **PT-205** | Publicar y cancelar una subasta | H-UI-007 |
| **PT-233** | **Hallazgo nuevo:** ADMIN sin reservas de conexión | H-UI-063 |

**Cinco guardas nuevas**: forma de lista SSR↔API · clases CSS existentes · contraste calculado · enlaces
entre sitios · afirmaciones del sitio. Las cinco fallan contra el árbol previo (RED documentado en
`evidence/PT-204/`).

---

## Pendiente de la tanda: 19 PT, ninguno empezado

Por orden de `Priority` de R-004. **No tienen código escrito**: están promovidos y sin abrir.

| PT | Ítem | Esf. | Nota |
|---|---|:--:|---|
| **PT-209** | El catálogo como superficie de búsqueda | M | **Bloqueado por dos decisiones de producto** |
| **PT-210** | La puja informa mínimo, reloj y estado | S | Toca el API |
| **PT-214** | Reenvío de la verificación de correo | S | — |
| **PT-215** | Watchlist con alta y baja | S | — |
| **PT-216** | **Cadena de cobro del vendedor** | **L** | 5 pantallas. El P0 más caro que queda |
| **PT-217** | Notificaciones accionables | S | — |
| **PT-219** | Legales — mitad de interfaz | M | La otra mitad, `BLOCKED` |
| **PT-220** | Disputa sin UUID, con contexto | M | — |
| **PT-221** | Cuenta atrás, imágenes y nº de pujas | M | Toca el API y el DTO |
| **PT-222** | Navegación: móvil, orientación y jerarquía | M | — |
| **PT-223** | SEO y contenido indexable | M | — |
| **PT-225** | Cerrar el bucle de reputación | M | — |
| **PT-226** | Contenido institucional y de ayuda | M | Publicar el FAQ que ya existe escrito |
| **PT-227** | Seguridad de cuenta: 2FA, contraseña, sesiones | M | — |
| **PT-228** | El sistema dice lo que pasa: estados y feedback | M | — |
| **PT-229** | Historial financiero: paginación y filtro | S | — |
| **PT-230** | La orden como documento de cumplimiento | M | — |
| **PT-231** | El dashboard como panel de estado | M | — |
| **PT-232** | La documentación refleja lo medido | M | Incluye corregir `PRD RF-10` |

---

## Bloqueos

| Qué | Quién decide | Bloquea |
|---|---|---|
| **Revisión jurídica** de `L-01`…`L-08`: aviso de privacidad en el registro, cookies, terceros no declarados, derechos ARCO, transparencia de comisión | Asesoría legal | El **texto** de PT-219. Su mitad de interfaz puede hacerse ya |
| **Taxonomía de categorías**: 8 en el diseño · 5 en el catálogo · **0 en el modelo** | Producto | El arranque de PT-209 |
| **¿El histórico de subastas cerradas es público?** El API lo prohíbe por diseño en modo público | Producto | El filtro «Cerradas» de PT-209 |
| **Destino de los diseños oficiales**: `Index.png`/`list.png` cotizan en **USD** contra `BC-01` y piden un filtro de **ubicación** que el modelo no tiene | Producto | El alcance de PT-232 |
| CFDI/PAC (`TD-001`) · Stripe y HeyBanco (`TD-002`) | Humano | Sin cambio |

> **Decisiones ya tomadas por el agente y declaradas** en `design.md §3`: retirar la taxonomía de
> categorías en vez de inventarla, no publicar el histórico de cerradas, y retirar el filtro de
> «vendedores verificados» —exponer el estado KYC de una persona es una decisión de privacidad—. Las tres
> son reversibles; migrar el esquema por una decisión no tomada, no.

---

## Riesgos vivos

1. **Ninguna corrección se ha visto con datos reales.** La base está vacía (`total: 0`, medido) porque
   `run-all.sh` la truncó. Lo demostrado es que los contratos **coinciden** y que hay guardas que fallan
   si dejan de coincidir. **Que el catálogo pinte subastas exige `run-all.sh` + la suite de navegador.**
2. **41 de 62 hallazgos siguen vivos**, incluidos **cuatro P0**: la cadena de cobro del vendedor
   (PT-216, tres puertas sin interfaz y sin cola de aprobación en ADMIN) y los filtros del catálogo
   (PT-209).
3. **La rama no está fusionada ni subida.**
4. **D5 sigue al 0 %** y la Confianza a un punto del umbral de Clase A. Nada de esta tanda lo mueve:
   exige volumen de ciclos de pago reales.

---

## Siguientes acciones, en orden

1. **`run-all.sh` + suite de navegador** sobre lo entregado. Es lo único que demuestra que el catálogo
   pinta subastas de verdad, y no sólo que el contrato coincide.
2. **PT-216** — el P0 con más impacto de negocio pendiente y el único `L`. Empezarlo antes que los cinco
   `S` restantes: los `S` caben en una sesión y éste no.
3. **`audit PTSA`** para registrar los 62 hallazgos y que la mejora sea medible.
4. **Decidir los cuatro bloqueos de producto**; dos frenan PT-209 por completo.
5. **FPGE-005** cuando lo anterior esté. La cola ya tiene un ítem —`H-UI-063`, cerrado por PT-233— y
   recibirá lo que salga del `audit PTSA`.
