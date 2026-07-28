# ===========================================
# Iron Loot API - Production Dockerfile
# ===========================================
# Multi-stage build for optimized production image

# ⚠️ CONTEXTO DE BUILD: LA RAIZ DEL MONOREPO, no `src/api`.
#
#     docker build -f src/api/Dockerfile -t ironloot-api .
#
# PT-129 (PTSA H-017) — Esta imagen NO COMPILABA. Medido:
#
#     src/modules/wallet/wallet.service.ts:10:35 - error TS2307:
#       Cannot find module '@ironloot/core' or its corresponding type declarations.
#     Found 8 error(s).
#
# `package.json` declara `"@ironloot/core": "file:../packages/core"`, y con el contexto en
# `src/api` esa ruta queda FUERA. En desarrollo no se notaba: `entrypoint.dev.sh` enlaza el paquete
# a mano con un `ln -sfn` (lineas 29-41). **En produccion no habia equivalente.**
#
# Nadie lo habia visto porque nadie habia construido nunca esta imagen — el job `docker` de CI
# apuntaba ademas a un `./Dockerfile` inexistente y jamas llego a ejecutarse.
#
# Se mantiene el arbol del monorepo dentro de la imagen para que `file:../packages/core` resuelva
# igual que fuera. La alternativa —empaquetar el core y publicarlo— es mas limpia a largo plazo y
# exige un registro de paquetes que hoy no existe.

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /repo

# Install build dependencies
# `openssl` no es opcional: sin el, `prisma generate` no detecta OpenSSL 3 y emite el motor de
# OpenSSL 1.1, que alpine moderno no tiene. El contenedor moria al conectar con:
#   Error loading shared library libssl.so.1.1
RUN apk add --no-cache python3 make g++ openssl

# El `tsconfig` compartido del monorepo: tanto CORE como el API lo extienden.
COPY tsconfig.base.json ./

# La libreria compartida primero: `file:../packages/core` la necesita presente y compilada.
COPY src/packages/core ./src/packages/core
RUN cd src/packages/core && npm install --ignore-scripts && npm run build

# Copy package files
COPY src/api/package*.json ./src/api/

WORKDIR /repo/src/api

# Install all dependencies for build — ahora `file:../packages/core` resuelve
RUN npm install

# El binario musl de `@css-inline`, explicito.
#
# Lo arrastra el adaptador de Handlebars del mailer. La variante existe en `package-lock.json`,
# pero npm sobre alpine no la resuelve sola, y el contenedor moria al arrancar con:
#
#     Error: Cannot find module '@css-inline/css-inline-linux-x64-musl'
#
# SUPOSICION DECLARADA: esta imagen es linux/amd64 sobre musl (alpine). Si algun dia se construye
# para arm64, hay que cambiar esta linea — y fallara ruidosamente al arrancar, que es como debe ser.
RUN npm install --no-save @css-inline/css-inline-linux-x64-musl

# Copy Prisma schema and generate client
COPY src/api/prisma ./prisma
RUN npx prisma generate

# Copy source and config files
COPY src/api/tsconfig*.json ./
COPY src/api/nest-cli.json ./
COPY src/api/src ./src

# Build the application
RUN npm run build

# NO se podan las dependencias, y es una decision, no un olvido.
#
# Aqui habia `npm prune --production`. Se llevaba por delante los binarios opcionales por
# plataforma. Medido:
#
#     Error: Cannot find module '@css-inline/css-inline-linux-x64-musl'
#
# Lo arrastra el adaptador de Handlebars del mailer: la poda deja el paquete padre y se lleva su
# binario musl. El contenedor construia y moria al arrancar. Defecto PREEXISTENTE — el `prune`
# estaba aqui desde siempre y nunca se vio, porque el build fallaba antes por `@ironloot/core`.
#
# Se probaron dos salidas y las dos fallan:
#   `npm install --omit=dev`                  -> dispara el `prepare` (`husky install`), que es
#                                                dependencia de desarrollo. exit 127.
#   `npm install --omit=dev --ignore-scripts` -> se salta tambien el `postinstall` de Prisma y
#                                                deja el cliente generado a medias.
#
# Coste: la imagen se lleva las dependencias de desarrollo. Es mas grande de lo necesario, esta
# MEDIDO en la evidencia de PT-129, y afinarlo esta declarado fuera de alcance. Una imagen grande
# que arranca vale mas que una pequena que no.

