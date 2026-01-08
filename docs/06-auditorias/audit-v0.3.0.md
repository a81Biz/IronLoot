# Auditoría IronLoot v0.3.0
**Fecha:** 2026-01-07  
**Auditor:** Claude  
**Alcance:** Backend API + Frontend Web + Configuración + Tests  
**Versión anterior auditada:** v0.2.0  
**Severidad:** 🔴 Crítico | 🟠 Alto | 🟡 Medio | 🟢 Bajo | ✅ Verificado

---

## Resumen Ejecutivo

Esta auditoría exhaustiva verifica el estado actual del proyecto IronLoot después de las correcciones aplicadas en v0.2.0 e identifica nuevos problemas y áreas de mejora.

### Estado de Problemas Previos (v0.2.0)

| Categoría | Total | Resueltos | Pendientes |
|-----------|-------|-----------|------------|
| Críticos | 4 | 4 ✅ | 0 |
| Altos | 8 | 8 ✅ | 0 |
| Medios | 12 | 12 ✅ | 0 |

### Nuevos Problemas Identificados (v0.3.0)

| Categoría | Cantidad |
|-----------|----------|
| 🔴 Críticos | 0 |
| 🟠 Altos | 4 |
| 🟡 Medios | 8 |
| 🟢 Bajos | 6 |

---

## ✅ VERIFICACIÓN DE CORRECCIONES ANTERIORES

### Problema #1 (v0.2.0): Wallet deposits sin verificación ✅ RESUELTO
**Archivo:** `api/src/modules/wallet/wallet.controller.ts` líneas 73-91

**Verificación:**
```typescript
@Post('deposit')
async deposit(@Request() req: AuthenticatedRequest, @Body() dto: DepositDto) {
  // ✅ Verifica que el pago sea válido y completado
  const payment = await this.paymentsService.verifyPayment(dto.referenceId);
  
  if (payment.status !== 'COMPLETED') {
    throw new BadRequestException(`Payment verification failed: status is ${payment.status}`);
  }
  
  // ✅ Usa el monto del pago verificado, no el input del usuario
  if (payment.amount !== dto.amount) {
    throw new BadRequestException('Payment amount mismatch');
  }
  
  return this.walletService.deposit(req.user.id, payment.amount, dto.referenceId);
}
```

---

### Problema #2 (v0.2.0): Bids sin validación de fondos ✅ RESUELTO
**Archivo:** `api/src/modules/bids/bids.service.ts` líneas 78-145

**Verificación:**
- ✅ WalletService inyectado (línea 30)
- ✅ holdFunds() llamado antes de crear bid (líneas 79-84)
- ✅ releaseFunds() del postor anterior (líneas 120-144)
- ✅ Compensación (rollback) en caso de error (líneas 163-173)

---

### Problema #3 (v0.2.0): Código duplicado en auth.js ✅ RESUELTO
**Archivo:** `web/public/js/core/auth.js`

**Verificación:** El código ya no tiene bloques `if (errorEl) { if (errorEl)` anidados. El manejo de errores está correctamente estructurado en las líneas 71-85.

---

### Problema #4 (v0.2.0): Sin scheduler de subastas ✅ RESUELTO
**Archivo:** `api/src/modules/scheduler/auction-scheduler.service.ts`

**Verificación:**
- ✅ Cron job cada minuto (línea 20)
- ✅ `startScheduledAuctions()` - PUBLISHED → ACTIVE (líneas 30-44)
- ✅ `closeExpiredAuctions()` - ACTIVE → CLOSED con creación de Order (líneas 50-146)
- ✅ `captureHeldFunds()` del ganador (línea 121)
- ✅ Notificación al ganador (líneas 129-137)

---

### Problema #5 (v0.2.0): Orders solo accesible por buyer ✅ RESUELTO
**Archivo:** `api/src/modules/orders/orders.service.ts` línea 104

**Verificación:**
```typescript
// ✅ Permite acceso a buyer Y seller
if (order.buyerId !== userId && order.sellerId !== userId) {
  throw new ForbiddenException('Access denied');
}
```

---

### Problema #6 (v0.2.0): verifyEmail path sin barra ✅ RESUELTO
**Archivo:** `web/public/js/core/api-client.js` línea 262

