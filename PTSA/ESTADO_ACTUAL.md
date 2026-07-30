# ESTADO ACTUAL — PTSA V3
**Última actualización**: 2026-07-29 | **Sesión**: S-009 (delta sync)

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

## Los mismos cuatro números por QUINTA vez, y eso es lo que hay que leer

Cuatro intervalos entre emisiones, y en cada uno apareció trabajo real: **3 · 2 · 1 · 1**. Siete defectos, todos
cerrados antes de emitir, y los cuatro números sin moverse.

**La estabilidad de este 100 mide que se cierra lo que se encuentra, no que no haya nada que encontrar.**

Y **cada hallazgo lo encontró el cierre del anterior**: H-032/H-033 al comprobar H-030, H-034 con la recomendación
de S-007, **H-035 con la lista que dejó S-008**. No es una racha, es una cadena — el sitio donde buscar lo dijo el
trabajo previo, no una intuición.

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
| D2 Integridad Arquitectónica | **100** | H-035 abierta y cerrada dentro de esta corrida | — |
| D3 Observabilidad y Recuperación | 100 | Estable — H-032/H-033/H-034 cerradas en las corridas previas | — |
| D4 Fidelidad Documental | 100 | Estable | — |
| D5 Fiabilidad Operacional | `SIN_DATOS` | **Por muestra insuficiente**, no por falta de datos | — |

`health_unstable = false`.

---

## Hallazgos activos: 0

**Cerrados: 35** — H-001 … H-035. Ninguno reabierto; **H-030 revisada** (`[A6]`: se anota, no se reescribe).

---

## Lo que cerró esta corrida (S-009), y la lista de terceros queda cerrada

| Hallazgo | Dim | Sev | Qué pasaba | Cierre |
|---|:--:|:--:|---|---|
| **H-035** | D2 | MEDIA | `distributed-lock.service.ts:12` leía `process.env.REDIS_URL \|\| 'redis://localhost:6379'` — **la reserva que RULE-17 prohíbe**, sobreviviendo a PT-137 y PT-147 | URL por inyección + **guarda nueva** para la mitad de RULE-17 que no la tenía. **Vista acusar al fichero correcto, y sólo a ése** |

**Lo que vale no es el defecto: es su causa.** La guarda de RULE-17 comprueba que las variables estén
**declaradas**; el texto de la regla dice, en negrita, *«the fallback was the problem, not the variable»* — y esa
mitad no la comprobaba nadie. Se vigiló lo fácil de medir y quedó sin vigilar lo que causó el incidente del que
nació la regla. **Había una guarda con el nombre correcto mirando otra cosa**, como en H-031.

**Los otros dos terceros de la lista:**

- **El almacenamiento**: se miró y **no aplica**. `writeFile` local, sin servicio remoto en v1.0. «Queda por
  mirar» y «se miró y no aplica» son estados distintos.
- **Redis**: el defecto **no era el que se fue a buscar**. Se buscaba un tope —ioredis trae los suyos— y apareció
  la reserva. Buscar una cosa y encontrar otra sólo pasa si se mira de verdad.

**Lo que NO se afirma:** el fallo no se ha observado (el compose declara `REDIS_URL`, así que la reserva no se
usaba). Y la guarda **sólo cubre el API**: ADMIN, BASE y CLIENT quedan fuera, y ADMIN tuvo este mismo defecto en
PT-147.

Evidencia: `E-038`, `evidence/PT-185/`. Anteriores: H-034 en `E-037`; H-032/H-033 en `E-036`; H-029/H-030/H-031 en
`E-034` y `E-035`.

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
3. **Llevar la guarda de reservas a ADMIN, BASE y CLIENT.** Hoy mira sólo `src/api/src`, y **ADMIN tuvo
   exactamente este defecto en PT-147**. Es el pendiente más concreto que deja la jornada.
4. **La pregunta que abrió H-035, aplicada al resto de las reglas:** ¿qué otra `RULE-NN` vigila la parte fácil de
   medir y no la que causó su incidente? Es la forma más productiva que ha aparecido hoy: no buscar código
   sospechoso, sino **guardas que miran al lado del agujero**.

> **Este fichero es un derivado.** Manda `PTSA/Hallazgos/H-XXX.md`. Lo vigila
> `estado-de-hallazgos-coherente.spec.ts` (**RULE-33**), que hoy lo pilló mintiendo.
