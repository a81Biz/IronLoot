#!/bin/bash
# ============================================
# IRON LOOT - Script de Correcciones
# ============================================
# Ejecutar desde la raíz del repositorio iron-loot
# Uso: chmod +x iron-loot-fixes.sh && ./iron-loot-fixes.sh
# ============================================

set -e  # Exit on error

echo "🔧 Iniciando correcciones de Iron Loot..."
echo ""

# --------------------------------------------
# 1. Eliminar archivos duplicados
# --------------------------------------------
echo "📁 Eliminando archivos duplicados..."

# Decoradores duplicados
if [ -f "src/modules/auth/decorators/current-user.decorator.ts" ]; then
    rm src/modules/auth/decorators/current-user.decorator.ts
    echo "   ✓ Eliminado: current-user.decorator.ts"
fi

if [ -f "src/modules/auth/decorators/public.decorator.ts" ]; then
    rm src/modules/auth/decorators/public.decorator.ts
    echo "   ✓ Eliminado: public.decorator.ts"
fi

# Interfaces duplicadas
if [ -f "src/modules/auth/interfaces/auth.interface.ts" ]; then
    rm src/modules/auth/interfaces/auth.interface.ts
    echo "   ✓ Eliminado: auth.interface.ts"
fi

if [ -f "src/modules/auth/interfaces/index.ts" ]; then
    rm src/modules/auth/interfaces/index.ts
    echo "   ✓ Eliminado: interfaces/index.ts"
fi

# Eliminar directorio interfaces si quedó vacío
if [ -d "src/modules/auth/interfaces" ] && [ -z "$(ls -A src/modules/auth/interfaces)" ]; then
    rmdir src/modules/auth/interfaces
    echo "   ✓ Eliminado: directorio interfaces/ (vacío)"
fi

echo ""

# --------------------------------------------
# 2. Corregir tsconfig.json
# --------------------------------------------
echo "📝 Corrigiendo tsconfig.json..."

if [ -f "tsconfig.json" ]; then
    # Crear backup
    cp tsconfig.json tsconfig.json.backup
    
    # Usar sed para corregir el exclude (remover "test" y "**/*.spec.ts")
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' 's/"exclude": \["node_modules", "dist", "test", "\*\*\/\*.spec.ts"\]/"exclude": ["node_modules", "dist"]/' tsconfig.json
    else
        # Linux
        sed -i 's/"exclude": \["node_modules", "dist", "test", "\*\*\/\*.spec.ts"\]/"exclude": ["node_modules", "dist"]/' tsconfig.json
    fi
    
    echo "   ✓ tsconfig.json actualizado"
    echo "   ℹ Backup creado: tsconfig.json.backup"
fi

echo ""

# --------------------------------------------
# 3. Corregir import de supertest en e2e test
# --------------------------------------------
echo "📝 Corrigiendo import de supertest en tests e2e..."

if [ -f "test/e2e/auth.e2e-spec.ts" ]; then
    # Crear backup
    cp test/e2e/auth.e2e-spec.ts test/e2e/auth.e2e-spec.ts.backup
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/import request from 'supertest'/import * as request from 'supertest'/" test/e2e/auth.e2e-spec.ts
    else
        # Linux
        sed -i "s/import request from 'supertest'/import * as request from 'supertest'/" test/e2e/auth.e2e-spec.ts
    fi
    
    echo "   ✓ auth.e2e-spec.ts actualizado"
fi

echo ""

# --------------------------------------------
# 4. Mostrar resumen
# --------------------------------------------
echo "============================================"
echo "✅ Correcciones aplicadas exitosamente!"
echo "============================================"
echo ""
echo "Archivos modificados:"
echo "  - tsconfig.json"
echo "  - test/e2e/auth.e2e-spec.ts"
echo ""
echo "Archivos eliminados:"
echo "  - src/modules/auth/decorators/current-user.decorator.ts"
echo "  - src/modules/auth/decorators/public.decorator.ts"
echo "  - src/modules/auth/interfaces/auth.interface.ts"
echo "  - src/modules/auth/interfaces/index.ts"
echo ""
echo "Próximos pasos:"
echo "  1. Revisa los cambios: git status"
echo "  2. Verifica que compile: npm run build"
echo "  3. Ejecuta tests: npm test"
echo "  4. Commit: git add -A && git commit -m 'fix: remove duplicate files and fix configurations'"
echo "  5. Push: git push origin main"
echo ""
