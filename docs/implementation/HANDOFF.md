# HANDOFF — estado actual

**FDGE V3** · **2026-07-30** · Se **sobrescribe**: es el estado de ahora, no la historia.

**Rama**: `master`, árbol limpio, **al día con `origin`** y cero ramas sin fusionar.

**Pruebas**: **1268** unitarias en verde — API **1056** (130 suites) · CORE **93** (6) · CLIENT **103** ·
ADMIN **13** · BASE **3**. *(CORE baja de 134 a 93 porque PT-191 retiró `Money` y el validador de IPN de PayPal
con sus 41 casos: eran pruebas verdes sobre código que no corría en producción.)*

**Reglas duras**: **36** `RULE-NN` (RULE-38 nueva). **Guardas de documentación**: **15** suites / **159** pruebas.

**Estado de cada PT**: el **ÍNDICE DE ESTADO** al final de [`HISTORY.log`](HISTORY.log) — generado con
`npm run indice:estado`. **143 encabezados · 0 realmente abiertos.**

---

## Estado: CERTIFICADO Clase A · cero hallazgos PTSA activos

**S-010 emitido el 2026-07-29.** `freshness = FRESH`, `commits_since_audit = 0`.

| Métrica | S-009 | **S-010** |
|---|---|---|
| Health | 100.0 | **100 / 100** |
| Risk | 0 | **0 / 100** |
| Confidence | 91.0 | **91.0** |
| Clase | A | **A** |

**Hallazgos: 35 registrados, CERO activos.** Los siete de hoy —H-029 … H-035— cerrados con tu VoBo y
verificados **ejecutando**.

### Los mismos cuatro números por QUINTA vez, y ése es el dato

Cuatro intervalos entre emisiones, y en cada uno apareció trabajo real: **3 · 2 · 1 · 1**. Siete defectos reales,
todos cerrados antes de emitir, y los cuatro números sin moverse ni un punto.

**La estabilidad de este 100 mide que se cierra lo que se encuentra, no que no haya nada que encontrar.**

**Y cada hallazgo salió de comprobar el anterior.** H-032/H-033, al verificar el cierre de H-030. H-034, con la
recomendación que dejó S-007. H-035, con la lista que dejó S-008. **No es una racha: es una cadena** — el sitio
donde buscar lo dijo el trabajo previo, no una intuición.

### Tres avisos que forman parte del resultado, no lo adornan

**1. El Health llega a 100 en parte porque el alcance se estrechó.** H-005 se cerró **aceptándola como
limitación declarada**, y lo que legitima el cierre es que la declaración de valor se corrigió a la vez
(`F-1 § U-006`): el producto ya **no promete** emitir CFDI, y `P-012` pasó a `FUERA_DE_ALCANCE_V1`. **El
sistema sigue sin emitir facturas.** Si v1.1 vuelve a prometerla, ese producto vuelve y H-005 se reabre.

**2. La Confianza está a UN punto del umbral de A** (91 contra 90). La baja **D5, al 0 %**: la fiabilidad
operacional **no está demostrada** — hacen falta **20 ciclos de pago resueltos** y hay **2**. Cualquier
pérdida de cobertura tumba la Clase A.

**3. Cero hallazgos activos es cero defectos CONOCIDOS.** Tercera emisión consecutiva en que un barrido
dirigido encuentra defectos que **ninguna prueba señalaba** — y hoy quedó claro **dónde** buscar: los dos de
esta corrida vivían en el **camino de fallo**, que nunca se había ejecutado.

---

## Esperan tu validación: nada

**PT-191 cerrado con tu VoBo** el 2026-07-30, con constancia en `HISTORY.log` (RULE-37: un BUG `DONE` sin
bloque de VoBo que lo nombre no está cerrado). Con él, **los 143 PT del registro están cerrados** — el
índice de estado, que es quien lo mide, dice **0 realmente abiertos**. Lista en
[`PENDING_TASKS.md`](PENDING_TASKS.md).

---

## Lo último: los cinco `AUD` abiertos, cerrados — y ninguno era lo que decía (PT-191)

Me pediste cerrarlos completos. Están cerrados. Lo que importa del resultado no es que sean cinco, sino que
**ninguno tenía el tamaño que anunciaba su enunciado**:

