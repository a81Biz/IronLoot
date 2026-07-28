# PT-128 — Tareas atómicas

**Prerequisito absoluto: PT-127 terminado y validado.** Sin migraciones que funcionen, este job no
puede pasar.

---

## PT-128.1 — Diagnosticar los manejadores abiertos

- **Objetivo**: saber **qué** impide que Jest salga, antes de decidir cómo tratarlo.
- **Entrada**: base con esquema (`prisma migrate deploy` sobre una base desechable).
- **Salida**: salida de `npx jest --config ./test/jest-e2e.json --detectOpenHandles --runInBand`,
  guardada como evidencia.
- **Validación**: el informe nombra al menos un manejador concreto con su traza.
- **Status**: PENDING

> Esta tarea va **primera** y su resultado condiciona PT-128.4. No se decide antes de medir.

## PT-128.2 — Ejecutar los 17 ficheros e2e y ver qué pasa de verdad

- **Objetivo**: descubrir el tamaño real del trabajo. **Sólo se ha ejecutado `auth`** (2 suites, 9
  tests). Los otros 15 ficheros no se han visto pasar nunca.
- **Entrada**: base con esquema.
- **Salida**: informe completo, fichero a fichero.
- **Validación**: se sabe cuántos pasan, cuántos fallan y por qué.
- **Status**: PENDING

> **Es el punto de decisión del tamaño del PT.** Si aparecen fallos legítimos de aplicación, se
> registran como hallazgos nuevos y **no se arrastran aquí** (ver `out-of-scope.md`).

## PT-128.3 — RED: la prueba del propio job

- **Objetivo**: que el arreglo del pipeline sea verificable y no una afirmación.
- **Entrada**: `design.md` § D5.
- **Salida**: `src/api/test/unit/ci/job-de-integracion.spec.ts` — comprueba que `test-integration`
  contiene un paso de esquema con `migrate deploy` (**no** `db push`) y un `prisma generate`. Con
  caso de control.
- **Validación**: **falla** (RED) contra el `ci.yml` de hoy.
- **Status**: PENDING

## PT-128.4 — Cerrar los manejadores abiertos

- **Objetivo**: que la suite termine sola.
- **Entrada**: el diagnóstico de PT-128.1.
- **Salida**: el `afterAll` / teardown que falte, donde el diagnóstico lo señale. **O**, si la fuga
  es de dependencia ajena e incerrable, `--forceExit` en `test:e2e` **con comentario que explique
  qué manejador y por qué no se puede cerrar**.
- **Validación**: `npx jest --config ./test/jest-e2e.json` **termina sin `--forceExit`**. Si no se
  consigue, la excepción está documentada en el fichero.
- **Status**: PENDING

## PT-128.5 — GREEN: el esquema en el job

- **Objetivo**: que la base llegue con esquema, y que aplicarlo verifique PT-127.
- **Entrada**: `.github/workflows/ci.yml:134-152`.
- **Salida**: pasos `prisma generate` y `prisma migrate deploy` antes de los tests.
- **Validación**: la prueba de PT-128.3 pasa (GREEN).
- **Status**: PENDING

## PT-128.6 — El checkpoint D3 en CI

- **Objetivo**: que `audit:observability` deje de depender de que el auditor se acuerde.
- **Entrada**: `ci.yml` + `npm run audit:observability`.
- **Salida**: job u paso que lo ejecuta.
- **Validación**: corre y da `silent_failure_count = 25` contra la línea base.
- **Status**: PENDING

## PT-128.7 — Reclasificar D1.N1 en `audit-scope.yaml`

- **Objetivo**: corregir una clasificación equivocada en vez de añadir un job que mienta.
- **Entrada**: `PTSA/audit-scope.yaml` § `ci_checkpoints` · precedente de PT-122 con D5.
- **Salida**: `D1.N1` documentado como **métrica de delta sync**, con el motivo escrito: en CI la
  base nace vacía y devolvería `SIN_DATOS` siempre.
- **Validación**: el fichero lo dice, con el mismo razonamiento que PT-122 dejó para D5.
- **Status**: PENDING

## PT-128.8 — Comprobar que el job puede ponerse rojo

- **Objetivo**: demostrar que verifica algo. **Es el criterio de PT-118.**
- **Entrada**: el job ya arreglado.
- **Salida**: evidencia de las dos corridas.
- **Validación**: romper un test e2e a propósito → **el job falla**; revertir → pasa.
- **Status**: PENDING

## PT-128.9 — Comprobar que `build` y `docker` se desbloquean

- **Objetivo**: cerrar la consecuencia, no sólo la causa.
- **Salida**: el grafo de jobs recorrido entero.
- **Validación**: `build` se ejecuta. `docker` se ejecuta en `prod`/`prep` — o falla por la ruta
  inexistente, que **es PT-129** y se anota como tal.
- **Status**: PENDING

## PT-128.10 — Regresión

- **Validación**: `typecheck` limpio · 603 tests del API · 134 de CORE · los cuatro checkpoints de
  auditoría verdes · `security-audit` intacto.
- **Status**: PENDING

## PT-128.11 — Evidencia y self-review (STATE 5)

- **Salida**: `docs/implementation/evidence/PT-128/` con las salidas de .1, .2, .8 y .9, más
  `self-review.md`.
- **Status**: PENDING

## PT-128.12 — Registro (STATE 7)

- **Salida**: `HISTORY.log` (con `PTSA reference: H-015`) · `HANDOFF.md` ·
  `PTSA/Hallazgos/H-015.md` a `CORREGIDA` por `## Revisión`.
- **Validación**: H-015 **no** pasa a CERRADA. `[R44]`.
- **Status**: PENDING

---

## Commits previstos

```
test:  PT-128 la prueba del job de integracion, antes del arreglo   (RED)
fix:   PT-128 la suite e2e termina sola                             (.4)
fix:   PT-128/H-015 el job aplica el esquema con migrate deploy     (.5)
feat:  PT-128 el checkpoint D3 corre en CI                          (.6)
docs:  PT-128 D1.N1 es metrica de delta sync, no de CI              (.7)
docs:  PT-128 evidencia, historia y H-015 a CORREGIDA               (.11 .12)
```
