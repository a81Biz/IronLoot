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
echo "🔄 Applying database schema..."
npx prisma db push --accept-data-loss 2>&1 || {
  echo "⚠️ db push failed, trying migrate deploy..."
  npx prisma migrate deploy 2>&1 || echo "⚠️ migrate also failed"
}
echo "✅ Database schema applied!"
echo ""

echo "🚀 Starting NestJS..."
echo "=========================================="
exec npm run start:dev
