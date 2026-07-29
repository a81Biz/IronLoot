# PT-147 — Cambios de especificación

## `.github/workflows/ci.yml` — job `docker`

| Antes | Después |
|---|---|
| Un paso: `context: .`, `file: ./Dockerfile` — **que no existe** | Cuatro pasos, uno por imagen de producción, cada uno con **su** contexto |
| No arrancaba nada | Arranca las cuatro y espera su `healthcheck` |

| Imagen | `context` | `file` |
|---|---|---|
| api | `.` | `src/api/Dockerfile` |
| admin | `src/admin` | `src/admin/Dockerfile` |
| base | `src/apps/base` | `src/apps/base/Dockerfile` |
| client | `src/apps/client` | `src/apps/client/Dockerfile` |

El job gana servicios `postgres` y `redis`: el API no arranca sin ellos.

## Fichero nuevo

`src/api/test/unit/despliegue/dockerfiles-citados-existen.spec.ts`

## Nueva regla de convenciones

`11-Conventions.md` — **RULE-26**:

> **Un workflow no cita ficheros que no existen, y una imagen no se da por buena hasta que arranca.**
> El job `docker` apuntaba a `./Dockerfile`, que **nunca ha existido**: las imágenes de producción las
> creó PT-129 en `src/api/`, `src/admin/`, `src/apps/base/` y `src/apps/client/`. Estuvo oculto
> porque el job estaba condicionado a dos ramas fantasma y quedaba `skipped` — y **un job saltado no
> cuenta como fallo**, así que el workflow se declaraba `success` (PT-147).
> **Construir no es arrancar** — es H-017: un healthcheck contra `/health` cuando la ruta real era
> `/api/v1/health` construía una imagen perfecta que quedaba `unhealthy` para siempre. Por eso el job
> arranca las cuatro y espera su `HEALTHCHECK`.
> **Los contextos no son uniformes**: el API construye desde la raíz del monorepo porque
> `@ironloot/core` es `file:../packages/core`. Escribirlos todos igual —el error natural— rompe el
> del API.
> Lo vigila `dockerfiles-citados-existen.spec.ts`.

## Lo que NO cambia

- **Ningún `Dockerfile`.** Los creó PT-129 y arrancaban; lo que faltaba era que CI lo comprobara.
- No se publican imágenes.
