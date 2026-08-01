# ESTADO ACTUAL — PTSA V3
**Última actualización**: 2026-07-30 | **Sesión**: S-013 (delta sync)

---

## Estado del Sistema

```
Sistema:        IronLoot Auction Platform v1.0.0
Fase actual:    CERTIFICADO — Clase A
Health:         100 / 100      cero hallazgos activos
Risk:           0 / 100        Risk_bruto = 0
Confidence:     91.0 / 100     POR PRIMERA VEZ DERIVADO: 80/100/95/100 — ver el desglose abajo
Freshness:      STALE          la tanda PT-204..PT-233 (FPGE-004) tocó `auditable_patterns`
                               desde 98e445b: src/apps/{base,client}/**, src/admin/**, docker-compose.yml.
                               **La puntuación NO se recalcula aquí** —eso exige un delta sync—: se corrige
                               la afirmación de frescura, que es lo único que se puede saber sin medir.
                               Lo delató `frescura-declarada-es-real.spec.ts` (PT-202), que es para lo que existe.
                               Se restaura con `resume PTSA`.
audit_commit:   98e445b3fe0c099001c58aa62699e410d9d3562a
Cobertura:      PARCIAL        D1/D2/D3/D4 medidas EJECUTANDO · D5 al 0 % — LIMITACIÓN DECLARADA de v1.0
```

> **S-013 — el sync corto que cierra el ciclo, y por qué hizo falta.**
>
> `PT-203` amplió `RULE-31` para cubrir la evidencia de PTSA, y eso toca `11-Conventions.md` — que está
> en `auditable_patterns`. **La consecuencia es la que la regla exige**: el certificado caduca en cuanto
> se toca el contrato, aunque lo que se haya hecho sea reforzarlo. Se resuelve **volviendo a ejecutar**,
> no reetiquetando: los cinco checkpoints, otra vez, sobre `98e445b`.
>
> | Checkpoint | Resultado |
> |---|---|
> | `audit:schema` (D2) | OK |
> | `audit:check` (D2) | OK — sin novedades respecto a la línea base |
> | `audit:observability` (D3) | OK — `silent_failure_count = 24` (base 25) · traza 100 % |
> | `audit:domain` (D1) | `rubric_compliance_score = 100` · 4 de 5 coherencias medidas |
> | `audit:reliability` (D5) | 2 de 20 ciclos · `health_unstable = false` |
>
> **Sin hallazgos nuevos.** Es la primera emisión del día en la que el intervalo no trae ninguno — y el
> intervalo es de un solo PT, que además era la corrección de lo que S-012 dejó sin ejecutar.
>
> **Lo que sí deja escrito:** ampliar el contrato caduca el certificado, y eso **no es un efecto
> secundario molesto**. Un contrato nuevo describe un sistema que aún no se ha vuelto a medir contra él.
> El coste de reemitir es el precio de que la frescura signifique algo.

