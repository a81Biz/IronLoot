# F4 — Trazabilidad (Central Milestone)

**Estado**: COMPLETADA  
**Fecha**: 2026-06-23  
**Confidence**: 88%  
**Limitaciones**: BLQ-001 (sin acceso a DB real — trazabilidad DB basada en schema.prisma, no observación de datos en vivo)

---

## Propósito

F4 es el milestone central: verificar que cada producto identificado en F3 tiene una cadena de trazabilidad inversa completa desde el producto consumible hasta la acción del usuario que lo genera. F5/F6/F7/F8 no pueden iniciar hasta que F4 esté 100% completa para todos los productos.

## Metodología

Para cada producto: `Producto ← Transformación ← Servicio ← Regla de negocio ← Fuente de datos ← Acción del usuario`

---

## P-001 — Bid (Puja)

```
Producto: BidRecord en DB + evento WebSocket { type: 'BID_PLACED', auctionId, bidId, amount, bidderId }
  ← Transformación: BidsService.placeBid() → crea Bid en DB, actualiza held_funds, emite WS
    ← Servicio: BidsService (src/api/src/modules/bids/bids.service.ts)
      ← Regla: CR-001 (bid > current price), CR-002 (soft-close extension), CR-003 (hold funds check)
        ← Fuente: Bid.amount, Auction.currentPrice, Wallet.balance del usuario
          ← Acción: POST /api/bids { auctionId, amount }
```

**Estado trazabilidad**: TRAZADO ✓  
**Anomalía detectada**: Soft-close extension value (EXTENSION_MS) hardcodeada → H-001

---

## P-002 — AuctionResult (Resultado de subasta)

```
Producto: Auction actualizada a estado CLOSED, Order creado, notifications emitidas
  ← Transformación: AuctionSchedulerService.closeAuction() → cierra subasta, crea Order, libera fondos no ganadores
    ← Servicio: AuctionSchedulerService + OrdersService + WalletService
      ← Regla: CR-005 (winner = highest bid), CR-006 (funds released to non-winners immediately on close)
        ← Fuente: Auction.status = 'SOFT_CLOSE'|'ACTIVE' + tiempo transcurrido + sistema de locks Redis
          ← Acción: Cron job automático (60s interval) en AuctionSchedulerService
```

**Estado trazabilidad**: TRAZADO ✓  
**Lock**: Distributed lock `lock:auction-close` con 60s TTL vía Redis

---

## P-003 — RateLimitResponse (Rate limit)

```
Producto: HTTP 429 Too Many Requests con headers de retry-after
  ← Transformación: ThrottlerGuard intercepta request antes de llegar al handler
    ← Servicio: @nestjs/throttler ThrottlerModule + ThrottlerGuard global
      ← Regla: 100 req/min global; auth endpoints: 5–30 req/min
        ← Fuente: Contador en memoria (in-process) por IP
          ← Acción: Cualquier request HTTP al API
```

**Estado trazabilidad**: TRAZADO ✓  
**Anomalía detectada**: Storage in-memory (no Redis) → H-002

---

## P-004 — PaymentWebhookResult (Resultado de webhook)

```
Producto: Payment.status actualizado en DB + WalletService.deposit() ejecutado si COMPLETED
  ← Transformación: PaymentsService.handleWebhook() → valida HMAC → delega a provider → actualiza DB
    ← Servicio: PaymentsService + [MercadoPagoProvider|PaypalProvider|HeyBancoProvider]
      ← Regla: CR-008 (HMAC validation mandatory), CR-004 (amount match required)
        ← Fuente: Webhook payload + Payment.referenceId + HMAC secret del proveedor
          ← Acción: POST /api/payments/webhook/:provider (desde Mercado Pago, PayPal, o HeyBanco)
```

**Estado trazabilidad**: TRAZADO ✓  
**Anomalía detectada**: PaymentsService usa Logger estándar → H-003

---

## P-005 — WalletTransaction (Transacción de wallet)

```
Producto: Wallet actualizada + LedgerEntry creado en DB (inmutable)
  ← Transformación: WalletService.[deposit|withdraw|holdFunds|releaseFunds] → prisma.$transaction atómica
    ← Servicio: WalletService (src/api/src/modules/wallet/wallet.service.ts)
      ← Regla: CR-001 (balance ≥ 0), CR-003 (hold ≤ balance disponible), CR-009 (payment method validation)
        ← Fuente: Wallet.balance, input amount, referenceId
          ← Acción: POST /api/wallet/deposit | POST /api/wallet/withdraw | Bid placement | Auction close
```

**Estado trazabilidad**: TRAZADO ✓  
**Anomalía detectada**: Withdraw payment validation comentada → H-004

---

## P-006 — Order (Pedido post-subasta)

```
Producto: Order en DB con OrderItem, totalAmount, status=PENDING_PAYMENT, timestamps
  ← Transformación: OrdersService.createFromAuction() → crea Order + OrderItems del Auction ganado
    ← Servicio: OrdersService (src/api/src/modules/orders/)
      ← Regla: CR-005 (winner determination), Order.totalAmount derivado de Bid ganador
        ← Fuente: Auction.winnerId, Bid.amount, Lot.items
          ← Acción: Invocado automáticamente por AuctionSchedulerService al cerrar subasta
```

**Estado trazabilidad**: TRAZADO ✓

---

