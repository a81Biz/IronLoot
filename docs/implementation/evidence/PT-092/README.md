# Evidencia — PT-092

**Fecha**: 2026-07-27 · **Rama**: `feature/PT-092-verificacion-de-cuenta`

## Viabilidad, probada contra el sandbox real ANTES de diseñar

```
importe            10.42 MXN   (céntimos aleatorios con crypto.randomInt)
aprobada por       sb-aczp042099237@personal.example.com   (titular real)
capturada          7DF26051AU788411U — 10.42 MXN
DEVOLUCIÓN         201 COMPLETED — 448946423W681830A
captura final      REFUNDED
```

## El flujo completo, verificado contra la API real

```
1.  CLABE registrada                              isVerified = false
2.  PayPal registrado                             OK
3.  SEGUNDO PayPal                                HTTP 400 — «Ya tienes una cuenta de PayPal
                                                  registrada (vendedor@ejemplo.com)»
4.  retiro sin KYC                                HTTP 400 (gate 1, el que ya existía)
5.  verificación abierta                          HTTP 201, importe 20
                                                  token en la respuesta: NO  ← correcto
6.  retiro CON KYC pero SIN verificar             HTTP 400 — «Esta cuenta aún no está
                                                  verificada…»          ← el gate nuevo
7.  token generado                                A7XMEC
9.  token incorrecto                              rechazado, 4 intentos restantes
10. token correcto EN MINÚSCULAS                  VERIFICADO
11. retiro ya verificado                          HTTP 201
```

El paso 6 es el cierre de TD-003 observado en ejecución, no deducido.

## Lo que la verificación real destapó

**`confirm()` aceptaba el token con la verificación en `PENDING`** — antes de que el dinero
saliera. No era explotable, porque el vendedor no puede conocer el token; pero habría afirmado
«cuenta verificada» sin que nada hubiera llegado a esa cuenta, que es justo lo que la
verificación existe para probar. Corregido, con el test **W-20**.

Apareció **ejecutando el flujo**, no leyendo el código. Los 19 tests previos pasaban.

## Decisiones del desarrollador que mejoraron el diseño

**Fondos de la primera venta.** Elimina un vector que el diseño original no cubría: si la
plataforma pagara cada verificación, dar de alta cuentas en masa la drenaría.

**Token en la referencia, no céntimos aleatorios.** Los céntimos los altera cualquier comisión o
redondeo del banco intermediario, y solo dan 100 combinaciones.

**Consecuencia**: para la CLABE **no hay reintegro**. El dinero ya es del vendedor y acaba en su
banco — la verificación *es* un retiro pequeño. Coste neto: cero.

## Cardinalidad

Un PayPal, varias CLABE, varias tarjetas. El rechazo del segundo PayPal **nombra el que ya
existe**, para poder quitarlo sin buscarlo.

## Hallazgos registrados, no resueltos aquí

**F-27 — depositar *a* una tarjeta exige dispersión que no tenemos.** `grep` sobre
`node_modules/mercadopago/dist/clients/`: cero clientes de *payout*, *money out* o *transfer*.
Decisión: la tarjeta **verifica y cobra**; el retiro va a CLABE o PayPal. En México la tarjeta de
débito suele tener CLABE asociada, así que el caso queda cubierto por esa vía. En la matriz como
bloqueado por dependencia externa.

**PCI**: el formulario de tarjeta será nuestro, pero el número irá del navegador directo a
MercadoPago mediante `cardToken` — verificado que el SDK lo expone, junto con `customerCard`.
Capturar el PAN en nuestro servidor movería el proyecto de **SAQ A-EP** a **SAQ D**: auditoría
anual presencial, escaneos trimestrales y segmentación de red.

## Suites

API **62 suites / 438 tests** · typecheck y lint limpios.
20 tests de verificación + 10 de cardinalidad + 2 del gate de retiro.
