# PLAN_ACTUAL — STATE 2: Clasificación y Estrategia

**Fecha**: 2026-07-29
**PT en el plan**: **PT-173 · PT-174 · PT-175 · PT-176**
**Origen**: petición del humano de construir la fase de QA que cierra la subasta y llega hasta el retiro.
Al verificar qué existía apareció el defecto de fondo — `DISCOVERY.md § F-172-A…C`.
**Estado**: **esperando ACK. Cero líneas de `src/` tocadas. Ninguna rama abierta.**

> El plan anterior (**PT-168…PT-172**, cerrados con VoBo y fusionados) se conserva en
> `archive/PLAN_ACTUAL-PT-168-172.md`.

---

## Objetivo

**Que la recepción la confirme quien recibe.** Hoy el vendedor marca `DELIVERED` su propio envío y con eso
libera su propio holdback: el control que protege al comprador lo desactiva la parte de la que protege.

De ahí sale todo lo demás — la fase de QA que el humano pidió sólo es construible *de verdad* cuando el
comprador tiene su acción; hasta entonces cualquier suite tendría que **sembrar**, que es lo que hace la
actual y lo que queremos dejar de hacer.

## Clasificación

| PT | Tipo | Complejidad | Qué | Depende de |
|---|---|---|---|---|
| **PT-173** | **BUG** (seguridad/dominio) | STANDARD | El vendedor libera su propio holdback: autorización y guarda de transición | — |
| **PT-174** | **FEATURE** | MAJOR | El comprador confirma recepción; el vendedor declara envío; interfaz en CLIENT | **decisión A/B/C** |
| **PT-175** | **FEATURE** (QA) | STANDARD | Fase `35-cierre-y-liquidacion.js`: cierre → envío → recepción → liberación → retiro, **sin sembrar** | PT-173, PT-174 |
| **PT-176** | **BUG** | TRIVIAL | El click de PayPal: un `div` de su UI tapa `#btnLogin` | — |

**PT-174 es MAJOR** y por eso exige análisis de riesgo y de regresión, y Proposal Package completo:
cambia quién puede hacer qué sobre dinero retenido.

**PT-173 y PT-176 son independientes**: se pueden ejecutar ya, sin esperar la decisión de negocio.

---

## PT-173 — El vendedor deja de poder liberar su propio holdback

**Es un BUG, no parte del FEATURE**, y conviene separarlo: hoy hay una vía por la que un vendedor cobra sin
enviar. Cerrarla no exige decidir nada de negocio.

1. `PATCH /shipments/:id/status` a `DELIVERED` **deja de aceptarse del vendedor** → 403.
2. Se valida la transición `PENDING → SHIPPED → DELIVERED` → 400 al salto.
3. Máquina de estados de envío en `@ironloot/core`, sin NestJS ni Prisma (RULE-02).

**Efecto colateral que hay que decir:** mientras PT-174 no exista, **nadie** podrá marcar `DELIVERED`, así
que la liberación quedará sólo en el vencimiento de `DISPUTE_WINDOW_DAYS`. Es un endurecimiento
deliberado: **preferimos que el dinero espere 14 días a que se libere por una vía que no debería existir.**

Con guarda: una prueba que ejerce el 403 del vendedor y el 400 del salto, con casos de control en los dos
sentidos (RULE-14).

## PT-174 — El comprador confirma la recepción

Todo el detalle en `ENRICHMENT.md`: 16 criterios de aceptación, 12 escenarios, NFRs y fuera de alcance.

**Lo que este plan añade es el orden:** primero API y máquina de estados, después interfaz. La interfaz sin
la autorización sería una pantalla que promete algo que el servicio no garantiza.

**La decisión pendiente**, y no la tomo yo:

| | Cuándo se libera tras la confirmación |
|---|---|
| **A** | Inmediato |
| **B** *(recomendada)* | Timer corto, **72 h** |
| **C** | Inmediato, con reclamación contra saldo futuro o reserva |

**Supuesto declarado y revocable:** si el ACK llega sin elegir, asumo **B con 72 h**, porque
`DISPUTE_WINDOW_DAYS` ya existe y B es un cambio de parámetro, no de modelo.

## PT-175 — La fase que el humano pidió, sin sembrar nada

`tests/qa-browser-suite/35-cierre-y-liquidacion.js`:

1. Subasta con ventana **corta** (minutos, no las 2 h del bootstrap actual) para que el cierre quepa en la
   corrida. **Hoy ya se demostró que el cron cierra solo**: subasta `CLOSED`, pedido 950.00 `PAID`,
   comisión 95.00, vendedor con 855.00 en holdback.
2. El vendedor declara el envío (API real).
3. **El comprador confirma la recepción** (API real) ← el eslabón que hoy no existe.
4. La liberación ocurre según A/B/C; la fase la comprueba en el ledger (`SETTLEMENT_RELEASE`).
5. El vendedor solicita el retiro **de esa ganancia** — no de un saldo sembrado.

**Y se retira el sembrado de `60-withdrawal.js`**, o se declara explícitamente que esa fase prueba el
subsistema aislado mientras la 35 prueba la cadena. Lo segundo es más honesto y más rápido de leer.

