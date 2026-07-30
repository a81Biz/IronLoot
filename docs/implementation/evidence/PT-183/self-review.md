# PT-183 — Autorrevisión (FDGE STATE 5)

**Fecha**: 2026-07-29 · **Rama**: `fix/PT-183-el-fallo-de-envio-no-llegaba`
**Cierra**: H-032 (D3, ALTA) · H-033 (D3, MEDIA) · revisa H-030

---

## Checklist

- [x] **Criterios verificados.** Las dos «Corrección esperada» se cumplen: el servicio propaga y **cada
      llamante declara qué hace**, con el motivo escrito; el transporte declara sus tres topes.
- [x] **Escenarios pasando.** 13 casos nuevos (8 + 5) y la suite completa en **959 / 118 suites**. `typecheck`
      limpio. Checkpoint D3 de vuelta en la línea base (25).
- [x] **Comprobado en vivo, en los dos sentidos.** Camino feliz: `1 → 2` correos en Mailhog. Camino de fallo,
      con Mailhog parado: **500 «Connection timeout»** — antes `200 «Verification email sent»` con la bandeja
      vacía. Y el tiempo: **121 s → ~5 s**.
- [x] **Sin efectos colaterales.** Inyectar el logger en el guard rompió su propio módulo de prueba; arreglado.
      Y se comprobó el **arranque real** del API dos veces, porque un cambio en un módulo puede romper el grafo
      de dependencias y eso no lo dice una prueba unitaria.
- [x] **Convenciones respetadas**, y ampliadas: **RULE-36** nueva, y el **Delta Log** rellenado.
- [x] **Commits atómicos**, con convención y trazables a PT-183.
- [x] **Documentación al día**: HISTORY, las tres fichas de hallazgo, E-036, y los derivados de PTSA en el
      delta sync S-007.

---

## Lo que no salió como estaba planeado

**1. Corrijo una afirmación de mi propio cierre de H-030, escrito minutos antes.** Decía que el reenvío
*«propaga el fallo — un `catch` que se lo comiera reproduciría el defecto por otra vía»*. **El `catch` existía**,
una capa más abajo, dentro de `EmailService`.

Lo que hice mal es identificable: **comprobé ejecutando que el correo salía, y di por bueno por lectura que el
fallo se propagaba.** Una de las dos afirmaciones se ejecutó y la otra se supuso — y la supuesta era la falsa.
Es exactamente lo que `[A1]` existe para impedir.

H-030 **no se reabre**: lo que reclamaba —que el correo salga— está cumplido y verificado. Pero queda anotado en
su ficha, porque `[A6]` dice que la evidencia se revisa, no se reescribe.

**2. Había una prueba verde sosteniendo el defecto.** `email.service.spec.ts` afirmaba `should not throw when
mailerService fails`, **dos veces**. No es un descuido aislado: es la misma forma que el caso de `BASE_URL` en
ese mismo fichero, que exigía la reserva `localhost:5174` hasta que PT-089 lo corrigió. **Una prueba puede ser
el mecanismo que mantiene vivo un defecto**, y este fichero lleva dos.

**3. Mis casos de control no supieron fallar hasta la tercera versión.** Y esto es lo más incómodo del PT,
porque acabo de escribir dos veces hoy que *una guarda que nadie ha visto fallar no es una guarda*:

| Versión | Cómo comprobaba | Por qué no valía |
|---|---|---|
| 1ª | recortaba 1200 caracteres alrededor de la llamada | dentro caían otras menciones a «H-032»: **verde con el defecto puesto** |
| 2ª | `lastIndexOf('try {')` sin verificar que envolviera | encontraba un `try` anterior ya cerrado: **verde otra vez** |
| 3ª | exige que no haya `catch` ni cierre entre el `try` y la llamada, y `} catch` justo después | **se vio caer**, cada una por su motivo |

C6 tenía la misma clase de error: buscaba `catch … throw err` en todo el fichero y pasaba por el `catch` de
`processCampaignInApp`, así que quitar el del correo la dejaba verde. Ahora se acota a `processEmail`.

**4. H-033 apareció midiendo, no leyendo.** La primera prueba del camino de fallo no dio un 500: dio un cliente
agotado a los 40 s. **Sin ejecutar el fallo, esos dos minutos no se habrían visto nunca** — y llevaban ahí desde
que existe el módulo.

**5. El checkpoint D3 cazó, por tercera vez en la jornada, trabajo mío de hace horas.** El `catch` mudo del guard
de PT-182, con una justificación que era falsa: *«añadir el logger cambiaría su firma en todos los llamantes»*.
Un guard recibe sus dependencias **por inyección**. Sonaba a razón técnica y era comodidad — y lo peor es que la
escribí en el mismo PT donde argumentaba que un control decorativo es peor que ninguno.

---

## Lo que este PT NO afirma

- **Que el correo se entregue.** Afirma que **sale del sistema**, y que si no sale, se dice. La entrega depende
  del proveedor SMTP; en desarrollo es Mailhog.
- **Que 5 000 ms sea el tope correcto en producción.** Está derivado de lo que el sistema ya espera de un
  tercero, **no medido** contra un SMTP real bajo carga.
- **Que no queden fallos que no llegan a su llamante.** El barrido miró la capa de correo. El patrón —capturar
  donde no se puede decidir— puede vivir en otras.
