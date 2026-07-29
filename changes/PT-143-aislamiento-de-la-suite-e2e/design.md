# PT-143 — Design: la suite e2e no aísla sus datos

**Tipo**: BUG · **Complejidad**: STANDARD
**Origen**: triaje de PT-136.5. Bloquea `build` y `docker`, que nunca se han ejecutado.

## La causa es un fichero, y es medible

`grep -c "deleteMany()"` sobre toda la suite: **11 ocurrencias, todas en el mismo sitio.**

```
src/api/test/e2e/orders-flow.e2e-spec.ts:31-41
  rating · shipment · commissionRecord · dispute · ledger
  order  · bid      · auction          · notification · wallet · session
```

**Once tablas truncadas sin filtro**, en el `beforeAll` de una suite que corre en paralelo con las
otras diecisiete. Mientras `ratings.e2e` prepara su pedido, `orders-flow` lo borra.

Eso explica lo que se veía y no encajaba:

| Síntoma | Explicación |
|---|---|
| `ratings.e2e`: `expected 201, got 404` | Su pedido ya no existe: `order.deleteMany()` |
| `auth-helper.ts:108`: `Foreign key constraint violated: auctions_seller_id_fkey` | Borra usuarios cuyas subastas otro worker acaba de recrear |
| Los fallos **cambian entre corridas** | Es una carrera: depende de qué worker llegue antes |
| En local pasaban 77/77 | Una base con historia y menos presión de scheduling lo esconde |

## Por qué no se había visto

La misma razón que PT-142: **hacen falta paralelismo y una base sin datos previos**, y en local no se
dan las dos. Es la tercera vez en esta tanda que aparece el mismo patrón — *una base con historia tapa
lo que una vacía destapa*.

## Decisiones de arquitectura

### D1 — `orders-flow` limpia lo suyo, no la base

Sus once `deleteMany()` pasan a estar acotados a los datos que la propia suite crea: prefijo propio en
correos y nombres, y borrado por esos identificadores, en orden de dependencias.

**No se usa `--runInBand`.** Serializar haría verde una suite que sigue sin poder correr en paralelo:
esconde el defecto en vez de cerrarlo, y este PT existe porque algo verde tapaba un problema.

### D2 — La guarda: ningún `deleteMany()` sin filtro en tests

`limpieza-de-tests-acotada.spec.ts`. Es barata, determinista, y cierra la clase entera — no sólo este
fichero.

Y tiene una segunda razón, más seria que el paralelismo: **`deleteMany()` sin filtro borra sobre la
base a la que apunte `DATABASE_URL`**. El comentario de `auth-helper.ts:105-106` ya lo temía —
*«Be careful not to delete real users if running on dev db. Ideally we run on test db»*— y se quedó en
una nota donde debía haber un mecanismo. `run-all.sh` trunca la base y está advertido en `CLAUDE.md`;
esto no lo estaba.

### D3 — `auth-helper` borra en orden de dependencias

`user.deleteMany()` viola `auctions_seller_id_fkey` porque el usuario todavía tiene subastas. Se
borran las dependencias primero, o se usa `onDelete: Cascade` donde el modelo ya lo declare.

### D4 — `payments.e2e` no es de este PT, y hay que decidirlo aparte

`POST /payments/initiate` con PayPal da **500** en CI porque las credenciales son de prueba. No es
aislamiento: es un test que **necesita una pasarela real**.

`PENDIENTES.md` § S-002 final ya lo había anticipado: *«si algún día se quiere cobertura del contrato
de la pasarela, va en un job nocturno, no en cada push»*. Dos vías:

- **[A] Job nocturno** con credenciales reales de sandbox, fuera del pipeline de cada push.
- **[B] Doblar la pasarela** en el e2e y dejar el contrato real para la suite de navegador, que ya
  cobra de verdad en Mercado Pago y PayPal (PT-134).

**Recomendación: [B]**, porque la cobertura del contrato real **ya existe** en la suite de navegador,
y un job nocturno con credenciales es superficie que mantener para repetir lo que ya se hace.

## Lo que este PT NO decide

- **No rediseña la suite.** Acota limpiezas y añade dos guardas.
- **No toca `src/`.**
- **No garantiza que `build` y `docker` pasen** — los desbloquea. Si fallan, se trian con la regla de
  PT-136.
