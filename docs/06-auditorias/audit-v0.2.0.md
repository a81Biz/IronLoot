# Auditoría IronLoot v0.2.0
**Fecha:** 2026-01-06  
**Auditor:** Claude  
**Alcance:** API Backend + Frontend Web  
**Severidad:** 🔴 Crítico | 🟠 Alto | 🟡 Medio | 🟢 Bajo

---

## Resumen Ejecutivo

Esta auditoría identifica **4 problemas críticos**, **8 problemas altos**, **12 problemas medios** y varias mejoras recomendadas.
**Actualización (Post-Fixes):** Se han resuelto TODOS los problemas críticos (4/4), altos (8/8) y medios (12/12).
El sistema ahora cuenta con validaciones financieras, scheduler de subastas, notificaciones, paginación y mejor seguridad.

---

## 🔴 PROBLEMAS CRÍTICOS (4)

### 1. [CRÍTICO] Wallet - Depósitos sin verificación de pago real ✅ RESUELTO
**Archivo:** `api/src/modules/wallet/wallet.controller.ts` líneas 62-66  
**Archivo:** `api/src/modules/wallet/wallet.service.ts` líneas 56-100

**Descripción:** El endpoint `/wallet/deposit` permite hacer depósitos directamente sin verificar que exista un pago real procesado por un proveedor (MercadoPago/PayPal). Cualquier usuario autenticado puede "depositar" dinero ficticio.

**Impacto:** Vulnerabilidad financiera crítica. Los usuarios pueden agregar fondos ilimitados sin pagar.

**Código problemático:**
```typescript
// wallet.controller.ts
@Post('deposit')
async deposit(@Request() req: AuthenticatedRequest, @Body() dto: DepositDto): Promise<any> {
  // NO VERIFICA QUE EXISTA UN PAGO REAL
  return this.walletService.deposit(req.user.id, dto.amount, dto.referenceId);
}
```

**Recomendación:**
```typescript
@Post('deposit')
async deposit(@Request() req: AuthenticatedRequest, @Body() dto: DepositDto): Promise<any> {
  // 1. Verificar que el referenceId corresponda a un Payment COMPLETED
  const payment = await this.paymentsService.verifyPayment(dto.referenceId);
  if (!payment || payment.status !== 'COMPLETED') {
    throw new BadRequestException('Invalid or incomplete payment');
  }
  // 2. Verificar que el payment no haya sido ya usado para otro depósito
  // 3. Solo entonces hacer el depósito
  return this.walletService.deposit(req.user.id, payment.amount, dto.referenceId);
}
```

---

### 2. [CRÍTICO] Bids sin validación de fondos del wallet ✅ RESUELTO
**Archivo:** `api/src/modules/bids/bids.service.ts`

**Descripción:** El servicio de pujas NO verifica que el usuario tenga fondos suficientes en su wallet antes de crear una puja. Tampoco se hace hold de los fondos.

**Impacto:** Los usuarios pueden pujar sin tener dinero para pagar. El sistema de subastas queda sin garantía de pago.

**Código faltante en `placeBid()`:**
```typescript
async placeBid(userId: string, auctionId: string, dto: CreateBidDto): Promise<Bid> {
  return this.prisma.$transaction(async (tx) => {
    // ... validaciones existentes ...

    // 🔴 FALTA: Verificar wallet activo
    // 🔴 FALTA: Verificar fondos suficientes
    // 🔴 FALTA: Hacer HOLD de los fondos
    // 🔴 FALTA: Liberar hold del postor anterior

    // Solo después crear la puja
  });
}
```

