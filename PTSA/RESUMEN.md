# PTSA V3 — RESUMEN DE AUDITORÍA
## IronLoot Auction Platform v1.0.0

**Sesión**: S-011 — **delta sync** (`resume PTSA`) | **Fecha**: 2026-07-30
**Disparador**: tres decisiones del humano tras señalar que *«de nuevo faltan muchas cosas»* — reabrir H-035 y
cerrarlo completo, **aceptar D5 como limitación declarada**, y añadir un índice de estado a `HISTORY.log`.
**auditoria_estado**: CERRADA_SIN_HALLAZGOS_ACTIVOS

---

## SCORES — CLASE A

| Métrica | S-009 | **S-010** | Cambio |
|---|---|---|---|
| **Health Score** | 100.0 | **100 / 100** | — |
| **Risk Score** | 0 | **0 / 100** | — |
| **Confidence** | 91.0 | **91.0 / 100** | — |
| **Clasificación** | A | **A** | — |

```
Health = (100×0.30) + (100×0.30) + (100×0.30) + (100×0.10) = 100
Risk   = min(100, 0 × 4) = 0                    Risk_bruto = 0 — cero hallazgos activos
Conf   = 80×0.40 + 100×0.25 + 95×0.20 + 100×0.15 = 91.0
```

**Regla del Agua Potable: NO activada.** D1 = 100. Se dice porque `[A4]` lo exige.

> **S-011 — lo que este sync tiene y los cinco anteriores no.**
>
> **D1 se midió sobre salida real generada en esta misma sesión.** `run-all.sh` produjo 209 de 210
> comprobaciones y, acto seguido, `audit:domain` evaluó las **ocho reglas `CR` con datos delante**:
> `rubric_compliance_score = 100`, 4 de 5 coherencias cruzadas medidas. S-006 a S-010 arrastraban
> `SIN_DATOS` en las cinco — un `SIN_DATOS` no es un aprobado, y el propio checkpoint lo dice.
>
> **D3 falló, y ése es el resultado que más vale.** Tres `catch` mudos que introdujeron PT-194 y PT-196
> — `H-036`, corregido y re-verificado antes de emitir: `silent_failure_count` de **27 a 24**, por
> debajo de la línea base. Los introduje **en el sitio donde mi propio diseño afirmaba que no los
> había**: `design.md` argumentaba que `null` ≠ `throw`, y el `catch` del llamante se comía el `throw`
> dos líneas después. **Lo encontró el checkpoint, no una lectura.**
>
> **D5 sin cambio**: 2 ciclos de pago resueltos de los 20 que exige la muestra. Es lo único que separa
> la Confianza de un número mayor, y sigue siendo la limitación declarada de v1.0.

**§15.6 se cumple por los dos lados**: Health ≥ 90 **y** Confidence ≥ 90. `freshness = FRESH` → sin cap.
`health_unstable = false` → sin cap por D5.

---

## ⚠ Los mismos cuatro números por CUARTA vez, y ése es el dato

En cada intervalo entre emisiones ha aparecido trabajo real: **tres** hallazgos entre S-005 y S-006, **dos** entre
S-006 y S-007 —uno ALTA—, **uno** entre S-007 y S-008. Seis defectos reales, todos cerrados antes de emitir, y
los cuatro números sin moverse.

**La estabilidad de este 100 mide que se cierra lo que se encuentra, NO que no haya nada que encontrar.**

### Y el hallazgo de hoy lo encontró la recomendación de ayer

S-007 cerró diciendo: *«ejercitar caminos de fallo… los candidatos siguientes son los otros terceros: la pasarela
de pago, Redis, el almacenamiento»*. **El primero de la lista tenía el defecto**, y eso no es mérito del barrido:
es la señal de que H-033 no era un caso aislado del correo, sino **la forma de este sistema al hablar con un
tercero**. Antes de hoy, sólo **dos** ficheros del API declaraban un tope — y los dos se escribieron hoy.

Y los tres avisos siguen vigentes uno por uno:

**1. El Health llega a 100 en parte porque el alcance se estrechó, no sólo porque se arreglara.** H-005
—la facturación fiscal— se cerró **aceptándola como limitación declarada** por decisión del humano. Lo que
legitima ese cierre es que **la declaración de valor se corrigió a la vez** (`F-1 § U-006`): el producto ya
**no promete** emitir CFDI, y `P-012` pasó a `FUERA_DE_ALCANCE_V1`. El hueco que D1 mide —entre lo declarado
y lo entregado— se cerró **por el lado de la declaración**. El sistema sigue sin emitir facturas.

