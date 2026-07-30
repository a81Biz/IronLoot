# ESTADO ACTUAL — PTSA V3
**Última actualización**: 2026-07-29 | **Sesión**: S-008 (delta sync)

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

## Los mismos cuatro números por CUARTA vez, y eso es lo que hay que leer

En cada intervalo entre emisiones ha aparecido trabajo real: tres hallazgos entre S-005 y S-006, dos entre S-006
y S-007 —uno ALTA—, **uno entre S-007 y S-008**. Seis defectos reales, todos cerrados antes de emitir, y los
cuatro números sin moverse.

**La estabilidad de este 100 mide que se cierra lo que se encuentra, no que no haya nada que encontrar.**

Y el de esta corrida **lo encontró la recomendación de la anterior**: S-007 dijo que los candidatos siguientes
eran los otros terceros —la pasarela de pago, Redis, el almacenamiento—, y **el primero de la lista tenía el
defecto**. No es mérito del barrido: es la señal de que el patrón se repite.

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
| D3 Observabilidad y Recuperación | **100** | H-034 abierta y cerrada dentro de esta corrida (y H-032/H-033 en la anterior) | — |
| D4 Fidelidad Documental | 100 | Estable | — |
| D5 Fiabilidad Operacional | `SIN_DATOS` | **Por muestra insuficiente**, no por falta de datos | — |

`health_unstable = false`.

---

## Hallazgos activos: 0

**Cerrados: 34** — H-001 … H-034. Ninguno reabierto; **H-030 revisada** (`[A6]`: se anota, no se reescribe).

---

## Lo que cerró esta corrida (S-008)

| Hallazgo | Dim | Sev | Qué pasaba | Cierre |
|---|:--:|:--:|---|---|
| **H-034** | D3 | MEDIA | Las **seis** llamadas de los tres adaptadores de pasarela usaban `fetch` **sin ningún tope**, y no había un `AbortController` en todo el directorio. El patrón de H-033 en el camino del dinero | `gateway-timeouts.ts`: **8 s** consultar · **20 s** operar. 7 casos, con **C1 y C2 vistos fallar** |

**MEDIA y no ALTA, y el motivo se dice:** por diseño de PT-087 ningún pago cobrado queda sin acreditar —vía
garantizada, reapertura del ciclo, asiento idempotente—, así que **el dinero no se pierde por esto**. Lo que se
degrada es el tiempo de respuesta y la ocupación de recursos.

**Lo que NO se afirma:** no se ha observado una llamada colgada contra una pasarela real. A diferencia de H-033
—donde los 121 s **se midieron**— aquí el defecto se comprobó **leyendo** y la consecuencia se infiere. `[A1]`.

**Y once capturas que no son hallazgo:** el barrido encontró 11 `catch` sin `throw` ni registro, todos
**declarados** en la línea base de D3 con motivo escrito. Once capturas sin `throw` suenan a once defectos y son
once decisiones — **la diferencia la hace el motivo escrito**, que es justo lo que faltaba en H-032, donde la
captura tenía una pregunta sin responder en vez de una razón.

**Mis dos casos de control no supieron fallar a la primera** (segunda vez en dos PT): C2 se contentaba con que el
fichero contuviera una cadena —bastaba el `import`— y C1 acusaba una llamada ya corregida por recortar una ventana
fija.

Evidencia: `E-037`, `evidence/PT-184/`. Las corridas anteriores: H-032/H-033 en `E-036` y `evidence/PT-183/`;
H-029/H-030/H-031 en `E-034`, `E-035` y `evidence/PT-182/`.

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
3. **Terminar la lista de terceros: quedan Redis y el almacenamiento de ficheros.** La pasarela era el primero
   y tenía el defecto. Con Redis, además, el fallo se puede **medir**: se para en desarrollo, como ya se hizo en
   PT-178. Es lo que separó a H-033 (medido) de H-034 (leído).
4. **Y seguir mirando dónde el código promete algo**: un nombre que dice «verifica», una respuesta que dice
   «enviado», una variable que declara una espera, **una prueba que dice «no lanza»**.

> **Este fichero es un derivado.** Manda `PTSA/Hallazgos/H-XXX.md`. Lo vigila
> `estado-de-hallazgos-coherente.spec.ts` (**RULE-33**), que hoy lo pilló mintiendo.