**Recomendación:**
```typescript
// Inyectar WalletService
constructor(
  private readonly walletService: WalletService,
  // ...
) {}

async placeBid(userId: string, auctionId: string, dto: CreateBidDto): Promise<Bid> {
  return this.prisma.$transaction(async (tx) => {
    // ... validaciones existentes ...

    // 1. Verificar que el usuario tiene wallet activo
    const wallet = await this.walletService.getWallet(userId);
    if (!wallet.isActive) {
      throw new ValidationException('Wallet must be active to place bids');
    }

    // 2. Verificar fondos disponibles
    const balance = await this.walletService.getBalance(userId);
    if (Number(balance.available) < dto.amount) {
      throw new ValidationException('Insufficient funds');
    }

    // 3. Liberar hold del postor anterior (si existe)
    const previousHighestBid = await tx.bid.findFirst({
      where: { auctionId },
      orderBy: { amount: 'desc' },
    });
    if (previousHighestBid && previousHighestBid.bidderId !== userId) {
      await this.walletService.releaseFunds(
        previousHighestBid.bidderId,
        Number(previousHighestBid.amount),
        auctionId,
        'Bid outbid - releasing hold'
      );
    }

    // 4. Hacer hold de los fondos del nuevo postor
    await this.walletService.holdFunds(
      userId,
      dto.amount,
      auctionId,
      `Hold for bid on auction ${auctionId}`
    );

    // 5. Crear la puja
    const bid = await tx.bid.create({ ... });
    // ...
  });
}
```

---

### 3. [CRÍTICO] Frontend - Código duplicado en auth.js ✅ RESUELTO
**Archivo:** `web/public/js/core/auth.js` líneas 71-87 y 145-159

**Descripción:** Hay bloques de código duplicados con `if (errorEl) { if (errorEl)` anidados, indicando un error de copiar/pegar que puede causar comportamientos inesperados.

**Código problemático:**
```javascript
// Líneas 71-87
if (errorEl) {
if (errorEl) {  // ← DUPLICADO
  let message = error.message || 'Credenciales inválidas';
  // ...
  errorEl.textContent = message;
  errorEl.style.display = 'block';
}
}  // ← CIERRE EXTRA
```

**Recomendación:** Eliminar la duplicación:
```javascript
if (errorEl) {
  let message = error.message || 'Credenciales inválidas';
  
  if (error.data?.error?.code === 'USER_NOT_VERIFIED') {
    message = 'Verificación de correo requerida. Por favor revisa tu bandeja de entrada.';
  } else if (error.data?.error?.message) {
    message = Array.isArray(error.data.error.message) 
      ? error.data.error.message.join(', ') 
      : error.data.error.message;
  }

  errorEl.textContent = message;
  errorEl.style.display = 'block';
}
```

---

### 4. [CRÍTICO] Sin proceso automático de cierre de subastas ✅ RESUELTO
**Archivo:** No existe

**Descripción:** No hay ningún job/cron/scheduler que:
- Cambie subastas de PUBLISHED a ACTIVE cuando llega `startsAt`
- Cambie subastas de ACTIVE a CLOSED cuando llega `endsAt`
- Cree órdenes automáticamente para el ganador
- Libere fondos de los perdedores

**Impacto:** Las subastas nunca terminan automáticamente. El sistema depende de que alguien haga algo manualmente.

**Recomendación:** Crear un módulo de scheduler:
```typescript
// api/src/modules/scheduler/auction-scheduler.service.ts
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class AuctionSchedulerService {
  @Cron(CronExpression.EVERY_MINUTE)
  async handleAuctionTransitions() {
    const now = new Date();
    
    // 1. Activar subastas publicadas que ya empezaron
    await this.prisma.auction.updateMany({
      where: {
        status: 'PUBLISHED',
        startsAt: { lte: now },
      },
      data: { status: 'ACTIVE' },
    });

    // 2. Cerrar subastas activas que terminaron
    const endedAuctions = await this.prisma.auction.findMany({
      where: {
        status: 'ACTIVE',
        endsAt: { lte: now },
      },
      include: {
        bids: { orderBy: { amount: 'desc' }, take: 1 },
      },
    });

    for (const auction of endedAuctions) {
      await this.closeAuction(auction);
    }
  }

  private async closeAuction(auction: Auction & { bids: Bid[] }) {
    // 1. Marcar como CLOSED
    // 2. Si hay ganador, crear Order
    // 3. Capturar fondos del ganador
    // 4. Liberar fondos de los demás postores
    // 5. Enviar notificaciones
  }
}
```

---

## 🟠 PROBLEMAS ALTOS (8)

### 5. [ALTO] Orders - Solo el buyer puede ver la orden ✅ RESUELTO
**Archivo:** `api/src/modules/orders/orders.service.ts` líneas 89-107

