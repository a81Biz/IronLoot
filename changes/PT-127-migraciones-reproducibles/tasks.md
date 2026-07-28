# PT-127 — Tareas atómicas

**Orden de ejecución obligatorio.** Ninguna empieza antes del ACK del Proposal Gate.
Marcadas `[A]` / `[B]` las que dependen de la vía elegida en `design.md` § D1.

---

## PT-127.0 — Copia de seguridad de los datos de auditoría

- **Objetivo**: que ninguna operación posterior pueda destruir la salida real que sostiene la
  validación de 11 productos PTSA.
- **Entrada**: `ironloot_db` en marcha.
- **Salida**: `pg_dump` fechado fuera del repositorio + recuento de control anotado.
- **Validación**: el dump restaura en una base desechable y el recuento coincide:
  `wallets 4 · ledger 15 · payments 1 · bids 3 · payment_cycle_events 49`.
- **Status**: PENDING

## PT-127.1 — RED: la prueba del control de drift, antes que el control

- **Objetivo**: escribir la prueba que falla hoy y que sólo pasará cuando D4 exista.
  **Tests-first no es opcional.**
- **Entrada**: `design.md` § D4; patrón de `test/unit/observabilidad/catch-mudos.spec.ts`.
- **Salida**: `src/api/test/unit/esquema/coherencia-migraciones.spec.ts` — comprueba que
  `audit:schema` existe y devuelve 0 diferencias. **Con caso de control**, como el resto de pruebas
  de este tipo en el repositorio.
- **Validación**: la prueba **falla** (RED) contra el estado actual.
- **Status**: PENDING

## PT-127.2 — Base sombra y captura del drift real

- **Objetivo**: dejar registrado, en el paquete, qué produce hoy el artefacto desplegable.
- **Entrada**: `ironloot-db`.
- **Salida**: base `ptsa_shadow` con las 23 aplicadas + salida de `migrate diff` guardada como
  evidencia.
- **Validación**: la salida reproduce lo que E-017 registró (5 divergencias).
- **Status**: PENDING

## PT-127.3 [A] — Generar la migración de reconciliación

- **Objetivo**: el DDL que falta, **generado**, nunca escrito.
- **Entrada**: `prisma/migrations` + `schema.prisma` + base sombra.
- **Salida**: `prisma/migrations/<ts>_reconcile_schema_drift_s002/migration.sql`.
- **Validación**: base limpia → `migrate deploy` → `migrate diff --from-schema-datamodel
  --to-schema-datasource --exit-code` = **0**.
- **Status**: PENDING

## PT-127.3 [B] — Colapsar en una migración inicial

- **Objetivo**: sustituir 23 ficheros que nunca se ejecutaron por uno que sí funciona.
- **Entrada**: `schema.prisma`.
- **Salida**: `prisma/migrations/<ts>_initial_schema/migration.sql` (generada con `--from-empty`);
  las 23 carpetas anteriores retiradas.
- **Validación**: idéntica a la de [A] — base limpia, `deploy`, `diff` = 0.
- **Status**: PENDING

## PT-127.4 — Comprobar que la aplicación funciona contra ese esquema

- **Objetivo**: no dar por buena una comparación de esquemas; comprobarlo con el cliente real.
- **Entrada**: base sombra reconstruida por PT-127.3.
- **Salida**: salida de las cuatro sondas del cliente Prisma.
- **Validación**: **4 de 4 OK** (hoy 1 de 4). Y `payments_reference_key` es **UNIQUE**.
- **Status**: PENDING

## PT-127.5 — Baseline de la base de desarrollo

- **Objetivo**: crear `_prisma_migrations` en `ironloot_db` **sin ejecutar SQL sobre sus datos**.
- **Entrada**: `ironloot_db` + migraciones ya validadas.
- **Salida**: `prisma migrate resolve --applied <cada migración>`.
- **Validación**: `migrate status` sin pendientes **y** recuento de datos idéntico al de PT-127.0.
- **Status**: PENDING

## PT-127.6 — Cambiar el punto de aplicación en el arranque

- **Objetivo**: que el esquema se aplique por migración, y que un fallo se vea.
- **Entrada**: `src/api/scripts/entrypoint.dev.sh:50-57`.
- **Salida**: `migrate deploy` sin `--accept-data-loss` y sin el respaldo que traga el error.
- **Validación**: `docker-compose restart api` → arranca; el log muestra la aplicación por
  migración; `/api/v1/health` responde 200.
- **Status**: PENDING

## PT-127.7 — GREEN: el control de drift

- **Objetivo**: que la prueba de PT-127.1 pase.
- **Entrada**: `design.md` § D4.
- **Salida**: `src/api/scripts/schema-drift-check.ts` + script `audit:schema` en `package.json`.
- **Validación**: la prueba de PT-127.1 pasa (GREEN). El script devuelve 0.
- **Status**: PENDING

## PT-127.8 — El control en CI

- **Objetivo**: que corra solo, y que no lo pueda bloquear un job roto.
- **Entrada**: `.github/workflows/ci.yml`.
- **Salida**: job `schema-drift`, **sin `needs`**, como `security-audit` (PT-118).
- **Validación**: el job aparece en el fichero y su comando corre en local.
- **Status**: PENDING

## PT-127.9 — Probar el control en los dos sentidos

- **Objetivo**: demostrar que el control detecta lo que dice detectar. Un control que nadie ha visto
  fallar no es un control — es la lección de PT-118 y de H-017.
- **Entrada**: el control ya en su sitio.
- **Salida**: evidencia de las dos corridas.
- **Validación**: añadir un campo a `schema.prisma` sin migración → `audit:schema` **falla**;
  generar la migración → **pasa**; revertir ambos.
- **Status**: PENDING

## PT-127.10 — Regresión completa

- **Objetivo**: que nada de lo que funcionaba haya dejado de funcionar.
- **Entrada**: el repositorio con todos los cambios.
- **Salida**: informe de pruebas.
- **Validación**: `typecheck` limpio · **603** tests del API · **134** de CORE ·
  `audit:check` · `audit:domain` (rubric 100) · `audit:observability` · `audit:reliability`,
  los cuatro verdes · recuento de datos intacto.
- **Status**: PENDING

## PT-127.11 — Evidencia y self-review (STATE 5)

- **Objetivo**: código no es evidencia; ejecución sí.
- **Salida**: `docs/implementation/evidence/PT-127/` con salidas de PT-127.2, .4, .5, .9 y .10, más
  `self-review.md` con la lista de comprobación de STATE 5.
- **Validación**: los 7 puntos de la lista respondidos.
- **Status**: PENDING

## PT-127.12 — Registro (STATE 7)

- **Objetivo**: que la próxima sesión sepa qué pasó y por qué.
- **Salida**: entrada en `HISTORY.log` (con `PTSA reference: H-014` y el delta real vs planificado)
  + `HANDOFF.md` actualizado + `PTSA/Hallazgos/H-014.md` a `CORREGIDA` mediante `## Revisión`.
- **Validación**: H-014 **no** pasa a CERRADA. `[R44]`: es BUG, lo cierra el humano.
- **Status**: PENDING

---

## Commits previstos (atómicos, trazables)

```
test:     PT-127 la prueba del control de drift, antes que el control        (RED)
fix:      PT-127/H-014 la migracion que reproduce el esquema                 (.3)
fix:      PT-127 el esquema se aplica por migracion, y un fallo se ve        (.6)
feat:     PT-127 audit:schema — el control que impide que el drift vuelva    (.7 .8)
docs:     PT-127 evidencia, historia y H-014 a CORREGIDA                     (.11 .12)
```