**Verificación:**
```javascript
async verifyEmail(token) {
  await request('POST', '/auth/verify-email', null, { params: { token } });
  //                     ^ ✅ Barra inicial presente
}
```

---

### Otros problemas v0.2.0 verificados:

| # | Descripción | Estado |
|---|-------------|--------|
| 7 | Wallet controller Any types | ✅ Tipado correcto con interfaces |
| 8 | Wallet DTO mínimo inconsistente | ✅ $10 en frontend y backend |
| 9 | Validación de fechas en CreateAuctionDto | ✅ Validadores personalizados |
| 10 | Slug con Math.random() | ✅ Usa nanoid(8) |
| 11 | Utils.toast() no implementado | ✅ Implementación completa |
| 12 | Dashboard con datos mock | ✅ Usa API real |
| 13 | Paginación en auctions | ✅ Implementada |
| 14 | Endpoint pujas del usuario | ✅ GET /bids/my-active |
| 15 | Password reset email | ✅ EmailService implementado |
| 16 | getBids público | ✅ @Public() decorator |
| 17 | Shipments validación permisos | ✅ Verifica sellerId |
| 18 | Rating duplicados | ✅ Verifica existingRating |
| 19 | Disputes ventana de tiempo | ✅ 30 días de límite |

---

## 🟠 PROBLEMAS ALTOS (4)

### 1. [ALTO] Scheduler no libera fondos de postores perdedores
**Archivo:** `api/src/modules/scheduler/auction-scheduler.service.ts`  
**Líneas:** 50-146

**Descripción:** Cuando una subasta se cierra, el scheduler:
- ✅ Captura los fondos del ganador
- ❌ NO libera los fondos (heldFunds) de los demás postores

Los usuarios que perdieron la subasta tienen sus fondos bloqueados indefinidamente.

**Código actual (líneas 117-141):**
```typescript
// Post-transaction handling (Funds Capture & Notification)
const winnerBid = auction.bids[0];
if (winnerBid) {
  try {
    await this.walletService.captureHeldFunds(/* ganador */);
    // ❌ FALTA: Liberar fondos de los demás postores
  } catch (e) { /* ... */ }
}
```

**Recomendación:**
```typescript
// Después de capturar fondos del ganador
const winnerBid = auction.bids[0];

// 1. Capturar fondos del ganador
if (winnerBid) {
  await this.walletService.captureHeldFunds(winnerBid.bidderId, ...);
}

// 2. LIBERAR fondos de todos los demás postores
const allBids = await this.prisma.bid.findMany({
  where: { auctionId: auction.id },
  distinct: ['bidderId'],  // Un registro por usuario
});

for (const bid of allBids) {
  if (bid.bidderId !== winnerBid?.bidderId) {
    try {
      await this.walletService.releaseFunds(
        bid.bidderId,
        Number(bid.amount),
        auction.id,
        `Auction ended - releasing hold for ${auction.title}`
      );
      
      // Notificar al perdedor
      await this.notificationsService.create(
        bid.bidderId,
        NotificationType.SYSTEM,
        'Subasta finalizada',
        `La subasta "${auction.title}" ha terminado. Tus fondos han sido liberados.`,
        { auctionId: auction.id }
      );
    } catch (e) {
      this.logger.error(`Failed to release funds for user ${bid.bidderId}`, e);
    }
  }
}
```

**Impacto:** Alto - Los usuarios no pueden usar sus fondos después de perder subastas.

---

### 2. [ALTO] PaymentsService es un mock sin integración real
**Archivo:** `api/src/modules/payments/payments.service.ts`  
**Líneas:** 1-68

**Descripción:** El servicio de pagos es completamente mock:
- `verifyPayment()` solo valida el formato del referenceId
- `createCheckoutSession()` retorna URLs mock
- `handleWebhook()` no procesa nada

**Código problemático:**
```typescript
async verifyPayment(referenceId: string): Promise<PaymentVerification> {
  await new Promise((resolve) => setTimeout(resolve, 500)); // ¡Solo un delay!
  
  if (referenceId.startsWith('PAY-')) {
    return { status: 'COMPLETED', amount: 100, /* ... */ };
  }
  // ❌ NO hay integración con Stripe/PayPal/MercadoPago
}
```

