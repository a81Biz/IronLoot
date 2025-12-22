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

---

## 📦 Requisitos

- Docker Desktop 4.x+
- Docker Compose v2+
- Node.js 20+ (solo para desarrollo local sin Docker)
- Git

---

## 🚀 Inicio Rápido

```bash
# 1. Clonar el repositorio
git clone <repo-url>
cd iron-loot

# 2. Copiar variables de entorno
cp .env.example .env

# 3. Iniciar servicios
docker compose up -d

# 4. Verificar que funciona
curl http://localhost:3000/api/v1/health
```

### Servicios disponibles

| Servicio | URL | Descripción |
|----------|-----|-------------|
| API | http://localhost:3000 | API REST principal |
| Swagger | http://localhost:3000/docs | Documentación interactiva |
| PostgreSQL | localhost:5432 | Base de datos |
| Redis | localhost:6379 | Cache y sesiones |
| pgAdmin | http://localhost:5050 | Administración de BD (opcional) |

Para iniciar pgAdmin:
```bash
docker compose --profile tools up -d pgadmin
```

---

## 🏗️ Arquitectura

```
iron-loot/
├── prisma/
│   └── schema.prisma          # Esquema de base de datos
├── scripts/
│   ├── entrypoint.dev.sh      # Script de inicio (Docker)
│   └── init-db.sql            # Inicialización de BD
├── src/
│   ├── common/
│   │   ├── config/            # Configuración y validación
│   │   └── observability/     # Logging, errores, métricas
│   ├── database/
│   │   └── prisma.service.ts  # Conexión a BD
│   └── modules/
│       ├── audit/             # Persistencia de eventos
│       ├── diagnostics/       # Endpoints de diagnóstico
│       └── health/            # Health checks
├── docker-compose.yml
├── Dockerfile.dev
└── package.json
```

---

## 📦 Módulos Implementados

### ✅ Core

| Módulo | Descripción | Estado |
|--------|-------------|--------|
| `ObservabilityModule` | Logging estructurado, manejo de errores, métricas | ✅ |
| `DatabaseModule` | Conexión Prisma a PostgreSQL | ✅ |
| `AuditModule` | Persistencia de eventos en BD | ✅ |
| `HealthModule` | Health checks | ✅ |
| `DiagnosticsModule` | Visualización de logs y métricas | ✅ |

### ⏳ Pendientes

| Módulo | Descripción | Estado |
|--------|-------------|--------|
| `AuthModule` | JWT, sesiones, password reset | ⏳ |
| `UsersModule` | Perfiles, verificación, vendedores | ⏳ |
| `AuctionsModule` | CRUD, máquina de estados | ⏳ |
| `BidsModule` | Pujas, validaciones | ⏳ |
| `OrdersModule` | Órdenes post-subasta | ⏳ |
| `PaymentsModule` | Integración de pagos | ⏳ |
| `ShipmentsModule` | Tracking de envíos | ⏳ |
| `RatingsModule` | Calificaciones | ⏳ |
| `DisputesModule` | Resolución de disputas | ⏳ |

---

## 🔍 Observabilidad

El sistema incluye observabilidad completa con tres pilares:

### 1. Logging Estructurado

Todos los logs son JSON estructurado con trace ID automático:

```json
{
  "timestamp": "2025-12-22T03:45:00.000Z",
  "level": "info",
  "service": "ironloot-api",
  "env": "development",
  "traceId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Request completed",
  "context": "HealthController",
  "duration": 15
}
```

**Uso en servicios:**

```typescript
import { StructuredLogger } from '@/common/observability';

@Injectable()
export class MyService {
  private readonly log = this.logger.child('MyService');

  constructor(private readonly logger: StructuredLogger) {}

  async doSomething() {
    this.log.info('Processing request', { orderId: '123' });
    this.log.error('Something failed', error, { context: 'extra' });
  }
}
```

### 2. Excepciones Tipadas

Excepciones de negocio con códigos de error consistentes:

```typescript
import { 
  AuctionNotFoundException,
  BidTooLowException,
  UserSuspendedException 
} from '@/common/observability';

// Lanza automáticamente 404 con código AUCTION_NOT_FOUND
throw new AuctionNotFoundException(auctionId);

// Lanza 400 con detalles
throw new BidTooLowException(auctionId, bidAmount, minimumBid);
```

