# PTSA V3 — RESUMEN DE AUDITORÍA
## IronLoot Auction Platform v1.0.0

**Sesión**: S-008 — **delta sync** (`resume PTSA`) | **Fecha**: 2026-07-29
**Disparador**: barrido de patrones derivado de **la recomendación que S-007 dejó escrita** — *«ejercitar
caminos de fallo… los candidatos siguientes son los otros terceros: la pasarela de pago, Redis, el
almacenamiento»*. El primero de la lista tenía el defecto.
**auditoria_estado**: CERRADA_SIN_HALLAZGOS_ACTIVOS

---

## SCORES — CLASE A

| Métrica | S-007 | **S-008** | Cambio |
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

| Dimensión | S-007 | **S-008** | Penaliza hoy |
|---|---|---|---|
| D1 Alineación de Dominio | 100 | **100** | — |
| D2 Integridad Arquitectónica | 100 | **100** | — |
| D3 Observabilidad y Recuperación | 100 | **100** | — |
| D4 Fidelidad Documental | 100 | **100** | — |

**D5**: `SIN_DATOS` **por muestra insuficiente**, no por ausencia de datos. `health_unstable: false`.
Alucinación y drift `NO_APLICA` (sistema determinista).

---

## LO QUE CERRÓ ESTA CORRIDA

**Un hallazgo**, y lo encontró aplicar al camino del dinero el patrón que se acababa de corregir en el correo.

### H-034 (MEDIA) — las seis llamadas a las pasarelas, sin tope

```
paypal.provider.ts:111        OAuth2 token
paypal.provider.ts:153        crear orden / capturar     ← por aquí pasa la captura
mercadopago.provider.ts:364   consulta de la vía garantizada
heybanco.provider.ts:41 · :77 · :115
```

Ninguna declaraba `signal`, y no había un `AbortController` en todo el directorio.

**Severidad MEDIA, y el motivo hay que decirlo:** por diseño de PT-087 **ningún pago cobrado queda sin
acreditar** —vía garantizada, reapertura del ciclo, asiento idempotente por referencia—, así que **el dinero no
se pierde por esto**. Lo que se degrada es el tiempo de respuesta y la ocupación de recursos: una petición de
depósito colgada mientras el usuario mira la pantalla, y una consulta de la vía garantizada que retiene su
ejecución.

Cerrado con `gateway-timeouts.ts`: **8 s para consultar, 20 s para operar**. La asimetría es **del dominio**:
consultar puede cortarse pronto porque la vía garantizada volverá; **crear o capturar** no, porque abandonar algo
que quizá se completó al otro lado deja un cobro sin saber qué pasó. Mismo razonamiento que hizo `socketTimeout`
mayor que `connectionTimeout` en H-033.

### Lo que esta emisión NO afirma

**No se ha observado una llamada colgada contra una pasarela real.** A diferencia de H-033 —donde los 121 s **se
midieron** parando Mailhog— aquí el defecto está comprobado **leyendo** las seis llamadas y el directorio
completo, y su consecuencia se infiere del comportamiento de `fetch` sin señal. `[A1]` exige la distinción, y la
ficha del hallazgo la hace con las mismas palabras.

**Y quedan dos terceros sin mirar**: Redis y el almacenamiento de ficheros. Siguen escritos como siguiente paso
en vez de darse por hechos.

### Once capturas que NO son hallazgo

El barrido encontró **11 `catch` sin `throw` ni registro** y ninguno es un defecto: están **declarados** en la
línea base del checkpoint D3, que exige motivo escrito por entrada. Los dos más sensibles están razonados en
`CLAUDE.md` — `payment-trace.service.ts` y `audit-persistence.service.ts` no lanzan porque *«un apunte de
trazabilidad no puede costarle el depósito al usuario»*.

Se dice porque **el número por sí solo alarma**: once capturas sin `throw` suenan a once defectos y son once
decisiones. **La diferencia la hace el motivo escrito** — que es exactamente lo que faltaba en H-032, donde la
captura no tenía un motivo sino una **pregunta sin responder**.

### Y mis dos casos de control no supieron fallar a la primera

Segunda vez en dos PT. **C2** se contentaba con que el fichero *contuviera* `conSenalDeAborto`, y bastaba la línea
del `import`: pasaba con el defecto puesto. **C1** tenía el error simétrico — recortaba una ventana fija de 500
caracteres y el cuerpo de `POST /payments` de HeyBanco es más largo, así que **acusaba una llamada ya
corregida**; un falso positivo enseña a desconfiar de la guarda, que es la forma silenciosa de perderla.

### Lo que cerraron las corridas anteriores, para referencia

**S-007**: H-032 (el fallo de envío que no llegaba a nadie, ALTA) y H-033 (121 s colgado). **S-006**: H-029, H-030
y H-031. Evidencias `E-034`, `E-035`, `E-036`.

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

Suite completa en verde al cerrar: **966 pruebas / 119 suites**.

---

## HALLAZGOS

**Activos: 0.** **Cerrados: 34** — H-001 … H-034. **H-030 revisada**, no reabierta.

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
3. **Terminar la lista de terceros: quedan Redis y el almacenamiento de ficheros.** La pasarela de pago era
   el primero de los tres y tenía el defecto (H-034). Los otros dos **no se han mirado**, y merece la pena
   hacerlo pronto: la recomendación acertó a la primera, así que la probabilidad de que acierte otra vez no es
   baja.
   Y con Redis hay una diferencia que la hace más valiosa: se puede **parar** en desarrollo —ya se hizo en
   PT-178— así que ahí el fallo se puede **medir**, no sólo leer. Es lo que separó a H-033 de H-034.
4. **Y seguir mirando dónde el código promete algo.** Un nombre que dice «verifica», una respuesta que dice
   «enviado», una variable que declara una espera, **una prueba que dice «no lanza»**. Ahí un defecto puede
   vivir años sin que nada se ponga rojo — y una de esas cuatro formas era, hoy, una prueba nuestra.