**Impacto:** El sistema financiero no está conectado a proveedores reales de pago.

**Recomendación:** Implementar integración con al menos un proveedor antes de producción:
- MercadoPago (ya hay stub en `providers/mercadopago.provider.ts`)
- PayPal (ya hay stub en `providers/paypal.provider.ts`)
- Stripe (recomendado para simplicidad)

---

### 3. [ALTO] Withdraw no tiene verificación de destino
**Archivo:** `api/src/modules/wallet/wallet.controller.ts`  
**Líneas:** 94-98

**Descripción:** El endpoint de retiro no verifica que el destino sea válido:

```typescript
@Post('withdraw')
async withdraw(@Request() req: AuthenticatedRequest, @Body() dto: WithdrawDto) {
  // ❌ NO verifica:
  // - Que el referenceId sea un método de pago válido del usuario
  // - Que el usuario tenga KYC completado
  // - Que no exceda límites diarios/mensuales
  return this.walletService.withdraw(req.user.id, dto.amount, dto.referenceId);
}
```

**Recomendación:**
```typescript
@Post('withdraw')
async withdraw(@Request() req: AuthenticatedRequest, @Body() dto: WithdrawDto) {
  // 1. Verificar que el usuario tenga método de pago registrado
  const paymentMethod = await this.paymentsService.getUserPaymentMethod(req.user.id, dto.referenceId);
  if (!paymentMethod) {
    throw new BadRequestException('Invalid payment method');
  }
  
  // 2. Verificar límites de retiro
  const dailyWithdrawn = await this.walletService.getDailyWithdrawals(req.user.id);
  if (dailyWithdrawn + dto.amount > DAILY_WITHDRAWAL_LIMIT) {
    throw new BadRequestException('Daily withdrawal limit exceeded');
  }
  
  // 3. Procesar retiro
  return this.walletService.withdraw(req.user.id, dto.amount, dto.referenceId);
}
```

---

### 4. [ALTO] Test E2E de wallet usa referenceId incorrecto
**Archivo:** `api/test/e2e/wallet.e2e-spec.ts`  
**Líneas:** 75-85

**Descripción:** El test usa `referenceId: 'e2e-dep-1'` pero el `PaymentsService.verifyPayment()` requiere el formato `PAY-{amount}`:

```typescript
it('/wallet/deposit (POST) - Deposit Funds', async () => {
  const res = await request(app.getHttpServer())
    .post('/wallet/deposit')
    .send({ amount: depositAmount, referenceId: 'e2e-dep-1' }) // ❌ Formato incorrecto
    .expect(201); // ❌ Fallará con 400
});
```

**Corrección:**
```typescript
.send({ amount: depositAmount, referenceId: `PAY-${depositAmount}` })
```

---

## 🟡 PROBLEMAS MEDIOS (8)

### 5. [MEDIO] docker-compose.yml tiene variable duplicada
**Archivo:** `docker-compose.yml`  
**Líneas:** 42-43

```yaml
environment:
  - LOG_LEVEL=${LOG_LEVEL:-debug}
  - LOG_LEVEL=${LOG_LEVEL:-debug}  # ← DUPLICADO
```

**Corrección:** Eliminar línea 43.

---

### 6. [MEDIO] EmailService tiene URLs hardcodeadas
**Archivo:** `api/src/modules/notifications/email.service.ts`  
**Líneas:** 17, 38

