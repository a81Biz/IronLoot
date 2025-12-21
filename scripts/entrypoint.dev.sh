#!/bin/sh
# ===========================================
# Iron Loot - Development Entrypoint
# ===========================================
# Waits for database and runs migrations before starting the app

set -e

echo "🔄 Waiting for database..."

# Wait for PostgreSQL to be ready
until nc -z db 5432; do
  echo "⏳ Database not ready, waiting..."
  sleep 2
done

echo "✅ Database is ready!"

# Run Prisma migrations
echo "🔄 Running database migrations..."
npx prisma migrate deploy || npx prisma db push --accept-data-loss

echo "✅ Migrations complete!"

# Start the application
echo "🚀 Starting application..."
exec npm run start:dev
