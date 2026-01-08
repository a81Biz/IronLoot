# Auditoría IronLoot v0.4.0
**Fecha:** 2026-01-07  
**Auditor:** Claude  
**Alcance:** Backend API + Frontend Web + Configuración + Tests + Seguridad  
**Versión anterior auditada:** v0.3.0  
**Severidad:** 🔴 Crítico | 🟠 Alto | 🟡 Medio | 🟢 Bajo | ✅ Verificado

---

## 📋 Resumen Ejecutivo

Esta auditoría exhaustiva evalúa el estado completo del proyecto IronLoot, verificando las correcciones de auditorías anteriores e identificando problemas pendientes y nuevos hallazgos.

### Estado General: **BUENO** ✅

| Categoría | v0.3.0 | v0.4.0 (Actual) | Tendencia |
|-----------|--------|-----------------|-----------|
| 🔴 Críticos | 0 | 0 | ➡️ Estable |
| 🟠 Altos | 4 | 2 | ⬇️ Mejora |
| 🟡 Medios | 8 | 5 | ⬇️ Mejora |
| 🟢 Bajos | 6 | 6 | ➡️ Estable |

---

## ✅ VERIFICACIÓN DE CORRECCIONES v0.3.0

### ✅ #1: Scheduler libera fondos de perdedores
**Estado:** CORREGIDO  
**Archivo:** `api/src/modules/scheduler/auction-scheduler.service.ts` líneas 151-191

```typescript
// ✅ Implementación verificada
const highestBidPerUser = await this.prisma.bid.groupBy({
  by: ['bidderId'],
  where: {
    auctionId: auction.id,
    bidderId: { not: winnerBid.bidderId },
  },
  _max: { amount: true },
});

for (const loserBid of highestBidPerUser) {
  await this.walletService.releaseFunds(/*...*/);
  // ✅ Notificación al perdedor incluida
}
```

---

### ✅ #2: EmailService URLs parametrizadas
**Estado:** CORREGIDO  
**Archivo:** `api/src/modules/notifications/email.service.ts` líneas 9, 17, 21, 42

```typescript
// ✅ Usa variable de entorno
this.frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
const verificationUrl = `${this.frontendUrl}/auth/verify-email?token=${token}`;
```

---

### ✅ #3: Withdraw tiene validación de límite diario
**Estado:** PARCIALMENTE CORREGIDO  
**Archivo:** `api/src/modules/wallet/wallet.controller.ts` líneas 123-136

```typescript
// ✅ Límite diario implementado
const DAILY_LIMIT = 5000;
const dailyWithdrawn = await this.walletService.getDailyWithdrawals(req.user.id);
if (dailyWithdrawn + dto.amount > DAILY_LIMIT) {
  throw new BadRequestException('Daily withdrawal limit exceeded');
}
// ⚠️ PENDIENTE: Validación de método de pago destino
```

---

### ✅ #4: Índice compuesto en bids
**Estado:** CORREGIDO  
**Archivo:** `api/prisma/schema.prisma` línea 206

```prisma
@@index([auctionId, amount(sort: Desc)], name: "idx_bids_auction_amount")
```

---

### ✅ #5: Validación de URLs de imágenes
**Estado:** CORREGIDO  
**Archivo:** `api/src/modules/auctions/dto/create-auction.dto.ts` líneas 77-82

```typescript
@IsArray()
@ArrayMaxSize(10, { message: 'Maximum 10 images allowed' })
@IsUrl({ protocols: ['https'], require_protocol: true }, { each: true })
@IsOptional()
images?: string[];
```

---

### ✅ #6: MaxLength en campos de texto (Disputes)
**Estado:** CORREGIDO  
**Archivo:** `api/src/modules/disputes/dto/create-dispute.dto.ts` líneas 20, 29

```typescript
@MaxLength(100)
reason: string;

@MaxLength(1000)
description: string;
```

---

## 🟠 PROBLEMAS ALTOS PENDIENTES (2)

