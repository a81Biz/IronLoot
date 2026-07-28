# ===========================================
# Iron Loot ADMIN — Production Dockerfile
# ===========================================
# PT-129 (PTSA H-017) — BASE, CLIENT y ADMIN no tenian imagen de produccion: solo `Dockerfile.dev`.
# Tres de los cuatro servicios carecian de artefacto desplegable.
#
# Patron heredado del `Dockerfile` del API: multi-stage, `npm prune --production`, usuario no-root.
#
# CON UNA DIFERENCIA QUE NO PUEDE OLVIDARSE: este servicio es SSR. `nest build` compila TypeScript a
# `dist/` y **no toca `views/` ni `public/`**. `main.ts` los resuelve con `join(__dirname, '..')`,
# es decir `/app/views` y `/app/public`. Una imagen que copie solo `dist/` arranca, PASA EL
# HEALTHCHECK, y devuelve 500 en la primera pagina que alguien pida.
#
# Por eso la verificacion de este PT exige pedir una PAGINA REAL, no solo el healthcheck.

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY src ./src

RUN npm run build

RUN npm prune --production

# Stage 2: Production
FROM node:20-alpine AS production

RUN addgroup -g 1001 -S ironloot && \
    adduser -S ironloot -u 1001

WORKDIR /app

COPY --from=builder --chown=ironloot:ironloot /app/dist ./dist
COPY --from=builder --chown=ironloot:ironloot /app/node_modules ./node_modules
COPY --from=builder --chown=ironloot:ironloot /app/package*.json ./

# Los estaticos del SSR. Sin esto la aplicacion arranca y no sirve una sola pagina.
COPY --chown=ironloot:ironloot views ./views
COPY --chown=ironloot:ironloot public ./public

ENV NODE_ENV=production

USER ironloot

EXPOSE 3001

# El healthcheck pide `/`, no un endpoint de salud: este servicio NO tiene uno, y lo que hay que
# comprobar de un SSR es que **sirve una pagina**. Es el mismo criterio que `docker-compose` usa hoy
# para los tres SSR, comprobado en los contenedores en marcha antes de escribir esto.
#
# Tiene una ventaja que conviene aprovechar: si `views/` o `public/` faltaran en la imagen, esto lo
# detecta. Un healthcheck contra un endpoint JSON no lo haria.
#
# `< 500` para distinguir degradado de muerto — y porque `/` puede responder 3xx legitimamente.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/', (r) => process.exit(r.statusCode < 500 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "dist/main"]
