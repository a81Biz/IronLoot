# ENRICHMENT.md — PT-174

**STATE 1-E.** `FEATURE` — El comprador confirma la recepción; el vendedor declara el envío.

**Fecha**: 2026-07-29
**Origen**: petición del humano — *«primero el comprador, el que gana la subasta, debe tener la opción de
marcar "recibida" después de que el vendedor la marca como "enviada" … aquí se puede aclarar la entrega
recepción, quizá falta profundizar»*.
**Hallazgo que lo motiva**: `DISCOVERY.md § F-172-A`.
**Estado**: esperando ACK. **Cero líneas de `src/` tocadas.**

> El enrichment anterior (**PT-156**, `BLOCKED` esperando una decisión de producto) se conserva en
> `archive/ENRICHMENT-PT-156.md`.

---

## El problema, en una frase

**Hoy el vendedor marca `DELIVERED` su propio envío y con eso libera su propio holdback.** El comprador
no tiene ninguna vía —ni endpoint, ni permiso, ni interfaz— para confirmar que recibió.

Verificado: `shipments.service.ts:114` restringe **todo** cambio de estado al vendedor; no hay validación
de transición; `@ironloot/core` no tiene máquina de estados de envío; y `grep` sobre
`src/apps/client/views/` y `public/js/` no devuelve **nada** sobre enviar, recibir o confirmar entrega.

---

## Lo que hay que decidir antes de implementar

Esto es lo que el humano llamó *«quizá falta profundizar»*, y **no es una decisión técnica**. La retención
existe para que, si algo sale mal, el dinero todavía esté ahí. Si la confirmación del comprador libera al
instante, el dinero se va **antes** de que la ventana de disputa haya corrido.

| | Cuándo se libera | A favor | En contra |
|---|---|---|---|
| **A** | **Inmediato** al confirmar el comprador | El vendedor cobra en minutos; es lo que pide «no esperar tantos minutos» | **Una disputa posterior no tiene fondos que reclamar.** La ventana de 14 días queda decorativa |
| **B** | **Timer corto** (48–72 h) desde la confirmación | El vendedor cobra en días, no semanas, y queda margen para reclamar | Hay que elegir el número, y sigue siendo una espera |
| **C** | Inmediato, con la disputa reclamando contra **saldo futuro** o una reserva de plataforma | Rápido **y** protegido | El más costoso: exige saldo negativo o una reserva, que hoy no existen |

**Recomendación: B con 72 h**, por una razón concreta de este repositorio: `DISPUTE_WINDOW_DAYS` ya existe
y se lee del entorno, así que **B es un cambio de parámetro y de disparador, no de modelo**. A es un cambio
de política de riesgo disfrazado de mejora de UX. C exige un modelo de saldo que no está.

### Las dos mentiras, que no son simétricas

El humano lo dijo así: *«la regla de espera … para asegurar que no mienta el vendedor al enviar ni el
comprador al recibir»*. Son dos riesgos distintos y **hoy sólo uno está contemplado**:

- **El vendedor miente al enviar** → hoy es posible y **sin coste**: marca `DELIVERED` sin enviar nada y
  cobra. Es F-172-A.
- **El comprador miente al recibir** → hoy **no puede**, porque no tiene la acción. Cuando la tenga, la
  mentira útil para él es **negar** la recepción, que retendría el dinero del vendedor. **Eso exige un
  vencimiento**: si no confirma ni disputa en N días, se libera igual.

`DISPUTE_WINDOW_DAYS` ya cumple ese papel de vencimiento, pero **hoy es un efecto lateral, no una regla
declarada**. Este PT la declara.

---

## Criterios de aceptación

**Autorización y máquina de estados**

- **AC-01** — el paso a `SHIPPED` sólo lo puede hacer **el vendedor** del pedido.
- **AC-02** — el paso a `DELIVERED` sólo lo puede hacer **el comprador**. El vendedor recibe **403** con
  un mensaje que dice por qué. *(Hoy devuelve 200: es el defecto.)*
- **AC-03** — la transición se valida `PENDING → SHIPPED → DELIVERED`. El salto de `PENDING` a
  `DELIVERED` se rechaza con **400**. *(Hoy se acepta.)*
- **AC-04** — la máquina de estados vive en `@ironloot/core`, sin NestJS ni Prisma, como la de subastas
  (RULE-02).
- **AC-05** — la autorización se comprueba **en el servicio**, no sólo en el controlador.

**Liberación del holdback**

