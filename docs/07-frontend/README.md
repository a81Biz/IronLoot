# Iron Loot Web

Frontend de la plataforma de subastas Iron Loot.

## Stack Tecnológico

- **React 18** - UI Library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router** - Routing
- **Zustand** - State management

## Estructura del Proyecto

```
web/
├── src/
│   ├── api/                 # Cliente API tipado
│   │   ├── client.ts        # Cliente base (auth, tokens, errors)
│   │   ├── auth.api.ts      # Módulo de autenticación
│   │   ├── auctions.api.ts  # Módulo de subastas
│   │   ├── wallet.api.ts    # Módulo de wallet
│   │   └── index.ts         # Export unificado
│   │
│   ├── components/          # Componentes reutilizables
│   │   ├── ui/              # Componentes base (Button, Input, etc.)
│   │   ├── layout/          # Layouts (MainLayout, AuthLayout)
│   │   ├── auction/         # Componentes específicos de subastas
│   │   └── auth/            # Componentes de autenticación
│   │
│   ├── pages/               # Páginas/Rutas
│   │   ├── auth/            # Login, Register, Recovery
│   │   ├── HomePage.tsx
│   │   ├── DashboardPage.tsx
│   │   └── ...
│   │
│   ├── hooks/               # Custom hooks
│   ├── stores/              # Zustand stores
│   ├── types/               # TypeScript types
│   └── styles/              # CSS globals
│
├── Dockerfile               # Producción (nginx)
├── Dockerfile.dev           # Desarrollo (vite dev server)
└── nginx.conf               # Config nginx para SPA
```

## Desarrollo Local

### Con Docker (Recomendado)

```bash
# Desde la raíz del proyecto
docker compose up web api db redis
```

El frontend estará disponible en `http://localhost:5173`

### Sin Docker

```bash
cd web
npm install
npm run dev
```

## API Client

El cliente API (`src/api/`) proporciona una capa de abstracción tipada para comunicarse con el backend:

```typescript
import { api } from '@/api';

// Autenticación
await api.auth.login({ email, password });
await api.auth.logout();

// Subastas
const auctions = await api.auctions.list({ status: 'ACTIVE' });
const auction = await api.auctions.getById('uuid');
await api.auctions.placeBid('auctionId', { amount: 100 });

// Wallet
const balance = await api.wallet.getBalance();
await api.wallet.deposit({ amount: 100, referenceId: 'ref' });
```

### Características del Cliente

- **Token Management**: Almacena tokens en localStorage y los adjunta automáticamente
- **Auto-refresh**: Refresca el access token cuando expira
- **Request Queue**: Encola requests durante el refresh para evitar race conditions
- **Error Handling**: Manejo centralizado de errores con traceId
- **TypeScript**: Completamente tipado

## Variables de Entorno

```bash
# .env
VITE_API_URL=http://localhost:3000
```

## Build de Producción

```bash
npm run build
```

Los archivos se generan en `dist/` y pueden ser servidos con cualquier servidor estático (nginx, etc.)

## Comunicación API Interna (Docker)

En Docker, los servicios se comunican a través de la red interna:

```
[Browser] → :5173 → [web (nginx)]
                          ↓ /api/*
                    [api:3000 (NestJS)]
                          ↓
                    [db:5432 (PostgreSQL)]
```

El nginx del frontend hace proxy de `/api/*` al backend, permitiendo:
- URLs relativas en el código (`/api/auctions` en lugar de `http://api:3000/auctions`)
- Evitar problemas de CORS
- Un solo punto de entrada para el usuario

## Scripts Disponibles

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run preview` | Preview del build |
| `npm run lint` | Ejecutar ESLint |
| `npm run type-check` | Verificar tipos |
