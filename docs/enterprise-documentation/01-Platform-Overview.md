# 01 — Platform Overview

**Source:** `CLAUDE.md:7-14`, `src/api/package.json:3`, `docker-compose.yml:1-319`

## What is Iron Loot?

Iron Loot is a **full-stack auction platform** (v1.0.0) that enables real-time bidding on goods, with integrated payment processing (PayPal + Mercado Pago), a financial wallet per user, and a dispute resolution workflow. The platform targets the **Mexican market** — currency is standardized to **MXN** (`src/api/prisma/schema.prisma:628`), and fiscal invoice integration (CFDI/PAC) is planned.

## Value Proposition

- **Transparent auctions** — real-time WebSocket bids, immutable audit log, no off-platform deals.
- **Secure payments** — wallet-based fund locking before close; webhook HMAC validation prevents fraud.
- **Dispute resolution** — structured 14-day conflict window after delivery.
- **Seller onboarding** — KYC verification, commission tracking, CFDI fiscal records.

## Actors

| Actor | Description |
|---|---|
| **Buyer** | Browses auctions, places bids, manages wallet deposits/withdrawals, opens disputes |
| **Seller** | Creates auction drafts, ships orders, receives payments minus platform commission |
| **Admin** | Moderates auctions (approve/reject/suspend), manages users, oversees KYC, views reports |
| **System** | Runs cron jobs (auction close, soft-close, cleanup), sends notifications, processes webhooks |

## Service Map

```
┌─────────────────────────────────────────────────────────────────┐
│                         NGINX (:80)                             │
│  localhost / base.ironloot.local → BASE (:5174)                 │
│  client.ironloot.local           → CLIENT (:5175)               │
│  admin.ironloot.local            → ADMIN (:3001)                │
│  api.ironloot.local              → API (:3000)                  │
│  ironloot.local                  → 301 redirects (PT-025)       │
└────────────┬──────────────────────────────┬─────────────────────┘
             │                              │
    ┌────────▼────────┐          ┌──────────▼──────────┐
    │  BASE (:5174)   │          │  CLIENT (:5175)     │
    │  NestJS SSR     │          │  NestJS SSR         │
    │  Public site    │          │  Private portal     │
    │  (Nunjucks)     │          │  (Nunjucks)         │
    └────────┬────────┘          └──────────┬──────────┘
             │   BFF HTTP proxy             │ Direct API calls
             └──────────────┬───────────────┘
                            │
                   ┌────────▼────────┐     ┌──────────────┐
                   │   API (:3000)   │     │  ADMIN(:3001)│
                   │   NestJS REST   │────▶│  NestJS SSR  │
                   │   + WebSockets  │     │  (Nunjucks)  │
                   └────────┬────────┘     └──────────────┘
                            │
              ┌─────────────┼──────────────┐
              │             │              │
    ┌─────────▼──────┐ ┌────▼─────┐ ┌─────▼──────┐
    │ PostgreSQL:5432│ │Redis:6379│ │Mailhog:1025│
    │ (postgres:16)  │ │(redis:7) │ │(dev email) │
    └────────────────┘ └──────────┘ └────────────┘
```

Source: `docker-compose.yml`, `src/nginx/nginx.conf`

## Services

| Service | Runtime | Port | Container | Memory Limit |
|---|---|---|---|---|
| `src/api/` | NestJS 10 | 3000 | `ironloot-api` | 1 GB |
| `src/apps/base/` | NestJS 10 | 5174 | `ironloot-base` | 512 MB |
| `src/apps/client/` | NestJS 10 | 5175 | `ironloot-client` | 512 MB |
| `src/admin/` | NestJS 10 | 3001 | `ironloot-admin` | 512 MB |
| `src/nginx/` | nginx | 80 | `ironloot-nginx` | — |
| PostgreSQL | postgres:16-alpine | 5432 | `ironloot-db` | 512 MB |
| Redis | redis:7-alpine | 6379 | `ironloot-redis` | 256 MB |
| Mailhog | mailhog/mailhog | 1025/8025 | `ironloot-mailhog` | 256 MB |

Source: `docker-compose.yml:33-319`

## Shared Library

`src/packages/core` (`@ironloot/core`) is a **framework-free TypeScript library** consumed by `src/api/`. It contains:
- Domain state machines (auction, order, dispute)
- Value objects (Money with MXN validation)
- Domain event types (AuctionClosedEvent, BidPlacedEvent, etc.)
- Repository interfaces (contracts for DI)
- Payment webhook validators
- No NestJS, no Prisma, no Express imports (`src/packages/core/src/index.ts:4`)

Source: `src/packages/core/package.json`, `src/packages/core/src/index.ts`

## Key Business Rules (non-negotiable)

| Rule | Value | Source |
|---|---|---|
| Auction soft-close window | 120s (env: `AUCTION_SOFT_CLOSE_WINDOW_SEC`) | `.env.example:113` |
| Payment expiration | 72h (env: `PAYMENT_EXPIRATION_HOURS`) | `.env.example:116` |
| Dispute window | 14 days after delivery (env: `DISPUTE_WINDOW_DAYS`) | `.env.example:119` |
| Global rate limit | 100 req/min per IP | `.env.example:94-95` |
| Auth throttle (login) | 5 req/min prod; 60 dev | `src/api/src/modules/auth/auth.controller.ts:35` |
| Currency | MXN only | `src/api/prisma/schema.prisma:628` |
| Withdrawal daily limit | 5,000 MXN | `src/api/src/modules/wallet/wallet.controller.ts:132` |
