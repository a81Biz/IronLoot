# PT-129 — Cambios de especificación

## API HTTP · Modelo de datos · Contratos de tipos · Eventos

**Ninguno.** No se toca código de aplicación. Ni una ruta, ni un DTO, ni una tabla.

Conviene decirlo con claridad porque es tentador «arreglar» el 404 añadiendo un alias `/health`
fuera del prefijo. **No se hace.** El prefijo global es correcto; lo que está mal es el fichero que
no lo respeta. Añadir un alias sería adaptar la aplicación a su documentación equivocada.

---

## Contrato de las imágenes de contenedor

### `src/api/Dockerfile` — healthcheck

```diff
  HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
-     CMD node -e "require('http').get('http://localhost:3000/health', \
-         (r) => process.exit(r.statusCode === 200 ? 0 : 1))"
+     CMD node -e "require('http').get('http://localhost:3000/api/v1/health', \
+         (r) => process.exit(r.statusCode < 500 ? 0 : 1)).on('error', () => process.exit(1))"
```

Tres cambios, cada uno con motivo:

| Cambio | Motivo |
|---|---|
| `/health` → `/api/v1/health` | `main.ts:77` fija el prefijo global. La ruta anterior devuelve 404 |
| `=== 200` → `< 500` | Un 503 por dependencia degradada no es un contenedor muerto. Con el criterio anterior, un Redis caído tira el contenedor |
| `+ .on('error', …)` | Sin manejador, un fallo de conexión mata el proceso de otra forma y el diagnóstico empeora |

### Imágenes nuevas

| Fichero | Estado |
|---|---|
| `src/admin/Dockerfile` | **nuevo** |
| `src/apps/base/Dockerfile` | **nuevo** |
| `src/apps/client/Dockerfile` | **nuevo** |

Patrón heredado del API: multi-stage, `npm prune --production`, usuario no-root `1001`,
`NODE_ENV=production`, healthcheck en su puerto (3001 · 5174 · 5175).

**Diferencia obligatoria respecto al API**: los tres son SSR y necesitan `views/` (plantillas
Nunjucks) y `public/` (CSS y JS de navegador) dentro de la imagen. `npm run build` compila
TypeScript a `dist/` y **no toca ninguna de las dos carpetas**.

### Contexto de build

`@ironloot/core` vive fuera del contexto de cada servicio. En desarrollo lo enlaza
`entrypoint.dev.sh:29-41` con un `ln -sfn`; **en producción no existe ese paso**. El build debe
resolverlo (`design.md` § D4).

PT-126 acotó el contexto de Docker a propósito; lo que se haga aquí debe respetarlo y no volver a
meter el monorepo entero.

---

## `docker-compose.yml`

La definición del healthcheck se retira y se **hereda** de la imagen. **Comportamiento observable:
sin cambios** — los cuatro servicios deben seguir llegando a `healthy` exactamente como hoy. Es la
primera comprobación de regresión.

---

## `.github/workflows/ci.yml` — job `docker`

```diff
-         file: ./Dockerfile
-         tags: ironloot-api:${{ github.sha }}
+         # los cuatro servicios, con sus rutas reales
+         # + arranque de cada imagen y comprobacion de que llega a healthy
```

El paso de arranque es el que cierra la causa raíz. Sin él, sólo se comprueba que la imagen
**construye** — y construir no es arrancar. El healthcheck roto de hoy habría pasado una
verificación de sólo-build sin despeinarse.

---

## Documentación que hay que actualizar

| Documento | Qué |
|---|---|
| `docs/enterprise-documentation/06-Backend-Architecture.md` | Que los cuatro servicios tienen imagen de producción y cómo se construyen |
| `CLAUDE.md` § Full Stack via Docker | Sólo si el uso diario cambia. **No debería** |

---

## Lo que este PT hace visible y no arregla

Que **no existe un `docker-compose` de producción**. Hay imágenes, pero no una composición que las
orqueste con sus variables, redes y volúmenes. Se anota; decidir el modelo de despliegue no es una
corrección de defecto.
