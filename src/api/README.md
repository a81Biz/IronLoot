# 🎮 Iron Loot API

![CI Status](https://img.shields.io/badge/CI-Success-brightgreen)
![Coverage](https://img.shields.io/badge/Coverage-41%25-yellow)
![Version](https://img.shields.io/badge/version-0.2.3-blue)

...

| `NODE_ENV` | Entorno (development, production) | ❌ | development |
| `PORT` | Puerto de la API | ❌ | 3000 |
| `RATE_LIMIT_TTL` | Ventana de tiempo en segundos | ❌ | 60 |
| `RATE_LIMIT_MAX` | Max requests por ventana. **Nota**: En `development` esto se ignora y se usa 60 req/min por defecto para facilitar pruebas. En `production` es más estricto (5 req/min). | ❌ | 100 |
![License](https://img.shields.io/badge/license-MIT-green)

Backend de la plataforma de subastas Iron Loot. Construido con NestJS, Prisma y PostgreSQL. y Redis.

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
| `ShipmentsModule` | Tracking de envíos | ✅ |
| `RatingsModule` | Calificaciones y reputación | ✅ |
| `DisputesModule` | Resolución de disputas | ✅ |
| `NotificationsModule` | Notificaciones (In-App) | ✅ |
| `WalletModule` | Cuenta de usuario, saldo, retenciones | ✅ |
| `WatchlistModule` | Lista de seguimiento de subastas | ✅ |
| `UsersModule (Settings)` | Configuración de usuario (idioma, notificaciones) | ✅ |

---

## 📚 Guía: Agregar Módulos

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

### 4. Integrar Observabilidad

Usa los decoradores de `src/common/observability` para asegurar logs y auditoría:

```typescript
import { Log, AuditedAction } from '@/common/observability/decorators';
import { AuditEventType, EntityType } from '@/common/observability/constants';

@Controller('bids')
export class BidsController {

  // @Log: Para endpoints de lectura o no críticos
  @Get()
  @Log() 
  findAll() { ... }

  // @AuditedAction: Para cambios de estado (crear, editar, borrar)
  @Post()
  @AuditedAction(
    AuditEventType.BID_PLACED,    // Qué pasó
    EntityType.AUCTION,           // Sobre qué entidad
    (args, result) => args[0].id, // Cómo obtener el ID de la entidad
    ['amount']                    // Qué campos guardar en el log (payload)
  )
  create(@Body() dto: CreateBidDto) { ... }
}
```

### 5. Implementar Tests (Obligatorio)

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

## 🌍 Variables de Entorno

| Variable | Descripción | Requerido | Default |
|----------|-------------|-----------|---------|
| `DATABASE_URL` | Connection string PostgreSQL | ✅ | - |
| `JWT_SECRET` | Clave secreta para firmar tokens | ✅ | - |
| `NODE_ENV` | Entorno (development, production) | ❌ | development |
| `PORT` | Puerto de la API | ❌ | 3000 |
| `RATE_LIMIT_TTL` | Ventana de tiempo en segundos | ❌ | 60 |
| `RATE_LIMIT_MAX` | Max requests por ventana | ❌ | 100 |

## 🚀 Deployment

### Producción con Docker

1.  **Construir imagen optimizada**:
    ```bash
    docker build -t ironloot-api .
    ```
2.  **Correr contenedor**:
    ```bash
    docker run -d -p 3000:3000 --env-file .env ironloot-api
    ```

## 📊 Monitoreo y Observabilidad

La plataforma incluye endpoints y herramientas para monitoreo:

-   **Health Check**: `GET /health` (Estado general)
-   **Detailed Health**: `GET /health/detailed` (Estado de dependencias: DB, Redis)
-   **Diagnósticos**: `GET /diagnostics` (Solo DEV/Admin - Logs y errores recientes)
-   **Trace ID**: Cada request incluye un header `x-trace-id` para trazabilidad distribuida.



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

## 🛠 Troubleshooting Común

**Error: `PrismaClientInitializationError: Can't reach database server at localhost:5432`**
*   Causa: No has levantado la base de datos o el puerto no está expuesto.
*   Solución: `docker compose up -d db` y espera unos segundos.

**Error: `Module not found` en tests**
*   Causa: Imports incorrectos o falta regenerar Prisma.
*   Solución: `npm run db:generate`.

---

## 📄 Licencia

Este proyecto está bajo la licencia [MIT](./LICENSE).


## Mailhog (Local Email Testing)

This project uses **Mailhog** to capture emails sent by the API during development. This prevents spamming real email addresses and allows you to test email contents easily.

### Accessing Mailhog
Once the Docker containers are running (`docker-compose up`), you can access the Mailhog Web UI at:

**[http://localhost:8025](http://localhost:8025)**

### How to use
1. Trigger an action in the application that sends an email (e.g., Register a new user, Request password reset).
2. Go to the Mailhog UI URL above.
3. You will see the email in the inbox immediately.
4. Click on the email to view its headers, plain text content, and HTML content.

### Configuration
The API connects to Mailhog using the hostname `mailhog` on port `1025` (SMTP). This is configured in `docker-compose.yml`.

## 💳 Integraciones de Pago y Logística
- **Integración de Pagos**:
  - `PaymentsModule`: Controladores y servicios para manejar pagos con MercadoPago y PayPal. Usa `PaymentProvider` interface para abstracción. Soporta **MXN**.

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
3. Configurar Webhook Secret para validación de seguridad:
   ```bash
   MERCADO_PAGO_WEBHOOK_SECRET=tu_webhook_secret
   ```

### PayPal
1. Obtener `CLIENT_ID` y `CLIENT_SECRET`.
2. Configurar en `.env`:
   ```bash
   PAYPAL_CLIENT_ID=tu_client_id
   PAYPAL_BUSINESS_EMAIL=email_vendedor_paypal@example.com
   PAYPAL_MODE=sandbox # o production
   ```
3. Configurar URLs base para redirecciones y webhooks:
   ```bash
   API_BASE_URL=https://api.tu-dominio.com
   WEB_BASE_URL=https://tu-dominio.com
   ```

### Verificación de Integración

> **PT-133** — `POST /payments/checkout` fue **retirado**: no lo invocaba ningún cliente. Ver
> ADR-047. Lo que sigue describe el flujo vigente.

Qué pasarelas se ofrecen al usuario **se deriva de la configuración real** (ADR-026): un proveedor
sin credenciales no aparece. Se consulta con:

```
GET /api/v1/payments/providers   ->   {"providers":["MERCADO_PAGO","PAYPAL"]}
```

El depósito se inicia con `POST /api/v1/payments/initiate`, que abre el **ciclo de pago** (PT-080)
con las garantías de PT-087: traza completa de cada paso, vía garantizada por consulta periódica si
la notificación no llega, y expiración a las `PAYMENT_EXPIRATION_HOURS`. El detalle está en
`docs-v2/4-ingenieria/Catalogo-de-API.md` y en los ADR-034 a ADR-040.

- **Sistemas de Calificación**:
  - `RatingsModule`: Permite calificar transacciones una vez que el envío ha sido entregado (`DELIVERED`).
  - Lógica de negocio: Un solo rating por rol (comprador/vendedor) por orden. Reputación pública.