- **AC-06** — la confirmación del comprador dispara la liberación según la opción elegida (A/B/C).
- **AC-07** — **el vencimiento sigue existiendo**: si el comprador no confirma, `DISPUTE_WINDOW_DAYS`
  libera igual. Un comprador que calla no puede retener el dinero indefinidamente.
- **AC-08** — la liberación es **idempotente**: `sellerSettledAt` impide una segunda del mismo pedido.
- **AC-09** — el camino nuevo **no se salta RULE-24**: lee bloqueando la fila, y con orden fijo si toca
  dos monederos.

**Interfaz (CLIENT)**

- **AC-10** — el vendedor tiene un control para declarar el envío, con transportista y guía.
- **AC-11** — el comprador tiene un control para confirmar la recepción, **visible sólo cuando el envío
  está `SHIPPED`**.
- **AC-12** — el JS va en `public/js/` y los estilos al CSS del sitio: la CSP no lleva `'unsafe-inline'`,
  así que un `onclick=` o un `style=` **no funcionaría y el navegador no diría nada** (RULE-07, RULE-09).
- **AC-13** — confirmar la recepción tiene consecuencia económica: lleva confirmación previa, y ese
  `confirm()` **debe estar registrado** (RULE-30 — es el defecto que dejó veinticuatro manejadores muertos
  en ADMIN).
- **AC-14** — toda ruta que el CLIENT invoque existe en el API (RULE-11).

**Trazabilidad**

- **AC-15** — envío y recepción quedan en `audit_events` vía `@AuditedAction`, con quién y cuándo.
- **AC-16** — `shippedAt` y `deliveredAt` se sellan en el momento real de cada transición.

---

## Escenarios de prueba

**Camino feliz**

1. Vendedor declara envío → `SHIPPED`, `shippedAt` sellado, pedido `SHIPPED`, aviso al comprador.
2. Comprador confirma recepción → `DELIVERED`, `deliveredAt` sellado, pedido `DELIVERED`.
3. Liberación según la opción elegida → `pending_balance` → `balance` con asiento `SETTLEMENT_RELEASE`.
4. Vendedor solicita el retiro de esa ganancia → reserva real, aprobación admin, `PAID`.

**Casos límite**

5. **El vendedor intenta `DELIVERED`** → **403**. Hoy: 200. *Es el caso que prueba que el defecto murió.*
6. **Salto `PENDING` → `DELIVERED`** → **400**. Hoy: se acepta.
7. **El comprador confirma dos veces** → una sola liberación.
8. **Un tercero** intenta cualquiera de las dos → 403.
9. **El comprador nunca confirma** → a los `DISPUTE_WINDOW_DAYS` se libera igual.
10. **Disputa abierta antes de liberar** → con B, el timer no libera mientras la disputa esté abierta.

**Fallo**

11. Envío inexistente o pedido no `PAID` → 400, como ya hace `create()`.
12. **Dos confirmaciones simultáneas** → una sola liberación y un solo asiento (RULE-24).

---

## NFRs

- **Concurrencia** — la liberación mueve saldo: `SELECT … FOR UPDATE`, orden fijo de bloqueo (RULE-24).
- **Idempotencia** — `sellerSettledAt` como clave; una confirmación repetida no duplica el asiento.
- **Observabilidad** — sin `catch` mudos. La línea base de silencios es **25** y no debe subir (D3).
- **Rendimiento** — sin consultas nuevas en el camino de la puja ni del pago.

---

## Fuera de alcance, explícito

- **`RETURNED` y las devoluciones.** El enum lo tiene y nada lo usa; abrirlo arrastra reembolsos y
  logística.
- **La resolución de disputas.** Resolver y reembolsar son dos pasos por decisión ya tomada; este PT no
  los une.
- **Integración con transportistas.** Transportista y guía se capturan como texto; no se consulta ninguna
  API de tracking.
- **Notificaciones por correo.** El aviso in-app entra; el correo no.
- **La opción C.** Exige un modelo de saldo (negativo o reserva) que no existe.
- **El retiro en sí.** Ya está implementado y probado real (PT-069…072); este PT sólo hace que el dinero
  **llegue** a ser retirable por el camino verdadero.

---

## Confianza

- Architecture Confidence: **90 %** — el modelo (`Shipment`, `Order`, `sellerSettledAt`,
  `releaseSettlement`) ya existe; faltan autorización, transición e interfaz.
- Implementation Confidence: **70 %**, y lo que falta **no es técnico**: es la decisión A/B/C. Con ella
  tomada, **90 %**.

**Esto es una pregunta, no una suposición.** Si el ACK llega sin elegir, asumo **B con 72 h**, lo dejo
escrito en `PLAN_ACTUAL.md` y se puede revocar.
