# PT-143 — Cambios de especificación

## `src/api/test/e2e/orders-flow.e2e-spec.ts`

| Antes | Después |
|---|---|
| 11 × `deleteMany()` sin filtro: `rating`, `shipment`, `commissionRecord`, `dispute`, `ledger`, `order`, `bid`, `auction`, `notification`, `wallet`, `session` | Borrado acotado a los datos de la propia suite, en orden de dependencias |

## `src/api/test/core/auth-helper.ts`

`user.deleteMany()` pasa a borrar dependencias primero. Desaparece la violación de
`auctions_seller_id_fkey`, y con ella el comentario que decía *«Ideally we run on test db»* — que era
una nota donde hacía falta un mecanismo.

## Fichero nuevo

`src/api/test/unit/pruebas/limpieza-de-tests-acotada.spec.ts`

## Nueva regla de convenciones

`11-Conventions.md` — **RULE-23**:

> **Ninguna prueba borra sin filtro.**
> `orders-flow.e2e-spec.ts` truncaba **once tablas** en su `beforeAll`, y Jest corre las suites en
> paralelo: mientras `ratings.e2e` preparaba su pedido, `orders-flow` lo borraba. De ahí los `404`
> que cambiaban de sitio entre corridas (PT-143).
> La segunda razón es peor que el paralelismo: **`deleteMany()` sin filtro borra sobre la base a la
> que apunte `DATABASE_URL`**. El propio `auth-helper` lo temía por escrito —*«Be careful not to
> delete real users if running on dev db»*— y se quedó en un comentario.
> **Correcto:** datos con prefijo propio y borrado acotado a ellos, en orden de dependencias.
> **Incorrecto:** `deleteMany()` y `deleteMany({})`, que son lo mismo con dos llaves de disfraz.
> **No vale `--runInBand`:** serializar esconde que la suite no puede correr en paralelo.
> Lo vigila `limpieza-de-tests-acotada.spec.ts`.

## `CLAUDE.md`

Junto al aviso de que `run-all.sh` trunca la base, se añade que **ninguna prueba borra sin filtro**, y
por qué: la base de desarrollo sostiene validaciones PTSA.
