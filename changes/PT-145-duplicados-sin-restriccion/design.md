# PT-145 — Design: dos duplicados que nadie impide

**Tipo**: BUG · **Complejidad**: STANDARD
**Origen**: excepciones declaradas de la guarda RULE-22 (PT-142).

## Los dos, y no son el mismo problema

| | `Rating` | `AccountVerification` |
|---|---|---|
| Guarda actual | `findFirst` + *«You have already rated this order»* | `findFirst` + `if (enCurso) return enCurso` |
| Restricción única | **ninguna** | **ninguna** |
| Qué deja una carrera | Dos valoraciones del mismo autor sobre el mismo pedido | Dos verificaciones **y cada una envía dinero** |
| Invariante | *una por (pedido, autor)* | *como máximo una EN CURSO por método* |

## La corrección **no puede ser la misma para los dos**, y esto corrige el DISCOVERY

El `DISCOVERY` daba por hecho que los dos exigían migración. **Sólo uno la admite.**

### `Rating` — restricción única, limpia

`@@unique([orderId, authorId])`. Prisma lo declara de forma nativa, genera migración, y
`audit:schema` sigue cuadrando.

### `AccountVerification` — la restricción que hace falta es **parcial**, y Prisma no puede declararla

La invariante no es *una por método*: un método puede tener varias verificaciones **a lo largo del
tiempo** —una expirada, otra nueva—. Es *como máximo una con `status IN (PENDING, SENT)`*.

En Postgres eso es un índice único parcial:

```sql
CREATE UNIQUE INDEX ... ON account_verifications (payment_method_id)
  WHERE status IN ('PENDING','SENT');
```

**Prisma no soporta índices parciales en el esquema.** Escribirlo en crudo dentro de una migración
haría que `schema.prisma` y las migraciones dejaran de coincidir, y **`audit:schema` reportaría
deriva**: el checkpoint D2 que PT-127 construyó para impedir exactamente esa divergencia se pondría
rojo, con razón.

Y las salidas de compromiso no valen:

- `@@unique([paymentMethodId, status])` permitiría **una `PENDING` y una `SENT` a la vez** — es
  decir, dos verificaciones en curso y **dos envíos de dinero**. Justo lo que hay que impedir.
- `@@unique([paymentMethodId])` prohibiría verificar dos veces en la vida del método. Rompe el
  producto.

**Se resuelve bloqueando**: `SELECT ... FOR UPDATE` sobre la fila de `user_payment_methods` antes de
comprobar y crear. Serializa por método de pago, que es exactamente el ámbito de la invariante. Es la
técnica de **RULE-24**, aplicada a una comprobación en vez de a un saldo, y **no necesita migración**.

Que las dos correcciones sean distintas no es una inconsistencia: **la restricción única es la
herramienta correcta cuando la invariante cabe en un índice, y el bloqueo cuando no.**

## Estado de los datos — medido antes de decidir

```
ratings_duplicados:                  0
verificaciones_en_curso_duplicadas:  0
total_ratings:                       0
total_verificaciones:                0
```

Las dos tablas están vacías, así que la migración de `Rating` se aplica sin conflicto y no hay nada
que reconciliar. **Se midió antes** porque una migración que añade una restricción a datos que ya la
violan falla a mitad y deja el esquema a medias.

## Decisiones

### D1 — La guarda de negocio se queda en los dos

El 400 *«ya has valorado este pedido»* y el `return enCurso` idempotente son las respuestas útiles.
Lo que se añade es la red debajo, para cuando dos peticiones pasen la guarda a la vez.

### D2 — `Rating`: `P2002` se traduce al mismo 400

Como en `shipments` y la CLABE (PT-142): la respuesta no debe depender de si alguien más estaba
pulsando el botón a la vez. **Con rastro** — llegar ahí significa que la carrera ocurrió de verdad, y
eso es un dato (lo exigió el checkpoint D3 en PT-142).

### D3 — La guarda RULE-22 pierde sus dos excepciones

`creacion-perezosa-atomica.spec.ts` tiene una prueba que comprueba que **cada excepción sigue
haciendo falta**. Al corregir los dos sitios, esa prueba fallará hasta que se retiren las líneas — que
es exactamente para lo que se escribió.

## Riesgos

| # | Riesgo | Mitigación |
|---|---|---|
| R1 | La migración de `Rating` falla si aparecen duplicados entre la medición y la aplicación | Medido en cero; la migración es aditiva y el fallo sería inmediato y visible |
| R2 | El bloqueo sobre el método de pago alarga la verificación | Es una operación de usuario, no un lote. Se ejerce el flujo real |
| R3 | Retirar las excepciones de RULE-22 y olvidar una | La prueba de caducidad lo dice |

## Lo que este PT NO decide

- **No toca `WalletService`.** El envío de dinero de la verificación ya pasa por los caminos que
  PT-146 bloqueó.
- **No rediseña la verificación de cuenta.**
