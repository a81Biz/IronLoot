# HANDOFF — estado actual

**FDGE V3** · **2026-07-30** · Se **sobrescribe**: es el estado de ahora, no la historia. La historia
está en [`HISTORY.log`](HISTORY.log), que es append-only y la tiene íntegra con su fecha.

**Rama**: `master`. PT-200 y PT-201 fusionados y **en espera de tu validación** — son BUG, y el agente no
los cierra.

**Pruebas**: **1385** unitarias en verde — API **1132** (138 suites) · CLIENT **144** (12) · CORE **93** (6) ·
ADMIN **13** (2) · BASE **3** (1). *(Medido el 2026-07-30. Sube de 1366 a 1385 por las 19 pruebas que
aportan las guardas de PT-200 y PT-201, no por trabajo de producto.)*

**Reglas duras**: **36** `RULE-NN`. **Guardas de documentación**: **19** suites.

**Hallazgos PTSA**: **36** registrados, **0** activos. **Deuda técnica**: **2** abiertas de **19** registradas.

**Estado de cada PT**: el **ÍNDICE DE ESTADO** al final de [`HISTORY.log`](HISTORY.log) — generado con
`npm run indice:estado`. **153 encabezados · 2 realmente abiertos** (PT-200, PT-201).

> **Estas siete cifras están vigiladas** por `handoff-es-estado-actual.spec.ts`, salvo el recuento de
> pruebas: verificarlo exigiría ejecutar las cinco suites dentro de una prueba. Se dice porque *lo que no
> se cita, no se protege* — esa cifra la sostiene una corrida manual, no un automatismo.

---

## Estado: CERTIFICADO Clase A · cero hallazgos PTSA activos

**S-011 emitido el 2026-07-30** (delta sync). `freshness = FRESH`, `commits_since_audit = 0`.

| Métrica | Valor |
|---|---|
| Health | **100 / 100** |
| Risk | **0 / 100** |
| Confidence | **91.0** |
| Clase | **A** |

Es el primer sync que mide **D1 con salida real generada en la misma sesión** —`run-all.sh` (209/210) y
`audit:domain` acto seguido: 8/8 reglas `CR` con datos delante, `rubric = 100`—. Las cinco emisiones
anteriores arrastraban `SIN_DATOS`.

### Tres avisos que forman parte del resultado, no lo adornan

**1. El Health llega a 100 en parte porque el alcance se estrechó.** `H-005` se cerró **aceptándola como
limitación declarada**, y lo que legitima el cierre es que la declaración de valor se corrigió a la vez
(`F-1 § U-006`): el producto ya **no promete** emitir CFDI, y `P-012` pasó a `FUERA_DE_ALCANCE_V1`. **El
sistema sigue sin emitir facturas.** Si v1.1 vuelve a prometerla, ese producto vuelve y `H-005` se reabre.

**2. La Confianza está a UN punto del umbral de A** (91 contra 90). La baja **D5, al 0 %**: hacen falta
**20 ciclos de pago resueltos** y hay **2**. Cualquier pérdida de cobertura tumba la Clase A.

**3. Cero hallazgos activos es cero defectos CONOCIDOS.** Cada emisión reciente encontró trabajo real —
**3 · 2 · 1 · 1 · 1**— y los cuatro números no se movieron. **La estabilidad de este 100 mide que se
cierra lo que se encuentra, no que no haya nada que encontrar.**

---

## Esperando tu validación: PT-200 y PT-201

**Es un BUG, y el agente no cierra bugs** (FDGE STATE 6 · RULE-37). Lo corregido:

| Dónde | Decía | Es |
|---|---|---|
| `HANDOFF.md` | nueve cifras — suites, guardas, encabezados, hallazgos, veredictos, deuda | medidas y corregidas; ahora **vigiladas** |
| `Master-Test-Plan.md` | Comisiones **0 tests** · Reembolsos **0 tests** | **11** y **5**, en 3 suites — *las que el registro cita al cerrar `AUD-013`* |
| `Master-Test-Plan.md` | core 8/134 · api 121/985 | **6/93** · **138/1130** |
| `docs-v2/README.md` | «Hoy (2026-07-29): 1078 unitarias» | **1383** |
| `10-Technical-Debt.md` | — | hueco `TD-018…023` declarado; **19 entradas, 2 abiertas** |
| `tsconfig.json` (raíz) | ausente desde `004f5dc` | restituido: sin él `npm run indice:estado` **no arrancaba** |
| `inventory/integrations.md` (PT-201) | 4 «Interface» en un directorio **retirado por PT-193** | 1 movida, y **3 declaradas inexistentes** — se retiraron por no tener implementador |
| `inventory/integrations.md` (PT-201) | almacén del rate limiter «TBD, see TD-002» | `ND-002`, **cerrada por PT-171**: existe desde PT-030 |

**Lo que enseña, y no es sobre estos documentos.** `HANDOFF.md` era el **único** registro de la tabla
*«Dónde vive un pendiente»* sin guarda, y el que más se lee: es el primer fichero que abre quien retoma el
trabajo. Le decía que tres inventarios no eran enumerables (lo son y tienen guarda desde PT-198), que
quedaban quince hallazgos por medir (cero) y que la deuda tenía 24 entradas (19).

**Ninguna de esas frases se escribió falsa. Se volvieron falsas al quedarse** — que es la diferencia entre
un documento que se sobrescribe y uno que se acumula.

---

## Deuda técnica y limitaciones vivas

| | Qué falta | Por qué no se cierra aquí |
|---|---|---|
| **TD-002** | Credenciales de Stripe y HeyBanco | El código está y se prueba (`provider-guarantees.spec`); falta el **acceso al tercero** |
| **TD-009** | Un 4xx en firma inválida no garantiza que la pasarela deje de reintentar | Riesgo aceptado por PT-080 |
| **H-005 / P-012** | Emisión de CFDI | Exige un **PAC certificado ante el SAT** y una decisión fiscal. Fuera de alcance de v1.0 por `F-1 § U-006` |
| **D5 al 0 %** | 18 ciclos de pago resueltos más | Ver abajo — **no lo cierra ninguna corrida de QA** |

---

## Siguiente

1. **Validar PT-200**, o decir qué corregir.
2. **Volumen de ciclos de pago.** Es lo único que sube D5 del 0 % y saca la Confianza del filo de 91.
   `U-008` corrigió el 2026-07-30 la vía que `U-007` había declarado: **no son «unas nueve corridas»** de
   `run-all.sh`, porque el script **trunca `payment_cycles` antes de cada corrida** (`run-all.sh:37-38`) —
   nueve corridas dan dos ciclos, que es la cifra que llevan cinco emisiones. La única vía real es
   **tráfico de producción**. Fabricarlos sin pasar por la pasarela mediría nuestro código, no la
   fiabilidad de las pasarelas.
3. **H-005**: cuando haya PAC. Los tres modelos están medidos en `evidence/PT-155/hallazgos.md`; la
   opción C es subconjunto de la B, y la B exige datos que **no se pueden pedir retroactivamente**.
4. **La pregunta que abrió `H-035`, aplicada al resto de las reglas:** ¿qué otra `RULE-NN` vigila la parte
   fácil de medir y no la que causó su incidente? Ya ha dado tres hallazgos, el último hoy — la guarda de
   RULE-38 comprobaba **que hubiera** un veredicto en vez de **que fuera el del registro**. No es buscar
   código sospechoso: es buscar **guardas que miran al lado del agujero**.
5. **La lista de variables de conexión es el límite de su guarda, y ya mordió una vez.** Cualquier
   variable nueva que apunte a un servicio hay que añadirla ahí, y **no hay nada que lo recuerde**.
6. **Seguir mirando dónde el código o un documento prometen algo**: un nombre que dice «verifica», una
   respuesta que dice «enviado», una variable que declara una espera, una prueba que dice «no lanza», y
   —lo de hoy— **una fila que dice «0 tests»**.