# Stage 2: Production
FROM node:20-alpine AS production

# `openssl` en la imagen FINAL, no solo en el builder.
#
# El sexto y ultimo bloqueo de PT-129, y el mas sutil de todos. El cliente Prisma se genera para el
# motor que detecta EN EL BUILD (`linux-musl-openssl-3.0.x`, porque alli si estaba openssl), pero
# vuelve a detectar EN ARRANQUE. Sin el binario `openssl` en la imagen final, la deteccion fallaba
# y pedia `linux-musl` — el motor de OpenSSL 1.1, que no existe aqui:
#
#     Prisma Client was generated for "linux-musl-openssl-3.0.x",
#     but the actual deployment required "linux-musl".
#
# `libssl.so.3` ya estaba (viene con node:20-alpine). Lo que faltaba era el binario con el que
# Prisma pregunta la version.
RUN apk add --no-cache openssl

# Create non-root user for security
RUN addgroup -g 1001 -S ironloot && \
    adduser -S ironloot -u 1001

# Se conserva el arbol del monorepo TAMBIEN en produccion, y no es cosmetica.
#
# `npm install` resuelve `"@ironloot/core": "file:../packages/core"` creando un **enlace
# simbolico** en `node_modules/@ironloot/core`. Si aqui se aplanara a `/app`, ese enlace apuntaria
# a un sitio que no existe y el contenedor moriria al arrancar con:
#
#     Error: Cannot find module '@ironloot/core'
#
# Paso de verdad al verificar este PT: la imagen CONSTRUIA y no ARRANCABA. Es la razon por la que
# la aceptacion de PT-129 exige arrancar cada imagen y no solo construirla.
WORKDIR /repo/src/api

# La libreria compartida, al mismo sitio relativo que en el builder: es a donde apunta el enlace.
COPY --from=builder --chown=ironloot:ironloot /repo/src/packages/core /repo/src/packages/core

# Copy built application
COPY --from=builder --chown=ironloot:ironloot /repo/src/api/dist ./dist
COPY --from=builder --chown=ironloot:ironloot /repo/src/api/node_modules ./node_modules
COPY --from=builder --chown=ironloot:ironloot /repo/src/api/package*.json ./

# El esquema, que NO es solo del build.
#
# Quinto bloqueo de PT-129, y el mas escondido: el motor de consultas estaba en la imagen, con
# permisos correctos, y Prisma seguia sin cargarlo — listando entre las rutas buscadas justo la que
# lo contenia. La causa era otra: **`schema.prisma` no viajaba a la imagen**. El cliente lo lee en
# ARRANQUE para resolver que motor le toca; sin el, no resuelve ninguno.
COPY --from=builder --chown=ironloot:ironloot /repo/src/api/prisma ./prisma

# Set environment
ENV NODE_ENV=production

# Use non-root user
USER ironloot

# Expose port
EXPOSE 3000

# Health check
#
# PT-129 (PTSA H-017) — Tres correcciones, cada una con motivo:
#
#   /health -> /api/v1/health   `main.ts` fija setGlobalPrefix('api') mas versionado. La ruta
#                               anterior devolvia 404, asi que este contenedor habria quedado
#                               `unhealthy` PARA SIEMPRE con la aplicacion funcionando.
#   === 200 -> < 500            Un 503 por dependencia degradada NO es un contenedor muerto. Con el
#                               criterio anterior, un Redis caido tiraba el contenedor entero.
#   + .on('error', ...)         Sin manejador, un fallo de conexion mata el proceso del healthcheck
#                               de otra forma y el diagnostico empeora.
#
# El healthcheck de `docker-compose` ya estaba corregido. Se arreglo ahi y no se propago aqui —
# porque esta imagen NUNCA se habia construido ni arrancado.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/v1/health', (r) => process.exit(r.statusCode < 500 ? 0 : 1)).on('error', () => process.exit(1))"

# Start application
CMD ["node", "dist/main"]
