# Modelo de Datos (Físico y Lógico) — IronLoot

| Metadato | Valor |
|---|---|
| **Origen** | Reconstrucción basada en evidencia |
| **Fuente** | `audit/raw/C-database.md`, `prisma/schema.prisma`, `prisma/migrations/*` |
| **Fecha** | 2026-07-23 |
| **Documentos usados** | 07-Database-Architecture, inventory/entities |
| **Código usado** | `schema.prisma` (896 líneas), 14 migraciones |
| **Nivel de confianza** | Alto |

> Catálogo lógico completo de entidades/enums en [Modelo Maestro de Dominio](../transversal/Modelo-Maestro-de-Dominio.md). Aquí: modelo físico, precisión, relaciones/`onDelete`, migraciones y **drift**.

## 1. Resumen físico

- **24 modelos · 18 enums · 14 migraciones.** Motor: PostgreSQL 16, ORM Prisma.
- IDs `uuid` (`@db.Uuid`), timestamps `Timestamptz`, JSON como `JsonB`.
- Dinero: `Decimal(12,2)` en Wallet/Ledger; `Decimal(10,2)` en Payment/Order/Bid/Refund/Commission.

## 2. Relaciones y `onDelete` (del SQL de migración, no sólo del esquema)

| Relación | Cardinalidad | onDelete (migración) |
|---|---|---|
| User–Profile | 1:1 | CASCADE |
| User–Session | 1:N | CASCADE |
| User–Auction (seller) | 1:N | RESTRICT |
| Auction–Bid, User–Bid | 1:N | RESTRICT |
| Auction–Order | 1:1 (auctionId único) | RESTRICT |
| Order–Payment/Shipment/Rating/Dispute | 1:N / 1:1 | RESTRICT |
| Wallet–Ledger, User–Wallet | 1:N / 1:1 | RESTRICT |
| User–UserPaymentMethod | 1:N | CASCADE (esquema+mig.) |
| Order–RefundRequest | 1:1 | (sin migración) |
| CommissionRecord/ModerationLog/CfdiRecord/KycSubmission | ref libre | sin FK |

> Los modelos de backoffice (excepto RefundRequest) usan **referencias libres** sin `@relation` ni FK — su integridad referencial no está garantizada en BD.

## 3. Migraciones (14, cronológico)

1–9: módulos base (auth/auctions/bids/orders/payments/shipments/ratings/disputes/notifications/wallet). · 10 `audit_fixes_v0_3_0`: +`AUCTION_LOST`, +`STRIPE`, 2FA cols, índice compuesto bids. · 11 `update_ledger_types`: HOLD→HOLD_BID, RELEASE→RELEASE_BID, +DEBIT_ORDER/CREDIT_SALE/FEE_PLATFORM. · 12 `fix_wallet_currency_default_to_mxn`: wallets USD→MXN (default+backfill). · 13 `remove_purchase_ledger_type`: elimina PURCHASE. · 14 `add_user_payment_methods`: tabla UserPaymentMethod.

## 4. Drift esquema↔migraciones (AUD-001) — CRÍTICO

**11 de 24 modelos (46%) sin `CREATE TABLE` en ninguna migración:** Watchlist, SystemConfig, CommissionConfig, CommissionRecord, ModerationLog, CfdiRecord, KycSubmission, NotificationCampaign, RefundRequest, SeoConfig, CmsContent (+ sus 9 enums).

**Valores de enum sin `ALTER TYPE`:** `AuctionStatus.SUSPENDED`, `AuctionStatus.PENDING_MODERATION`, `PaymentProvider.HEY_BANCO`.

- **Causa:** uso de `prisma db push` (`package.json:27`) en vez de migraciones para el backoffice.
- **Impacto:** un entorno construido con `prisma migrate deploy` **carece de ~la mitad del esquema**.
- **Recomendación:** migración de reconciliación (`prisma migrate diff`) + prohibir `db push`.

## 5. Modelo de dinero (detalle)

- **Wallet:** `balance`, `heldFunds` `Decimal(12,2)`, `currency` MXN, `isActive` (requiere depósito inicial).
- **Ledger:** inmutable, append-only; `type` (LedgerType 9 valores), `amount/balanceBefore/balanceAfter`; sin currency propio (hereda wallet).
- **Payment:** `currency` **default DB `USD`** (`migration ...123540:13`) vs esquema `MXN` (`schema.prisma:304`) → **AUD-008**.
- **CommissionRecord/RefundRequest:** `amount` sin/con currency; sin migración → integridad no verificable (`AUD-001`).

## 6. Seed

**No existe** script de seed pese a `db:seed` en `package.json:29` → `npm run db:seed` falla hoy (`AUD-017`). `docker-compose` referencia `init-db.sql` (ro) para el contenedor db.

> Diagrama ERD lógico: ver [Modelo Maestro de Dominio](../transversal/Modelo-Maestro-de-Dominio.md). Máquinas de estado: [DDD-Bounded-Contexts](../3-arquitectura/DDD-Bounded-Contexts.md).