```typescript
const verificationUrl = `http://localhost:5173/auth/verify-email?token=${token}`;
const resetUrl = `http://localhost:5173/auth/reset-password?token=${token}`;
```

**Recomendación:** Usar variable de entorno:
```typescript
const baseUrl = this.configService.get('FRONTEND_URL', 'http://localhost:5173');
const verificationUrl = `${baseUrl}/auth/verify-email?token=${token}`;
```

---

### 7. [MEDIO] Dashboard tiene estadísticas hardcodeadas
**Archivo:** `web/public/js/pages/dashboard.js`  
**Líneas:** 52-54

```javascript
// TODO: Load other stats from API when endpoints are ready
Utils.$('#statActiveBids').textContent = '3';
Utils.$('#statWonAuctions').textContent = '5';
Utils.$('#statWatchlist').textContent = '12';
```

**Recomendación:** Crear endpoint `GET /users/me/stats` en el backend.

---

### 8. [MEDIO] Falta rate limiting específico para wallet
**Archivo:** `api/src/modules/wallet/wallet.controller.ts`

El `.env.example` menciona rate limiting específico pero no está implementado en el controller:

```
# Critical endpoints have stricter limits (configured in code)
# - Login: 5 per minute
# - Bid: 30 per minute
# ❌ Wallet no mencionado
```

**Recomendación:** Agregar decorador `@Throttle()`:
```typescript
@Post('deposit')
@Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 por minuto
async deposit() { /* ... */ }