> **S-012 — delta sync ejecutado el 2026-07-30. Frescura restaurada MIDIENDO, y un hallazgo nuevo.**
>
> `PT-202` dejó el score en `STALE` porque `PT-200` tocó `10-Technical-Debt.md`, del alcance auditable.
> Este sync lo resuelve como debe resolverse: **volviendo a ejecutar los cinco checkpoints**, no
> reescribiendo la etiqueta. Deriva medida sobre `ffbdf14`: **cero** ficheros de `auditable_patterns`.
>
> | Checkpoint | Resultado |
> |---|---|
> | `audit:schema` (D2) | OK — las migraciones reproducen `schema.prisma` |
> | `audit:check` (D2) | OK — 0 paquetes con aviso propio |
> | `audit:observability` (D3) | OK — `silent_failure_count = 24`, línea base 25 · traza 100 % |
> | `audit:domain` (D1) | 8/8 reglas `CR` · `rubric = 100` · 4 de 5 coherencias medidas |
> | `audit:reliability` (D5) | 2 de 20 ciclos · `health_unstable = false` |
>
> **Hallazgo nuevo: `H-037` (D4), cerrado antes de emitir.** Dos hallazgos citaban evidencia que
> **nunca se capturó** — `H-008 → E-011` y `H-036 → E-040`—. No fue un borrado: `[A6]` está intacto; se
> escribió la cita antes que la captura y la captura no llegó. `E-040` se escribe con la salida real y
> se re-verifica ejecutando; `E-011` **no se fabrica**, se declara — reconstruirla hoy sería inventar
> procedencia, que es lo que `[A1]` prohíbe y lo que el propio hallazgo denuncia.
>
> **Y la Confianza se re-derivó desde cero — con un tropiezo mío que vale la pena dejar escrito.**
>
> Al preparar este sync di por hecho que el 91.0 se arrastraba **sin desglose guardado**, y me puse a
> medir los cuatro insumos de nuevo. **Era falso**: `RESUMEN.md` y `F9_Consolidacion.md` lo guardan
> desde **S-005** (`d125f3e`), la emisión donde nació el número. Mi búsqueda pedía `Confidence = ` y el
> artefacto dice `Conf = `. **Buscar la forma en vez de la cosa**, otra vez, y esta vez para concluir
> que faltaba algo que estaba.
>
> Lo que sí tiene valor es lo que salió de haberlo medido igual: **cuatro insumos derivados de forma
> independiente, y coinciden exactamente con los de S-005.** Eso no es redundancia — es la primera
> reproducción del número por una vía distinta:
>
> ```
> coverage           = 80    4 de 5 dimensiones medidas EJECUTANDO; D5 al 0 % (2 de 20 ciclos)
> freshness          = 100   FRESH, cero deriva sobre auditable_patterns desde ffbdf14
> evidence_validity  =  95   38 evidencias declaran validez; 2 citadas estaban MISSING (38/40)
> autonomy           = 100   los cinco checkpoints ejecutados aqui, sin pedir nada al humano
>
> Confidence = 80x0.40 + 100x0.25 + 95x0.20 + 100x0.15 = 32 + 25 + 19 + 15 = 91.0
> ```
>
> **Los cuatro coinciden con los de S-005, medidos hoy sin mirarlos.** `coverage` se derivó de «4 de 5
> dimensiones medidas ejecutando»; `evidence_validity` de contar 38 evidencias válidas contra 2 citadas
> y ausentes (38/40). Que dos caminos independientes den el mismo 91.0 es la mejor noticia de este sync,
> y no habría aparecido sin el error de partida.

> **S-011 — delta sync ejecutado el 2026-07-30, y la frescura vuelve a ser real.**
>
> El sync anterior (S-010) se declaraba `FRESH` con **28 commits y 6 PT** encima; `PT-197` lo corrigió a
> `STALE` sin inventar puntuación, y este sync lo resuelve **midiendo**.
>
> **D1 se midió sobre salida real generada en esta misma sesión** (`run-all.sh`, 209/210 comprobaciones),
> que es lo que el propio checkpoint exige y lo que las cinco emisiones anteriores no pudieron hacer:
> las ocho reglas `CR` en verde con datos delante, `rubric_compliance_score = 100`, y 4 de 5
> comprobaciones de coherencia cruzada medidas.
>
> **D3 falló y se corrigió antes de emitir** → `H-036`, tres `catch` mudos que introdujeron PT-194 y
> PT-196. `silent_failure_count` de **27 a 24**, por debajo de la línea base.
>
> **D5 sigue al 0 %**, y `U-008` corrige **por qué**. La cifra —2 ciclos de 20— no baja porque nadie
> insista: `run-all.sh` **trunca `payment_cycles` antes de cada corrida**, así que la muestra **no puede
> acumularse**. U-007 decía que veinte eran «unas nueve corridas»; nueve corridas dan **dos**.
>
> La decisión no cambia: la única vía real es **volumen de producción**. Lo que se retira es una vía que
> no lleva a ninguna parte, y que habría costado nueve corridas descubrir.

**Regla del Agua Potable: NO activada** — D1 = 100. Se dice porque `[A4]` lo exige.

---

## Esta emisión no trae hallazgos nuevos: trae decisiones

**D5 pasa a ser una limitación declarada de v1.0** (`F-1 § U-007`): el producto **no afirma** que su fiabilidad
operacional esté demostrada. Hacen falta 20 ciclos de pago resueltos, hay 2, y cada uno exige aprobación manual
en la pasarela. **El número no mejora por declararlo** — es lo que hace honesta la declaración, y la diferencia
con H-005, donde la aceptación sí subió D1 porque el producto dejó de prometer la factura.

**H-035 se reabrió y se cerró completa.** Su cierre anterior declaraba que ADMIN, BASE y CLIENT quedaban fuera
«escrito como pendiente». Medido: **seis** reservas, no cuatro — y una **en el propio API**, que la lista corta de
variables de la guarda ocultaba.

