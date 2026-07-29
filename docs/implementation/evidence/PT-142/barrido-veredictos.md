# PT-142.1 — El barrido completo, con veredicto para cada sitio

**Fecha**: 2026-07-28
El barrido de `DISCOVERY.md` § Revisión U-001 buscaba a seis líneas de distancia y encontró **cuatro**.
Ampliada la ventana a 25 líneas y añadido `count`, son **nueve**.

## Los nueve, clasificados

Hay **dos clases distintas**, y la consecuencia de la carrera no es la misma:

- **A — creación perezosa**: la fila *debe* existir; si no está, se crea. Una carrera hace fallar una
  operación legítima.
- **B — guarda de regla de negocio**: la fila *no debe* existir; si está, se rechaza. Una carrera
  devuelve **500 en vez de 400**… salvo que no haya restricción única, y entonces **crea un duplicado
  en silencio**, que es mucho peor.

| # | Sitio | Clase | ¿Restricción única? | Qué pasa en una carrera | Veredicto |
|---|---|:--:|:--:|---|---|
| 1 | `system-config.service.ts:191` | A | ✅ `key` | Falla el arranque de la 2ª instancia | **PT-142** |
| 2 | `wallet.service.ts:27` — `getWallet()` | A | ✅ `userId` | Error al crear monedero | **PT-142** |
| 3 | `wallet.service.ts:151` — depósito | A | ✅ | **La acreditación puede fallar** | **PT-142** |
| 4 | `wallet.service.ts:412` — cierre subasta | A | ✅ | El abono al vendedor falla | **PT-142** |
| 5 | `watchlist.service.ts:46` | A | ✅ `[userId,auctionId]` | 500 donde el código promete «Idempotent 200 OK» | **PT-142** |
| 6 | `shipments.service.ts:42` | B | ✅ `orderId` | 500 en vez de 400 | **PT-142** |
| 7 | `payments.service.ts:61` — CLABE | B | ✅ `[userId,referenceId]` | 500 en vez de 400 | **PT-142** |
| 8 | `ratings.service.ts:44` | B | ❌ **sólo índices** | **Dos valoraciones del mismo autor sobre el mismo pedido** | **PT-145** |
| 9 | `account-verification.service.ts:88` | A | ❌ **sólo índices** | **Dos verificaciones, y cada una envía dinero** | **PT-145** |

## Los dos que salen del alcance de PT-142, y por qué

**8 y 9 no tienen restricción de unicidad.** Eso los cambia de naturaleza: no producen un error, producen
**una fila duplicada que nadie ve**. Y corregirlos exige una **migración** de esquema —RULE-10— que
PT-142 no tiene en su alcance aprobado.

### El grave es el 9

```
account-verification.service.ts:88-104
  const enCurso = await this.prisma.accountVerification.findFirst({
    where: { paymentMethodId, status: { in: ['PENDING','SENT'] } },
  });
  if (enCurso) return enCurso;          // <- idempotencia, y es la unica que hay
  ...
  const saldo = await this.wallet.getBalance(userId);   // el importe SALE del vendedor
  ...
  const verificacion = await this.prisma.accountVerification.create({...});
```

`AccountVerification` sólo declara índices (`idx_account_verification_method`,
`idx_account_verification_pending`, `idx_account_verification_user`) — **ninguna restricción única**.

Dos peticiones simultáneas pasan las dos por `if (enCurso)`, y se crean **dos verificaciones**. Cada
verificación **envía dinero** a la cuenta del vendedor, descontado de su saldo. No es un error de
código HTTP: es **un cobro duplicado**.

Es de la familia de lo que `Payment.reference @unique` resuelve para los depósitos — la idempotencia
del asiento contable— aplicado a un flujo que no la tiene.

### El 8

`Rating` tampoco tiene `@@unique([orderId, authorId])`. La frase *«You have already rated this
order»* es la única defensa, y es comprobar-y-actuar. Dos peticiones simultáneas dejan **dos
valoraciones del mismo autor sobre el mismo pedido**, y la reputación es justo lo que un comprador
mira antes de pujar.

## Lo que PT-142 hace con los siete restantes

- **1–5 (clase A, con unicidad)**: `upsert`. La base resuelve la carrera.
- **6–7 (clase B, con unicidad)**: la guarda se queda —el 400 es correcto y es la respuesta útil— y
  el `create` mapea `P2002` al **mismo** `BadRequestException`. Así la carrera da 400, no 500: el
  usuario recibe la misma respuesta corra o no corra otro a la vez.

Ninguno de los siete necesita migración.