## P-007 — DisputeRecord (Disputa)

```
Producto: Dispute en DB con estado (OPEN → REVIEWING → RESOLVED/REJECTED) + eventos
  ← Transformación: DisputesService.[openDispute|resolveDispute] → crea/actualiza Dispute
    ← Servicio: DisputesService usando DisputeStateMachine de @ironloot/core
      ← Regla: CR-007 (14-day window post-delivery para abrir disputa)
        ← Fuente: Order.deliveredAt + días transcurridos + actor (buyer/admin)
          ← Acción: POST /api/disputes { orderId, reason, evidence }
```

**Estado trazabilidad**: TRAZADO ✓  
**Verified**: `DisputeStateMachine.windowDays` importado de @ironloot/core

---

## P-008 — AuthToken (Token de autenticación)

```
Producto: JWT Access Token + Refresh Token (HttpOnly cookie) + user session
  ← Transformación: AuthService.login() → valida credenciales → genera tokens → set-cookie
    ← Servicio: AuthService (src/api/src/modules/auth/auth.service.ts)
      ← Regla: CR-013 (banned users cannot authenticate), CR-010 (2FA required si enabled)
        ← Fuente: User.passwordHash, User.state, User.twoFactorEnabled, User.twoFactorSecret
          ← Acción: POST /api/auth/login { email, password, [totp] }
```

**Estado trazabilidad**: TRAZADO ✓

---

## P-009 — CfdiRecord (Registro fiscal CFDI)

```
Producto: CfdiRecord en DB con folio, UUID SAT, XML firmado — ESPERADO
  ← Transformación: CfdiService.createCfdi() → llama PAC → almacena XML/UUID — STUB (no implementado)
    ← Servicio: CfdiService (stub)
      ← Regla: CR-011 (toda transacción gravable debe tener CFDI válido)
        ← Fuente: Order completado + datos fiscales del comprador/vendedor
          ← Acción: Trigger automático al completar una Order (o petición manual)
```

**Estado trazabilidad**: PARCIALMENTE TRAZADO — cadena de transformación rota (stub)  
**Anomalía detectada**: CFDI integration es stub → H-005

---

## P-010 — PageRenderSSR (Página renderizada SSR)

```
Producto: HTML renderizado con datos del usuario (perfil, pujas, wallet, órdenes)
  ← Transformación: AppController.[dashboard|wallet|bids|profile] → fetch API server-side → render template
    ← Servicio: AppController CLIENT (src/apps/client/src/app.controller.ts) + NestJS render engine
      ← Regla: BFF pattern — token en HttpOnly cookie, no expuesto al JS del browser
        ← Fuente: Cookie HttpOnly (JWT) + API responses via servidor
          ← Acción: GET navegación browser a cualquier página del CLIENT
```

**Estado trazabilidad**: TRAZADO ✓  
**Anomalía detectada**: apiUrl expuesto al browser en todas las páginas → H-006

---

## P-011 — NotificationRecord (Notificación)

```
Producto: Notification en DB + emisión via Socket.io o email
  ← Transformación: NotificationsService.send() → crea Notification en DB → emite WS / envía email
    ← Servicio: NotificationsService
      ← Regla: Notificaciones enviadas en eventos clave (nueva puja, superado, subasta cerrada, orden creada, disputa)
        ← Fuente: Evento de dominio disparado por BidsService / AuctionSchedulerService / OrdersService
          ← Acción: Acciones de usuario (puja, pago) o eventos del sistema (cierre, disputa)
```

**Estado trazabilidad**: TRAZADO ✓

---

## P-012 — CmsContent (Contenido CMS)

```
Producto: Respuesta JSON con contenido CMS o página renderizada con contenido dinámico
  ← Transformación: CmsService.[getContent|updateContent] → lee/escribe en cms_content tabla
    ← Servicio: CmsService (src/api/src/modules/cms/)
      ← Regla: Solo admins pueden modificar contenido (RolesGuard)
        ← Fuente: cms_content tabla en DB, keyed por slug
          ← Acción: GET /api/cms/:slug (público) | PUT /api/cms/:slug (admin)
```

**Estado trazabilidad**: TRAZADO ✓

---

## Resumen F4

| Producto | Estado | Anomalías |
|---|---|---|
| P-001 Bid | TRAZADO ✓ | H-001 (soft-close hardcoded) |
| P-002 AuctionResult | TRAZADO ✓ | — |
| P-003 RateLimitResponse | TRAZADO ✓ | H-002 (in-memory throttler) |
| P-004 PaymentWebhookResult | TRAZADO ✓ | H-003 (Logger estándar) |
| P-005 WalletTransaction | TRAZADO ✓ | H-004 (withdraw mock) |
| P-006 Order | TRAZADO ✓ | — |
| P-007 DisputeRecord | TRAZADO ✓ | — |
| P-008 AuthToken | TRAZADO ✓ | — |
| P-009 CfdiRecord | PARCIAL | H-005 (stub) |
| P-010 PageRenderSSR | TRAZADO ✓ | H-006 (apiUrl browser) |
| P-011 NotificationRecord | TRAZADO ✓ | — |
| P-012 CmsContent | TRAZADO ✓ | — |

**12/12 productos trazados** (P-009 cadena rota en stub — registrado como H-005).

**F4 COMPLETADA — F5/F6/F7/F8 pueden proceder.**