| Hallazgo | Enunciado | Lo que había |
|---|---|---|
| **AUD-027** | «dos rutas de config SMTP» | El panel tenía un formulario completo que guardaba y respondía «guardado» — y el mailer lee `MAIL_*` del entorno. **No configuraba nada, ni tras reiniciar** |
| **AUD-011** | «no menciona `AuctionStateMachine`» | **Seis** puertas al estado sin cerradura, dos sin llamar ni a `assertAuctionModifiable`. Y **la máquina estaba incompleta**: cablearla tal cual habría roto la moderación |
| **AUD-010** | «no mueve dinero» | **Tres** defectos. Cablear el primero sin los otros habría **impreso dinero**: `createRefund` sólo acredita, no carga a nadie |
| **AUD-012** | «`Money` no se usa» | **30 de 42** símbolos de `core` sin consumidor. Uno no estaba muerto: implementaba el IPN de **PayPal**, un protocolo que esta plataforma no usa |
| **AUD-006** | «el WS no autentica» | Cierto **y deliberado** — la puja en vivo se ve sin cuenta. Faltaba que fuera comprobable, y había **dos armas cargadas** con cero llamantes apuntándole |

**Recuento de la tabla de veredictos: 20 corregidos · 0 abiertos · 1 limitación · 15 sin verificar.**

### La respuesta a «¿por qué siempre salen más casos?»

**El enunciado de un hallazgo es su síntoma, no su tamaño.** Los cinco se cerraron leyendo el código, no el
enunciado — y los cinco resultaron ser otra cosa, cuatro de ellas más grandes. Mientras «revisar qué falta»
signifique releer enunciados, la lista que sale es la de síntomas, y por eso nunca terminaba.

Corolario práctico, que ya está aplicado: **al cerrar un hallazgo, mide la clase, no el ejemplo.** AUD-012
nombraba un símbolo; medir el conjunto dio 30. AUD-027 nombraba una clave; medir el camino dio un formulario
entero que no hacía nada.

### Y esto sí cambia el mapa de «cómo dejan de salir cosas»

| Clase | Estado |
|---|---|
| `RULE-NN` · `TD`/`ND` · `H-XXX`↔derivados · HISTORY/PENDING · índice de estado | guardadas desde antes |
| endpoints del inventario | **PT-188** |
| afirmaciones `AUD` en `docs-v2` | **PT-189 (RULE-38)** — y hoy **encontró sola** las 49 líneas obsoletas que dejaron estos cierres, en 13 documentos |
| **superficie exportada de `@ironloot/core`** | **PT-191** — 24 huérfanos declarados uno a uno; no pueden crecer |
| **cargas del canal público (WebSocket)** | **PT-191** — ninguna emisión puede llevar un campo identificativo |
| **el generador del índice de estado** | **PT-191** — se comía en silencio una entrada mal colocada; ahora **aborta nombrándola** |
| **citas a fichero en el contrato de agente** | **PT-191** — `11-Conventions.md` citaba **tres ficheros que no existen**, y uno era el nombre viejo que `RULE-32` existe para contar |
| **unicidad de `UC` · `RN` · `ADR`** | **PT-191** — ningún identificador se define dos veces como clave de fila |
| Los otros 5 inventarios · `P-XXX` (12 productos) · citas `fichero:línea` en `docs-v2` | **sin guarda, y escrito** |

Los **15 `AUD` sin verificar** siguen siendo deuda de medición. No se declaran corregidos sin medirlos: eso es
exactamente lo que produjo el «36/36».

### Cinco veces más mis guardas midieron otra cosa

Mismo patrón de siempre —**comprobar la forma en vez de la relación**—, y hoy con una variante nueva: la guarda
de `core` **se leyó a sí misma** (su lista de declarados contaba como consumo) y pasó **en vacío**. La delató un
caso que compara la cuenta contra la lista, no la propia guarda. Está en la autorrevisión, con las otras cuatro.

---

## Antes de eso: 74 líneas declaraban vigentes nueve hallazgos corregidos (PT-189)

Me pediste revisar la documentación para saber qué falta, y luego arreglarlo en orden. Esto es lo que había:

