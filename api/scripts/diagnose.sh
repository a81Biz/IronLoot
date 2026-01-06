#!/bin/bash
# ===========================================
# Iron Loot - Diagnostic Script
# ===========================================
# Run this to diagnose startup issues

echo "=========================================="
echo "🔍 IRON LOOT DIAGNOSTICS"
echo "=========================================="
echo ""

# Check if containers are running
echo "📦 Container Status:"
docker compose ps
echo ""

# Check API logs (last 50 lines)
echo "📋 API Logs (last 50 lines):"
echo "------------------------------------------"
docker compose logs api --tail=50 2>&1
echo ""

# Check if database is accessible
echo "🗄️ Database Status:"
docker compose exec -T db pg_isready -U ironloot -d ironloot_db 2>&1 || echo "Database not ready"
echo ""

# Check if API port is listening
echo "🔌 Port Check:"
docker compose exec -T api sh -c "netstat -tlnp 2>/dev/null | grep 3000 || echo 'Port 3000 not listening'"
echo ""

# Check for TypeScript compilation errors
echo "🔧 TypeScript Compilation Check:"
docker compose exec -T api sh -c "npx tsc --noEmit 2>&1 | head -50" || echo "Cannot run tsc"
echo ""

# Check Prisma
echo "📊 Prisma Status:"
docker compose exec -T api sh -c "npx prisma db push --accept-data-loss 2>&1 | tail -20" || echo "Prisma check failed"
echo ""

echo "=========================================="
echo "🏁 Diagnostics Complete"
echo "=========================================="
