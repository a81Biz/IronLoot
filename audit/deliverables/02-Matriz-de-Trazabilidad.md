# Matriz Global de Trazabilidad — IronLoot

| Metadato | Valor |
|---|---|
| **Origen** | Fase 5 de la auditoría documental |
| **Fuente** | `audit/raw/A..F` (evidencia citada) + código en `src/` |
| **Fecha** | 2026-07-23 |
| **Cadena** | Regla de negocio → Caso de uso → Entidad → Servicio → Endpoint → Pantalla → Prueba → Manual |
| **Nivel de confianza** | Alto (estático). "✗" = cadena rota → hallazgo asociado. |

**Leyenda de estado de cadena:** ✅ completa · ⚠️ parcial (eslabón débil) · ✗ rota (falta un eslabón) · N/A no aplica.

---

## 1. Reglas de negocio ↔ implementación ↔ prueba

| # | Regla (canónica) | Caso de uso | Entidad | Servicio (código) | Endpoint | Pantalla | Prueba | Manual | Cadena | Hallazgo |
|---|---|---|---|---|---|---|---|---|---|---|
| R-01 | Puja debe ser estrictamente `> currentPrice` | Pujar | Bid, Auction | `bid-validation.ts:35`, `bids.service.ts:71` | `POST /auctions/:id/bids` | **✗ sin página de puja** | core 6 + e2e 7; prod 4 | Manual comprador | ✗ | AUD-002 |
| R-02 | Incremento mínimo de puja | Pujar | Bid | `system-config.ts:29` (config) **no aplicado** en `bid-validation.ts` | (mismo) | ✗ | ninguna | ✗ | ✗ | AUD-009 |
| R-03 | Vendedor no puja su subasta + no auto-superarse | Pujar | Bid, Auction, User | `bid-validation.ts:31`, `bids.service.ts:85` | `POST /auctions/:id/bids` | ✗ | core 6 | Manual | ⚠️ | AUD-002 |
| R-04 | Soft-close 120s extiende `endsAt` | Pujar / Cierre | Auction | `bids.service.ts:100`; config `AUCTION_SOFT_CLOSE_WINDOW_SEC` | `POST /auctions/:id/bids` (WS `auction:extended`) | ✗ (WS sin cliente) | scheduler 3 | Manual | ⚠️ | AUD-002, AUD-006 |
| R-05 | Bloqueo de fondos al pujar (hold-first) | Pujar | Wallet, Ledger | `wallet.service.ts:164-215`, `wallet-calculation.ts` | (interno) | Wallet | prod 8 + core 12 | Manual wallet | ⚠️ | AUD-013 (race) |
| R-06 | Superado libera fondos previos | Pujar | Wallet, Ledger | `bids.service.ts:137-162` | (interno) | Notificaciones | prod 4 | Manual | ⚠️ | — |
| R-07 | Cierre crea orden PAID + redistribuye fondos | Cerrar subasta | Auction, Order, Wallet | `auction-scheduler.service.ts:127-160` (core `CloseAuctionUseCase` **no cableado**) | cron | Ganadas | scheduler 3 (core 4 no ejecutado) | Manual | ⚠️ | AUD-012 |
| R-08 | Comisión de plataforma | Cerrar / Cobrar | Wallet, CommissionRecord | **10% fijo** `wallet.service.ts:285` **vs** `commissions.service.ts:46` (no cableado) | admin commissions | Admin/Comisiones | **0 tests** | Manual admin | ✗ | AUD-005, AUD-013 |
| R-09 | Depósito = monto verificado del proveedor | Depositar | Wallet, Payment, UserPaymentMethod | `wallet.controller.ts:96-108`, `payments.service.ts` | `POST /wallet/deposit` | Depósito | prod 5 + e2e | Manual wallet | ⚠️ | AUD-003 (auth UI) |
| R-10 | Límite de retiro 5000 MXN/día + método registrado | Retirar | Wallet, UserPaymentMethod | `wallet.controller.ts:126-134` | `POST /wallet/withdraw` | Retiro | prod 5 | Manual wallet | ⚠️ | AUD-003 |
| R-11 | Webhook: validar HMAC/IPN antes de procesar | Confirmar pago | Payment, Wallet | `mercadopago.provider.ts:137`, `paypal.provider.ts:72`, `heybanco.provider.ts:130` | `POST /payments/webhook/:provider` | N/A | core 7+11; prod 6 | Manual devops | ⚠️ | AUD-023 |
| R-12 | Ventana de disputa 14 días tras entrega | Abrir disputa | Dispute, Order | `dispute-state-machine.ts:12`, `disputes.service.ts:55` | `POST /disputes` | Crear disputa | core 7 + prod 7 | Manual | ⚠️ | AUD-003 |
| R-13 | Resolución de disputa | Resolver disputa | Dispute, RefundRequest, Wallet | `admin.service.ts:868` **no mueve dinero** | `POST /admin/disputes/:id/resolve-*` | Admin/Disputas | **0 tests** prod | Manual admin | ✗ | AUD-010 |
| R-14 | Reembolso: crédito + orden→REFUNDED | Reembolsar | RefundRequest, Order, Wallet, Ledger | `refunds.service.ts:19-89` (core `ProcessRefundUseCase` no cableado) | `POST /admin/refunds` | Admin/Reembolsos | **0 tests** prod | Manual admin | ✗ | AUD-012, AUD-013 |
| R-15 | Calificación requiere envío DELIVERED | Calificar | Rating, Order, Shipment | `ratings.service.ts:40` | `POST /ratings` | Reputación | prod 6 + e2e 6 | Manual | ✅ | — |
| R-16 | Moneda MXN global; Decimal no Float | (transversal) | Payment, Wallet, Refund | `schema.prisma` (Payment default DB `USD`) | N/A | N/A | core Money 30 (**no usado en API**) | Manual | ⚠️ | AUD-008, AUD-012 |
| R-17 | Login bloqueado si no verificado / SUSPENDED / BANNED | Autenticar | User, Session | `auth.service.ts:636,733` | `POST /auth/login` | Login | prod 9 + e2e 8 | Manual | ✅ | — |
| R-18 | Puerta de secretos en producción (exit si placeholder) | Arranque | — | `env.validation.ts` (falta set admin) | N/A | N/A | — | DevOps | ⚠️ | AUD-004 |
| R-19 | Rate limit global 100/min + estricto en auth/wallet | (transversal) | — | `@Throttle` en auth/wallet/webhook | (varios) | N/A | — | DevOps | ⚠️ | AUD-004 (admin skip) |
| R-20 | Ledger inmutable (insert-only; corrección vía ADJUSTMENT) | (transversal) | Ledger | `wallet.service.ts` (sin update) | N/A | Historial wallet | prod 8 | Manual | ✅ | AUD-018 (retención) |

