# PT-145 — Cambios de especificación

## `schema.prisma` — modelo `Rating`

```prisma
@@unique([orderId, authorId])
```

Con su **migración** (`npm run db:migrate`). Nunca `db push`: es el atajo que produjo H-014.

## `schema.prisma` — modelo `AccountVerification`

**Sin cambios.** Su invariante —*como máximo una con `status IN (PENDING, SENT)` por método*— es un
índice único **parcial**, y Prisma no puede declararlo en el esquema. Escribirlo en crudo dentro de
una migración haría que `schema.prisma` y las migraciones divergieran, y **`audit:schema` reportaría
deriva** — el checkpoint que PT-127 construyó para impedir exactamente eso.

Se resuelve bloqueando la fila del método de pago (RULE-24).

## `ratings.service.ts`

La guarda se queda; el `create` traduce `P2002` al **mismo** 400, con un `warn` que deje constancia
de que la carrera ocurrió.

## `account-verification.service.ts`

`solicitar()` abre transacción, bloquea `user_payment_methods` con `SELECT ... FOR UPDATE`, y **dentro**
comprueba si hay una en curso y crea. La idempotencia —devolver la existente— no cambia.

## `creacion-perezosa-atomica.spec.ts`

Se retiran las dos excepciones declaradas. Su prueba de caducidad falla hasta que se haga.

## Nueva regla de convenciones

`11-Conventions.md` — **RULE-25**:

> **Cuando la invariante cabe en un índice, se declara; cuando no, se bloquea.**
> `Rating` necesitaba *una por (pedido, autor)*: eso es `@@unique`, y Prisma lo declara.
> `AccountVerification` necesitaba *como máximo una EN CURSO por método*, que en Postgres es un
> índice único **parcial** — y Prisma no puede declararlo. Escribirlo en crudo en una migración
> divergiría de `schema.prisma` y pondría rojo `audit:schema`, el checkpoint que PT-127 creó para
> impedir esa divergencia (PT-145).
> Las salidas de compromiso no valen y conviene saber por qué: `@@unique([paymentMethodId, status])`
> permitiría una `PENDING` **y** una `SENT` a la vez, o sea dos verificaciones en curso y **dos
> envíos de dinero**; `@@unique([paymentMethodId])` prohibiría verificar dos veces en la vida del
> método y rompería el producto.
> **Correcto:** restricción única si la invariante es total; `SELECT ... FOR UPDATE` sobre la fila
> que delimita el ámbito si es parcial.
> **Incorrecto:** un índice parcial en crudo que el esquema no declare, y una restricción más ancha
> «que al menos evita el caso feo».

## Registros

- `PENDING_TASKS.md` — PT-145 pasa a §2 al terminar.
- Las dos excepciones de RULE-22 desaparecen.