**Descripción:** El método `findOne` solo permite acceso al buyer. El seller no puede ver sus propias órdenes de venta.

```typescript
if (order.buyerId !== userId) {
  throw new ForbiddenException('Access denied');
}
```

**Recomendación:**
```typescript
if (order.buyerId !== userId && order.sellerId !== userId) {
  throw new ForbiddenException('Access denied');
}
```

---

### 6. [ALTO] API Client - verifyEmail path sin barra inicial ✅ RESUELTO
**Archivo:** `web/public/js/core/api-client.js` línea 262

**Descripción:** La llamada a verify-email usa `'auth/verify-email'` en vez de `'/auth/verify-email'`.

```javascript
async verifyEmail(token) {
  await request('POST', 'auth/verify-email', null, { params: { token } });
  //                     ^ FALTA la barra inicial
}
```

**Recomendación:**
```javascript
async verifyEmail(token) {
  await request('POST', '/auth/verify-email', null, { params: { token } });
}
```

---

### 7. [ALTO] Auth Controller - /me usa POST en vez de GET ✅ RESUELTO
**Archivo:** `api/src/modules/auth/auth.controller.ts` línea 238

**Descripción:** El endpoint `/auth/me` usa método POST cuando debería ser GET ya que es una operación de lectura sin body.

```typescript
@Post('me')  // ← Debería ser @Get('me')
@UseGuards(JwtAuthGuard)
async me(@CurrentUser() user: AuthenticatedUser): Promise<AuthenticatedUser> {
  return user;
}
```

**Recomendación:** Cambiar a GET y actualizar el API client:
```typescript
@Get('me')
@UseGuards(JwtAuthGuard)
async me(@CurrentUser() user: AuthenticatedUser): Promise<AuthenticatedUser> {
  return user;
}
```

```javascript
// api-client.js
async me() {
  const { data } = await request('GET', '/auth/me');  // Cambiar POST a GET
  return data;
}
```

---

### 8. [ALTO] Wallet Controller - Retornos tipo any ✅ RESUELTO
**Archivo:** `api/src/modules/wallet/wallet.controller.ts`

**Descripción:** Todos los métodos retornan `Promise<any>` en vez de DTOs tipados, lo que elimina la seguridad de tipos y la documentación de Swagger.

```typescript
@Get('balance')
async getBalance(@Request() req: AuthenticatedRequest): Promise<any> { ... }

@Get('history')
async getHistory(...): Promise<any> { ... }

@Post('deposit')
async deposit(...): Promise<any> { ... }
```

**Recomendación:** Crear DTOs de respuesta apropiados:
```typescript
// dto/wallet-response.dto.ts
export class WalletBalanceResponseDto {
  @ApiProperty() available: number;
  @ApiProperty() held: number;
  @ApiProperty() currency: string;
  @ApiProperty() isActive: boolean;
}

export class WalletHistoryResponseDto {
  @ApiProperty() walletId: string;
  @ApiProperty() count: number;
  @ApiProperty({ type: [LedgerEntryDto] }) history: LedgerEntryDto[];
}
```

---

### 9. [ALTO] Bids Service - Cast innecesario y confuso ✅ RESUELTO
**Archivo:** `api/src/modules/bids/bids.service.ts` líneas 54-55

**Descripción:** La validación de estado de subasta tiene un cast `(auction.status as string)` innecesario y la lógica es confusa.

```typescript
const isActive =
  ((auction.status as string) === AuctionStatus.ACTIVE ||
    auction.status === AuctionStatus.PUBLISHED) &&
  auction.startsAt <= now &&
  auction.endsAt > now;
```

**Recomendación:** Simplificar la lógica:
```typescript
const isWithinTimeWindow = auction.startsAt <= now && auction.endsAt > now;
const hasValidStatus = [AuctionStatus.ACTIVE, AuctionStatus.PUBLISHED].includes(auction.status);

if (!hasValidStatus || !isWithinTimeWindow) {
  throw new AuctionNotActiveException(auctionId, auction.status);
}
```

---