## 2. Casos de uso ↔ evidencia

| Caso de uso | Evidencia en código | Pantalla | Cobertura E2E | Estado |
|---|---|---|---|---|
| Registro + verificación email + login | `auth.controller.ts` | BASE auth/* | auth.e2e 8 | ✅ |
| SSO cross-subdominio (BFF cookie) | `base/src/main.ts:73-120` | BASE→CLIENT | — | ⚠️ (CLIENT sin proxy, AUD-003) |
| Explorar catálogo → detalle | `base app.controller.ts:48-61` | BASE list/detail | — | ✅ |
| Pujar → ganar → cierre | `bids.service`, `scheduler` | **✗ sin UI puja** | bids.e2e 7 | ✗ AUD-002 |
| Wallet depósito/retiro | `wallet.controller.ts` | CLIENT wallet/* | wallet.e2e 5 | ⚠️ AUD-003 |
| Orden → envío → entrega → rating | `orders/shipments/ratings.service` | CLIENT orders/* | orders.e2e 5 | ✅ |
| Disputa → mediación → resolución → reembolso | `disputes.service`, `admin.service` | CLIENT/Admin disputas | disputes.e2e 4 | ✗ AUD-010/013 |
| Moderación admin | `admin.service` (raw prisma) | Admin auctions | 0 | ✗ AUD-011 |
| KYC verificación vendedor | `kyc.service` | Admin kyc | 0 | ⚠️ |
| CFDI factura fiscal | `cfdi.service` (**stub**) | Admin cfdi | 0 | ✗ AUD-016 |
| Campañas de notificación | `admin.service` notifications | Admin notifications | 0 | ⚠️ |

## 3. Entidades ↔ migración ↔ documentación

| Entidad | En schema.prisma | Migración | En 07-Database/entities.md | Estado |
|---|---|---|---|---|
| User, Profile, Session, Auction, Bid, Order, Payment, Shipment, Rating, Dispute, Notification, Wallet, Ledger + observabilidad | ✅ | ✅ | ✅ | ✅ |
| Watchlist, SystemConfig, CommissionConfig, CommissionRecord, ModerationLog, CfdiRecord, KycSubmission, NotificationCampaign, RefundRequest, SeoConfig, CmsContent | ✅ | **✗ sin migración** | parcial | ✗ AUD-001 |
| UserPaymentMethod | ✅ | ✅ (migración 14) | **✗ sin documentar** | ✗ AUD-019 |
| Enum `AuctionStatus.SUSPENDED/PENDING_MODERATION`, `PaymentProvider.HEY_BANCO` | ✅ | **✗ sin ALTER TYPE** | parcial | ✗ AUD-001/023 |

---

## 4. Eslabones rotos (resumen)

| Cadena rota | Eslabón faltante | Hallazgo |
|---|---|---|
| Regla puja → **Pantalla** | No hay página de puja ni cliente WS en CLIENT | AUD-002 |
| Config incremento → **Servicio** | `AUCTION_MIN_INCREMENT_AMOUNT` no leído por `bid-validation` | AUD-009 |
| Escrituras CLIENT → **Auth** | Sin proxy BFF; API sólo Bearer | AUD-003 |
| Comisión → **Regla única** | Dos mecanismos (fijo vs configurable) | AUD-005 |
| Resolución disputa → **Dinero** | No dispara reembolso | AUD-010 |
| Reembolso/Comisión → **Prueba** | 0 tests en servicios de producción | AUD-013 |
| Use-cases core → **Producción** | Nunca importados por la API | AUD-012 |
| Modelos backoffice → **Migración** | 11 tablas sin migración | AUD-001 |
| CFDI → **Implementación** | `generate()` lanza NotImplemented | AUD-016 |
| Moneda MXN → **Default BD pagos** | `payments.currency` default `USD` | AUD-008 |

---

*Fin de la Matriz de Trazabilidad. Cada "✗" tiene un hallazgo asociado en `01-Registro-de-Hallazgos.md`.*