**Y `HISTORY.log` decía «pendiente» de 102 entradas cerradas**, lo que hizo reportar PT-147 como pendiente
llevando horas cerrado. Resuelto con un índice generado (PT-187), que en su primera ejecución encontró **cinco
BUG cerrados por el agente sin constancia del VoBo**.

Los tres avisos siguen vigentes:

**1. El Health llega a 100 en parte porque el alcance se estrechó.** H-005 se cerró **aceptándola como
limitación declarada**, y lo que legitima ese cierre es que la declaración de valor se corrigió a la vez
(`F-1 § U-006`): el producto ya **no promete** emitir CFDI. **El sistema sigue sin emitir facturas.**

**2. La Confianza está a un punto del umbral.** 91.0 contra 90. La baja **D5, al 0 %** — y desde esta emisión
eso es una **limitación declarada**, no un pendiente: la fiabilidad operacional **no está demostrada** y se dice.
Cualquier pérdida de cobertura tumba la Clase A.

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

## Lo que cerró esta corrida (S-010)

| Qué | Resultado |
|---|---|
| **H-035** reabierta | **Seis** reservas retiradas —API 1, BASE 3, CLIENT 3—, ADMIN ya estaba limpio. La guarda cubre **los cuatro servicios** |
| **D5** | **Limitación declarada de v1.0** (`F-1 § U-007`). No cambia ningún score: la Confianza sigue en 91.0 |
| **PT-187** | Índice de estado generado al final de `HISTORY.log`. 102 entradas tenían `Status:` obsoleto |

**Las dos reservas más caras eran las del proxy del BFF**: sin `API_URL`, el sitio manda *todas* sus llamadas a
su propio contenedor y **arranca `healthy` sin funcionar**. Ahora `variableObligatoria()` **aborta nombrando la
variable** — comprobado en vivo.

**Y la del API la ocultó la propia guarda**: su lista de variables no incluía `CLIENT_URL`. `E-038` había
declarado esa debilidad textualmente y **se cumplió en la corrida siguiente**. Declarar una debilidad no la
cierra.

**Una reserva se conserva a propósito y se declara**: `public-origins.ts` mantiene el subdominio de desarrollo por
decisión escrita de PT-089. Es discutible —un despliegue que olvide `BASE_URL` mandaría correos a un dominio que
para el usuario no existe— y queda anotado como decisión vista, no como cabo suelto.

Evidencia: `E-039`, `evidence/PT-186/`, `evidence/PT-187/`. Anteriores: `E-034` … `E-038`.

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
| **D5** (Success / Retry / Failure) | **LIMITACIÓN DECLARADA de v1.0** (`F-1 § U-007`). Hacen falta **20 ciclos resueltos** y hay **2**, y cada uno exige aprobación manual en la pasarela. Se reabre con volumen real de producción, sin otra decisión |
| Coherencia P-003 → P-006 | **0 disputas** en la base. La comprobación corre y lo declara: `0 de 0`, `sin filas que comparar` |

**Ninguno de los dos es un defecto del sistema ni de la herramienta.** Son datos que no existen todavía, y
desde H-025 y H-028 los instrumentos **lo dicen** en vez de dar verde.

---

## Siguiente

1. **Volumen de ciclos de pago** — lo único que sube D5 y saca la Confianza del filo de 91.
2. **La decisión fiscal, cuando haya PAC.** Tres modelos medidos en `evidence/PT-155/hallazgos.md`. La C es
   subconjunto de la B; la B exige datos que **no se pueden pedir retroactivamente**.
3. **La pregunta que abrió H-035, aplicada al resto de las reglas:** ¿qué otra `RULE-NN` vigila la parte fácil
   de medir y no la que causó su incidente? Ya ha dado dos hallazgos. No es buscar código sospechoso: es buscar
   **guardas que miran al lado del agujero**.
4. **La lista de variables de conexión es el límite de su guarda, y ya mordió una vez.** Cualquier variable nueva
   que apunte a un servicio hay que añadirla ahí, y **no hay nada que lo recuerde**.

> **Este fichero es un derivado.** Manda `PTSA/Hallazgos/H-XXX.md`. Lo vigila
> `estado-de-hallazgos-coherente.spec.ts` (**RULE-33**), que hoy lo pilló mintiendo.
