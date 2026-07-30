# PTSA V3 — RESUMEN DE AUDITORÍA
## IronLoot Auction Platform v1.0.0

**Sesión**: S-007 — **delta sync** (`resume PTSA`) | **Fecha**: 2026-07-29
**Disparador**: barrido de la capa de correo al **comprobar el cierre de H-030**, por la instrucción del humano
— *«si hay un hallazgo nuevo lo tratas hasta cerrarlo»*, *«revisa de nuevo qué falta»*.
**auditoria_estado**: CERRADA_SIN_HALLAZGOS_ACTIVOS

---

## SCORES — CLASE A

| Métrica | S-006 | **S-007** | Cambio |
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

**§15.6 se cumple por los dos lados**: Health ≥ 90 **y** Confidence ≥ 90. `freshness = FRESH` → sin cap.
`health_unstable = false` → sin cap por D5.

---

## ⚠ Los mismos cuatro números por tercera vez, y ése es el dato

En cada intervalo entre emisiones ha aparecido trabajo real: **tres** hallazgos entre S-005 y S-006, **dos** más
entre S-006 y S-007 —uno **ALTA**—, y todos cerrados antes de emitir.

**La estabilidad de este 100 mide que se cierra lo que se encuentra, NO que no haya nada que encontrar.** Quien
lea sólo la tabla se lleva la impresión de tres jornadas sin incidentes, y hubo cinco defectos reales.

### Y uno de los dos de hoy desmiente parte del cierre anterior

H-030 se cerró afirmando que el reenvío de verificación *«propaga el fallo — un `catch` que se lo comiera
reproduciría el defecto por otra vía»*. **El `catch` existía**, una capa más abajo, dentro de `EmailService`.

Lo que se hizo mal es identificable: se comprobó **ejecutando** que el correo salía, y se dio por bueno **por
lectura** que el fallo se propagaba. Una afirmación se ejecutó y la otra se supuso — y la supuesta era la falsa.
Es `[A1]` incumplido por el agente. **H-030 no se reabre** —lo que reclamaba está cumplido y verificado en
vivo— pero queda anotado en su ficha: `[A6]`, la evidencia se revisa, no se reescribe.

Y los tres avisos siguen vigentes uno por uno:

**1. El Health llega a 100 en parte porque el alcance se estrechó, no sólo porque se arreglara.** H-005
—la facturación fiscal— se cerró **aceptándola como limitación declarada** por decisión del humano. Lo que
legitima ese cierre es que **la declaración de valor se corrigió a la vez** (`F-1 § U-006`): el producto ya
**no promete** emitir CFDI, y `P-012` pasó a `FUERA_DE_ALCANCE_V1`. El hueco que D1 mide —entre lo declarado
y lo entregado— se cerró **por el lado de la declaración**. El sistema sigue sin emitir facturas.

**2. La Confianza está a UN punto del umbral de A.** 91.0 contra un mínimo de 90. La baja **la cobertura de
D5, que es 0 %**: la fiabilidad operacional **no está demostrada**. Dos ciclos de pago no son una serie, y
desde PT-180 el instrumento lo dice en vez de inventarse un veredicto. Cualquier pérdida de cobertura tumba
la Clase A.

**3. Cero hallazgos activos no es cero defectos: es cero defectos CONOCIDOS.** Tercera emisión consecutiva en
que un barrido dirigido encuentra defectos que **ninguna prueba señalaba**. Un `0` en esta columna mide lo que
se ha buscado — y hoy quedó claro **dónde** buscar: los dos de esta corrida vivían en el **camino de fallo**,
que nunca se había ejecutado. El camino feliz estaba probado; el otro, nunca.

---

## SCORES POR DIMENSIÓN

| Dimensión | S-006 | **S-007** | Penaliza hoy |
|---|---|---|---|
| D1 Alineación de Dominio | 100 | **100** | — |
| D2 Integridad Arquitectónica | 100 | **100** | — |
| D3 Observabilidad y Recuperación | 100 | **100** | — |
| D4 Fidelidad Documental | 100 | **100** | — |

**D5**: `SIN_DATOS` **por muestra insuficiente**, no por ausencia de datos. `health_unstable: false`.
Alucinación y drift `NO_APLICA` (sistema determinista).

---

## LO QUE CERRÓ ESTA CORRIDA

**Dos hallazgos, y los dos salieron de comprobar el cierre del anterior.** No de leer código nuevo: de
**ejecutar el camino de fallo**, que es el que nunca se ejercitaba.

| Hallazgo | Dim | Sev | Qué pasaba | Cómo se comprobó el cierre |
|---|:--:|:--:|---|---|
| **H-032** | D3 | **ALTA** | `EmailService` absorbía cualquier fallo de envío | **En vivo** con Mailhog parado: de `200 «Verification email sent»` con la bandeja vacía a **500 «Connection timeout»** |
| **H-033** | D3 | MEDIA | El transporte no declaraba **ningún tope** de espera | Medido: **121 s → ~5 s** |

### H-032 anulaba tres capas de recuperación, no una

`notification-queue.worker.ts` tiene un `catch` que cuenta intentos, los registra y **relanza para que BullMQ
reintente**. Ese `catch` **no podía ejecutarse nunca**: lo que llamaba por debajo no lanzaba, así que un envío
fallido marcaba el trabajo como **completado con éxito**.