**2. La Confianza está a UN punto del umbral de A.** 91.0 contra un mínimo de 90. La baja **la cobertura de
D5, que es 0 %** — y desde esta emisión eso es una **limitación declarada** (`F-1 § U-007`), no un pendiente: la
fiabilidad operacional **no está demostrada** y se dice. Dos ciclos no son una serie, y desde PT-180 el
instrumento se niega a pronunciarse en vez de inventarse un veredicto. Cualquier pérdida de cobertura tumba la
Clase A.

**3. Cero hallazgos activos no es cero defectos: es cero defectos CONOCIDOS.** Tercera emisión consecutiva en
que un barrido dirigido encuentra defectos que **ninguna prueba señalaba**. Un `0` en esta columna mide lo que
se ha buscado — y hoy quedó claro **dónde** buscar: los dos de esta corrida vivían en el **camino de fallo**,
que nunca se había ejecutado. El camino feliz estaba probado; el otro, nunca.

---

## SCORES POR DIMENSIÓN

| Dimensión | S-009 | **S-010** | Penaliza hoy |
|---|---|---|---|
| D1 Alineación de Dominio | 100 | **100** | — |
| D2 Integridad Arquitectónica | 100 | **100** | — |
| D3 Observabilidad y Recuperación | 100 | **100** | — |
| D4 Fidelidad Documental | 100 | **100** | — |

**D5**: `SIN_DATOS` **por muestra insuficiente**, no por ausencia de datos. `health_unstable: false`.
Alucinación y drift `NO_APLICA` (sistema determinista).

---

## LO QUE CERRÓ ESTA CORRIDA

**Ningún hallazgo nuevo. Un hallazgo reabierto, una limitación declarada y una deuda de registro.**

### H-035 — reabierta, y el motivo es el propio cierre

Se cerró en S-009 diciendo que la guarda mira `src/api/src` y que ADMIN, BASE y CLIENT quedaban fuera **«escrito
como pendiente, no dado por hecho»**. Eso era mejor que callarlo y **peor que medirlo**:

| Servicio | Reservas a `localhost` |
|---|---|
| **API** | **1** — `paypal.provider.ts:311`, que S-009 declaró limpio |
| ADMIN | 0 |
| **BASE** | **3** — dos en el controlador y **una en el proxy del BFF** |
| **CLIENT** | **3** — dos en el controlador y una en el guard de sesión |

**Seis, no cuatro.** Y la del API la ocultó **la propia guarda**: su lista de variables de conexión tenía seis
nombres y `CLIENT_URL` no estaba. `E-038` había declarado esa debilidad con estas palabras —*«una variable de
conexión nueva que nadie añada a esa lista no se vigilará»*— y **se cumplió en la corrida siguiente**. Declarar
una debilidad no la cierra.

**Las dos caras son las del proxy del BFF:** sin `API_URL`, el sitio manda *todas* sus llamadas a su propio
contenedor y **arranca `healthy` sin funcionar**.

Cerrada: `variableObligatoria()` **aborta nombrando la variable** —comprobado en vivo—, el API pasa a
`clientOrigin()`, y la guarda cubre **los cuatro servicios** con un caso por servicio.

### D5 — limitación declarada de v1.0

Cuatro corridas del checkpoint, el mismo resultado: `SIN_DATOS` por muestra insuficiente. Se declara en
`F-1 § U-007` que **la fiabilidad operacional no está demostrada**, con su reapertura escrita: con volumen real
de producción los 20 ciclos aparecen solos y la declaración caduca sin otra decisión.

**Lo que no dice:** que el sistema sea poco fiable. Dice que **no se puede afirmar que lo sea**.

### PT-187 — el registro decía «pendiente» de 102 cosas cerradas

`HISTORY.log` es append-only, así que la línea `Status:` es histórica: **102 entradas dicen
`VALIDATION_PENDING` estando cerradas**. Costó tiempo real — se reportó **PT-147 como pendiente** llevando horas
cerrado, y el humano lo señaló con razón. **El fichero lo decía, y el agente repitió el fichero en vez de
medirlo.**

Resuelto con un índice **generado** al final del propio fichero: añade, no reescribe. Reescribir las 102 líneas
se leería mejor y borraría el momento en que se supo cada cosa.

**Y su primera ejecución encontró un defecto de proceso del agente**, que es para lo que se escribió: cinco BUG
—PT-182 … PT-186— escritos con `Status: DONE` **directamente**, cuando FDGE STATE 6 dice que *el agente no cierra
bugs*. El VoBo estaba dado de antemano, así que el resultado era correcto; lo que faltaba era **la constancia**.
Y un cierre sin constancia de quién lo autorizó **es indistinguible de uno que el agente se dio a sí mismo**.
De ahí **RULE-37**.