### #1 [ALTO] PaymentsService sin integración real de producción
**Archivo:** `api/src/modules/payments/payments.service.ts`  
**Estado:** PENDIENTE (heredado de v0.3.0)

**Descripción:** El servicio de pagos funciona con mocks para desarrollo. Stripe está parcialmente implementado pero requiere configuración completa.

**Código actual:**
```typescript
async verifyPayment(referenceId: string): Promise<PaymentVerification> {
  // Stripe Logic
  if (referenceId.startsWith('cs_')) {
    const result = await this.stripeProvider.verifyPayment(referenceId);
    // ✅ Stripe implementado
  }

  // Mock Logic (para desarrollo)
  if (referenceId.startsWith('PAY-')) {
    return { status: 'COMPLETED', amount: 100, /* ... */ };
  }
}
```

**Verificación positiva:**
- ✅ StripeProvider implementado correctamente (`providers/stripe.provider.ts`)
- ✅ Checkout sessions funcionan
- ✅ Webhooks básicos implementados
- ⚠️ MercadoPago y PayPal son stubs vacíos

**Acción requerida para producción:**
1. Configurar `STRIPE_SECRET_KEY` en producción
2. Completar integración de webhooks de Stripe
3. (Opcional) Implementar MercadoPago para LATAM

**Impacto:** Bloqueante para producción comercial.

---

### #2 [ALTO] Withdraw sin validación completa de destino
**Archivo:** `api/src/modules/wallet/wallet.controller.ts` líneas 112-136

**Descripción:** El endpoint de retiro valida límites diarios pero NO verifica que el `referenceId` sea un método de pago válido registrado del usuario.

**Código actual:**
```typescript
@Post('withdraw')
async withdraw(@Request() req: AuthenticatedRequest, @Body() dto: WithdrawDto) {
  // ✅ Límite diario verificado
  const dailyWithdrawn = await this.walletService.getDailyWithdrawals(req.user.id);
  if (dailyWithdrawn + dto.amount > DAILY_LIMIT) { /* ... */ }
  
  // ❌ FALTA: Verificar que referenceId sea un método de pago válido del usuario
  return this.walletService.withdraw(req.user.id, dto.amount, dto.referenceId);
}
```

**Riesgo:**
- Un usuario podría especificar cualquier `referenceId` arbitrario
- Sin KYC/verificación de identidad para retiros

**Recomendación:**
```typescript
@Post('withdraw')
async withdraw(@Request() req: AuthenticatedRequest, @Body() dto: WithdrawDto) {
  // 1. Verificar método de pago registrado
  const paymentMethod = await this.paymentMethodService.findByUserAndId(
    req.user.id, 
    dto.referenceId
  );
  if (!paymentMethod) {
    throw new BadRequestException('Invalid payment method. Please add a valid payout method first.');
  }

  // 2. Verificar límites
  const dailyWithdrawn = await this.walletService.getDailyWithdrawals(req.user.id);
  if (dailyWithdrawn + dto.amount > DAILY_LIMIT) { /* ... */ }
  
  // 3. Procesar retiro
  return this.walletService.withdraw(req.user.id, dto.amount, dto.referenceId);
}
```

**Impacto:** Alto - Vulnerabilidad financiera potencial.

---

## 🟡 PROBLEMAS MEDIOS (5)

### #3 [MEDIO] Cookie sin flag HttpOnly
**Archivo:** `web/public/js/core/api-client.js` línea 31

**Código actual:**
```javascript
function setCookie(name, value, days) {
  document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Lax";
  // ❌ Falta: HttpOnly; Secure
}
```

**Riesgo:** El token de acceso almacenado en cookie puede ser leído por JavaScript, haciéndolo vulnerable a ataques XSS.

**Nota:** El token también está en localStorage, lo cual es intencional para SPA. Sin embargo, la cookie debería ser HttpOnly si se usa para SSR.

**Recomendación:** 
- Para SPA puro: Eliminar la cookie y usar solo localStorage
- Para SSR: Mover manejo de cookies al backend con HttpOnly

---

### #4 [MEDIO] Rate limiting comentado en wallet
**Archivo:** `api/src/modules/wallet/wallet.controller.ts` líneas 83, 113

