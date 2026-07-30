# HANDOFF — estado actual

**FDGE V3** · **2026-07-29** · Se **sobrescribe**: es el estado de ahora, no la historia.

**Rama**: `master`, árbol limpio, cero ramas sin fusionar. **Sin subir a `origin`.**

**Pruebas**: **1245** unitarias en verde — API **992** (122 suites) · CORE **134** · CLIENT **103** ·
ADMIN **13** · BASE **3**.

**Reglas duras**: **35** `RULE-NN`. **Guardas de documentación**: **14** suites / **151** pruebas.

**Estado de cada PT**: el **ÍNDICE DE ESTADO** al final de [`HISTORY.log`](HISTORY.log) — generado con
`npm run indice:estado`. **139 encabezados · 0 realmente abiertos.**

---

## Estado: CERTIFICADO Clase A · cero hallazgos activos

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

Los veintiséis PT de la jornada —**PT-158 … PT-183**— están cerrados con tu VoBo. Cero trabajo FDGE pendiente.
Lista en [`PENDING_TASKS.md`](PENDING_TASKS.md).

---

## Lo último: la documentación decía cosas que el código dejó de hacer (PT-188)

Fui a añadir lo de la jornada y **medí primero**. Lo que había:

| Documento | Decía | Es |
|---|---|---|
| `inventory/endpoints.md` | 86 rutas, incluida `/users/settings` | **159**, y esa ruta **no existe** — es la fantasma de **H-020** |
| `inventory/entities.md` | «Total models: 27» | **33** |
| `Catalogo-de-API.md` | «~118 endpoints», ADMIN «~61» | **159** y **80** |
| `Catalogo-Maestro-de-Reglas.md` `RN-64` | El holdback se libera «cuando el pedido está DELIVERED» | Eso **era el defecto**: así el vendedor liberaba su propio dinero |
| `Master-Test-Plan.md` | «frontends: 0 suites, ninguna» | **3 suites, 119 casos** |
| Registro Maestro de ADR | Se quedaba en ADR-049 | Faltaban **seis** decisiones de la jornada |

**La peor es `RN-64`**: no estaba incompleta, **describía el comportamiento defectuoso como si fuera la regla de
negocio**. Quien la leyera para entender la liberación del holdback entendía justo lo que PT-174 tuvo que
corregir.

**Y la de `endpoints.md` es la que más enseña.** H-020 costó que «Configuración» no cargara para nadie. El código
se arregló hace meses; **el documento que un agente lee para saber a dónde llamar siguió diciendo la ruta
equivocada**. Así vuelve H-020.

### Dónde estaba la causa

`11-Conventions.md` tiene guarda. `10-Technical-Debt.md` tiene guarda. **Los seis inventarios no tenían
ninguna** — y son los que se desviaron. Ahora `endpoints.md` la tiene en las dos direcciones; **los otros cinco
siguen sin ella y está escrito**, no dado por hecho.

### Y volví a retirar una promesa en vez de afinarla

Intenté deducir el nivel de autorización de cada ruta. Tres versiones, tres resultados distintos — una dio `JWT` a
`POST /auth/register` **teniendo `@Public()`**, y otra dio por **públicos los ochenta endpoints de
administración**, porque `admin.controller.ts` declara `@UseGuards(AdminDualAuthGuard)` **junto a** `@Public()`.

La cuarta funcionaba, y **la retiré igual**. Esa columna se cura a mano —19 controladores, no 159 rutas— y la
guarda comprueba sólo lo que se mide sin ambigüedad. **Prometer menos y cumplirlo es mejor que una guarda que a
veces miente.**

Añadidas **ADR-050 … ADR-055** al Registro Maestro: la recepción la confirma quien recibe · un servicio no decide
por sus llamantes · todo tercero declara su tope · ninguna variable de conexión tiene reserva · el registro
append-only necesita índice · **v1.0 no afirma que su fiabilidad esté demostrada**.

---

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

1. **`git push origin master`** de lo de esta tanda. Lo anterior ya está en `origin`.
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