**Excepciones disponibles:**

| Categoría | Excepciones |
|-----------|-------------|
| Generic | `ValidationException`, `NotFoundException`, `ConflictException`, `UnauthorizedException`, `ForbiddenException` |
| Auth | `InvalidCredentialsException`, `TokenExpiredException`, `TokenInvalidException`, `SessionExpiredException` |
| User | `UserNotFoundException`, `UserNotVerifiedException`, `UserSuspendedException`, `UserBannedException`, `EmailAlreadyExistsException` |
| Auction | `AuctionNotFoundException`, `AuctionNotActiveException`, `AuctionAlreadyClosedException`, `AuctionNotStartedException` |
| Bid | `BidTooLowException`, `BidOnOwnAuctionException`, `BidAlreadyWinnerException` |
| Payment | `PaymentFailedException`, `PaymentExpiredException`, `PaymentAlreadyProcessedException` |
| Order | `OrderNotFoundException`, `OrderCannotCancelException` |
| Shipment | `ShipmentNotFoundException`, `InvalidTrackingNumberException` |
| Dispute | `DisputeNotFoundException`, `DisputeAlreadyResolvedException`, `DisputeWindowExpiredException` |

### 3. Decoradores

Logging y auditoría automática con decoradores:

```typescript
import { Log, Audit, AuditEventType, EntityType } from '@/common/observability';

@Injectable()
export class BidService {
  
  @Log({ includeArgs: true })
  @Audit({
    eventType: AuditEventType.BID_PLACED,
    entityType: EntityType.AUCTION,
    entityIdExtractor: (args) => args[0].auctionId,
    payloadFields: ['amount']
  })
  async placeBid(dto: PlaceBidDto) {
    // La ejecución se loguea automáticamente
    // El evento de auditoría se persiste en BD
  }
}
```

### 4. Métricas

Métricas en memoria accesibles vía API:

```typescript
import { MetricsService } from '@/common/observability';

@Injectable()
export class PaymentService {
  constructor(private readonly metrics: MetricsService) {}

  async processPayment() {
    const stopTimer = this.metrics.startTimer('payment_processing');
    try {
      // procesar...
      this.metrics.increment('payments_successful');
    } catch {
      this.metrics.increment('payments_failed');
    } finally {
      stopTimer();
    }
  }
}
```

### 5. Request Context

Acceso al contexto de request desde cualquier servicio:

```typescript
import { RequestContextService } from '@/common/observability';

@Injectable()
export class AnyService {
  constructor(private readonly ctx: RequestContextService) {}

  async doWork() {
    const traceId = this.ctx.getTraceId();  // UUID de la request
    const userId = this.ctx.getUserId();     // Usuario autenticado
    const elapsed = this.ctx.getElapsedMs(); // Tiempo transcurrido
  }
}
```

---

## 🌐 API Endpoints

### Health

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/health` | Health check básico |
| GET | `/api/v1/health/detailed` | Health check con dependencias |

### Diagnostics

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/diagnostics/ping` | Ping simple |
| GET | `/api/v1/diagnostics/stats` | Estadísticas de BD |
| GET | `/api/v1/diagnostics/errors` | Errores recientes |
| GET | `/api/v1/diagnostics/errors/trace/:traceId` | Errores por trace ID |
| GET | `/api/v1/diagnostics/audit` | Eventos de auditoría |
| GET | `/api/v1/diagnostics/audit/entity/:type/:id` | Historial de entidad |
| GET | `/api/v1/diagnostics/requests` | Request logs |
| GET | `/api/v1/diagnostics/requests/slow` | Requests lentos |
| GET | `/api/v1/diagnostics/metrics` | Métricas en memoria |

**Ejemplos:**

```bash
# Ver estadísticas
curl http://localhost:3000/api/v1/diagnostics/stats

# Ver últimos 10 errores
curl "http://localhost:3000/api/v1/diagnostics/errors?limit=10"

# Ver requests lentos (>500ms)
curl "http://localhost:3000/api/v1/diagnostics/requests/slow?minMs=500"

# Buscar por trace ID
curl http://localhost:3000/api/v1/diagnostics/errors/trace/550e8400-e29b-41d4-a716-446655440000
```

---

## 🗄️ Base de Datos