```typescript
@Post('deposit')
// @Throttle({ default: { limit: 10, ttl: 60000 } }) // TODO: Install ThrottlerModule

@Post('withdraw')
// @Throttle({ default: { limit: 5, ttl: 60000 } }) // TODO: Install ThrottlerModule
```

**Riesgo:** Sin rate limiting, los endpoints financieros son vulnerables a ataques de fuerza bruta o abuso.

**Recomendación:** Descomentar y configurar `ThrottlerModule` en `app.module.ts`:
```typescript
ThrottlerModule.forRoot([{
  ttl: 60000,
  limit: 100, // Global
}]),
```

---

### #5 [MEDIO] WebSocket no implementado
**Ubicación:** No existe módulo WebSocket/Gateway

**Descripción:** Las subastas no se actualizan en tiempo real. Los usuarios deben refrescar manualmente para ver nuevas pujas.

**Impacto en UX:** Los usuarios pueden perder pujas por no ver actualizaciones.

**Arquitectura propuesta:**
```typescript
// api/src/modules/auctions/auctions.gateway.ts
@WebSocketGateway({ namespace: '/auctions' })
export class AuctionsGateway {
  @WebSocketServer() server: Server;

  emitNewBid(auctionId: string, bid: any) {
    this.server.to(`auction:${auctionId}`).emit('bid:new', bid);
  }

  emitAuctionExtended(auctionId: string, newEndTime: Date) {
    this.server.to(`auction:${auctionId}`).emit('auction:extended', { newEndTime });
  }
}
```

**Prioridad:** Media-Alta para mejor UX en subastas activas.

---

### #6 [MEDIO] Falta CSRF protection
**Ubicación:** `api/src/main.ts`, cookies

**Descripción:** No hay protección CSRF implementada. Las cookies de sesión podrían ser explotadas en ataques cross-site.

**Código actual en `main.ts`:**
```typescript
app.enableCors({
  origin: configService.get('CORS_ORIGINS', 'http://localhost:5173').split(','),
  credentials: true,
});
// ❌ No hay csurf middleware
```

**Recomendación para producción:**
```typescript
import * as csurf from 'csurf';
app.use(csurf({ cookie: true }));
```

---

### #7 [MEDIO] Shipments no actualiza estado de Order
**Archivo:** `api/src/modules/shipments/shipments.service.ts` líneas 103-119

**Descripción:** Cuando un shipment cambia a SHIPPED o DELIVERED, el estado de la Order no se actualiza correspondientemente.

**Código actual:**
```typescript
async updateStatus(userId: string, id: string, dto: UpdateShipmentStatusDto): Promise<Shipment> {
  // ... validaciones ...
  
  const updatedShipment = await this.prisma.shipment.update({
    where: { id },
    data: updateData,
  });
  
  // ❌ FALTA: Actualizar Order.status a SHIPPED o DELIVERED
  return updatedShipment;
}
```

**Recomendación:**
```typescript
// Después de actualizar shipment
if (dto.status === ShipmentStatus.SHIPPED) {
  await this.prisma.order.update({
    where: { id: shipment.orderId },
    data: { status: OrderStatus.SHIPPED },
  });
}
if (dto.status === ShipmentStatus.DELIVERED) {
  await this.prisma.order.update({
    where: { id: shipment.orderId },
    data: { status: OrderStatus.DELIVERED },
  });
}
```

---

## 🟢 PROBLEMAS BAJOS (6)

### #8 [BAJO] Falta CAPTCHA en registro/login
**Archivos:** `api/src/modules/auth/auth.controller.ts`

Sin CAPTCHA, los endpoints de autenticación son vulnerables a ataques automatizados. Considerar hCaptcha o reCAPTCHA para producción.

---

### #9 [BAJO] 2FA no implementado
**Archivos:** `api/src/modules/auth/two-factor-auth.service.ts` (existe pero no integrado)

El archivo existe con stubs pero no está conectado al flujo de autenticación.

---