**Sobre la espera**, que es lo que el humano quiere evitar: con la recepción confirmada por el comprador, la
espera deja de ser de 14 días. Cuánto queda depende de A/B/C — con **A** son segundos; con **B**, la fase
tendría que **adelantar el vencimiento** por configuración (`DISPUTE_WINDOW_DAYS` corto en el entorno de
QA), no por `UPDATE` a la base. Es la diferencia entre configurar y falsear.

## PT-176 — El click de PayPal

`71-paypal-guaranteed.js:78`. El botón es visible y habilitado, y un `<div class="loginSignUpSeparator">`
de PayPal se le superpone. Opciones, de menos a más frágil: `press('Enter')` sobre el campo, `click({
force: true })`, o descartar el overlay.

**Se arregla y se deja anotado que es un selector contra una UI ajena**, que volverá a romperse. Y **no se
declara verificada la vía garantizada por esto**: ya lo estaba por PT-087, con captura real.

---

## Alternativas consideradas

| Alternativa | Por qué se rechaza |
|---|---|
| **Sólo construir la fase de QA (lo pedido literal)** | Tendría que **sembrar** la entrega o marcarla como el vendedor — es decir, ejercitar el defecto en vez de exponerlo. La fase pasaría en verde sobre un flujo que permite cobrar sin enviar |
| **Meter PT-173 dentro de PT-174** | El BUG se puede cerrar hoy; el FEATURE espera una decisión de negocio. Juntarlos ataría el arreglo de seguridad a una decisión de producto |
| **Liberar al confirmar, sin más (opción A)** | Es un cambio de política de riesgo. Se propone, no se asume |
| **Que la fase de QA fuerce la liberación con `UPDATE` a la BD** | Falsear en vez de configurar. Es lo que hace hoy `60-withdrawal.js` y lo que este plan viene a quitar |
| **Arreglar PayPal con selectores más específicos** | El problema no es la especificidad: es un overlay. Un selector más fino se rompe igual la próxima vez |

---

## Riesgos y análisis de regresión (PT-174 es MAJOR)

| Riesgo | Mitigación |
|---|---|
| **PT-173 deja la liberación sólo al vencimiento** hasta que PT-174 exista | Declarado arriba y aceptado: es preferible a la vía actual. Si el hueco molesta, PT-174 va detrás sin pausa |
| **Un comprador que no confirma retiene el dinero del vendedor** | AC-07: el vencimiento sigue liberando. **Es la mentira simétrica** y está contemplada |
| **La liberación por el camino nuevo se salta el bloqueo de fila** | AC-09 + RULE-24. `releaseSettlement` ya lo hace; la prueba nueva lo exige también por el camino nuevo |
| **Doble liberación** por confirmación repetida o simultánea | `sellerSettledAt` + escenarios 7 y 12 |
| **La interfaz nueva no funciona en silencio** por la CSP | AC-12/AC-13 y las guardas `plantillas-sin-js-inline`, `estilos-fuera-de-plantillas`, RULE-30 |
| **El CLIENT llama a una ruta que no existe** | RULE-11 y `rutas-que-el-client-invoca.spec.ts`, que cubre también el JS de navegador |
| **Romper el retiro que ya funciona** | PT-175 no toca el subsistema de retiro: sólo cambia de dónde viene el dinero |

**Lo que se comprueba antes y después:** suite completa del API (881), CORE (134), CLIENT (103), las 12
guardas de documentación y `test:guardas`.

---

## Criterios de éxito

1. Un vendedor que intenta `DELIVERED` recibe **403**; el salto `PENDING → DELIVERED` recibe **400**.
2. El comprador puede confirmar la recepción por API **y desde CLIENT**, sólo si el envío está `SHIPPED`.
3. La liberación ocurre según la opción elegida, es **idempotente** y deja `SETTLEMENT_RELEASE`.
4. Si el comprador no confirma, el vencimiento libera igual.
5. La fase 35 recorre **cierre → envío → recepción → liberación → retiro sin un solo `INSERT` sembrado**.
6. La fase 71 de PayPal vuelve a pasar.
7. Guardas nuevas **vistas fallar** antes de arreglar, con casos de control en los dos sentidos.
8. `audit:domain` sigue en **14 de 14** y la línea base de silencios sigue en 25.

---

## Lo que este plan NO hace

- **No decide A/B/C.** Es de negocio.
- **No toca `RETURNED`, disputas, transportistas ni correo** (ver `ENRICHMENT.md § fuera de alcance`).
- **No cierra H-025 ni H-026**, que son de la auditoría y van por su cuenta.
- **No emite PTSA.** D1 quedó en 14/14 hoy; el registro se actualizará cuando toque, no aquí.

---

## COMPUERTA — STATE 2

**Esperando ACK.** No se abre rama ni se toca `src/` hasta que llegue, y para PT-174 hace falta además el
Proposal Package aprobado (`changes/PT-174-…/`).

**Lo que necesito de ti, mínimo:** la decisión **A / B / C** — o un «adelante» y aplico **B con 72 h**,
revocable.

**Si quieres avanzar sin decidir todavía**: **PT-173 y PT-176 no dependen de la decisión** y pueden ir ya.