**El registro de hallazgos afirmaba «36/36 corregidos»** y **cinco no lo estaban**. También decía que su columna
de recomendación «indica el PT que lo resolvió» — **sólo 2 de 36 filas citan un PT**. Ninguna de esas dos frases
es mía: son de julio. Lo que las mantenía vivas es que **nadie las volvía a mirar y ninguna guarda cubría la
clase**.

**(a)** 81 fragmentos reescritos en 22 documentos. **Reescribí la frase, no el símbolo** — mi primer intento
cambió `⚠️` por `✅` dejando el texto del defecto, y **lo reverté**: una línea que se contradice a sí misma es
peor que una obsoleta.

**(b)** **UC-28** (declarar envío) y **UC-29** (confirmar recepción), que no existían. *(Nacieron como `UC-17`/`UC-18` y colisionaban con dos casos ya existentes —webhook y moderar—; renumerados en PT-191, que además dejó guarda.)* Antes de hoy «recepción» y
«holdback» **no aparecían ni una vez** en `1-negocio` ni en `2-producto`: lo más importante de la jornada vivía
en las reglas y en las ADR, no en el producto.

**(c)** Los ocho que faltaban, medidos. Corregidos AUD-004/007/013/014/018/023; **abiertos AUD-006** (WebSocket
sin autenticar) y **AUD-011** (el panel salta la máquina de estados).

### La forma en que esto deja de salir

Es lo que preguntaste, y tiene respuesta concreta: **el corpus de afirmaciones es finito, y cada clase o tiene
guarda o está declarada.**

| Clase | Estado |
|---|---|
| `RULE-NN` · `TD`/`ND` · `H-XXX`↔derivados · HISTORY/PENDING · índice de estado | guardadas desde antes |
| endpoints del inventario | **PT-188** |
| **afirmaciones `AUD` en `docs-v2`** | **PT-189 (RULE-38)** |
| Los otros 5 inventarios · citas `fichero:línea` en `docs-v2` | **sin guarda, y escrito** *(las del contrato de agente sí, desde PT-191)* |

La pieza que cierra el bucle es la **tabla de veredictos de los 36**, con cuatro estados donde **«sin verificar»
es legítimo**. No se exige saberlo todo: se exige que **conste si se ha mirado**. Recuento honesto de hoy: **15
corregidos · 5 abiertos · 1 limitación declarada · 15 sin verificar**.

Mientras haya casillas «sin verificar» seguirán apareciendo cosas al medirlas. **Eso ya no es un fallo del
análisis: es una lista con 15 entradas y un final.**

### Y cinco veces hoy mis guardas midieron otra cosa

El patrón es siempre el mismo: **comprobar la forma en vez de la relación**. En PT-189 fueron tres —el arreglo a
medias, el listón que acusó a 18 documentos que decían la verdad, y el parser que leía prosa en vez de la tabla—.
Los cacé antes de darlos por buenos, pero el patrón es mío y está escrito en cada autorrevisión.

---

## Antes de eso: la documentación medida (PT-188)

## Antes de eso: las tres decisiones (PT-186, PT-187)

**1. H-035 reabierta y cerrada completa.** Su cierre anterior declaraba que ADMIN, BASE y CLIENT quedaban fuera
«escrito como pendiente». Medido: **seis** reservas a `localhost`, no las cuatro que estimé —API 1, BASE 3,
CLIENT 3; ADMIN estaba limpio—. **Las dos caras son las del proxy del BFF**: sin `API_URL`, el sitio arranca
`healthy` y manda *todas* sus llamadas a su propio contenedor.

Y la del API **la ocultó la propia guarda**: su lista de variables no incluía `CLIENT_URL`. `E-038` había
declarado esa debilidad con esas palabras y **se cumplió en la corrida siguiente**. *Declarar una debilidad no la
cierra* — que es la misma lección que *declarar un alcance no es medirlo*.

**2. D5, limitación declarada.** Ver arriba.

**3. Índice de estado en `HISTORY.log`.** 102 entradas mostraban un `Status:` histórico, y eso hizo que te
reportara PT-147 como pendiente. Ahora hay un índice **generado** al final del fichero: añade, no reescribe —
reescribir las 102 líneas se leería mejor y borraría el momento en que se supo cada cosa.