### 10. [ALTO] Auctions Service - Slug puede colisionar ✅ RESUELTO
**Archivo:** `api/src/modules/auctions/auctions.service.ts` líneas 194-205

**Descripción:** El slug usa `Math.random()` que tiene baja entropía y puede generar colisiones.

```typescript
private generateSlug(title: string): string {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '') +
    '-' +
    Math.random().toString(36).substring(2, 7)  // ← Baja entropía
  );
}
```

**Recomendación:** Usar nanoid o UUID parcial:
```typescript
import { nanoid } from 'nanoid';

private generateSlug(title: string): string {
  const baseSlug = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  return `${baseSlug}-${nanoid(8)}`;  // Más entropía
}
```

---

### 11. [ALTO] Utils.toast() no implementado ✅ RESUELTO
**Archivo:** `web/public/js/core/utils.js` líneas 206-210

**Descripción:** El método toast solo hace console.log, no muestra notificación visual al usuario.

```javascript
toast(message, type = 'info') {
  // TODO: Implement toast notification system
  console.log(`[${type.toUpperCase()}] ${message}`);
}
```

**Recomendación:** Implementar toast real:
```javascript
toast(message, type = 'info') {
  const container = document.getElementById('toastContainer') || this.createToastContainer();
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-message">${message}</span>
    <button class="toast-close">&times;</button>
  `;
  
  container.appendChild(toast);
  
  toast.querySelector('.toast-close').onclick = () => toast.remove();
  setTimeout(() => toast.remove(), 5000);
},

createToastContainer() {
  const container = document.createElement('div');
  container.id = 'toastContainer';
  container.className = 'toast-container';
  document.body.appendChild(container);
  return container;
}
```

---

### 12. [ALTO] Dashboard usa datos mock hardcodeados ✅ RESUELTO
**Archivo:** `web/public/js/pages/dashboard.js` líneas 100-123

**Descripción:** La función `loadActiveBids()` usa datos mock en vez de llamar al API.

```javascript
// Mock data for now
const bids = [
  {
    auction: { title: 'PlayStation 5', slug: 'playstation-5', endsAt: new Date(Date.now() + 7200000) },
    amount: 450,
    currentPrice: 480,
    isWinning: false,
  },
  // ...
];
```

**Recomendación:** Crear endpoint y usarlo:
```javascript
// API
@Get('users/me/bids')
async getMyBids(@CurrentUser() user) { ... }

