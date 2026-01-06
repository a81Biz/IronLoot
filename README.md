# 🎮 Iron Loot API

Plataforma de subastas en línea construida con NestJS, PostgreSQL y Redis.

## 📋 Tabla de Contenidos

- [Requisitos](#requisitos)
- [Inicio Rápido](#inicio-rápido)
- [Arquitectura](#arquitectura)
- [Módulos Implementados](#módulos-implementados)
- [Observabilidad](#observabilidad)
- [API Endpoints](#api-endpoints)
- [Base de Datos](#base-de-datos)
- [Scripts Disponibles](#scripts-disponibles)
- [Desarrollo](#desarrollo)
- [Guía: Agregar Módulos](#guía-agregar-módulos)

---

## 📦 Requisitos

- Docker Desktop 4.x+
- Docker Compose v2+
- Node.js 20+ (solo para desarrollo local y tests)
- Git

---

## 🚀 Inicio Rápido

### Opción A: Todo en Docker (Recomendado para ver funcionando)

```bash
# 1. Clonar e iniciar
git clone <repo-url>
cd iron-loot
cp .env.example .env

# 2. Levantar servicios (BD, Redis, API)
docker compose up -d

# 3. La API estará disponible en unos segundos
curl http://localhost:3000/api/v1/health
```

### Opción B: Desarrollo Local (Híbrido)

Si vas a desarrollar, levanta la infraestructura en Docker y corre la API en tu máquina.

```bash
# 1. Levantar solo infraestructura (BD y Redis)
docker compose up -d db redis

# 2. Instalar dependencias
npm install

# 3. Generar cliente de Prisma
npm run db:generate

# 4. Migrar base de datos
npm run db:migrate

# 5. Iniciar API en modo desarrollo
npm run start:dev
```

---

## 🏗️ Arquitectura

```
iron-loot/
├── prisma/
│   └── schema.prisma          # Esquema de base de datos
├── src/
│   ├── common/                # Código compartido (Decoradores, Excepciones, Guards)
│   ├── database/              # Módulo de base de datos
│   └── modules/               # Módulos de negocio
│       ├── auctions/          # ✅ Gestión de subastas
│       ├── auth/              # ✅ Autenticación (JWT)
│       ├── users/             # ✅ Gestión de usuarios
│       └── ...
├── test/
│   ├── core/                  # Helpers para tests de integración
│   ├── e2e/                   # Tests End-to-End
│   └── unit/                  # Tests Unitarios
└── docker-compose.yml
```

---

## 📦 Módulos Implementados

### ✅ Core & Negocio

| Módulo | Descripción | Estado |
|--------|-------------|--------|
| `ObservabilityModule` | Logging estructurado, errores, métricas | ✅ |
| `DatabaseModule` | Conexión Prisma a PostgreSQL | ✅ |
| `AuthModule` | JWT, Registro, Login, Roles | ✅ |
| `UsersModule` | Perfiles, Vendedores, Auditoría | ✅ |
| `AuctionsModule` | CRUD Subastas, Estados (Draft/Published) | ✅ |

### ⏳ Pendientes

| Módulo | Descripción | Estado |
|--------|-------------|--------|
| `BidsModule` | Pujas, validaciones en tiempo real | ⏳ |
| `OrdersModule` | Órdenes post-subasta | ⏳ |
| `PaymentsModule` | Integración de pagos | ⏳ |
| `ShipmentsModule` | Tracking de envíos | ⏳ |
| `RatingsModule` | Calificaciones | ⏳ |
| `DisputesModule` | Resolución de disputas | ⏳ |

---

## � Guía: Agregar Módulos

Sigue estos pasos para añadir un nuevo módulo de negocio (ej. `BidsModule`).

### 1. Estructura de Carpetas

Crea la carpeta en `src/modules/bids/`:
```
src/modules/bids/
├── dto/                    # Data Transfer Objects
│   ├── create-bid.dto.ts
│   └── index.ts
├── bids.controller.ts      # Endpoints
├── bids.service.ts         # Lógica de negocio
└── bids.module.ts          # Definición del módulo
```

### 2. Crear el Módulo

```typescript
// src/modules/bids/bids.module.ts
import { Module } from '@nestjs/common';
import { DatabaseModule } from '@/database/database.module';
import { BidsController } from './bids.controller';
import { BidsService } from './bids.service';

@Module({
  imports: [DatabaseModule], // Importar DatabaseModule si usas Prisma
  controllers: [BidsController],
  providers: [BidsService],
  exports: [BidsService], // Exportar si otros módulos lo necesitan
})
export class BidsModule {}
```

### 3. Registrar en AppModule

Añádelo en `src/app.module.ts`:
```typescript
import { BidsModule } from './modules/bids/bids.module';

@Module({
  imports: [
    // ... otros módulos
    BidsModule,
  ],
})
export class AppModule {}
```

### 4. Implementar Tests (Obligatorio)

**Unitarios (`test/unit/bids/`)**:
Debes crear tests para Service y Controller isolados (mockeando dependencias).
Ver ejemplos en `test/unit/auctions/`.

**End-to-End (`test/e2e/bids.e2e-spec.ts`)**:
Usa el `TestApp` y `AuthHelper` para probar el flujo completo.

```typescript
// Ejemplo E2E rápido
describe('Bids (e2e)', () => {
    // ... setup TestApp ...
    it('should place a bid', async () => {
        const user = await authHelper.createAuthenticatedUser();
        // ... request ...
    });
});
```

---

## 🧪 Testing

Para asegurar la integridad de la aplicación, ejecutamos dos tipos de tests.

### Tests Unitarios
Prueban la lógica aislada de Servicios y Controladores.
```bash
npm test
```

### Tests E2E (Integración)
Prueban el flujo completo API -> BD -> Respuesta.
**Requiere que la BD esté corriendo en Docker (`docker compose up -d db`).**

```bash
npm run test:e2e
```

Para correr un test específico:
```bash
npm run test:e2e test/e2e/auctions.e2e-spec.ts
```

---

## � Troubleshooting Común

**Error: `PrismaClientInitializationError: Can't reach database server at localhost:5432`**
*   Causa: No has levantado la base de datos o el puerto no está expuesto.
*   Solución: `docker compose up -d db` y espera unos segundos.

**Error: `Module not found` en tests**
*   Causa: Imports incorrectos o falta regenerar Prisma.
*   Solución: `npm run db:generate`.

---

## 📄 Licencia

MIT