**Y en su primera ejecución encontró un defecto de proceso mío:** cinco BUG —PT-182 … PT-186— escritos con
`Status: DONE` **directamente**, cuando FDGE STATE 6 dice que el agente no cierra bugs. Tu VoBo estaba dado, así
que el resultado era correcto; faltaba **la constancia**. Un cierre sin registro de quién lo autorizó es
indistinguible de uno que el agente se dio a sí mismo. Corregido con el bloque de cierre que faltaba, y vigilado
por **RULE-37**.

---

## Antes de eso: las pasarelas no declaraban ningún tope (PT-184)

La recomendación de S-007 decía que los candidatos siguientes eran los otros terceros —**la pasarela de pago**,
Redis, el almacenamiento—. El primero de la lista tenía el defecto.

Las **seis** llamadas de los tres adaptadores usaban `fetch` **sin `signal`**, y no había un `AbortController` en
todo el directorio. Incluidas la que **captura** en PayPal y la que consulta en la vía garantizada.

**Antes de hoy sólo dos ficheros del API declaraban un tope, y los dos se escribieron hoy.** No era un descuido
puntual: era la forma de este sistema al hablar con un tercero.

Cerrado con `gateway-timeouts.ts` — **8 s consultar · 20 s operar**. La asimetría es del dominio: consultar puede
cortarse pronto porque la vía garantizada volverá a preguntar; **crear o capturar** no, porque abandonar algo que
quizá se completó al otro lado deja un cobro sin saber qué pasó.

**MEDIA y no ALTA, con su razón:** PT-087 garantiza que ningún pago cobrado queda sin acreditar —vía garantizada,
reapertura del ciclo, asiento idempotente—, así que **el dinero no se pierde por esto**. Se degrada el tiempo de
respuesta y la ocupación de recursos.

**Y lo que no se afirma:** no se ha observado una llamada colgada contra una pasarela real. H-033 se **midió**
(121 s parando Mailhog); esto se **leyó**. La diferencia marca el siguiente paso — **Redis se puede parar**, así
que ahí el fallo se podrá medir.

### Once capturas que parecen defectos y no lo son

El barrido dio 11 `catch` sin `throw` ni registro. Ninguno es hallazgo: están **declarados** en la línea base del
checkpoint D3, con motivo escrito, y los dos más sensibles razonados en `CLAUDE.md`. Once capturas sin `throw`
suenan a once defectos y son once decisiones — **la diferencia la hace el motivo escrito**, que es justo lo que
faltaba en H-032.

### Y mis casos de control fallaron de la misma forma dos PT seguidos

C2 exigía que el fichero *contuviera* el helper, y bastaba la línea del `import`. En PT-183 fue «que el bloque
contenga H-032». **Compruebo que exista una cadena en vez de una relación**; las dos veces la corrección fue
contar o acotar en vez de buscar. Y C1 tuvo el error simétrico: acusaba una llamada **ya corregida** por recortar
una ventana fija — un falso positivo enseña a desconfiar de la guarda, que es la forma silenciosa de perderla.

---

## Antes de eso: el fallo de envío no llegaba a nadie (PT-183)

Los dos hallazgos salieron de **comprobar el cierre del anterior**, ejecutando el camino de **fallo**. El camino
feliz del correo estaba probado desde siempre; el otro, nunca.

### Y uno desmiente parte de ese cierre — mío, de hace minutos

H-030 se cerró afirmando que el reenvío *«propaga el fallo — un `catch` que se lo comiera reproduciría el defecto
por otra vía»*. **El `catch` existía**, una capa más abajo, dentro de `EmailService`.

Lo que hice mal es identificable: **comprobé ejecutando que el correo salía, y di por bueno por lectura que el
fallo se propagaba.** Una afirmación se ejecutó y la otra se supuso — y la supuesta era la falsa. H-030 no se
reabre (lo que reclamaba está cumplido y verificado en vivo), pero queda anotado en su ficha.

