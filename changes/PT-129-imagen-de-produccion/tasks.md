# PT-129 — Tareas atómicas

**Prerequisitos**: PT-127 (esquema) y PT-128 (pipeline que pueda verificar).

---

## PT-129.1 — RED: la prueba del healthcheck

- **Objetivo**: que la ruta del healthcheck deje de poder divergir del prefijo global en silencio.
- **Entrada**: `src/api/src/main.ts:77` (`setGlobalPrefix('api')` + versionado); los `Dockerfile`.
- **Salida**: `src/api/test/unit/despliegue/healthcheck-apunta-a-ruta-real.spec.ts` — extrae la URL
  del `HEALTHCHECK` de cada `Dockerfile` y comprueba que empieza por el prefijo global real. Con
  caso de control.
- **Validación**: **falla** (RED) contra `src/api/Dockerfile` de hoy.
- **Status**: PENDING

> Se prueba lo que se puede probar sin construir: que la ruta escrita coincide con la que el código
> expone. Que el contenedor llegue a `healthy` se comprueba arrancándolo (PT-129.6).

## PT-129.2 — GREEN: corregir el healthcheck del API

- **Entrada**: `src/api/Dockerfile:60-61`.
- **Salida**: `/api/v1/health`, umbral `< 500`, manejador `.on('error', …)`.
- **Validación**: la prueba de PT-129.1 pasa.
- **Status**: PENDING

## PT-129.3 — Resolver `@ironloot/core` en un build de producción

- **Objetivo**: el riesgo real del PT. En desarrollo lo enlaza `entrypoint.dev.sh:29-41` a mano;
  **en producción no hay equivalente**.
- **Entrada**: `src/packages/core`, el patrón de `src/api/Dockerfile`, la decisión D4.
- **Salida**: el mecanismo de build que lo resuelve (contexto raíz + `.dockerignore`, salvo que el
  Gate elija empaquetarlo).
- **Validación**: `docker build` del API **construye**, y el contenedor arranca sin errores de
  módulo no encontrado.
- **Status**: PENDING

> Va antes que los tres Dockerfiles nuevos: si esto no se resuelve, los tres nacen rotos.

## PT-129.4 — Los tres `Dockerfile` de producción

- **Entrada**: patrón del API + D3 (los SSR necesitan `views/` y `public/`).
- **Salida**: `src/admin/Dockerfile`, `src/apps/base/Dockerfile`, `src/apps/client/Dockerfile`.
- **Validación**: los tres **construyen**.
- **Status**: PENDING

## PT-129.5 — `docker-compose` hereda el healthcheck

- **Objetivo**: una sola definición, para que no vuelvan a divergir.
- **Entrada**: `docker-compose.yml`.
- **Salida**: la redefinición se retira; se hereda del `Dockerfile`.
- **Validación**: `docker-compose up -d` → los cuatro servicios `healthy`, **igual que hoy**.
- **Status**: PENDING

## PT-129.6 — Arrancar las cuatro imágenes y comprobarlas

- **Objetivo**: **esto es lo que cierra la causa raíz.** Nadie ha visto nunca una de estas imágenes
  arrancar.
- **Entrada**: las cuatro imágenes construidas.
- **Salida**: evidencia de `docker ps` con el estado de salud de cada una.
- **Validación**:
  - las cuatro llegan a **`healthy`**;
  - los tres SSR sirven una **página real** con 200 — no sólo el healthcheck.
- **Status**: PENDING

> El segundo punto no es celo: `npm run build` compila TypeScript y **no copia plantillas ni
> estáticos**. Una imagen que sólo copie `dist/` pasa el healthcheck y devuelve 500 en la primera
> página. Sólo se ve pidiéndola.

## PT-129.7 — El job `docker` de CI

- **Entrada**: `.github/workflows/ci.yml:201-207`.
- **Salida**: rutas reales a los cuatro `Dockerfile`; y el paso que **arranca** cada imagen y
  comprueba salud.
- **Validación**: el job construye y arranca. Sin el arranque, esto vuelve.
- **Status**: PENDING

## PT-129.8 — Caso de control

- **Objetivo**: demostrar que la prueba detecta lo que dice detectar.
- **Validación**: cambiar la ruta del healthcheck a `/health` → la prueba de PT-129.1 **falla**;
  revertir → pasa. Y arrancar una imagen con la ruta rota → **nunca llega a `healthy`**.
- **Status**: PENDING

## PT-129.9 — Regresión

- **Validación**: `docker-compose up -d` deja los cuatro `healthy` · `typecheck` limpio · 603 tests
  del API · 134 de CORE · los checkpoints de auditoría verdes · tiempo y tamaño de build medidos y
  anotados.
- **Status**: PENDING

## PT-129.10 — Evidencia y self-review (STATE 5)

- **Salida**: `docs/implementation/evidence/PT-129/` con la salida de `docker ps` mostrando las
  cuatro imágenes `healthy`, las respuestas de las páginas reales, y `self-review.md`.
- **Status**: PENDING

## PT-129.11 — Registro (STATE 7)

- **Salida**: `HISTORY.log` (`PTSA reference: H-017`) · `HANDOFF.md` ·
  `PTSA/Hallazgos/H-017.md` a `CORREGIDA` por `## Revisión`.
- **Validación**: H-017 **no** pasa a CERRADA. `[R44]`.
- **Status**: PENDING

---

## Commits previstos

```
test:  PT-129 la prueba de que el healthcheck apunta a una ruta real   (RED)
fix:   PT-129/H-017 el healthcheck de la imagen del API                (.2)
feat:  PT-129 @ironloot/core resuelto en el build de produccion        (.3)
feat:  PT-129 imagenes de produccion para ADMIN, BASE y CLIENT         (.4 .5)
fix:   PT-129 el job docker construye y arranca lo que existe          (.7)
docs:  PT-129 evidencia, historia y H-017 a CORREGIDA                  (.10 .11)
```