### #10 [BAJO] Logs sin política de retención
**Archivo:** `api/prisma/schema.prisma`

Las tablas `AuditEvent`, `ErrorEvent`, `RequestLog` crecerán indefinidamente.

**Recomendación:** Implementar job de limpieza en `system-cleanup.service.ts`.

---

### #11 [BAJO] Notificaciones con límite hardcodeado
**Archivo:** `api/src/modules/notifications/notifications.service.ts`

```typescript
take: 50, // Hardcoded
```

Debería ser configurable vía query param.

---

### #12 [BAJO] Falta upload de imágenes propio
**Sistema actual:** Solo acepta URLs externas para imágenes.

**Recomendación:** Implementar upload a S3/CloudFlare R2 con el módulo `upload/` existente.

---

### #13 [BAJO] Documentación Swagger incompleta
**Archivos varios:** Algunos endpoints no tienen `@ApiResponse` con todos los códigos de error posibles.

---

## 📊 ANÁLISIS DE ARQUITECTURA

### Backend (NestJS + Prisma)

| Componente | Estado | Notas |
|------------|--------|-------|
| Estructura modular | ✅ Excelente | Módulos bien separados |
| DTOs con validación | ✅ Excelente | class-validator completo |
| Guards de autenticación | ✅ Bueno | JWT + Refresh tokens |
| Manejo de errores | ✅ Excelente | Excepciones tipadas + filtros |
| Observabilidad | ✅ Excelente | Logs estructurados + auditoría |
| Tests | ✅ Bueno | Unit + E2E cubiertos |

### Frontend (Vanilla JS + NestJS Views)

| Componente | Estado | Notas |
|------------|--------|-------|
| API Client | ✅ Bueno | Manejo de tokens, refresh |
| Auth flow | ✅ Bueno | Login, registro, recovery |
| Auction pages | ✅ Bueno | Lista, detalle, create |
| Wallet pages | ✅ Bueno | Balance, history, deposit |
| Error handling | ✅ Bueno | Toast notifications |

### Base de Datos (PostgreSQL + Prisma)

| Aspecto | Estado | Notas |
|---------|--------|-------|
| Schema normalizado | ✅ Excelente | Relaciones bien definidas |
| Índices | ✅ Bueno | Índices importantes presentes |
| Migraciones | ✅ Excelente | Historial completo |
| Enums | ✅ Bueno | Estados bien definidos |

---

## 🔐 ANÁLISIS DE SEGURIDAD

| Aspecto | Estado | Nivel |
|---------|--------|-------|
| Autenticación JWT | ✅ | Implementado |
| Refresh Tokens | ✅ | Con revocación |
| Password Hashing | ✅ | bcrypt, 12 rounds |
| Input Validation | ✅ | class-validator |
| SQL Injection | ✅ | Prisma ORM previene |
| Rate Limiting | ⚠️ | Básico, wallet sin throttle |
| CSRF Protection | ❌ | No implementado |
| XSS Protection | ✅ | Headers configurados |
| CAPTCHA | ❌ | No implementado |
| 2FA | ❌ | Stub sin integrar |
| Session Management | ✅ | DB sessions con revocación |

### Vulnerabilidades identificadas:

1. **Bajo:** Tokens en localStorage (inherente a SPAs)
2. **Medio:** Sin CSRF protection
3. **Medio:** Rate limiting incompleto en wallet
4. **Alto:** Withdraw sin validación de método de pago

---

## 📦 DEPENDENCIAS

### Backend (`api/package.json`)

| Dependencia | Versión | Estado |
|-------------|---------|--------|
| @nestjs/core | ^10.0.0 | ✅ Actual |
| @prisma/client | ^5.0.0 | ✅ Actual |
| bcrypt | ^5.1.0 | ✅ Seguro |
| passport-jwt | ^4.0.0 | ✅ Actual |
| class-validator | ^0.14.0 | ✅ Actual |
| stripe | ^14.0.0 | ✅ Actual |

### Frontend (`web/package.json`)

| Dependencia | Versión | Estado |
|-------------|---------|--------|
| @nestjs/core | ^10.0.0 | ✅ Actual |
| nunjucks | ^3.2.4 | ✅ Actual |