| Hallazgo | Sev | Qué pasaba | Cierre |
|---|:--:|---|---|
| **H-032** | **ALTA** | `EmailService` absorbía el fallo, y con él **tres capas de recuperación**: el `catch` del worker de la cola, su contador de intentos y los reintentos de BullMQ. Un envío fallido marcaba el trabajo como **completado** | **En vivo** con Mailhog parado: `200 «Verification email sent»` con bandeja vacía → **500 «Connection timeout»** |
| **H-033** | MEDIA | El transporte no declaraba **ningún tope**: con el SMTP caído, reenvío **y registro** se colgaban **121 s**. Preexistente, tapado por H-032 | Medido: **121 s → ~5 s** |

El servicio llevaba su propia duda escrita: `// Don't rethrow to avoid breaking registration flow?`. La duda era
buena; contestarla **una vez para todos los llamantes**, no — la respuesta correcta es distinta en cada uno. Ahora
los cuatro la declaran con su motivo: reenvío y cola **propagan**; registro **captura** (la cuenta ya existe) y
recuperación de contraseña **captura**, porque su respuesta es opaca a propósito y propagar convertiría una caída
del SMTP en un **oráculo de enumeración**. Es **RULE-36**.

### Tres cosas propias, y las tres incómodas

1. **Una prueba verde sostenía el defecto** — `should not throw when mailerService fails`, dos veces, en el mismo
   fichero que hasta PT-089 exigía la reserva `localhost:5174`. **Una prueba puede ser el mecanismo que mantiene
   vivo un defecto.**
2. **Mis casos de control no supieron fallar hasta la tercera versión.** Las dos primeras pasaban con el defecto
   puesto, y eso es especialmente incómodo el mismo día en que escribí dos veces que *una guarda que nadie ha
   visto fallar no es una guarda*.
3. **El checkpoint D3 cazó, por tercera vez hoy, un `catch` mudo mío de hace horas** — el del guard de reCAPTCHA
   de PT-182, con una justificación escrita que era **falsa**: dije que inyectar el logger «cambiaría su firma en
   todos los llamantes», y un guard recibe sus dependencias por inyección.

### Y el registro de reglas declaraba ser completo sin serlo

El **Delta Log** de las convenciones dice ser *el* registro incremental y tenía **12 de 34** reglas. Completado,
con las filas nuevas marcadas como **reconstruidas** desde `HISTORY.log` — su procedencia es más débil y se dice.

---

## Antes de eso: tres controles que aparentaban estar puestos (PT-182)

El barrido no buscó errores. Buscó **afirmaciones**: un nombre que promete verificar, una respuesta que dice
«enviado», una variable que declara una espera. **Ninguno de los tres fallaba nunca** — por eso dos llevaban
meses ahí.

| Hallazgo | Sev | Qué afirmaba | Qué hacía |
|---|:--:|---|---|
| **H-029** | MEDIA | «verifica el captcha» | comprobaba que el token **existiera**; `"x"` pasaba igual que un token legítimo de Google |
| **H-030** | **ALTA** | «Verification email sent» | la llamada de envío estaba **comentada** |
| **H-031** | MEDIA | una espera de 72 h | reserva `:-0` en el compose: **sin espera** |

**H-030 es ALTA por lo que promete, no por el correo.** Es el camino de recuperación de una cuenta que no se
puede activar: lo pide exactamente quien no recibió el correo del registro, y se le dejaba esperando para
siempre leyendo «revisa tu bandeja». Y el `TODO` que lo justificaba —«when NotificationsModule is ready»—
**ya se cumplía**: el servicio de correo existe y está en uso en el registro. El comentario sobrevivió al
trabajo que lo resolvía.

Por eso el cierre se comprobó **contra Mailhog y no contra la respuesta del endpoint**: la respuesta ya decía
«enviado» cuando no enviaba nada. La afirmación es el `1 → 2`.

**H-031 lo introduje yo, hace unas horas.** PT-174 puso `:-0` para que la fase 35 de QA no esperase tres días
por una liberación: la conveniencia de QA colocada donde vive el valor por defecto de producción. Cualquier
despliegue que no declarase la variable liberaba el neto **al instante** de la confirmación, sin ventana para
el comprador, y **nada lo habría dicho** — el cron corre, los asientos cuadran, la espera simplemente no
ocurre. Se registró como hallazgo en vez de dejarlo en la prosa de una evidencia: **el recuento es lo que se
lee.** Es ahora un corolario de RULE-17 — *el valor por defecto no puede ser el desprotegido*.

