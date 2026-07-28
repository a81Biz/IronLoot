# PT-138 — Escenarios de prueba

## El criterio que resume el PT: los tres sitios, la misma respuesta

| # | Prueba | Host | Contenedor | CI |
|---|---|:--:|:--:|:--:|
| S3-01 | `job-de-integracion` | ✓ | **✓** (hoy ✗) | ✓ |
| S3-02 | `rutas-que-el-client-invoca` | ✓ | **✓** (hoy ✗) | ✓ |
| S3-03 | `coherencia-documentacion-codigo` | ✓ | **✓** (hoy ✗) | ✓ |
| S3-04 | `capturas-en-su-sitio` | ✓ | **✓** (hoy ✗) | ✓ |
| S3-05 | `endpoints-legados-retirados` | ✓ | **✓** (hoy ✗) | ✓ |
| S3-06 | `coherencia-deuda-tecnica` | ✓ | **✓** (hoy ✗) | ✓ |
| S3-07 | `healthcheck-apunta-a-ruta-real` | ✓ | **✓** (hoy ✗) | ✓ |
| S3-08 | `lock-declara-plataformas` | ✓ | **✓** (hoy ✗) | ✓ |
| S3-09 | `audit:check` | ✓ | **✓** (hoy «No hay línea base») | ✓ |
| S3-10 | `audit:observability` | ✓ | **✓** (hoy `SIN_DATOS` + `OK`) | ✓ |

**Ninguna celda puede dar resultado distinto por el sitio donde se ejecutó.** Una guarda que depende
de dónde se corre no es una guarda.

## `SIN_DATOS` — el escenario más importante

| # | Escenario | Hoy | Esperado |
|---|---|---|---|
| SD-01 | `audit:observability` sin poder leer la BD | `SIN_DATOS` + `OK — sin silencios nuevos`, **exit 0** | **Falla**, exit ≠ 0, diciendo qué no pudo medir |
| SD-02 | `audit:observability` midiendo, resultado bueno | — | exit 0 |
| SD-03 | `audit:observability` midiendo, resultado malo | — | exit ≠ 0, **mensaje distinto del de SD-01** |

> SD-01 y SD-03 no pueden confundirse. *«No pude medir»* y *«medí y está mal»* son cosas distintas y
> tienen que leerse distinto. Confundirlas es lo que hace que un `SIN_DATOS` se lea como verde — la
> lección que PT-122 dejó escrita en `CLAUDE.md` y que esta métrica incumple.

## El arranque no se rompe (R4)

| # | Escenario | Esperado |
|---|---|---|
| ARR-01 | `docker compose rm -fsv api` → `up -d` | Los ocho contenedores `healthy` |
| ARR-02 | Editar un fichero de `src/api/src/` con el entorno arriba | **Recarga en caliente** funciona |
| ARR-03 | El montaje nuevo no solapa `/app/src`, `/app/test`, `/app/prisma` | Punto distinto (`/repo`), sólo lectura |
| ARR-04 | `@ironloot/core` sigue enlazado | El entrypoint completa sus cuatro pasos |

## `observability-check.ts` sin CLI de docker

| # | Escenario | Esperado |
|---|---|---|
| OBS-01 | Ejecutado **dentro** del contenedor | `trace_completeness` con número real |
| OBS-02 | Ejecutado **desde el host** | El **mismo** número. Si difieren, hay un segundo defecto y se investiga antes de seguir |
| OBS-03 | `grep "docker exec" observability-check.ts` | Sin resultados |

## Casos de control

| # | Escenario | Esperado |
|---|---|---|
| AC-01 | Guarda que lee la raíz, con la raíz montada | Pasa |
| AC-02 | La misma, con el montaje retirado | **Falla** con mensaje claro, no con `Tests: 0 total` |
| AC-03 | `security-baseline.json` ausente | `audit:check` **falla**, no aprueba |

## Regresión

| # | Suite | Línea base |
|---|---|---|
| REG-01 | Unitarias | **944** |
| REG-02 | e2e | **77** |
| REG-03 | Navegador | **176** |
| REG-04 | Los ocho contenedores tras el cambio de compose | `healthy` |

## Lo que NO se prueba aquí

- Rendimiento del montaje de la raíz en Windows (bind mounts pueden ser lentos). Si aparece, se mide y
  se registra; no se optimiza en este PT.
- Reescribir cómo los ocho ficheros resuelven `RAIZ`. Se toca lo mínimo para que funcione en los tres
  sitios.