**No se detectaron vulnerabilidades críticas en dependencias.**

---

## 📋 PLAN DE ACCIÓN

### Fase 1: Pre-Testing (Inmediato)

| # | Tarea | Severidad | Esfuerzo | Estado |
|---|-------|-----------|----------|--------|
| 7 | Shipments actualice Order.status | 🟡 | 30min | Pendiente |
| 4 | Activar rate limiting en wallet | 🟡 | 15min | Pendiente |

### Fase 2: Pre-Producción

| # | Tarea | Severidad | Esfuerzo | Estado |
|---|-------|-----------|----------|--------|
| 1 | Configurar Stripe en producción | 🟠 | 2h | Pendiente |
| 2 | Validación de método de pago en withdraw | 🟠 | 4h | Pendiente |
| 6 | Implementar CSRF protection | 🟡 | 2h | Pendiente |
| 3 | Revisar cookie security | 🟡 | 1h | Pendiente |

### Fase 3: Post-Launch

| # | Tarea | Severidad | Esfuerzo | Estado |
|---|-------|-----------|----------|--------|
| 5 | WebSocket para tiempo real | 🟡 | 1 día | Pendiente |
| 8 | CAPTCHA | 🟢 | 4h | Pendiente |
| 9 | 2FA completo | 🟢 | 1 día | Pendiente |
| 10 | Retención de logs | 🟢 | 2h | Pendiente |

---

## ✅ CONCLUSIÓN

### Estado del Proyecto: **APTO PARA TESTING** ✅

El proyecto IronLoot ha mejorado significativamente desde la auditoría v0.3.0:

**Fortalezas:**
- ✅ Arquitectura sólida y bien estructurada
- ✅ Sistema de autenticación completo
- ✅ Manejo de fondos con sistema de hold/release funcionando
- ✅ Observabilidad y auditoría completa
- ✅ Tests con buena cobertura
- ✅ Correcciones de auditorías anteriores aplicadas

**Áreas de mejora para producción:**
- ⚠️ Completar integración de pagos (Stripe configurado)
- ⚠️ Añadir validación de métodos de pago en retiros
- ⚠️ Implementar CSRF y mejorar rate limiting

### Recomendación Final

| Ambiente | Recomendación |
|----------|---------------|
| **Testing/QA** | ✅ **APROBADO** - Puede proceder |
| **Staging** | ⚠️ Aplicar fixes #4 y #7 primero |
| **Producción** | 🚫 Requiere fixes #1 y #2 completados |

---

## 📎 ARCHIVOS REVISADOS

### Backend API
- `api/src/modules/auth/` - Autenticación completa ✅
- `api/src/modules/auctions/` - Subastas ✅
- `api/src/modules/bids/` - Pujas con hold de fondos ✅
- `api/src/modules/wallet/` - Wallet y ledger ✅
- `api/src/modules/orders/` - Órdenes ✅
- `api/src/modules/payments/` - Pagos (Stripe + mocks) ⚠️
- `api/src/modules/shipments/` - Envíos ⚠️
- `api/src/modules/disputes/` - Disputas ✅
- `api/src/modules/ratings/` - Ratings ✅
- `api/src/modules/notifications/` - Notificaciones ✅
- `api/src/modules/scheduler/` - Jobs automáticos ✅
- `api/prisma/schema.prisma` - Schema DB ✅
- `api/test/` - Tests completos ✅

### Frontend Web
- `web/public/js/core/api-client.js` - Cliente API ⚠️
- `web/public/js/core/auth.js` - Autenticación ✅
- `web/public/js/pages/` - Páginas funcionales ✅
- `web/views/` - Templates HTML ✅

### Configuración
- `docker-compose.yml` - Orquestación ✅
- `.env.example` - Variables documentadas ✅
- `api/.eslintrc.js` - Linting ✅

---

*Auditoría exhaustiva generada el 2026-01-07 por Claude*  
*Próxima auditoría recomendada: Post-correcciones de Fase 1*