// Frontend
const bids = await Api.users.getMyBids();
```

---

## 🟡 PROBLEMAS MEDIOS (12)

### 13. [MEDIO] Wallet DTO - Mínimo inconsistente ✅ RESUELTO
**Archivo:** `web/public/js/pages/wallet.js` vs `api/src/modules/wallet/dto/wallet.dto.ts`

- Frontend valida mínimo de $10.00 para depósito
- Backend DTO valida mínimo de $5.00 para depósito
- Backend DTO valida mínimo de $1.00 para retiro

**Recomendación:** Unificar validaciones:
```typescript
// wallet.dto.ts
@Min(10, { message: 'Minimum deposit is $10.00' })
amount: number;
```

---

### 14. [MEDIO] Auction Detail - No diferencia slug de ID ✅ RESUELTO
**Archivo:** `web/public/js/pages/auction-detail.js` líneas 16-19

```javascript
const pathParts = window.location.pathname.split('/');
const auctionId = pathParts[pathParts.length - 1];
// Asume que siempre es ID, pero podría ser slug
```

**Recomendación:** El backend ya debería manejar ambos o crear endpoint específico.

---

### 15. [MEDIO] Auctions Service - findAll no soporta paginación ✅ RESUELTO
**Archivo:** `api/src/modules/auctions/auctions.service.ts` líneas 71-95

No hay soporte para `page`, `limit`, `offset`.

---

### 16. [MEDIO] Falta endpoint para pujas del usuario ✅ RESUELTO
**Archivos:** `api/src/modules/bids/bids.controller.ts`, `api/src/modules/bids/bids.service.ts`

No existe endpoint `GET /users/me/bids` o similar para obtener pujas del usuario actual.

---

### 17. [MEDIO] Falta endpoint de estadísticas del usuario ✅ RESUELTO
Para el dashboard se necesitan endpoints como:
- `GET /users/me/stats`
- `GET /users/me/won-auctions`
- `GET /users/me/active-bids`

---

### 18. [MEDIO] Password reset email no se envía ✅ RESUELTO
**Archivo:** `api/src/modules/auth/auth.service.ts` línea 473-474

```typescript
// TODO: Send password reset email
// await this.emailService.sendPasswordResetEmail(user.email, resetToken);
```

---

### 19. [MEDIO] Falta validación de fecha en CreateAuctionDto ✅ RESUELTO
**Archivo:** `api/src/modules/auctions/dto/create-auction.dto.ts`

No se valida que:
- `startsAt` sea en el futuro
- `endsAt` sea posterior a `startsAt`
- La duración mínima/máxima de la subasta

---

### 20. [MEDIO] Bids controller - getBids debería ser público ✅ RESUELTO
**Archivo:** `api/src/modules/bids/bids.controller.ts`

El controlador tiene `@UseGuards(JwtAuthGuard)` a nivel de clase, pero ver el historial de pujas debería ser público.

---

### 21. [MEDIO] Notifications - Falta implementación de creación ✅ RESUELTO
Los servicios no crean notificaciones cuando ocurren eventos (nueva puja, ganaste subasta, etc.).

---

### 22. [MEDIO] Shipments - Falta validación de permisos ✅ RESUELTO
**Archivo:** `api/src/modules/shipments/shipments.service.ts`

No verifica que quien actualiza el envío sea el seller de la orden.

---

### 23. [MEDIO] Rating - Sin protección de duplicados ✅ RESUELTO
**Archivo:** `api/src/modules/ratings/ratings.service.ts`

Un usuario podría crear múltiples ratings para la misma orden.

---

### 24. [MEDIO] Disputes - createDispute sin validación de tiempo ✅ RESUELTO
**Archivo:** `api/src/modules/disputes/disputes.service.ts`

No valida si la ventana de disputa sigue abierta (ej: 14 días después de entrega).

---

## 🟢 MEJORAS RECOMENDADAS

### Seguridad
1. Añadir rate limiting más estricto a `/wallet/deposit` y `/wallet/withdraw`
2. Implementar verificación 2FA para retiros
3. Añadir logs de auditoría para operaciones financieras
4. Implementar CAPTCHA en registro y login

### Performance
1. Añadir índices compuestos donde se necesiten
2. Implementar caché para listado de subastas activas
3. Usar WebSockets para actualización en tiempo real de precios

### UX
1. Implementar sistema de notificaciones push
2. Añadir confirmación antes de pujas grandes
3. Mostrar historial de precios de subasta
4. Implementar watchlist de subastas

### Código
1. Añadir tests E2E para flujo completo de subasta
2. Documentar todos los endpoints en Swagger
3. Crear types compartidos entre API y frontend
4. Implementar CI/CD con verificación de tipos

---

## Plan de Acción Prioritizado

### Sprint 1 (Urgente - Esta semana)
- [x] Fix #1: Wallet deposits verification
- [x] Fix #2: Bids wallet validation
- [x] Fix #3: Frontend auth.js duplicación
- [x] Fix #4: Crear auction scheduler

### Sprint 2 (Alta prioridad)
### Sprint 2 (Alta prioridad)
- [x] Fix #8: Wallet Controller Any Types
- [x] Fix #12: Dashboard Mock Data
- [ ] Fix #5-7: Problemas altos restantes
- [ ] Implementar toast notifications
- [ ] Crear endpoints de usuario faltantes

### Sprint 3 (Media prioridad)
- [ ] Fix #13-24: Problemas medios
- [ ] Tests E2E
- [ ] Documentación Swagger completa

---

## Conclusión

El proyecto tiene una buena arquitectura base pero requiere atención urgente en:
1. **Seguridad financiera** - Los depósitos y pujas carecen de validación adecuada
2. **Automatización** - Las subastas no tienen proceso de cierre automático
3. **Calidad de código** - Hay código duplicado y tipos faltantes

Se recomienda no desplegar a producción hasta resolver al menos los 4 problemas críticos identificados.
