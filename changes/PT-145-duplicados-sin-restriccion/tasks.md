# PT-145 — Tareas atómicas

**Prerequisito**: PT-142 y PT-146 fusionados.
**Aviso**: editar `schema.prisma` **exige generar migración** (RULE-10). Es el atajo que produjo H-014.

---

## PT-145.1 — Medir duplicados antes de tocar nada

- **Objetivo**: una migración que añade una restricción a datos que ya la violan falla a mitad.
- **Salida**: recuento de duplicados en `ratings` y de verificaciones en curso por método.
- **Validación**: **hecho** — 0, 0, sobre tablas vacías.
- **Status**: DONE

## PT-145.2 — RED: la carrera de valoraciones

- **Salida**: N valoraciones simultáneas del mismo autor sobre el mismo pedido.
- **Validación**: **falla hoy** con más de una fila creada.
- **Status**: PENDING

## PT-145.3 — RED: la carrera de verificaciones

- **Salida**: N solicitudes simultáneas de verificación sobre el mismo método.
- **Validación**: **falla hoy** con dos verificaciones en curso. **Es la que importa: cada una envía
  dinero.**
- **Status**: PENDING

## PT-145.4 — GREEN: `@@unique([orderId, authorId])` en `Rating`

- **Entrada**: `schema.prisma`, modelo `Rating`.
- **Salida**: la restricción **y su migración** (`npm run db:migrate`). Nunca `db push`.
- **Validación**: `npm run audit:schema` sigue en verde — las migraciones reproducen el esquema.
- **Status**: PENDING

## PT-145.5 — GREEN: `ratings.service` traduce `P2002` al mismo 400

- **Salida**: `try/catch` con `P2002` → *«You have already rated this order»*, **dejando rastro**.
- **Validación**: PT-145.2 en verde. Un `warn` con el dato: llegar ahí significa que la carrera
  ocurrió.
- **Status**: PENDING

## PT-145.6 — GREEN: bloqueo sobre el método de pago

- **Objetivo**: la invariante *«como máximo una en curso»* es parcial y no cabe en un índice de
  Prisma. Se serializa por método.
- **Salida**: `SELECT ... FOR UPDATE` sobre `user_payment_methods` al principio de la transacción de
  `solicitar()`, con la comprobación y la creación dentro.
- **Validación**: PT-145.3 en verde. **Sin migración.**
- **Status**: PENDING

## PT-145.7 — Retirar las dos excepciones de RULE-22

- **Entrada**: `creacion-perezosa-atomica.spec.ts` § `EXCEPCIONES_DECLARADAS`.
- **Validación**: su prueba de caducidad —«ninguna excepción sobra»— **falla** hasta retirarlas. Es
  para lo que se escribió.
- **Status**: PENDING

## PT-145.8 — El esquema, comprobado en los dos sentidos

- **Salida**: `audit:schema` en verde; la migración aplicada con `migrate deploy`, no con `db push`.
- **Validación**: `_prisma_migrations` contiene la nueva. Es la lección de H-014.
- **Status**: PENDING

## PT-145.9 — Regresión, evidencia, registro

- **Salida**: 728 unitarias + las nuevas · e2e en CI · carpeta de evidencia propia ·
  `HISTORY.log` + `HANDOFF.md`.

  > **Anotado por PT-170: esa carpeta nunca se creó.** La tarea la declaraba como salida y la entrada
  > de `HISTORY.log` la cita, pero `docs/implementation/evidence/PT-145/` no existe. El hueco está
  > **declarado y contado** en `docs/implementation/evidence-baseline.json`, que sólo puede bajar
  > (RULE-34). No se crea una carpeta ahora para que la cita cuadre: escribirla sin haber ejecutado
  > nada sería inventar evidencia, y FDGE dice que la evidencia **es** la ejecución. El trabajo de
  > PT-145 sí está verificado — su migración está aplicada en `_prisma_migrations`
  > (`20260729020000_pt145_rating_unico_por_pedido_y_autor`) y su prueba vive en la suite.
- **Validación**: STATE 5. BUG → `VALIDATION_PENDING`.
- **Status**: PENDING
