# PTSA V3 — RESUMEN DE AUDITORÍA
## IronLoot Auction Platform v1.0.0

**Sesión**: S-006 — **delta sync** (`resume PTSA`) | **Fecha**: 2026-07-29
**Disparador**: barrido dirigido tras el cierre de S-005, por instrucción del humano — *«revisa de nuevo qué
falta»*, *«si hay un hallazgo nuevo lo tratas hasta cerrarlo»*, *«cierra los PT con mi VoBo»*.
**auditoria_estado**: CERRADA_SIN_HALLAZGOS_ACTIVOS

---

## SCORES — CLASE A

| Métrica | S-005 | **S-006** | Cambio |
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

## ⚠ La columna «Cambio» está vacía, y ése es el dato de esta emisión

Entre S-005 y S-006 aparecieron **tres hallazgos más** —uno **ALTA** en D1—, se corrigieron y se cerraron. Los
cuatro números no se movieron ni un punto.

**Un 100 estable no significa que no haya pasado nada.** Significa que lo encontrado se cerró antes de emitir.
Quien lea sólo la tabla se lleva la impresión de una jornada sin incidentes, y hubo tres defectos reales — uno
de ellos en el camino que usa quien no puede activar su cuenta.

Y los tres avisos de S-005 siguen vigentes uno por uno:

**1. El Health llega a 100 en parte porque el alcance se estrechó, no sólo porque se arreglara.** H-005
—la facturación fiscal— se cerró **aceptándola como limitación declarada** por decisión del humano. Lo que
legitima ese cierre es que **la declaración de valor se corrigió a la vez** (`F-1 § U-006`): el producto ya
**no promete** emitir CFDI, y `P-012` pasó a `FUERA_DE_ALCANCE_V1`. El hueco que D1 mide —entre lo declarado
y lo entregado— se cerró **por el lado de la declaración**. El sistema sigue sin emitir facturas.

**2. La Confianza está a UN punto del umbral de A.** 91.0 contra un mínimo de 90. La baja **la cobertura de
D5, que es 0 %**: la fiabilidad operacional **no está demostrada**. Dos ciclos de pago no son una serie, y
desde PT-180 el instrumento lo dice en vez de inventarse un veredicto. Cualquier pérdida de cobertura tumba
la Clase A.

**3. Cero hallazgos activos no es cero defectos: es cero defectos CONOCIDOS.** Y esta emisión es la **tercera
consecutiva** que lo demuestra: un barrido dirigido encontró tres defectos que **ninguna prueba señalaba**, y
dos llevaban meses en el código. Un `0` en esta columna mide lo que se ha buscado, no lo que hay.

---

## SCORES POR DIMENSIÓN

| Dimensión | S-005 | **S-006** | Penaliza hoy |
|---|---|---|---|
| D1 Alineación de Dominio | 100 | **100** | — |
| D2 Integridad Arquitectónica | 100 | **100** | — |
| D3 Observabilidad y Recuperación | 100 | **100** | — |
| D4 Fidelidad Documental | 100 | **100** | — |

**D5**: `SIN_DATOS` **por muestra insuficiente**, no por ausencia de datos. `health_unstable: false`.
Alucinación y drift `NO_APLICA` (sistema determinista).

---

## LO QUE CERRÓ ESTA CORRIDA

**Tres hallazgos**, y los tres tenían **la misma forma**: un control que aparenta estar puesto. No hay error
que los delate — para verlos hay que leer lo que **afirman** y comprobarlo. Eso es lo que buscó el barrido: no
errores, **afirmaciones**.

| Hallazgo | Dim | Sev | Qué afirmaba | Qué hacía | Cómo se comprobó el cierre |
|---|:--:|:--:|---|---|---|
| **H-029** | D2 | MEDIA | «verifica el captcha» | comprobaba que el token **existiera**; `"x"` pasaba igual que un token legítimo | 7 casos: token basura rechazado, y **el timeout de Google también** |
| **H-030** | D1 | **ALTA** | «Verification email sent» | la llamada de envío estaba **comentada** | **En vivo** contra Mailhog: `1 → 2` correos |
| **H-031** | D2 | MEDIA | una espera de 72 h | reserva `:-0` en el compose: **sin espera** | C7 **visto fallar** con la reserva a 0 |

Todos en **PT-182**, con VoBo humano instruido de antemano.

### H-030 es ALTA, y no por el correo

Es **el camino de recuperación de una cuenta que no se puede activar**. Lo pide exactamente quien no recibió
el correo del registro, y se le dejaba esperando para siempre — con un mensaje que decía «revisa tu bandeja».

La condición del `TODO` que lo justificaba —«when NotificationsModule is ready»— **ya se cumplía**:
`email.service.ts:24` implementa `sendVerificationEmail` y está en uso en el registro. **El comentario
sobrevivió al trabajo que lo resolvía**, que es F-33 otra vez.

Y por eso el cierre se comprobó **contra Mailhog y no contra la respuesta del endpoint**: la respuesta ya
decía «enviado» cuando no enviaba nada. Lo que se afirma es el `1 → 2`.

### H-031 es mío, y de hoy

`docker-compose.yml` fijaba `SETTLEMENT_HOLDBACK_HOURS` con reserva **`:-0`**, así que la espera que protege
al comprador **valía cero** en cualquier despliegue que no declarase la variable: el neto se liberaba al
instante de la confirmación y **nada lo habría dicho** — el cron corre, los asientos cuadran, la espera
simplemente no existe.

Lo introdujo **PT-174** unas horas antes para que la fase 35 de QA no esperase tres días: la conveniencia de
QA puesta donde vive el valor por defecto de producción. **Se registra como hallazgo** en vez de dejarlo en
la prosa de una evidencia, porque **el recuento es lo que se lee**.

Y su guarda **tenía el defecto que venía a vigilar**: contaba `..` a mano para llegar a la raíz, y dentro del
contenedor eso daba `/docker-compose.yml` — fallaba por no encontrar el fichero. Es el modo en que una guarda
se vuelve inútil sin dejar de existir.

### Dos guardas propias se pusieron en rojo, con razón

- **RULE-33** — `RESUMEN.md` y `ESTADO_ACTUAL.md` anunciaban `0` activos con dos hallazgos abiertos.
- **RULE-20** — la carpeta de evidencia de PT-182 existía antes que su entrada en `HISTORY.log`.

Las dos veces **el número lo corrigió el trabajo, no la guarda**. Es exactamente para lo que se escribieron.

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

Suite completa en verde al cerrar: **946 pruebas / 116 suites**.

---

## HALLAZGOS

**Activos: 0.** **Cerrados: 31** — H-001 … H-031.

Ninguno se cerró por inferencia: los técnicos, ejecutando; H-005, por decisión humana fechada y con la
declaración de valor enmendada a la vez.

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
3. **Seguir mirando, y saber ya dónde.** Tres emisiones consecutivas en que un barrido dirigido encuentra
   defectos que ninguna prueba señalaba. Lo que los tres de hoy tienen en común da la pista: **los sitios
   donde el código promete algo** — un nombre que dice «verifica», una respuesta que dice «enviado», una
   variable que declara una espera. Ahí es donde un defecto puede vivir años sin que nada se ponga rojo.
