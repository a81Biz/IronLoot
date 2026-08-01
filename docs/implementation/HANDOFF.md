# HANDOFF — estado actual

**FDGE V3** · **2026-07-31** · Se **sobrescribe**: es el estado de ahora, no la historia. La historia
está en [`HISTORY.log`](HISTORY.log), que es append-only y la tiene íntegra con su fecha.

**Rama**: `master`. La tanda FPGE-004 está **fusionada** (21 commits, merge `--no-ff`). **Sin subir a
`origin`**: eso lo decide el humano.

**Pruebas**: API **1.140** (135 suites) · CLIENT **172** (14) · BASE **23** (4) · ADMIN **13** (2).
*(Medido el 2026-07-31 al cerrar la tanda. `tsc --noEmit` limpio en los cuatro servicios.)*

**Reglas duras**: **40** `RULE-NN` (RULE-39…42 las añade la tanda FPGE-004). **Guardas de documentación**: **20** suites.

**Hallazgos PTSA**: **42** registrados, **1** activo (`H-042`). **Deuda técnica**: **5** abiertas de **22** registradas.

**Estado de cada PT**: el **ÍNDICE DE ESTADO** al final de [`HISTORY.log`](HISTORY.log) — generado con
`npm run indice:estado`. **187 encabezados · 0 realmente abiertos.**

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
**Tablero por tarea:** ese mismo directorio, `tasks.md` — **50 `DONE` · 0 `PENDING` · 2 `BLOCKED`**
(los dos bloqueados son el texto legal, que exige revisión jurídica).

### Lo que hay que saber antes de tocar nada

**El certificado PTSA dice 100/100 Clase A con cero hallazgos activos, y es formalmente correcto.** Esta
auditoría encontró once P0 el día siguiente, sin un commit de código intermedio. Las dos cosas conviven
porque **PTSA audita productos de datos**: mide D1 sobre la salida real en la base, y las 14 reglas de
dominio se cumplían sobre las filas **y se seguirían cumpliendo con el catálogo apagado**. Ninguna
pregunta si el producto llega a la pantalla.

**Consecuencia: cerrar estos PT no subirá el Health de 100.** No se retira una penalización que nunca se
aplicó. Quien mire `score-history.json` verá 100 antes y 100 después.
**Hecho el 2026-07-31 (`S-014`):** los 64 hallazgos entran al registro como **cuatro familias** —
`H-038`…`H-041`, evidencia `E-041`—, una por causa y no una por síntoma. **Sin emitir puntuación**: los
checkpoints de delta sync necesitan una base con historia y la base está vacía. `freshness` sigue
`STALE`; se restaura con `resume PTSA` tras `run-all.sh`.

---

## Entregado: 32 PT · 64 de 64 hallazgos

| PT | Qué cierra | Hallazgos |
|---|---|---|
| **PT-204** | El contrato de forma de lista SSR↔API en **7** consumidores | 001·002·003·004 |
| **PT-205** | Publicar y cancelar una subasta | 007 |
| **PT-206** | El saldo pendiente de liquidación llega a la interfaz | 011 |
| **PT-207** | El registro alcanzable desde el detalle público | 009 |
| **PT-208** | La portada deja de afirmar lo que el sistema no hace | 027·028·041 |
| **PT-209** | El catálogo filtra de verdad (y retira lo que no puede funcionar) | 010·042·043·051 |
| **PT-210** | La puja informa su mínimo, su reloj y su estado | 020·048·050 |
| **PT-211** | Contraste WCAG AA del precio y la prosa legal | 033·034·035 |
| **PT-212** | Estados, badges y fechas en español | 037·038·045·052 |
| **PT-213** | Guarda de **forma** de respuesta, no sólo de ruta | (meta) |
| **PT-214** | Reenvío de la verificación de correo | 025 · **064** |
| **PT-215** | Watchlist con alta y baja | 017 |
| **PT-216** | **La cadena de cobro del vendedor** (5 pantallas) | 005·006·008·026 |
| **PT-217** | Notificaciones accionables | (A-17) |
| **PT-218** | ADMIN sin `localhost` fijo | 040·060·061 |
| **PT-219** | Consentimiento, cookies y datos personales — **parcial** | 029·030·031·032 |
| **PT-220** | Disputa sin UUID, con contexto | 021 |
| **PT-221** | Cuenta atrás, imágenes y nº de pujas | 018·019 |
| **PT-222** | Navegación móvil y orientación | 012·013·014·015·053·054 |
| **PT-223** | SEO y contenido indexable | 039·058·059 |
| **PT-224** | Las dos 404 vuelven al sistema de estilos | 036·062 |
| **PT-225** | Cerrar el bucle de reputación | 016·056 |
| **PT-226** | Centro de ayuda | (A-10·A-11) |
| **PT-227** | Seguridad de cuenta: 2FA, contraseña, cierre real | 022·023·024 |
| **PT-228** | La interfaz dice lo que pasa | 046·047 |
| **PT-229** | Historial financiero: paginación y filtro | 044 |
| **PT-230** | La orden como documento de cumplimiento | 049 |
| **PT-231** | El dashboard como panel de estado | 055 |
| **PT-232** | La documentación refleja lo medido | 057 |
| **PT-233** | **Hallazgo nuevo:** ADMIN sin reservas de conexión | **063** |
| **PT-235** | El punto ciego de la guarda de PT-213: las claves nombradas | (cobertura) |
| **PT-236** | 8 citas rotas invisibles + 13 servicios de ADMIN sin inventariar | (cobertura) |

