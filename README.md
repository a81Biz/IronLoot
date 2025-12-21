# 🛡️ Iron Loot API

> Plataforma de Subastas Transparentes - Backend API

[![NestJS](https://img.shields.io/badge/NestJS-10.x-red.svg)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED.svg)](https://docs.docker.com/compose/)

## 📋 Requisitos Previos

- **Docker** >= 24.x
- **Docker Compose** >= 2.x
- **Git**

> ⚠️ **Importante**: El desarrollo local se realiza **exclusivamente mediante Docker**. No es necesario instalar Node.js, PostgreSQL o Redis localmente.

## 🚀 Inicio Rápido

### 1. Clonar el repositorio

```bash
git clone https://github.com/your-org/iron-loot.git
cd iron-loot
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
# Editar .env según necesidad (los valores por defecto funcionan para desarrollo)
```

### 3. Levantar el entorno de desarrollo

```bash
# Levantar todos los servicios
docker compose up -d

# Ver logs en tiempo real
docker compose logs -f api

# Solo levantar servicios base (sin pgAdmin)
docker compose up -d api db redis
```

### 4. Verificar que todo funciona

```bash
# Health check
curl http://localhost:3000/api/v1/health

# Respuesta esperada:
# {"status":"healthy","timestamp":"...","version":"0.1.0","environment":"development","uptime":...}
```

## 🛠️ Comandos Útiles

### Docker

```bash
# Levantar servicios
docker compose up -d

# Detener servicios
docker compose down

# Ver logs
docker compose logs -f [service]

# Reiniciar un servicio
docker compose restart api

# Reconstruir imagen (después de cambios en Dockerfile)
docker compose build --no-cache api

# Limpiar todo (incluye volúmenes)
docker compose down -v
```

### Desarrollo

```bash
# Ejecutar comandos dentro del contenedor
docker compose exec api npm run lint
docker compose exec api npm run test
docker compose exec api npm run test:e2e

# Acceder al shell del contenedor
docker compose exec api sh

# Ver logs de la API
docker compose logs -f api
```

### Base de Datos

```bash
# Acceder a PostgreSQL
docker compose exec db psql -U ironloot -d ironloot_db

# Backup de la base de datos
docker compose exec db pg_dump -U ironloot ironloot_db > backup.sql

# Restaurar backup
docker compose exec -T db psql -U ironloot ironloot_db < backup.sql
```

## 📁 Estructura del Proyecto

```
iron-loot/
├── docker-compose.yml      # Configuración de Docker Compose
├── Dockerfile.dev          # Dockerfile para desarrollo
├── Dockerfile              # Dockerfile para producción
├── .env.example            # Variables de entorno (plantilla)
├── package.json            # Dependencias y scripts
├── tsconfig.json           # Configuración TypeScript
├── nest-cli.json           # Configuración NestJS
├── src/
│   ├── main.ts             # Punto de entrada
│   ├── app.module.ts       # Módulo raíz
│   ├── common/             # Código compartido
│   │   ├── config/         # Configuración
│   │   ├── decorators/     # Decoradores personalizados
│   │   ├── dto/            # DTOs comunes
│   │   ├── exceptions/     # Excepciones de negocio
│   │   ├── filters/        # Filtros (manejo de errores)
│   │   ├── guards/         # Guards (autorización)
│   │   ├── interceptors/   # Interceptores
│   │   ├── middleware/     # Middleware (trace-id, logging)
│   │   └── pipes/          # Pipes (validación)
│   ├── modules/            # Módulos funcionales
│   │   ├── auth/           # Autenticación
│   │   ├── users/          # Usuarios
│   │   ├── auctions/       # Subastas
│   │   ├── bids/           # Pujas
│   │   ├── orders/         # Órdenes
│   │   ├── payments/       # Pagos
│   │   ├── shipments/      # Envíos
│   │   ├── ratings/        # Calificaciones
│   │   ├── disputes/       # Disputas
│   │   ├── notifications/  # Notificaciones
│   │   └── health/         # Health checks
│   └── database/           # Prisma y migraciones
├── test/
│   ├── unit/               # Pruebas unitarias
│   └── e2e/                # Pruebas end-to-end
├── scripts/                # Scripts de utilidad
└── docs/                   # Documentación
```

## 🔍 Observabilidad

### Trace ID

Cada request incluye un `X-Trace-Id` header para correlación:

```bash
# Enviar trace-id propio
curl -H "X-Trace-Id: mi-trace-123" http://localhost:3000/api/v1/health

# El response incluye el mismo trace-id
# X-Trace-Id: mi-trace-123
```

### Logs

Los logs siguen un formato estructurado JSON:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "service": "ironloot-api",
  "env": "development",
  "trace_id": "abc-123",
  "message": "GET /api/v1/health 200 5ms",
  "context": { ... }
}
```

### Sistema de Auditoría (Database)

El sistema registra automáticamente:

| Tabla | Descripción | Uso |
|-------|-------------|-----|
| `audit_events` | Eventos de negocio | Pujas, pagos, cierres, etc. |
| `error_events` | Errores capturados | Diagnóstico y debugging |
| `request_logs` | Logs HTTP | Performance y análisis |

```bash
# Ver eventos de una subasta
docker compose exec db psql -U ironloot -d ironloot_db \
  -c "SELECT * FROM audit_events WHERE entity_id = 'uuid-here'"

# Ver errores recientes
docker compose exec db psql -U ironloot -d ironloot_db \
  -c "SELECT * FROM error_events ORDER BY created_at DESC LIMIT 10"
```

## 🔐 Seguridad

- **Helmet**: Headers de seguridad HTTP
- **Rate Limiting**: 100 requests/minuto por IP (configurable)
- **Validación**: Todas las entradas son validadas con class-validator
- **CORS**: Configurado según entorno

## 📚 Documentación API

En desarrollo, la documentación Swagger está disponible en:

```
http://localhost:3000/docs
```

## 🧪 Testing

```bash
# Unit tests
docker compose exec api npm run test

# Tests con coverage
docker compose exec api npm run test:cov

# E2E tests
docker compose exec api npm run test:e2e

# Lint
docker compose exec api npm run lint
```

## 🔧 Herramientas Adicionales

### pgAdmin (Administración de BD)

```bash
# Levantar con herramientas de desarrollo
docker compose --profile tools up -d

# Acceder en: http://localhost:5050
# Email: admin@ironloot.local
# Password: admin
```

## 📝 Flujo de Trabajo (Git)

```
dev/<nombre>  →  dev  →  qa  →  prep  →  prod
     │             │       │       │        │
   trabajo     integra   QA    release   estable
```

1. Crear rama desde `dev`: `git checkout -b dev/mi-feature`
2. Desarrollar y commitear
3. PR hacia `dev`
4. CI valida automáticamente
5. Merge tras aprobación

## 📄 Licencia

Propiedad de Iron Loot Inc. Todos los derechos reservados.
