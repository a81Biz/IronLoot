# PT-129 — Self-Review (STATE 5)

**Fecha**: 2026-07-27 · **Rama**: `fix/PT-129-imagen-de-produccion` · **Origen**: PTSA H-017

---

## Resultado, sin adornos

**Tres de cuatro imágenes: construidas, arrancadas y `healthy`. La cuarta —el API— construye y no
arranca.**

```
pt129-admin    Up 21 minutes (healthy)
pt129-client   Up 21 minutes (healthy)
pt129-base     Up 21 minutes (healthy)
pt129-api      Exited (1)
```

El PT **no está terminado**. Y lo que ha destapado es más grave que el hallazgo original.

---

## Lo que H-017 decía, y lo que había de verdad

H-017 registraba tres defectos: healthcheck a un 404, tres servicios sin imagen, y el job `docker`
apuntando a un fichero inexistente.

**Al construir por primera vez aparecieron cinco bloqueos independientes en la imagen del API**,
ninguno visible hasta que alguien lo intentó:

| # | Bloqueo | Estado |
|---|---|---|
| 1 | **No compilaba.** `@ironloot/core` fuera del contexto de build → 8 errores `TS2307` | ✅ corregido — contexto en la raíz del monorepo |
| 2 | **Arrancaba y moría**: `npm install` deja `@ironloot/core` como **enlace simbólico**; aplanar a `/app` lo rompía | ✅ corregido — se conserva el árbol del monorepo |
| 3 | **`npm prune --production`** se llevaba el binario musl de `@css-inline` | ✅ corregido — no se poda, con el coste medido |
| 4 | **Prisma sin OpenSSL**: `libssl.so.1.1: No such file or directory` | ✅ corregido — `openssl` en las dos fases |
| 5 | **El motor de Prisma no carga** pese a estar presente en la imagen | ⛔ **ABIERTO** |

Los cuatro primeros estaban ahí desde siempre. **El healthcheck roto que motivó H-017 era el
quinto de la lista por orden de aparición: ni siquiera se llegaba a él.**

---

## Lista de comprobación FDGE

- [x] **¿Criterios de éxito verificados?** Tres de cinco.

  | # | Criterio | Resultado |
  |---|---|---|
  | 1 | Las cuatro imágenes construyen | ✅ las cuatro |
  | 2 | Cada imagen arranca y llega a `healthy` | ⚠️ **3 de 4** |
  | 3 | Los SSR sirven una página real | ✅ el healthcheck pide `/`: llegar a `healthy` **es** servir la página |
  | 4 | El job `docker` apunta a ficheros que existen | ⛔ **no hecho** — se detiene con el criterio 2 abierto |
  | 5 | `docker-compose up -d` sigue dejando los cuatro `healthy` | ✅ los ocho contenedores intactos |

- [x] **¿Efectos colaterales?** Ninguno sobre el entorno de desarrollo: `docker-compose` no se tocó
      y los ocho contenedores siguen `healthy`. Las imágenes de producción son artefactos nuevos.

- [x] **¿Convenciones respetadas?** Los tres Dockerfiles nuevos copian el patrón del API:
      multi-stage, usuario no-root `1001`, `NODE_ENV=production`.

- [x] **¿Sin artefactos de depuración?** Los cuatro contenedores `pt129-*` y la imagen intermedia
      `pt129-builder` eliminados.

- [ ] **¿Documentación actualizada?** **No** — pendiente hasta cerrar el bloqueo 5.

---

## Lo que sí quedó demostrado

### El healthcheck de los SSR se comprobó contra la realidad, no se copió

Antes de escribirlo se leyeron los healthchecks de los contenedores en marcha:

```
base    http://localhost:5174/
client  http://localhost:5175/
admin   http://localhost:3001/
```

Piden **`/`**, no un endpoint de salud — porque un SSR no tiene uno y lo que hay que comprobar es
que **sirve una página**. Copiar el patrón del API (`/api/v1/health`) habría sido un healthcheck
contra una ruta inexistente: **el mismo defecto de H-017, replicado tres veces**.

Y tiene una ventaja que se aprovechó: si `views/` o `public/` faltaran en la imagen, el healthcheck
lo detecta. Llegar a `healthy` **es** la prueba del escenario E3.

### Los guardas de configuración de producción funcionan

Al arrancar el API con configuración incompleta:

```
STARTUP CONFIGURATION ERRORS:
  - ADMIN_USERNAME must be set to a non-default value (not "admin") in production
  - ADMIN_TOTP_SECRET must be set (>=16 chars) in production
  - ADMIN_PASSWORD must be set to a strong non-default value in production
  - ALLOWED_ORIGINS must be explicitly set in production
```

No es un fallo: es `validate-startup-config` haciendo exactamente su trabajo. Buena señal, y queda
registrada.

### Tamaños medidos

```
ironloot-base:pt129     152MB
ironloot-client:pt129   151MB
ironloot-admin:pt129    156MB
ironloot-api:pt129      541MB   <- se lleva las dependencias de desarrollo (bloqueo 3)
```

Afinarlo está **declarado fuera de alcance**. Una imagen grande que arranca vale más que una
pequeña que no — aunque esta todavía no arranque.

---

## El bloqueo 5, descrito para quien lo retome

El motor de consultas **está en la imagen**:

```
$ docker run --rm ironloot-api:pt129 ls node_modules/.prisma/client/ | grep engine
libquery_engine-linux-musl-openssl-3.0.x.so.node
```

Y aun así Prisma no lo carga, listando entre las rutas buscadas la que lo contiene.

Dos cosas ya descartadas: **no es que falte** (está), y **no es la caché de capas** (se reconstruyó
con `--no-cache` y el motor aparece).

Queda por mirar: permisos efectivos bajo el usuario `ironloot`, y si `dist/` quedó compilado contra
una resolución de cliente distinta de la que hay en la imagen final.

---

## Delta real vs planificado

| # | Desviación | |
|---|---|---|
| 1 | **El riesgo R1 se quedó corto.** El plan preveía un problema con `@ironloot/core`. Eran **cinco** bloqueos independientes | El plan no era malo: era imposible saberlo sin construir, que es justamente lo que nadie había hecho |
| 2 | El healthcheck de los SSR **no** replica el del API | Se comprobó contra los contenedores en marcha. Replicarlo habría repetido H-017 |
| 3 | `npm prune --production` **se retira** en vez de arreglarse | Las dos alternativas fallan y están documentadas en el fichero. Coste medido |
| 4 | **PT-129 no se cierra** | El criterio 2 sigue abierto |

---

## Estado

**`IN_PROGRESS`, no `VALIDATION_PENDING`.**

H-017 **no** pasa a `CORREGIDA`: pasa a `CORREGIDA_PARCIAL`. Tres de sus cuatro piezas están
resueltas y verificadas arrancando; la del API sigue abierta con un bloqueo nuevo y localizado.

**Marcarlo como corregido sería exactamente el defecto que esta auditoría persigue**: declarar
verde algo que nadie ha visto funcionar.