### Tablas de Observabilidad

```sql
-- Ver request logs
SELECT timestamp, trace_id, http_method, http_path, http_status, duration_ms 
FROM request_logs 
ORDER BY timestamp DESC 
LIMIT 20;

-- Ver errores
SELECT timestamp, trace_id, error_code, message, http_status 
FROM error_events 
ORDER BY timestamp DESC 
LIMIT 20;

-- Ver eventos de auditoría
SELECT timestamp, trace_id, event_type, entity_type, entity_id, result 
FROM audit_events 
ORDER BY timestamp DESC 
LIMIT 20;

-- Trazabilidad completa de un request
SELECT 'request' as type, timestamp, http_path as detail 
FROM request_logs WHERE trace_id = 'tu-trace-id'
UNION ALL
SELECT 'error', timestamp, message 
FROM error_events WHERE trace_id = 'tu-trace-id'
UNION ALL
SELECT 'audit', timestamp, event_type 
FROM audit_events WHERE trace_id = 'tu-trace-id'
ORDER BY timestamp;
```

### Acceso a la BD

```bash
# Via Docker
docker compose exec db psql -U ironloot -d ironloot_db

# Via pgAdmin
docker compose --profile tools up -d pgadmin
# Abrir http://localhost:5050
# Email: admin@ironloot.local
# Password: admin
```

---

## 📜 Scripts Disponibles

### Docker

```bash
# Iniciar todos los servicios
docker compose up -d

# Ver logs
docker compose logs api -f

# Reconstruir API
docker compose build --no-cache api

# Detener todo
docker compose down

# Limpiar volúmenes (⚠️ borra datos)
docker compose down -v
```

### NPM (dentro del contenedor o local)

```bash
# Desarrollo
npm run start:dev

# Producción
npm run build
npm run start:prod

# Linting
npm run lint
npm run lint:fix

# Tests
npm run test
npm run test:e2e
npm run test:cov

# Prisma
npm run db:generate    # Generar cliente
npm run db:push        # Aplicar schema (dev)
npm run db:migrate     # Crear migración
npm run db:studio      # UI de Prisma
```

---

## 💻 Desarrollo

### Variables de Entorno

```env
# API
NODE_ENV=development
API_PORT=3000
LOG_LEVEL=debug

# Database
DATABASE_URL=postgresql://ironloot:ironloot_dev@db:5432/ironloot_db
DB_USER=ironloot
DB_PASSWORD=ironloot_dev
DB_NAME=ironloot_db

# Redis
REDIS_URL=redis://redis:6379

# Rate Limiting
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100

# JWT (para cuando se implemente auth)
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=1h
```

### Estructura de Respuestas

**Éxito:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-22T03:45:00.000Z",
  "version": "0.1.0"
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "AUCTION_NOT_FOUND",
    "message": "Auction not found",
    "status": 404,
    "timestamp": "2025-12-22T03:45:00.000Z",
    "traceId": "550e8400-e29b-41d4-a716-446655440000",
    "path": "/api/v1/auctions/123"
  }
}
```

### Headers

Todas las respuestas incluyen:

| Header | Descripción |
|--------|-------------|
| `x-trace-id` | UUID único para trazabilidad |

Puedes enviar tu propio trace ID:
```bash
curl -H "x-trace-id: my-custom-trace-123" http://localhost:3000/api/v1/health
```

---

## 📊 Monitoreo

### Ver logs en tiempo real

```bash
docker compose logs api -f
```

### Consultar métricas

```bash
curl http://localhost:3000/api/v1/diagnostics/metrics
```

### Buscar errores recientes

```bash
curl http://localhost:3000/api/v1/diagnostics/errors
```

---

## 🔧 Troubleshooting

### Prisma client no generado

```bash
docker compose exec api npx prisma generate
docker compose restart api
```

### Base de datos no conecta

```bash
# Verificar que PostgreSQL está corriendo
docker compose ps

# Ver logs de la BD
docker compose logs db

# Reconectar
docker compose restart api
```

### Limpiar y reiniciar todo

```bash
docker compose down -v
docker compose build --no-cache
docker compose up -d
```

---

## 📄 Licencia

MIT

---

## 👥 Contribución

1. Fork el repositorio
2. Crea una rama (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Agrega nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crea un Pull Request
