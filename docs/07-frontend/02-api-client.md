# 2. API Client - Sistema de Comunicación

## 2.1 Visión General

El **API Client** es la capa de abstracción entre el frontend y el backend. Proporciona:

* **Tipado completo** - Todas las llamadas y respuestas están tipadas
* **Gestión de tokens** - Almacenamiento y refresh automático
* **Manejo de errores** - Centralizado con traceId
* **Request queue** - Encola requests durante token refresh

---

## 2.2 Estructura

```
src/api/
├── client.ts          # Cliente base
├── auth.api.ts        # Módulo autenticación
├── auctions.api.ts    # Módulo subastas
├── wallet.api.ts      # Módulo wallet
└── index.ts           # Export unificado
```

---

## 2.3 Uso Básico

```typescript
import { api } from '@/api';

// Autenticación
await api.auth.login({ email: 'user@example.com', password: '123456' });
await api.auth.logout();
const user = await api.auth.me();

// Subastas
const auctions = await api.auctions.list({ status: 'ACTIVE', page: 1 });
const auction = await api.auctions.getById('uuid');
const bid = await api.auctions.placeBid('auctionId', { amount: 150 });

// Wallet
const balance = await api.wallet.getBalance();
await api.wallet.deposit({ amount: 100, referenceId: 'payment_123' });
const history = await api.wallet.getHistory(20);
```

---

## 2.4 Cliente Base (`client.ts`)

### 2.4.1 Configuración

```typescript
const apiClient = new ApiClient({
  baseUrl: 'http://localhost:3000',
  timeout: 30000,
  onUnauthorized: () => {
    // Redirigir a login
    window.location.href = '/login';
  },
  onError: (error) => {
    console.error(`[API Error] ${error.statusCode}: ${error.message}`);
  },
});
```

### 2.4.2 Métodos HTTP

```typescript
// GET
const response = await apiClient.get<Auction[]>('/auctions', {
  params: { status: 'ACTIVE', limit: 10 }
});

// POST
const response = await apiClient.post<Bid>('/auctions/123/bids', {
  amount: 100
});

// PATCH
const response = await apiClient.patch<Auction>('/auctions/123', {
  title: 'Nuevo título'
});

// DELETE
const response = await apiClient.delete('/auctions/123');
```

### 2.4.3 Respuesta

Todas las llamadas devuelven:

```typescript
interface ApiResponse<T> {
  data: T;           // Datos de la respuesta
  status: number;    // HTTP status code
  traceId?: string;  // ID de trazabilidad (del header x-trace-id)
}
```

---

## 2.5 Gestión de Tokens

### 2.5.1 Almacenamiento

Los tokens se almacenan en:
1. **Memoria** (variable) - Para acceso rápido
2. **localStorage** - Para persistencia entre recargas

```typescript
// Después de login exitoso
setTokens(accessToken, refreshToken);

// Para cerrar sesión
clearTokens();

// Verificar si está autenticado
if (isAuthenticated()) {
  // ...
}
```

### 2.5.2 Auto-Refresh

Cuando una request recibe **401 Unauthorized**:

1. Se detecta el error
2. Se llama a `/auth/refresh` con el refreshToken
3. Se actualizan los tokens
4. Se reintenta la request original

```typescript
// Esto sucede automáticamente dentro de client.ts
private async handleUnauthorized<T>(retryFn: () => Promise<T>): Promise<T> {
  if (this.isRefreshing) {
    // Encolar la request
    return new Promise((resolve, reject) => {
      this.refreshQueue.push({ resolve, reject });
    });
  }

  this.isRefreshing = true;
  await this.refreshAccessToken();
  // Reintentar request original
  return retryFn();
}
```

### 2.5.3 Request Queue

Si múltiples requests fallan con 401 mientras se está refrescando el token, se encolan y se ejecutan una vez que el refresh termina:

```
Request A → 401 → Inicia refresh
Request B → 401 → Encolada
Request C → 401 → Encolada
                    │
                    ▼
              Refresh completo
                    │
    ┌───────────────┼───────────────┐
    ▼               ▼               ▼
Request A      Request B      Request C
(retry)        (retry)        (retry)
```

