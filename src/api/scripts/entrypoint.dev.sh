#!/bin/bash
# ===========================================
# Iron Loot - Development Entrypoint
# ===========================================
set -e

echo "=========================================="
echo "🚀 Iron Loot API Starting..."
echo "=========================================="
echo ""

echo "🔄 Waiting for database..."
RETRIES=15
until nc -z db 5432 || [ $RETRIES -eq 0 ]; do
  echo "⏳ Database not ready ($RETRIES retries left)"
  RETRIES=$((RETRIES-1))
  sleep 2
done

if [ $RETRIES -eq 0 ]; then
  echo "❌ Database not available"
  exit 1
fi
echo "✅ Database is ready!"
echo ""

# Link @ironloot/core from monorepo workspace mount (PT-019 fix)
# packages/core is mounted at /packages/core via docker-compose volume
if [ -d "/packages/core" ]; then
  echo "🔄 Linking @ironloot/core workspace package..."
  mkdir -p /app/node_modules/@ironloot
  # Build core if dist doesn't exist yet
  if [ ! -f "/packages/core/dist/index.js" ]; then
    echo "  Building packages/core..."
    cd /packages/core && npm install --ignore-scripts && npm run build && cd /app
  fi
  ln -sfn /packages/core /app/node_modules/@ironloot/core
  echo "✅ @ironloot/core linked!"
else
  echo "⚠️ /packages/core not found — @ironloot/core will not be available"
fi
echo ""

# CRITICAL: Generate Prisma client (required after volume mount)
echo "🔄 Generating Prisma client..."
npx prisma generate
echo "✅ Prisma client generated!"
echo ""

# Apply database schema
#
# PT-127 (PTSA H-014) — Por migracion, y si falla el arranque falla.
#
# Antes esto era `prisma db push --accept-data-loss`, con `migrate deploy` de respaldo y un `echo`
# tragandose el error del respaldo. Tres consecuencias, todas medidas:
#
#   1. `db push` no escribe `_prisma_migrations`, asi que las 23 migraciones NUNCA se ejecutaron.
#      Aplicadas a una base limpia producian otro esquema: el cliente Prisma fallaba en 3 de 4
#      sondas y `payments.reference` perdia la unicidad que impide acreditar un deposito dos veces.
#   2. El segundo `||` convertia cualquier fallo en un mensaje. El arranque SIEMPRE parecia exitoso.
#   3. `--accept-data-loss` se ejecutaba solo, en cada arranque.
#
# Coste consciente: quien edite `schema.prisma` ya no vera su cambio aplicado con reiniciar.
# Tiene que generar migracion (`npm run db:migrate`). Ese atajo es justamente el que produjo H-014.
echo "🔄 Applying database schema (migrations)..."
npx prisma migrate deploy
echo "✅ Database schema applied!"
echo ""

echo "🚀 Starting NestJS..."
echo "=========================================="
exec npm run start:dev