**Dos hallazgos nuevos aparecieron durante la tanda** y tienen PT propio, no se colaron en otro:

- **H-UI-063** — `ADMIN_API_URL` con reserva en tres ficheros, invisible para la guarda de `H-035`
  porque esa variable no estaba en su lista. Es la reaparición que `S-013 §SIGUIENTE·4` predijo palabra
  por palabra. → `PT-233`.
- **H-UI-064** — `auth.service.ts:225` justificaba capturar un fallo de envío diciendo que *«el usuario
  tiene la vía de reenvío»*. **Esa vía no existía.** Un comentario que declara una capacidad ausente es
  la familia de H-016 dentro del código. → `PT-214`.

**Siete guardas nuevas**, todas con RED documentado y casos de control en las dos direcciones:

| Guarda | Qué impide que vuelva |
|---|---|
| `forma-de-lista-ssr.spec.ts` | Que un consumidor SSR lea una clave que el API no emite |
| `clases-css-existen.spec.ts` | Que el marcado use una clase que ningún CSS define |
| `contraste-de-texto.spec.ts` | Que un token de texto baje del umbral AA — **calcula** el ratio |
| `feedback-de-formularios.spec.ts` | Que un formulario envíe sin bloquear, o que un mensaje sea mudo |
| `enlaces-entre-sitios.spec.ts` | Que BASE mande al portal una ruta que sirve él mismo |
| `afirmaciones-del-sitio.spec.ts` | Que la portada afirme lo que una `RN-XX` niega |
| `estados.spec.ts` | Que una tabla vuelva a imprimir el enum crudo |

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

1. **`H-042` — el único hallazgo activo, y está en el camino del dinero.** Un webhook de PayPal con
   firma fabricada obtuvo `SIGNATURE_OK` y llegó a intentar la captura; sólo lo detuvo un 404 de PayPal.
   **No lo introdujo esta tanda.** Asignado a `PT-234` como INVESTIGATION: no se toca sin medir por qué
   la verificación respondió `SUCCESS`.
2. **La rama no está fusionada ni subida.** Diecinueve commits locales.
3. **Los contenedores no se han reconstruido.** ADMIN y BASE exigen ahora `ADMIN_API_URL` y
   `PUBLIC_SITE_URL` respectivamente, y **abortan al arrancar si faltan** (RULE-17, y es a propósito).
   `docker-compose.yml` las declara; un despliegue que no recoja el compose nuevo no arrancará.
4. **Ocho cosas quedan fuera y están declaradas**, no olvidadas: el texto legal, la dirección de envío en
   la orden (cambio de esquema), la subida de imágenes, la lista de sesiones activas, la respuesta en
   disputas mediadas, la reputación en el punto de decisión, la taxonomía de categorías y el histórico
   público de cerradas.
5. **D5 sigue al 0 %** y la Confianza a un punto del umbral de Clase A. Nada de esta tanda lo mueve:
   exige volumen de ciclos de pago reales.

---

## Ejecutado el 2026-07-31: `run-all.sh` → suite de navegador → `resume PTSA`

**Suite de navegador: 209 de 210** comprobaciones. El único fallo es `QA-PP-15`, que es `H-042`.

**Verificado con datos reales**, que era el riesgo número uno: el catálogo público y la portada
**pintan la subasta**. `bootstrap` 13/13, `e2e` 5/5, puja en vivo 8/8, cierre y liquidación 17/17,
retiro real 13/13, traza de pago 16/16.

