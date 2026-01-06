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
- [Enlaces de Interés](#enlaces-de-interés)

---

## 🔗 Enlaces de Interés

| Aplicación | URL | Credenciales (Dev) |
|------------|-----|--------------------|
| **API Swagger** | [http://localhost:3000/docs](http://localhost:3000/docs) | - |
| **API Root** | [http://localhost:3000](http://localhost:3000) | - |
| **Admin BD (pgAdmin)** | [http://localhost:5050](http://localhost:5050) | `admin@ironloot.com` / `admin` |

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
| `BidsModule` | Pujas, validaciones en tiempo real | ✅ |
| `OrdersModule` | Órdenes post-subasta | ✅ |
| `PaymentsModule` | Pagos (PayPal/Mercado Pago Sandbox) | ✅ |

### ⏳ Pendientes

| Módulo | Descripción | Estado |
|--------|-------------|--------|
| `ShipmentsModule` | Tracking de envíos | ✅ |
| `RatingsModule` | Calificaciones y reputación | ✅ |
| `DisputesModule` | Resolución de disputas | ⏳ |
| `NotificationsModule` | Notificaciones | ⏳ |

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

## 💳
- **Integración de Pagos**:
  - `PaymentsModule`: Controladores y servicios para manejar pagos con MercadoPago y PayPal. Usa `PaymentProvider` interface para abstracción. Actualmente funciona en modo **MOCK** (simulación) por defecto.

- **Logística y Envíos**:
  - `ShipmentsModule`: Gestión de envíos para órdenes pagadas. Permite al vendedor crear envíos y a ambas partes ver el estado.
  - Soporta múltiples proveedores (DHL, FedEx, etc.) y estados de envío.

Para activar la integración real con los proveedores:

### Mercado Pago
1. Obtener `ACCESS_TOKEN` del panel de desarrolladores.
2. Configurar en `.env`:
   ```bash
   MERCADO_PAGO_ACCESS_TOKEN=tu_access_token
   ```
3. Implementar la llamada al SDK en `src/modules/payments/providers/mercadopago.provider.ts`.

### PayPal
1. Obtener `CLIENT_ID` y `CLIENT_SECRET`.
2. Configurar en `.env`:
   ```bash
   PAYPAL_CLIENT_ID=tu_client_id
   PAYPAL_CLIENT_SECRET=tu_client_secret
   ```
3. Implementar la llamada al SDK en `src/modules/payments/providers/paypal.provider.ts`.

### Verificación de Integración
El endpoint `POST /payments/checkout` retorna un campo `isIntegrated` que indica si las credenciales están configuradas:

```json
{
  "externalId": "...",
  "redirectUrl": "...",
  "isIntegrated": false // false = MOCK, true = REAL
}
```

- **Sistemas de Calificación**:
  - `RatingsModule`: Permite calificar transacciones una vez que el envío ha sido entregado (`DELIVERED`).
  - Lógica de negocio: Un solo rating por rol (comprador/vendedor) por orden. Reputación pública.