### Tres cosas que salieron de comprobar, no de escribir

**La guarda nueva tenía el defecto que venía a vigilar.** C7 contaba `..` a mano para llegar a la raíz, y
dentro del contenedor eso daba `/docker-compose.yml`: fallaba por no encontrar el fichero. Es el modo en que
una guarda se vuelve inútil sin dejar de existir.

**Un caso mío pasaba por el motivo equivocado.** El control «un correo ya verificado no reenvía» usaba
`emailVerified`, campo que no existe —el esquema tiene `emailVerifiedAt`—, así que el servicio no veía la
verificación y no reenviaba **por ceguera, no por respeto**. Un caso verde que no comprobaba nada.

**Dos guardas propias se pusieron en rojo, con razón.** RULE-33, porque los derivados de PTSA anunciaban `0`
activos con dos hallazgos abiertos; RULE-20, porque la carpeta de evidencia de PT-182 existía antes que su
entrada en `HISTORY.log`. Las dos veces **el número lo corrigió el trabajo, no la guarda**.

---

## Antes de eso: los registros dejaron de mentir (PT-168 … PT-181)

**Los hallazgos PTSA cerrados están efectivamente corregidos** — verificado ejecutando, no leyendo. **Lo que
estaba roto era lo que el repositorio decía de sí mismo.**

| PT | Qué mentía | Guarda |
|---|---|---|
| **PT-168** | Tres derivados de PTSA declaraban activos cuatro hallazgos `CERRADA` | **RULE-33** |
| **PT-169** | PT-167 sólo existía en su commit; dos PT fuera del registro de pendientes | **RULE-34** |
| **PT-170** | `H-001` y `H-023` citaban carpetas de evidencia inexistentes | RULE-31 ampliada |
| **PT-171** | `ND-002` y `ND-003` contradecían al código | **RULE-35** |
| **PT-181** | Seis entradas del registro de deuda desmentidas por el código | RULE-35 |

**Deuda técnica: 2 abiertas de 24** — TD-002 (credenciales de terceros) y TD-009 (riesgo aceptado por PT-080).

---

## La cadena que ahora se recorre entera (PT-173 … PT-176)

Cerraron el defecto de fondo: **la recepción la confirma quien recibe**. Hasta entonces el vendedor marcaba
entregado su propio envío y liberaba su propio dinero, sin enviar nada — el holdback que protege al comprador
era anulable por la parte de la que protege.

Y la **fase 35** recorre la cadena completa —cierre → envío → recepción → liberación → retiro— **con cero
escrituras a la base**, frente a las seis que siembra la fase 60. Visto pasar en navegador real: **17/17**,
con la contabilidad cerrando sola —950 → 95 de comisión → 855 retenido → 855 liberado → 855 disponible— y
`QA-CL-07` comprobando que el vendedor recibe **403**.

---

## Siguiente

1. **Subido a `origin/master`** — ya no hay nada pendiente de empujar.
2. **Volumen de ciclos de pago.** Es lo único que sube D5 del 0 % y saca la Confianza del filo de 91. No lo
   cierra otra corrida igual: hacen falta 20 ciclos resueltos.
3. **H-005**: cuando haya PAC. Los tres modelos están medidos en `evidence/PT-155/hallazgos.md`; la opción C
   es subconjunto de la B, y la B exige datos que **no se pueden pedir retroactivamente**.
4. **La pregunta que abrió H-035, aplicada al resto de las reglas:** ¿qué otra `RULE-NN` vigila la parte fácil de
   medir y no la que causó su incidente? Ya ha dado dos hallazgos. No es buscar código sospechoso: es buscar
   **guardas que miran al lado del agujero**.
5. **La lista de variables de conexión es el límite de su guarda, y ya mordió una vez.** Cualquier variable nueva
   que apunte a un servicio hay que añadirla ahí, y **no hay nada que lo recuerde**.
5. **Y seguir mirando dónde el código promete algo**: un nombre que dice «verifica», una respuesta que dice
   «enviado», una variable que declara una espera, **una prueba que dice «no lanza»**. Una de esas cuatro formas
   era, hoy, una prueba nuestra.