Es la familia de **H-014**, **H-015** y **H-027**, y este repositorio ya la tiene escrita como principio: *un
mecanismo que no se ejecuta no avisa de nada.* Tres capas —el `catch`, el contador de intentos, la política de
reintentos— anuladas por la de abajo.

**Y el servicio llevaba su propia duda escrita al lado**: `// Don't rethrow to avoid breaking registration
flow?`. La duda era buena. Contestarla **una vez, para todos los llamantes**, no puede serlo — la respuesta
correcta es distinta en cada uno, y el servicio no sabe a cuál está sirviendo. De ahí **RULE-36**.

### H-033 apareció midiendo, no leyendo

La primera prueba del camino de fallo no dio un 500: dio un **cliente agotado a los 40 s**. Con el tope del
cliente subido, `real 2m1.490s`. El transporte no declaraba topes y nodemailer aplicaba los suyos: dos minutos
para conectar — en el reenvío **y en el registro**, la primera pantalla del producto.

Es **preexistente** y estaba tapado por H-032, porque tras los dos minutos se respondía `200`. **Corregir H-032
no creó la espera: la hizo visible.**

### Tres cosas propias, y las tres incómodas

1. **Una prueba verde sostenía el defecto.** `email.service.spec.ts` afirmaba `should not throw when
   mailerService fails`, **dos veces** — mismo fichero que hasta PT-089 exigía la reserva `localhost:5174`.
   **Una prueba puede ser el mecanismo que mantiene vivo un defecto.**
2. **Los casos de control C4/C5/C6 no supieron fallar hasta la tercera versión.** Las dos primeras pasaban con
   el defecto puesto. Detalle en `E-036`, y es incómodo porque *«una guarda que nadie ha visto fallar no es una
   guarda»* se escribió dos veces hoy en este mismo repositorio.
3. **El checkpoint D3 cazó, por tercera vez en la jornada, un `catch` mudo del día**: el del guard de reCAPTCHA
   de PT-182, con una justificación escrita que era **falsa** — decía que inyectar el logger «cambiaría su firma
   en todos los llamantes», y un guard recibe sus dependencias por inyección. Sonaba a razón técnica y era
   comodidad. 26 → 25.

### Y el registro de reglas declaraba ser completo sin serlo

El **Delta Log** de `11-Conventions.md` dice ser *el* registro incremental de reglas y tenía **12 de 34**.
Veintidós sin fila, así que quien buscara cuándo llegó una regla y contra qué defecto no encontraba nada **y no
tenía forma de saber que la tabla estaba incompleta**. Es H-016 aplicado a sí mismo. Completado, con las filas
nuevas marcadas como **reconstruidas** desde `HISTORY.log`: su procedencia es más débil que la de las otras y se
dice.

### Lo que cerró S-006, para referencia

H-029 (el guard de reCAPTCHA que no verificaba), H-030 (el correo que no salía) y H-031 (el holdback con reserva
`0`). Evidencias `E-034` y `E-035`.

---

## COBERTURA DECLARADA — `[A8]`

Sin cambios respecto a S-005. **Este delta sync no amplía cobertura: confirma correcciones.**

| Dimensión | Cobertura | Por qué |
|---|---:|---|
| D1 Dominio | **100 %** | 14 de 14 reglas medidas, las 14 cumplen |
| D2 Integridad | 100 % | Esquema verificado en la base **y contra el modelo**; 0 vulnerabilidades |
| D3 Observabilidad | 100 % | Silencios en línea base, `trace_completeness` 100 %, endpoints en vivo en los dos estados |
| D4 Documental | 100 % | 135 pruebas en 12 guardas de documentación |
| **D5 Fiabilidad** | **0 %** | **Muestra insuficiente**: 2 ciclos resueltos frente a los 20 que los umbrales exigen |

**D5 al 0 % sigue siendo la afirmación más importante de esta tabla.** No es que el sistema sea poco fiable:
es que **no se puede afirmar que lo sea**. Subirlo exige volumen de ciclos de pago, no otra corrida igual.

Suite completa en verde al cerrar: **959 pruebas / 118 suites**.

---

## HALLAZGOS

**Activos: 0.** **Cerrados: 33** — H-001 … H-033. **H-030 revisada**, no reabierta.

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
3. **Ejercitar caminos de FALLO, no sólo los felices.** Es la lección concreta de esta corrida, y la más
   accionable que ha salido hoy: los dos hallazgos vivían en el camino de error, que **nunca se había
   ejecutado**. Parar la dependencia y pedir la operación —lo que aquí se hizo con Mailhog— encontró en cinco
   minutos dos defectos con meses de vida. Los candidatos siguientes son los otros terceros: la pasarela de
   pago, Redis, el almacenamiento de ficheros.
4. **Y seguir mirando dónde el código promete algo.** Un nombre que dice «verifica», una respuesta que dice
   «enviado», una variable que declara una espera, **una prueba que dice «no lanza»**. Ahí un defecto puede
   vivir años sin que nada se ponga rojo — y una de esas cuatro formas era, hoy, una prueba nuestra.
