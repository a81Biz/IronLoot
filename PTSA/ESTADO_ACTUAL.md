# ESTADO ACTUAL — PTSA V3
**Última actualización**: 2026-07-29 | **Sesión**: S-006 (delta sync)

---

## Estado del Sistema

```
Sistema:        IronLoot Auction Platform v1.0.0
Fase actual:    CERTIFICADO — Clase A
Health:         100 / 100      cero hallazgos activos
Risk:           0 / 100        Risk_bruto = 0
Confidence:     91.0 / 100     A UN PUNTO del umbral de A — la baja D5 al 0 %
Freshness:      FRESH          medido el 2026-07-29, commits_since_audit = 0
Cobertura:      PARCIAL        D1/D2/D3/D4 al 100 % · D5 al 0 % (muestra insuficiente)
```

**Regla del Agua Potable: NO activada** — D1 = 100. Se dice porque `[A4]` lo exige.

---

## Los scores son idénticos a S-005, y eso es lo que hay que leer

Entre las dos emisiones aparecieron **tres hallazgos más** —uno ALTA en D1—, se corrigieron y se cerraron. El
número no se movió.

**Un 100 estable no significa que no haya pasado nada.** Significa que lo que se encontró se cerró antes de
emitir. Los tres avisos siguen vigentes:

**1. El Health llega a 100 en parte porque el alcance se estrechó.** H-005 se cerró **aceptándola como
limitación declarada**, y lo que legitima ese cierre es que la declaración de valor se corrigió a la vez
(`F-1 § U-006`): el producto ya **no promete** emitir CFDI. **El sistema sigue sin emitir facturas.**

**2. La Confianza está a un punto del umbral.** 91.0 contra 90. La baja **D5, que está al 0 %**: la
fiabilidad operacional **no está demostrada** — 2 ciclos de pago no son una serie. Cualquier pérdida de
cobertura tumba la Clase A.

**3. Cero hallazgos activos es cero defectos CONOCIDOS.** Y esta emisión lo demuestra por tercera vez
consecutiva: un barrido dirigido encontró tres defectos que **ninguna prueba señalaba**, dos de ellos con
meses en el código. Este `0` mide lo que se ha buscado, no lo que hay.

---

## Dimensiones

| Dim | Score | Estado | Penaliza hoy |
|---|---:|---|---|
| D1 Alineación de Dominio | **100** | H-030 (ALTA) abierta y cerrada dentro de esta corrida | — |
| D2 Integridad Arquitectónica | **100** | H-029 y H-031 abiertas y cerradas dentro de esta corrida | — |
| D3 Observabilidad y Recuperación | 100 | Estable desde S-005 | — |
| D4 Fidelidad Documental | 100 | Estable | — |
| D5 Fiabilidad Operacional | `SIN_DATOS` | **Por muestra insuficiente**, no por falta de datos | — |

`health_unstable = false`.

---

## Hallazgos activos: 0

**Cerrados: 31** — H-001 … H-031. Ninguno reabierto.

---

## Los tres que cerró esta corrida

Los tres tenían **la misma forma**: un control que aparenta estar puesto. No hay error que los delate — para
verlos hay que leer lo que **afirman** y comprobarlo.

| Hallazgo | Dim | Sev | Qué afirmaba | Qué hacía | Cómo se comprobó el cierre |
|---|:--:|:--:|---|---|---|
| **H-029** | D2 | MEDIA | «verifica el captcha» | comprobaba que el token **existiera** | 7 casos: token basura rechazado, y **timeout de Google también** |
| **H-030** | D1 | ALTA | «Verification email sent» | la llamada estaba **comentada** | **En vivo**: Mailhog `1 → 2` correos |
| **H-031** | D2 | MEDIA | una espera de 72 h | reserva `:-0`: **sin espera** | C7 **visto fallar** con la reserva a 0 |

**H-030 es ALTA** porque es el camino de recuperación de una cuenta que no se puede activar: lo pide justamente
quien no recibió el correo del registro, y se le dejaba esperando para siempre.

**H-031 es mío y de hoy** — lo introdujo PT-174 unas horas antes, poniendo la conveniencia de QA donde vive el
valor por defecto de producción. Se registra igual: esconderlo en la prosa de una evidencia lo dejaría fuera
del recuento.

Evidencia: `E-034` (los defectos), `E-035` (los cierres), `docs/implementation/evidence/PT-182/`.

---

## Dos guardas propias se pusieron en rojo, con razón

- **RULE-33** — `RESUMEN.md` y este fichero anunciaban `0` activos con dos hallazgos abiertos en el registro.
- **RULE-20** — la carpeta de evidencia de PT-182 existía antes que su entrada en `HISTORY.log`.

Las dos veces **el número lo corrigió el trabajo, no la guarda**. Es para lo que se escribieron.

---

## Productos: 12

`VALIDADO` **11** · `FUERA_DE_ALCANCE_V1` **1** (`P-012 CfdiRecord`).

`P-012` **no pasa a `VALIDADO`**: el producto no se genera. Sale del inventario de v1.0 con su motivo escrito
y su **reapertura declarada** — si v1.1 vuelve a prometer la factura, vuelve y H-005 se reabre con él. `[A6]`:
no se degrada ni se borra.

---

## Qué falta medir, y por qué

| Qué | Bloqueo |
|---|---|
| **D5** (Success / Retry / Failure) | **Volumen**: hacen falta **20 ciclos resueltos** y hay **2**. Los umbrales (`>= 95 %` verde) no pueden expresar «bien» por debajo de veinte |
| Coherencia P-003 → P-006 | **0 disputas** en la base. La comprobación corre y lo declara: `0 de 0`, `sin filas que comparar` |

**Ninguno de los dos es un defecto del sistema ni de la herramienta.** Son datos que no existen todavía, y
desde H-025 y H-028 los instrumentos **lo dicen** en vez de dar verde.

---

## Siguiente

1. **Volumen de ciclos de pago** — lo único que sube D5 y saca la Confianza del filo de 91.
2. **La decisión fiscal, cuando haya PAC.** Tres modelos medidos en `evidence/PT-155/hallazgos.md`. La C es
   subconjunto de la B; la B exige datos que **no se pueden pedir retroactivamente**.
3. **Seguir mirando, y mirar afirmaciones.** Tres emisiones seguidas en que un barrido dirigido encuentra
   defectos que ninguna prueba señalaba. Lo que los tres de hoy tienen en común da la pista de dónde buscar:
   **sitios donde el código promete algo** — un nombre que dice «verifica», una respuesta que dice «enviado»,
   una variable que declara una espera.

> **Este fichero es un derivado.** Manda `PTSA/Hallazgos/H-XXX.md`. Lo vigila
> `estado-de-hallazgos-coherente.spec.ts` (**RULE-33**), que hoy lo pilló mintiendo.