---

## 2.6 Manejo de Errores

### 2.6.1 Tipo de Error

```typescript
interface ApiError {
  statusCode: number;    // 400, 401, 404, 500, etc.
  message: string;       // Mensaje descriptivo
  error?: string;        // Tipo de error
  traceId?: string;      // Para debugging
}
```

### 2.6.2 Uso con try/catch

```typescript
try {
  await api.wallet.withdraw({ amount: 1000, referenceId: 'ref' });
} catch (error) {
  if (error.statusCode === 400) {
    // Fondos insuficientes
    showNotification(error.message);
  }
  // El traceId ayuda a debugging
  console.log('TraceId:', error.traceId);
}
```

---

## 2.7 Tipos

Los tipos están definidos en `src/types/api.types.ts`:

```typescript
// Entidades principales
interface User { id, email, username, ... }
interface Auction { id, title, currentPrice, status, ... }
interface Bid { id, amount, auctionId, ... }
interface WalletBalance { available, held, currency, ... }

// Requests
interface LoginRequest { email, password }
interface CreateBidRequest { amount }
interface DepositRequest { amount, referenceId }

// Responses
interface PaginatedResponse<T> {
  data: T[];
  meta: { total, page, limit, totalPages };
}
```

---

## 2.8 Módulos API

### 2.8.1 Auth (`auth.api.ts`)

| Método | Descripción |
|--------|-------------|
| `register(data)` | Registrar nuevo usuario |
| `login(data)` | Iniciar sesión |
| `logout()` | Cerrar sesión |
| `me()` | Obtener usuario actual |
| `verifyEmail(token)` | Verificar email |
| `forgotPassword(email)` | Solicitar reset |
| `resetPassword(token, password)` | Restablecer contraseña |

### 2.8.2 Auctions (`auctions.api.ts`)

| Método | Descripción |
|--------|-------------|
| `create(data)` | Crear subasta (Draft) |
| `list(filters)` | Listar subastas |
| `getById(id)` | Obtener por ID |
| `getBySlug(slug)` | Obtener por slug |
| `update(id, data)` | Actualizar (solo Draft) |
| `publish(id)` | Publicar |
| `placeBid(auctionId, data)` | Colocar puja |
| `getBids(auctionId)` | Historial de pujas |

### 2.8.3 Wallet (`wallet.api.ts`)

| Método | Descripción |
|--------|-------------|
| `getBalance()` | Obtener balance |
| `deposit(data)` | Depositar fondos |
| `withdraw(data)` | Retirar fondos |
| `getHistory(limit)` | Historial de transacciones |

---

## 2.9 Extensibilidad

Para agregar un nuevo módulo:

1. Crear archivo `src/api/[nombre].api.ts`
2. Exportar desde `src/api/index.ts`
3. Agregar tipos en `src/types/api.types.ts`

```typescript
// src/api/orders.api.ts
import { apiClient } from './client';
import type { Order, CreateOrderRequest } from '../types/api.types';

export const ordersApi = {
  async list(): Promise<Order[]> {
    const response = await apiClient.get<Order[]>('/orders');
    return response.data;
  },
  // ...
};

// src/api/index.ts
export { ordersApi } from './orders.api';

export const api = {
  auth: authApi,
  auctions: auctionsApi,
  wallet: walletApi,
  orders: ordersApi,  // ← Nuevo
};
```

---

## 2.10 Relación con Backend

| Frontend | Backend | Endpoint |
|----------|---------|----------|
| `api.auth.login()` | `AuthController.login()` | `POST /auth/login` |
| `api.auctions.list()` | `AuctionsController.findAll()` | `GET /auctions` |
| `api.wallet.deposit()` | `WalletController.deposit()` | `POST /wallet/deposit` |

El API Client actúa como un **contrato** entre frontend y backend. Si el backend cambia, solo se actualiza el módulo correspondiente en el frontend.