### Tres veces más, mis propias guardas midieron otra cosa

Van cuatro en la jornada, y el patrón es siempre el mismo: **comprobar que exista una cadena en vez de una
relación.** Hoy: un regex terminado en `$` con la bandera `m` —que casa fin de *línea*— cortaba cada bloque de
VoBo en su encabezado, así que la guarda comprobaba títulos; y `SIN_DECLARAR` se trataba como «abierto», lo que
acusaba a seis entradas anteriores al campo `Status:`. **Un desconocido no es un pendiente.**

### Lo que cerraron las corridas anteriores, para referencia

**S-009**: H-035 (la reserva del cerrojo). **S-008**: H-034. **S-007**: H-032 y H-033. **S-006**: H-029, H-030,
H-031. Evidencias `E-034` … `E-039`.

---

## COBERTURA DECLARADA — `[A8]`

Sin cambios respecto a S-005. **Este delta sync no amplía cobertura: confirma correcciones.**

| Dimensión | Cobertura | Por qué |
|---|---:|---|
| D1 Dominio | **100 %** | 14 de 14 reglas medidas, las 14 cumplen |
| D2 Integridad | 100 % | Esquema verificado en la base **y contra el modelo**; 0 vulnerabilidades |
| D3 Observabilidad | 100 % | Silencios en línea base, `trace_completeness` 100 %, endpoints en vivo en los dos estados |
| D4 Documental | 100 % | 135 pruebas en 12 guardas de documentación |
| **D5 Fiabilidad** | **0 %** | **Limitación declarada de v1.0** (`F-1 § U-007`): 2 ciclos resueltos frente a 20, y cada uno exige aprobación manual en la pasarela |

**D5 al 0 % sigue siendo la afirmación más importante de esta tabla.** No es que el sistema sea poco fiable:
es que **no se puede afirmar que lo sea**. Subirlo exige volumen de ciclos de pago, no otra corrida igual.

Suite completa en verde al cerrar: **973 pruebas / 120 suites**.

---

## HALLAZGOS

**Activos: 0.** **Cerrados: 35** — H-001 … H-035. **H-030 revisada**, no reabierta.

Ninguno se cerró por inferencia: los técnicos, ejecutando; H-005, por decisión humana fechada y con la
declaración de valor enmendada a la vez. Y cuando una parte de un cierre resultó falsa —H-030— **se anotó en su
ficha en vez de reescribirla**: `[A6]`.

---

## PRODUCTOS: 12

`VALIDADO` **11** · `FUERA_DE_ALCANCE_V1` **1** (`P-012 CfdiRecord`).

`P-012` **no pasa a `VALIDADO`**: el producto no se genera, y marcarlo validado sería falso. Sale del
inventario que v1.0 entrega, con su motivo escrito y su reapertura declarada — si v1.1 vuelve a prometer la
factura, `P-012` vuelve y **H-005 se reabre con él**. `[A6]`: no se degrada ni se borra.

---

## SIGUIENTE

1. **Volumen de ciclos de pago.** Es lo único que sube D5 del 0 %, y con ello la Confianza por encima del
   filo de 91. Hacen falta **20 ciclos resueltos**; hoy hay 2.
2. **La decisión fiscal, cuando haya PAC.** Los tres modelos siguen medidos en
   `evidence/PT-155/hallazgos.md`. La opción C es subconjunto de la B, y la B exige datos que **no se pueden
   pedir retroactivamente**.
3. **La pregunta que abrió H-035, aplicada al resto de las reglas:** ¿qué otra `RULE-NN` tiene guarda para la
   parte fácil de medir y no para la que causó su incidente? Hoy ha dado dos hallazgos (H-035 y el alcance de su
   propia guarda). No es buscar código sospechoso: es buscar **guardas que miran al lado del agujero**.
4. **Y una que sale del PT-187:** la lista de variables de conexión de la guarda es su límite, y ya mordió una
   vez. Cualquier variable nueva que apunte a un servicio hay que añadirla ahí — no hay nada que lo recuerde.
4. **Y seguir mirando dónde el código promete algo.** Un nombre que dice «verifica», una respuesta que dice
   «enviado», una variable que declara una espera, **una prueba que dice «no lanza»**. Ahí un defecto puede
   vivir años sin que nada se ponga rojo — y una de esas cuatro formas era, hoy, una prueba nuestra.
