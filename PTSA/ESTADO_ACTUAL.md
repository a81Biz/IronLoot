# ESTADO ACTUAL — PTSA V3
**Última actualización**: 2026-07-29 | **Sesión**: S-007 (delta sync)

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

## Los mismos cuatro números por tercera vez, y eso es lo que hay que leer

En cada intervalo entre emisiones ha aparecido trabajo real: tres hallazgos entre S-005 y S-006, **dos más
entre S-006 y S-007** —uno ALTA—, y todos cerrados antes de emitir.

**La estabilidad de este 100 mide que se cierra lo que se encuentra, no que no haya nada que encontrar.**

Y los dos de esta corrida salieron de **comprobar el cierre del hallazgo anterior**. Uno de ellos desmiente
parte de ese cierre: H-030 afirmaba que el reenvío «propaga el fallo», y el `catch` estaba una capa más abajo.
Se comprobó **ejecutando** que el correo salía y se dio por bueno **por lectura** que el fallo se propagaba —
`[A1]` incumplido por el agente. Está anotado en la ficha de H-030; no se reabre, porque lo que reclamaba está
cumplido y verificado.

Los tres avisos siguen vigentes:

**1. El Health llega a 100 en parte porque el alcance se estrechó.** H-005 se cerró **aceptándola como
limitación declarada**, y lo que legitima ese cierre es que la declaración de valor se corrigió a la vez
(`F-1 § U-006`): el producto ya **no promete** emitir CFDI. **El sistema sigue sin emitir facturas.**

**2. La Confianza está a un punto del umbral.** 91.0 contra 90. La baja **D5, que está al 0 %**: la
fiabilidad operacional **no está demostrada** — 2 ciclos de pago no son una serie. Cualquier pérdida de
cobertura tumba la Clase A.

**3. Cero hallazgos activos es cero defectos CONOCIDOS.** Tercera emisión consecutiva en que un barrido
dirigido encuentra defectos que **ninguna prueba señalaba**. Este `0` mide lo que se ha buscado, no lo que hay
— y hoy quedó claro **dónde** buscar: los dos de esta corrida vivían en el **camino de fallo**, que nunca se
había ejecutado. El camino feliz estaba probado; el otro, nunca.

---

## Dimensiones

| Dim | Score | Estado | Penaliza hoy |
|---|---:|---|---|
| D1 Alineación de Dominio | 100 | Estable — H-030 revisada, no reabierta | — |
| D2 Integridad Arquitectónica | 100 | Estable desde S-006 | — |
| D3 Observabilidad y Recuperación | **100** | H-032 (ALTA) y H-033 abiertas y cerradas dentro de esta corrida | — |
| D4 Fidelidad Documental | 100 | Estable | — |
| D5 Fiabilidad Operacional | `SIN_DATOS` | **Por muestra insuficiente**, no por falta de datos | — |

`health_unstable = false`.

---

## Hallazgos activos: 0

**Cerrados: 33** — H-001 … H-033. Ninguno reabierto; **H-030 revisada** (`[A6]`: se anota, no se reescribe).

---

## Los dos que cerró esta corrida (S-007)

| Hallazgo | Dim | Sev | Qué pasaba | Cómo se comprobó el cierre |
|---|:--:|:--:|---|---|
| **H-032** | D3 | **ALTA** | `EmailService` absorbía el fallo, y con él **tres capas de recuperación**: el `catch` del worker, su contador de intentos y los reintentos de BullMQ. Un envío fallido marcaba el trabajo como **completado** | **En vivo** con Mailhog parado: `200 «Verification email sent»` con bandeja vacía → **500 «Connection timeout»** |
| **H-033** | D3 | MEDIA | El transporte no declaraba **ningún tope**: con el SMTP caído, reenvío **y registro** se colgaban **121 s**. Preexistente, tapado por H-032 | Medido: **121 s → ~5 s** |

**Y tres cosas propias que salieron con ellos:**

1. **Una prueba verde sostenía el defecto** — `should not throw when mailerService fails`, dos veces, en el
   mismo fichero que hasta PT-089 exigía la reserva `localhost:5174`. Una prueba puede ser el mecanismo que
   mantiene vivo un defecto.
2. **Los casos de control C4/C5/C6 no supieron fallar hasta la tercera versión.** Las dos primeras pasaban con
   el defecto puesto.
3. **El checkpoint D3 cazó, por tercera vez en la jornada, un `catch` mudo del día**: el del guard de reCAPTCHA
   de PT-182, cuya justificación escrita era **falsa** — un guard recibe sus dependencias por inyección.

Nueva **RULE-36**: *un servicio compartido no decide qué hacen sus llamantes con un fallo.*

Evidencia: `E-036`, `docs/implementation/evidence/PT-183/`. Los tres de S-006 (H-029/H-030/H-031) en `E-034`,
`E-035` y `evidence/PT-182/`.

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