**Y encontró dos regresiones de la tanda que 1.441 pruebas unitarias no vieron**, corregidas en el acto:
`{{ self.title() }}` —sintaxis de Jinja2 que Nunjucks no implementa, **500 en todas las páginas
públicas**— y un desbordamiento de 4 px a 768 px visible sólo en modo `headed`. Más dos fallos de la
propia suite, que no marcaba la casilla de consentimiento que PT-219 hizo obligatoria.

**`resume PTSA` → S-015**: Health **95.5** (baja desde 100 por `H-042`), Risk 32, Confidence **95.0**
(sube desde 91.0), Clase A. **D1 pasa del 50 % al 100 % de cobertura**, porque por primera vez desde
S-005 se midió sobre salida generada en la misma sesión.

---

## Siguientes acciones, en orden

1. **`PT-234` — `H-042`.** El **único hallazgo activo**, y está en el camino del dinero: un webhook de
   PayPal con firma fabricada obtuvo `SIGNATURE_OK` y llegó a intentar la captura. Es INVESTIGATION,
   no BUG: su Discovery separa **midiendo** las tres hipótesis —modo sandbox que no verifica, cabeceras
   ausentes tratadas como válidas, o `SUCCESS` emitido antes de verificar—. **No se parchea a ciegas
   una ruta de cobro.**

2. **El texto legal** (`TD-028`, puntos `L-01`…`L-08`). Bloqueado por asesoría jurídica, no por
   priorización nuestra. Es lo único que falta para cerrar `H-041` del todo.

3. **`R-054` (dirección de envío, `TD-026`) y `R-055` (subida de imágenes, `TD-027`).** Los dos
   pendientes de producto con impacto directo: hoy el vendedor tiene que enviar un objeto físico y la
   pantalla no dice a dónde, y los lotes se publican sin una sola foto teniendo el campo `images`.

4. **`R-052` — ¿es la pantalla un producto auditable?** La pregunta que dejó `H-038` y que `ADR-061`
   sólo resolvió a medias: un `✅` del PRD ya significa «llega al usuario», pero la unidad de auditoría
   de PTSA sigue siendo el producto de datos. Es una decisión de **la especificación de PTSA**, no un
   PT de desarrollo.

5. **`FPGE` cuando 1 esté cerrado.** La cola vive en `docs/implementation/ROADMAP.md`.

**Lo que ya NO está pendiente**, porque este bloque lo declaró hasta hoy y era falso: `PT-216` está
entregado, los 62 hallazgos ya se registraron en `S-014`, y `FPGE-005` ya corrió. Se anota en vez de
borrarse porque un registro de estado que lista como pendiente algo terminado es exactamente el defecto
que `PT-140` midió — cuarenta y cuatro tareas `BLOCKED` ya fusionadas.

---

## Lo que conviene saber antes de tocar nada

**El orden es `run-all.sh` → suite de navegador → `resume PTSA`.** Los checkpoints `audit:domain` y
`audit:reliability` necesitan una base **con historia**, y `run-all.sh` es lo que la genera: medir antes
es medir lo que la corrida va a borrar. La diferencia se midió — `D1` pasó del 50 % al 100 % de cobertura
sólo por respetar el orden.

**`run-all.sh` trunca la base de datos.** Copia antes si contiene salida real que sostenga una validación.

**`HISTORY.log` es LF y append-only.** Escribirlo desde Python en Windows sin `newline=''` lo convierte a
CRLF, y entonces `npm run indice:estado` deja de casar **todas** las entradas y escribe «0 encabezados»
**sin dar error**. Se detectó porque el número era absurdo, no porque algo protestara. Las entradas nuevas
van **arriba** del separador `---` del índice, o el generador aborta — con un mensaje claro, eso sí.

**Antes de fiarte de una guarda, léela con desconfianza.** `forma-de-lista-ssr.spec.ts` se ha equivocado
**cuatro veces** midiendo otra cosa, **las cuatro estando en verde**: la ruta de plantilla con doble
prefijo, `fetchJson(` buscado como subcadena literal, la resolución de variable fuera del ámbito del
método, y la exclusión de toda expresión con punto (`PT-235`). Ninguna se encontró ejecutándola — tres
leyéndola y **una cruzando el grafo de conocimiento**, que no comparte los supuestos de quien la escribió.
