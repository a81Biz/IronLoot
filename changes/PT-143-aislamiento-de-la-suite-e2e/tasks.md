# PT-143 — Tareas atómicas

**Prerequisito**: PT-136 y PT-142 fusionados.
**Regla**: `--runInBand` no es una solución. Serializar esconde que la suite no puede correr en
paralelo, y este PT existe porque algo verde tapaba un defecto.

---

## PT-143.1 — RED: la guarda de limpiezas acotadas

- **Objetivo**: una prueba que falle hoy, nombrando las once.
- **Salida**: `src/api/test/unit/pruebas/limpieza-de-tests-acotada.spec.ts` — ningún `deleteMany()`
  sin filtro bajo `src/api/test/`.
- **Validación**: falla listando las 11 de `orders-flow.e2e-spec.ts`.
- **Status**: PENDING

## PT-143.2 — GREEN: `orders-flow` limpia lo suyo

- **Entrada**: `orders-flow.e2e-spec.ts:31-41`.
- **Salida**: prefijo propio para sus datos; borrado acotado a ellos, en orden de dependencias.
- **Validación**: PT-143.1 en verde; la suite sigue pasando **sola**.
- **Status**: PENDING

## PT-143.3 — `auth-helper` borra en orden

- **Entrada**: `auth-helper.ts:105-115` — `user.deleteMany()` viola `auctions_seller_id_fkey`.
- **Salida**: dependencias primero, o `onDelete: Cascade` donde el modelo ya lo declare.
- **Validación**: sin violaciones de clave ajena en la corrida completa.
- **Status**: PENDING

## PT-143.4 — Casos de control

- **Salida**: (a) `deleteMany()` sin filtro → **falla**; (b) `deleteMany({ where })` → pasa;
  (c) `deleteMany({})` con objeto vacío → **falla**, que es el disfraz de la misma cosa.
- **Validación**: los tres. (c) es el que importa: sin él, la guarda se esquiva con dos llaves.
- **Status**: PENDING

## PT-143.5 — La suite entera, en paralelo, contra base vacía

- **Objetivo**: la barra del PT.
- **Salida**: 18 ficheros e2e con Jest en paralelo. **82/82**, o el desglose de lo que quede.
- **Validación**: dos corridas seguidas con el mismo resultado. Un aislamiento que funciona una vez
  no es aislamiento.
- **Status**: PENDING

## PT-143.6 — Decidir `payments.e2e` (D4)

- **Entrada**: da 500 con credenciales de prueba. No es aislamiento.
- **Salida**: doblar la pasarela en el e2e **[B]**, dejando el contrato real a la suite de navegador
  —que ya cobra de verdad (PT-134)—, o job nocturno **[A]**.
- **Validación**: `payments.e2e` deja de depender de una pasarela real en cada push.
- **Status**: PENDING

## PT-143.7 — `build` y `docker`, por primera vez

- **Objetivo**: lo que este PT desbloquea.
- **Validación**: los **ocho** jobs ejecutados. Si `build` o `docker` fallan, **se trian**: defecto
  del job → aquí; defecto del repositorio → PT propio. La regla de PT-136 sigue en vigor.
- **Status**: PENDING

## PT-143.8 — Regresión, evidencia, registro

- **Salida**: 713 unitarias + la guarda · 82 e2e · `evidence/PT-143/` en `.md` (F-136-A) ·
  `HISTORY.log` + `HANDOFF.md`.
- **Validación**: STATE 5. BUG → `VALIDATION_PENDING`.
- **Status**: PENDING
