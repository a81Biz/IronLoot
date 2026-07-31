# ESTADO ACTUAL — PTSA V3
**Última actualización**: 2026-07-30 | **Sesión**: S-011 (delta sync)

---

## Estado del Sistema

```
Sistema:        IronLoot Auction Platform v1.0.0
Fase actual:    CERTIFICADO — Clase A
Health:         100 / 100      cero hallazgos activos
Risk:           0 / 100        Risk_bruto = 0
Confidence:     91.0 / 100     EL DE S-011, con freshness = 100. Ya no es valido: ver abajo
Freshness:      STALE          1 fichero del alcance auditable cambio tras S-011 (PT-200)
audit_commit:   edebe36d114c1cbcf80baf536b0b4b283cfe243a
Cobertura:      PARCIAL        D1/D2/D3/D4 medidas EJECUTANDO · D5 al 0 % — LIMITACIÓN DECLARADA de v1.0
```

> **Frescura corregida el 2026-07-30 (PT-202) — y esta vez la corrige una guarda, no una lectura.**
>
> `S-011` se emitio con `commits_since_audit = 0` y era cierto. Dejo de serlo con **PT-200**, que toco
> `docs/enterprise-documentation/10-Technical-Debt.md` — un fichero de `auditable_patterns`. Medido:
> **1 de 22** ficheros cambiados desde `edebe36` esta en el alcance; los otros 21 son `*.spec.ts`,
> `docs/implementation/**` o `PTSA/**`, todos en `ignore_patterns`. **Ningun codigo de produccion
> cambio.**
>
> **La regla no admite matices y esta bien que no los admita.** `[R29]` dice `STALE` si hay commits
> sobre patrones auditables, sin preguntar si mejoraron el documento — y el cambio de PT-200 lo mejoro:
> declaro el hueco `TD-018…023` y el recuento real. Una regla que dejara al autor decidir si su propio
> cambio cuenta no seria una regla.
>
> **Lo que NO se hace aqui, y es lo que mas importa:** no se recalculan Health, Risk ni Confidence.
> Corregir la frescura es medir commits; reemitir una puntuacion exige un delta sync, y PTSA **solo se
> activa con su disparador explicito**. Inventar el numero seria justo lo que `[A1]` prohibe.
>
> **La consecuencia, dicha en vez de escondida:** `freshness` pesa **0.25** en la Confianza (FRESH = 100,
> STALE = 50), asi que el **91.0** de la tabla se calculo con un insumo que ya no se sostiene. Por `[A8]`
> el score **no es valido** hasta el proximo sync. El «Clase A» es el de S-011, no el de hoy.
>
> **Se restaura con `resume PTSA`** — un sync que vuelva a medir. Es barato: solo cambio un documento.
>
> Y ahora hay `audit_commit`, que es lo que convierte la frase en falsable: sin declarar desde que
> commit se mide, «commits_since_audit = 0» no se puede contradecir. Lo vigila
> `frescura-declarada-es-real.spec.ts`.

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