@Post('withdraw')
@Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 por minuto
async withdraw() { /* ... */ }
```

---

### 9. [MEDIO] Falta WebSocket para actualizaciones en tiempo real
**Ubicación:** No existe módulo WebSocket

Las subastas activas no se actualizan en tiempo real. Los usuarios deben refrescar la página para ver nuevas pujas.

**Recomendación:** Implementar WebSocket gateway:
- Evento `bid:new` cuando hay nueva puja
- Evento `auction:extended` cuando se extiende el tiempo
- Evento `auction:closed` cuando termina

---

### 10. [MEDIO] Prisma schema no tiene índice para consultas comunes
**Archivo:** `api/prisma/schema.prisma`

Falta índice compuesto para la consulta más común en bids:

```prisma
model Bid {
  // ... campos existentes ...
  
  // ❌ FALTA: Índice para ordenar pujas por cantidad en una subasta
  @@index([auctionId, amount(sort: Desc)], name: "idx_bids_auction_amount")
}
```

---

### 11. [MEDIO] Auction images no tiene validación de URL
**Archivo:** `api/src/modules/auctions/dto/create-auction.dto.ts`  
**Líneas:** 76-80

```typescript
@IsArray()
@IsUrl({}, { each: true })
@IsOptional()
images?: string[];
```

No valida:
- Tamaño máximo del array
- Protocolos permitidos (solo https)
- Dominios permitidos (para evitar SSRF)

**Recomendación:**
```typescript
@IsArray()
@ArrayMaxSize(10, { message: 'Maximum 10 images allowed' })
@IsUrl({ protocols: ['https'], require_protocol: true }, { each: true })
@IsOptional()
images?: string[];
```

---

### 12. [MEDIO] Falta validación de longitud en campos de texto
**Archivos varios:** DTOs de disputes, ratings, etc.

**Ejemplo en `CreateDisputeDto`:**
```typescript
@IsString()
@IsNotEmpty()
description: string;  // ❌ Sin @MaxLength
```

**Recomendación:** Agregar `@MaxLength()` a todos los campos de texto libre.

---

## 🟢 PROBLEMAS BAJOS (6)

### 13. [BAJO] Falta documentación Swagger en algunos endpoints
**Archivos:** Varios controllers

Algunos endpoints no tienen `@ApiResponse` completo con tipos de error.

---

### 14. [BAJO] Falta CAPTCHA en registro/login
**Archivo:** `api/src/modules/auth/auth.controller.ts`

Vulnerable a ataques de fuerza bruta automatizados.

---

### 15. [BAJO] Falta 2FA para operaciones sensibles
**Archivos:** wallet.controller.ts, auth.controller.ts

Retiros y cambios de contraseña deberían requerir 2FA.

---

### 16. [BAJO] Notificaciones sin límite de paginación
**Archivo:** `api/src/modules/notifications/notifications.service.ts` línea 46

```typescript
take: 50, // Hardcoded, debería ser configurable
```

---

### 17. [BAJO] Falta manejo de archivos/imágenes propios
**Sistema actual:** Solo acepta URLs externas para imágenes de subastas.

Recomendación: Implementar upload a S3/CloudFlare R2.

---

### 18. [BAJO] Logs de auditoría no tienen retención
**Archivo:** `api/prisma/schema.prisma`

Las tablas `AuditEvent`, `ErrorEvent`, `RequestLog` crecerán indefinidamente.

Recomendación: Implementar job de limpieza o particionamiento por fecha.

---

## 📊 MÉTRICAS DE CÓDIGO

### Cobertura de Tests

| Módulo | Unit Tests | E2E Tests | Estado |
|--------|------------|-----------|--------|
| Auth | ✅ | ✅ | Completo |
| Auctions | ✅ | ✅ | Completo |
| Bids | ✅ | ✅ | Completo |
| Wallet | ✅ | ⚠️ | E2E necesita fix |
| Orders | ✅ | ✅ | Completo |
| Payments | ✅ | ✅ | Mock only |
| Shipments | ✅ | ✅ | Completo |
| Ratings | ✅ | ✅ | Completo |
| Disputes | ✅ | ✅ | Completo |
| Notifications | ✅ | ✅ | Completo |

### Seguridad

| Aspecto | Estado | Notas |
|---------|--------|-------|
| Autenticación JWT | ✅ | Implementado |
| Refresh Tokens | ✅ | Con revocación |
| Password Hashing | ✅ | bcrypt, 12 rounds |
| Rate Limiting | ⚠️ | Básico, falta en wallet |
| Input Validation | ✅ | class-validator |
| SQL Injection | ✅ | Prisma ORM |
| XSS Protection | ✅ | Headers + sanitización |
| CSRF | ⚠️ | No implementado |
| CAPTCHA | ❌ | No implementado |
| 2FA | ❌ | No implementado |

---

## 📋 PLAN DE ACCIÓN PRIORIZADO

### Fase 1: Antes de Testing (Inmediato)

| # | Tarea | Severidad | Esfuerzo |
|---|-------|-----------|----------|
| 1 | Liberar fondos de perdedores en scheduler | 🟠 Alto | 2h |
| 4 | Fix test E2E wallet referenceId | 🟠 Alto | 15min |
| 5 | Eliminar LOG_LEVEL duplicado | 🟡 Medio | 5min |
| 6 | Parametrizar URLs de email | 🟡 Medio | 30min |

### Fase 2: Antes de Producción

| # | Tarea | Severidad | Esfuerzo |
|---|-------|-----------|----------|
| 2 | Implementar proveedor de pagos real | 🟠 Alto | 2-3 días |
| 3 | Validación de retiros | 🟠 Alto | 4h |
| 8 | Rate limiting para wallet | 🟡 Medio | 1h |
| 10 | Índice compuesto en bids | 🟡 Medio | 30min |
| 11 | Validación de URLs de imágenes | 🟡 Medio | 1h |
| 12 | MaxLength en campos de texto | 🟡 Medio | 1h |

### Fase 3: Mejoras Posteriores

| # | Tarea | Severidad | Esfuerzo |
|---|-------|-----------|----------|
| 7 | Endpoint de estadísticas de usuario | 🟡 Medio | 2h |
| 9 | WebSocket para tiempo real | 🟡 Medio | 1 día |
| 14 | CAPTCHA | 🟢 Bajo | 4h |
| 15 | 2FA | 🟢 Bajo | 1 día |
| 17 | Upload de imágenes | 🟢 Bajo | 1 día |

---

## ✅ CONCLUSIÓN

### Estado General: **BUENO** (con reservas)

El proyecto ha mejorado significativamente desde v0.2.0:
- Todos los problemas críticos anteriores están resueltos
- La arquitectura es sólida y bien estructurada
- El sistema de observabilidad es completo
- Los tests tienen buena cobertura

### Bloqueantes para Testing
1. ⚠️ **Fix #1** (liberar fondos de perdedores) - Afecta flujo completo de subastas
2. ⚠️ **Fix #4** (test E2E) - Tests fallarán

### Bloqueantes para Producción
1. 🚫 **Fix #2** (pagos reales) - Sin integración financiera real
2. 🚫 **Fix #3** (validación de retiros) - Vulnerabilidad financiera

### Recomendación
**APROBADO PARA TESTING** después de aplicar fixes #1 y #4.
**NO APROBAR PARA PRODUCCIÓN** hasta implementar fixes #2 y #3.

---

*Auditoría generada el 2026-01-07 por Claude*
