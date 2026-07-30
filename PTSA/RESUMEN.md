# PTSA V3 — RESUMEN DE AUDITORÍA
## IronLoot Auction Platform v1.0.0

**Sesión**: S-009 — **delta sync** (`resume PTSA`) | **Fecha**: 2026-07-29
**Disparador**: cerrar la lista que dejó S-008 — mirar los **dos terceros que faltaban**, Redis y el
almacenamiento de ficheros.
**auditoria_estado**: CERRADA_SIN_HALLAZGOS_ACTIVOS

---

## SCORES — CLASE A

| Métrica | S-008 | **S-009** | Cambio |
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
D5, que es 0 %**: la fiabilidad operacional **no está demostrada**. Dos ciclos de pago no son una serie, y
desde PT-180 el instrumento lo dice en vez de inventarse un veredicto. Cualquier pérdida de cobertura tumba
la Clase A.

**3. Cero hallazgos activos no es cero defectos: es cero defectos CONOCIDOS.** Tercera emisión consecutiva en
que un barrido dirigido encuentra defectos que **ninguna prueba señalaba**. Un `0` en esta columna mide lo que
se ha buscado — y hoy quedó claro **dónde** buscar: los dos de esta corrida vivían en el **camino de fallo**,
que nunca se había ejecutado. El camino feliz estaba probado; el otro, nunca.

---

## SCORES POR DIMENSIÓN

| Dimensión | S-008 | **S-009** | Penaliza hoy |
|---|---|---|---|
| D1 Alineación de Dominio | 100 | **100** | — |
| D2 Integridad Arquitectónica | 100 | **100** | — |
| D3 Observabilidad y Recuperación | 100 | **100** | — |
| D4 Fidelidad Documental | 100 | **100** | — |

**D5**: `SIN_DATOS` **por muestra insuficiente**, no por ausencia de datos. `health_unstable: false`.
Alucinación y drift `NO_APLICA` (sistema determinista).

---

## LO QUE CERRÓ ESTA CORRIDA

**Un hallazgo, y la lista de terceros queda cerrada.** Los dos que faltaban se miraron, y el resultado es
distinto en cada uno — que es exactamente por qué había que mirarlos y no suponerlos.

### El almacenamiento: se miró y NO aplica

`upload.service.ts` escribe con `writeFile` **en disco local**. No hay S3 ni servicio remoto en v1.0, así que el
patrón de H-034 no tiene dónde darse: no hay nada a lo que esperar por red.

**«Queda por mirar» y «se miró y no aplica» son estados distintos**, y sólo el segundo cierra un pendiente.

### Redis: el defecto no era el que se fue a buscar

Se buscaba un tope. Los dos clientes `ioredis` no declaran topes propios pero **la biblioteca trae los suyos**
—10 s de conexión, reintentos acotados—, así que aquí no hay un equivalente a los dos minutos de nodemailer.

Lo que apareció al mirar fue otra cosa, de otra dimensión:

### H-035 (D2, MEDIA) — la reserva que RULE-17 prohíbe, sobreviviendo en un fichero

```ts
// distributed-lock.service.ts:12
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
```

**Y lo que vale de este hallazgo no es el defecto: es su causa.** La guarda de RULE-17
—`variables-de-entorno-declaradas.spec.ts`— comprueba que toda variable que el código lee esté **declarada** en un
`.env.example`. Funciona. Pero el texto de la regla dice, en negrita y como su afirmación central:

> *The fallback was the problem, not the variable.*

**Esa mitad no la comprobaba nadie.** La regla nació de cinco contenedores caídos: se vigiló la parte fácil de
medir —¿está declarada?— y quedó sin vigilar la que causó el incidente —¿tiene reserva?—.

Por eso este `||` pasó por **PT-137**, por **PT-147** y por todas las corridas de la suite, mientras el cliente de
al lado llevaba escrito *«PT-137 — Mismo defecto que las colas: reserva a `localhost`»*. **Había una guarda con el
nombre correcto mirando otra cosa** — la familia de H-031, donde la guarda del holdback miraba el servicio y el
agujero estaba en el compose.

Lo que costaba: el cerrojo es lo que impide que dos instancias procesen el mismo cierre de subasta. Un despliegue
sin `REDIS_URL` **arranca**, apunta a un `localhost` que en el contenedor no es nadie, `acquireLock` relanza y
**ninguna subasta se cierra**.

**La corrección vale por la guarda nueva más que por el arreglo**: `conexiones-sin-reserva.spec.ts` cubre las
**tres** formas de escribir una reserva —`||`, `??` y el segundo argumento de `config.get`, que es la que produjo
el incidente original— y **se vio acusar al fichero correcto, y sólo a ése**, antes de arreglarlo.

### Lo que esta emisión NO afirma

- **Que se haya observado el fallo.** `docker-compose` declara `REDIS_URL`, así que la reserva no se usaba en
  ningún entorno existente. El daño era **potencial**, como en H-029 y H-031.
- **Que no queden reservas fuera del API.** La guarda mira `src/api/src`. **ADMIN, BASE y CLIENT no están
  cubiertos**, y ADMIN tuvo este mismo defecto en PT-147: es el sitio más probable para el siguiente.
- **Que la lista de variables de conexión esté completa.** Son seis. Una nueva que nadie añada a esa lista **no se
  vigilará** — debilidad conocida de la guarda, no descuido.

### Lo que cerraron las corridas anteriores, para referencia

**S-008**: H-034 (las pasarelas sin tope). **S-007**: H-032 (el fallo de envío que no llegaba a nadie, ALTA) y
H-033 (121 s colgado). **S-006**: H-029, H-030, H-031. Evidencias `E-034` … `E-037`.

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
3. **Llevar la guarda de reservas a ADMIN, BASE y CLIENT.** `conexiones-sin-reserva.spec.ts` mira
   `src/api/src` y nada más. **ADMIN tuvo exactamente este defecto en PT-147**, así que es el sitio más probable
   para el siguiente — y hoy no hay nada que lo impida. Es el pendiente más concreto que deja esta jornada.
4. **La pregunta que abrió H-035, aplicada al resto de las reglas:** ¿qué otra `RULE-NN` tiene guarda para la
   parte fácil de medir y no para la que causó su incidente? Es la forma más productiva que ha aparecido hoy: no
   buscar código sospechoso, sino **guardas que miran al lado del agujero**.
4. **Y seguir mirando dónde el código promete algo.** Un nombre que dice «verifica», una respuesta que dice
   «enviado», una variable que declara una espera, **una prueba que dice «no lanza»**. Ahí un defecto puede
   vivir años sin que nada se ponga rojo — y una de esas cuatro formas era, hoy, una prueba nuestra.
