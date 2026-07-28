# PT-142 — Cambios de especificación

## Los cuatro sitios

| Fichero | Antes | Después |
|---|---|---|
| `system-config.service.ts:191-203` | `findUnique` → `if (!existing)` → `create` | `upsert({ where: {key}, create: {...}, update: {} })` |
| `wallet.service.ts:27-33` — `getWallet()` | `findUnique` → `if (wallet) return` → `create` | `upsert` |
| `wallet.service.ts:151-152` — depósito | `findUnique ?? create`, sobre `tx` | `tx.wallet.upsert(...)` — **sigue sobre `tx`** |
| `wallet.service.ts:412-415` — cierre | `findUnique` → `if (!sellerWallet)` → `create`, sobre `tx` | `tx.wallet.upsert(...)` |

**Los dos de dentro de la transacción siguen dentro.** Sacarlos rompería la atomicidad del asiento,
que es lo que PT-087 construyó: *o se crea y acredita, o no ocurre ninguna de las dos*.

**`update: {}` en los cuatro.** Es creación perezosa, no sincronización: si la fila existe, no se
toca. En `system-config` importa de más — un arranque no debe pisar la configuración que otro dejó.

## Lo que NO cambia

- **`Payment.reference` sigue siendo única** y sigue siendo la garantía contra el asiento duplicado.
- **Ningún nivel de aislamiento** de transacción.
- **Ningún contrato de API**, ningún dato, ninguna migración.
- **`schema.prisma:761`** (`userId @unique` en `Wallet`) se queda: **es lo que hace visible la
  carrera**. Sin esa restricción no habría error — habría dos monederos para el mismo usuario y un
  saldo que depende de cuál lea cada consulta.

## Fichero nuevo

`src/api/test/unit/persistencia/creacion-perezosa-atomica.spec.ts` — la guarda de RULE-22.

## Nueva regla de convenciones

`11-Conventions.md` — **RULE-22**:

> **Una fila con restricción de unicidad no se crea con `findX` + `create`.**
> Entre la lectura y la escritura cabe otro proceso. Este repositorio tenía **cuatro** sitios así, y
> **tres estaban en el camino del dinero**: la creación perezosa del monedero en `getWallet()`, en el
> asiento de un depósito y en el abono al vendedor al cerrar una subasta (PT-142).
> **Estar dentro de una transacción no basta**: Prisma usa *read committed*, y dos transacciones
> pueden leer las dos la ausencia de la misma fila. La transacción da atomicidad sobre lo que
> escribe, no exclusión sobre algo que aún no existe.
> Ninguno se había visto nunca porque hacen falta concurrencia **y** una base sin la fila creada, y en
> desarrollo no se da ninguna de las dos: una sola instancia, y una base con historia donde la rama
> del `create` no llega a ejecutarse. Lo destapó la primera corrida de CI, contra una base vacía y con
> Jest en paralelo — la lección de PT-122 dada la vuelta: **una base con historia tapa lo que una
> vacía destapa.**
> **Correcto:** `upsert`, con `update: {}` si es creación perezosa.
> **Incorrecto:** `findUnique(...) ?? create(...)`, aunque esté dentro de una transacción.
> **Salida declarada:** `create` con manejo explícito de `P2002` **y su motivo escrito**.
> Lo vigila `creacion-perezosa-atomica.spec.ts`.

## `CLAUDE.md` — § Bid & Wallet Flow

Se añade:

> **El monedero se crea de forma perezosa, y esa creación es atómica** (`upsert`, PT-142). Antes era
> `findUnique` + `create` en tres sitios del camino del dinero: un usuario sin monedero cuya
> notificación de depósito llegara mientras cargaba su panel podía ver fallar **la acreditación**.
> No se perdía dinero —el ciclo se reabre y reintenta (PT-087)— pero un fallo evitable en el camino
> del dinero no es aceptable. → **RULE-22**

## Registros

- `PENDING_TASKS.md` — PT-142 pasa a §2 (validación humana) al terminar.
- `HANDOFF.md` — al cerrarse, `build` y `docker` dejan de ser «nunca ejecutados».
- **PTSA**: no cierra ningún hallazgo. Es un defecto nuevo, encontrado por un mecanismo nuevo.
