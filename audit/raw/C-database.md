# C — Database / Data Model Audit (Phase 3)

Scope: `src/api/prisma/schema.prisma` (authoritative current schema, 896 lines) + all 14 migration
folders under `src/api/prisma/migrations/` + seed script search. No files modified except this one.

Sources:
- Schema: `src/api/prisma/schema.prisma`
- Migrations (chronological, 14 folders):
  1. `20260106100011_init_auctions_module/migration.sql`
  2. `20260106111403_init_bids_module/migration.sql`
  3. `20260106115351_init_orders_module/migration.sql`
  4. `20260106123540_add_payments_module/migration.sql`
  5. `20260106133716_add_shipments_module/migration.sql`
  6. `20260106135936_add_ratings_module/migration.sql`
  7. `20260106141606_add_disputes_module/migration.sql`
  8. `20260106142346_add_notifications_module/migration.sql`
  9. `20260106154609_add_wallet_module/migration.sql`
  10. `20260107205455_audit_fixes_v0_3_0/migration.sql`
  11. `20260108020207_update_ledger_types/migration.sql`
  12. `20260619_fix_wallet_currency_default_to_mxn/migration.sql`
  13. `20260619_remove_purchase_ledger_type/migration.sql`
  14. `20260623_add_user_payment_methods/migration.sql`
- Seed script: **none found**. `src/api/package.json:29` defines `"db:seed": "npx prisma db seed"`,
  but there is no `prisma.seed` config block in `package.json` and no `seed*.ts`/`seed*.js` file
  anywhere under `src/api/prisma/` (Glob `**/seed*.ts` and `**/*.ts` under `prisma/` → no results).
  Running `npm run db:seed` would fail today. `src/api/package.json:27` also exposes
  `"db:push": "npx prisma db push"` — relevant to the Drift Check (section 5).

---

## 1. ENTITY CATALOG

One subsection per Prisma model. Field format: `name : type (db type) — nullable? / default / unique?`.

### User (`users`) — schema.prisma:40-101
| Field | Type | Nullable | Default | Unique |
|---|---|---|---|---|
| id | String @db.Uuid | no | uuid() | PK |
| createdAt (`created_at`) | DateTime @db.Timestamptz | no | now() | |
| updatedAt (`updated_at`) | DateTime @db.Timestamptz | no | @updatedAt | |
| email | String @db.VarChar(255) | no | | yes |
| username | String @db.VarChar(50) | no | | yes |
| passwordHash (`password_hash`) | String @db.VarChar(255) | no | | |
| twoFactorSecret (`two_factor_secret`) | String? @db.VarChar(100) | yes | | |
| isTwoFactorEnabled (`is_two_factor_enabled`) | Boolean | no | false | |
| displayName (`display_name`) | String? @db.VarChar(100) | yes | | |
| avatarUrl (`avatar_url`) | String? @db.Text | yes | | |
| state | UserState | no | PENDING_VERIFICATION | |
| suspendedReason (`suspended_reason`) | String? @db.Text | yes | | |
| bannedReason (`banned_reason`) | String? @db.Text | yes | | |
| settings | Json @db.JsonB | no | `{"language":"es","notifications":{"email":true,"inApp":true}}` | |
| isSeller (`is_seller`) | Boolean | no | false | |
| sellerEnabledAt (`seller_enabled_at`) | DateTime? @db.Timestamptz | yes | | |
| emailVerifiedAt (`email_verified_at`) | DateTime? @db.Timestamptz | yes | | |
| emailVerificationToken (`email_verification_token`) | String? @db.VarChar(255) | yes | | |
| emailVerificationExpiresAt (`email_verification_expires_at`) | DateTime? @db.Timestamptz | yes | | |
| passwordResetToken (`password_reset_token`) | String? @db.VarChar(255) | yes | | |
| passwordResetExpiresAt (`password_reset_expires_at`) | DateTime? @db.Timestamptz | yes | | |

Relations (schema.prisma:83-95): `sessions Session[]`, `profile Profile?`, `auctions Auction[]` (as seller),
`bids Bid[]` (as bidder), `watchlist Watchlist[]`, `ordersAsBuyer Order[] "OrdersBuyer"`,
`ordersAsSeller Order[] "OrdersSeller"`, `authoredRatings Rating[] "RatingAuthor"`,
`receivedRatings Rating[] "RatingTarget"`, `createdDisputes Dispute[] "DisputeCreator"`,
`notifications Notification[]`, `paymentMethods UserPaymentMethod[]`, `wallet Wallet?` (schema.prisma:72).
Indexes (schema.prisma:97-99): `idx_users_email(email)`, `idx_users_username(username)`, `idx_users_state(state)`.
Map: `users`.

### Profile (`profiles`) — schema.prisma:104-128
| Field | Type | Nullable | Default | Unique |
|---|---|---|---|---|
| id | String @db.Uuid | no | uuid() | PK |
| createdAt/updatedAt | DateTime @db.Timestamptz | no | now()/@updatedAt | |
| userId (`user_id`) | String @db.Uuid | no | | yes (1:1) |
| phone | String? @db.VarChar(20) | yes | | |
| legalName (`legal_name`) | String? @db.VarChar(150) | yes | | |
| address | String? @db.Text | yes | | |
| city | String? @db.VarChar(100) | yes | | |
| country | String? @db.VarChar(100) | yes | | |
| postalCode (`postal_code`) | String? @db.VarChar(20) | yes | | |
| rfc | String? @db.VarChar(13) | yes | | |

Relation: `user User @relation(fields:[userId], onDelete: Cascade)` — schema.prisma:111. Index `idx_profiles_user(userId)` (schema.prisma:126). Map: `profiles`.

### Session (`sessions`) — schema.prisma:131-153
| Field | Type | Nullable | Default | Unique |
|---|---|---|---|---|
| id | String @db.Uuid | no | uuid() | PK |
| createdAt | DateTime @db.Timestamptz | no | now() | |
| userId (`user_id`) | String @db.Uuid | no | | |
| refreshToken (`refresh_token`) | String @db.VarChar(255) | no | | yes |
| expiresAt (`expires_at`) | DateTime @db.Timestamptz | no | | |
| ipAddress (`ip_address`) | String? @db.VarChar(50) | yes | | |
| userAgent (`user_agent`) | String? @db.Text | yes | | |
| lastUsedAt (`last_used_at`) | DateTime? @db.Timestamptz | yes | | |
| revokedAt (`revoked_at`) | DateTime? @db.Timestamptz | yes | | |

Relation: `user User @relation(fields:[userId])` — schema.prisma:137 (no explicit onDelete in schema, but migration sets `ON DELETE CASCADE`, see §5). Indexes: `idx_sessions_user`, `idx_sessions_token`, `idx_sessions_expires` (schema.prisma:149-151). Map: `sessions`.

### Auction (`auctions`) — schema.prisma:160-196
| Field | Type | Nullable | Default | Unique |
|---|---|---|---|---|
| id | String @db.Uuid | no | uuid() | PK |
| createdAt/updatedAt | DateTime @db.Timestamptz | no | now()/@updatedAt | |
| title | String @db.VarChar(200) | no | | |
| description | String @db.Text | no | | |
| slug | String @db.VarChar(255) | no | | yes |
| images | Json @db.JsonB | no | `[]` | |
| startingPrice (`starting_price`) | Decimal @db.Decimal(10,2) | no | | |
| currentPrice (`current_price`) | Decimal @db.Decimal(10,2) | no | | |
| startsAt (`starts_at`) | DateTime @db.Timestamptz | no | | |
| endsAt (`ends_at`) | DateTime @db.Timestamptz | no | | |
| status | AuctionStatus | no | DRAFT | |
| isBlocked (`is_blocked`) | Boolean | no | false | |
| adminNotes (`admin_notes`) | String? @db.Text | yes | | |
| sellerId (`seller_id`) | String @db.Uuid | no | | |

Relations: `seller User @relation(fields:[sellerId])` (schema.prisma:186), `bids Bid[]`, `watchlist Watchlist[]`,
`order Order?` (1:1, schema.prisma:190). Indexes: `idx_auctions_seller`, `idx_auctions_status`,
`idx_auctions_ends_at` (schema.prisma:192-194). Map: `auctions`. **Note**: `startingPrice`/`currentPrice` are
`Decimal(10,2)` with **no currency column on Auction itself** — currency is implicit (MXN, see §6).

### Bid (`bids`) — schema.prisma:199-219
| Field | Type | Nullable | Default | Unique |
|---|---|---|---|---|
| id | String @db.Uuid | no | uuid() | PK |
| createdAt/updatedAt | DateTime @db.Timestamptz | no | now()/@updatedAt | |
| amount | Decimal @db.Decimal(10,2) | no | | |
| auctionId (`auction_id`) | String @db.Uuid | no | | |
| bidderId (`bidder_id`) | String @db.Uuid | no | | |

Relations: `auction Auction @relation(fields:[auctionId])` (schema.prisma:209), `bidder User @relation(fields:[bidderId])` (schema.prisma:212).
Indexes: `idx_bids_auction`, `idx_bids_bidder`, `idx_bids_amount`, composite `idx_bids_auction_amount(auctionId, amount DESC)` (schema.prisma:214-217). Map: `bids`.

### Watchlist (`watchlist`) — schema.prisma:222-236
| Field | Type | Nullable | Default | Unique |
|---|---|---|---|---|
| id | String @db.Uuid | no | uuid() | PK |
| createdAt | DateTime @db.Timestamptz | no | now() | |
| userId (`user_id`) | String @db.Uuid | no | | part of composite unique |
| auctionId (`auction_id`) | String @db.Uuid | no | | part of composite unique |

Relations: `user User @relation(fields:[userId])`, `auction Auction @relation(fields:[auctionId])` (schema.prisma:228,231).
Composite unique `@@unique([userId, auctionId])` (schema.prisma:233); index `idx_watchlist_user` (schema.prisma:234). Map: `watchlist`.
**No migration creates this table — see Drift §5.**

### Order (`orders`) — schema.prisma:249-278
| Field | Type | Nullable | Default | Unique |
|---|---|---|---|---|
| id | String @db.Uuid | no | uuid() | PK |
| createdAt/updatedAt | DateTime @db.Timestamptz | no | now()/@updatedAt | |
| totalAmount (`total_amount`) | Decimal @db.Decimal(10,2) | no | | |
| status | OrderStatus | no | PENDING_PAYMENT | |
| auctionId (`auction_id`) | String @db.Uuid | no | | yes (1:1) |
| buyerId (`buyer_id`) | String @db.Uuid | no | | |
| sellerId (`seller_id`) | String @db.Uuid | no | | |

Relations: `auction Auction @relation(fields:[auctionId])` (1:1, schema.prisma:260), `buyer User "OrdersBuyer"` (schema.prisma:263),
`seller User "OrdersSeller"` (schema.prisma:266), `payments Payment[]`, `shipment Shipment?`, `ratings Rating[]`, `dispute Dispute?`,
`refundRequest RefundRequest?` (schema.prisma:268-272). Indexes: `idx_orders_buyer`, `idx_orders_seller`, `idx_orders_status` (schema.prisma:274-276). Map: `orders`. **No `currency` column on Order** — assumed MXN implicit (§6).

### Payment (`payments`) — schema.prisma:297-321
| Field | Type | Nullable | Default | Unique |
|---|---|---|---|---|
| id | String @db.Uuid | no | uuid() | PK |
| createdAt/updatedAt | DateTime @db.Timestamptz | no | now()/@updatedAt | |
| amount | Decimal @db.Decimal(10,2) | no | | |
| currency | String @db.VarChar(3) | no | **`MXN`** (schema.prisma:304) | |
| provider | PaymentProvider | no | | |
| status | PaymentStatus | no | PENDING | |
| externalId (`external_id`) | String? @db.VarChar(255) | yes | | |
| metadata | Json @db.JsonB | no | `{}` | |
| orderId (`order_id`) | String @db.Uuid | no | | |

Relation: `order Order @relation(fields:[orderId])` (schema.prisma:315). Indexes: `idx_payments_order`, `idx_payments_external_id`, `idx_payments_status` (schema.prisma:317-319). Map: `payments`.
**Currency drift**: original migration `20260106123540_add_payments_module/migration.sql:13` set `DEFAULT 'USD'`; no migration ever alters this default to MXN — see §5/§6.

### Shipment (`shipments`) — schema.prisma:345-367
| Field | Type | Nullable | Default | Unique |
|---|---|---|---|---|
| id | String @db.Uuid | no | uuid() | PK |
| createdAt/updatedAt | DateTime @db.Timestamptz | no | now()/@updatedAt | |
| provider | ShipmentProvider | no | | |
| trackingNumber (`tracking_number`) | String? @db.VarChar(100) | yes | | |
| status | ShipmentStatus | no | PENDING | |
| estimatedDelivery (`estimated_delivery`) | DateTime? @db.Timestamptz | yes | | |
| shippedAt (`shipped_at`) | DateTime? @db.Timestamptz | yes | | |
| deliveredAt (`delivered_at`) | DateTime? @db.Timestamptz | yes | | |
| orderId (`order_id`) | String @db.Uuid | no | | yes (1:1) |

Relation: `order Order @relation(fields:[orderId])` (schema.prisma:362). Indexes: `idx_shipments_order`, `idx_shipments_status` (schema.prisma:364-365). Map: `shipments`.

### Rating (`ratings`) — schema.prisma:370-393
| Field | Type | Nullable | Default | Unique |
|---|---|---|---|---|
| id | String @db.Uuid | no | uuid() | PK |
| createdAt/updatedAt | DateTime @db.Timestamptz | no | now()/@updatedAt | |
| score | Int @db.SmallInt | no | (comment: 1-5, not DB-enforced) | |
| comment | String? @db.Text | yes | | |
| orderId (`order_id`) | String @db.Uuid | no | | |
| authorId (`author_id`) | String @db.Uuid | no | | |
| targetId (`target_id`) | String @db.Uuid | no | | |

Relations: `order Order`, `author User "RatingAuthor"`, `target User "RatingTarget"` (schema.prisma:381,384,387). Indexes: `idx_ratings_order`, `idx_ratings_author`, `idx_ratings_target` (schema.prisma:389-391). Map: `ratings`.

### Dispute (`disputes`) — schema.prisma:404-422
| Field | Type | Nullable | Default | Unique |
|---|---|---|---|---|
| id | String @db.Uuid | no | uuid() | PK |
| orderId (`order_id`) | String @db.Uuid | no | | yes (1:1) |
| creatorId (`creator_id`) | String @db.Uuid | no | | |
| reason | String @db.VarChar(100) | no | | |
| description | String @db.Text | no | | |
| status | DisputeStatus | no | OPEN | |
| resolution | String? @db.Text | yes | | |
| createdAt/updatedAt | DateTime @db.Timestamptz | no | now()/@updatedAt | |

Relations: `order Order @relation(fields:[orderId])`, `creator User "DisputeCreator"` (schema.prisma:415-416). Indexes: `idx_disputes_order`, `idx_disputes_creator`, `idx_disputes_status` (schema.prisma:418-420). Map: `disputes`.

### Notification (`notifications`) — schema.prisma:436-451
| Field | Type | Nullable | Default | Unique |
|---|---|---|---|---|
| id | String @db.Uuid | no | uuid() | PK |
| userId (`user_id`) | String @db.Uuid | no | | |
| type | NotificationType | no | | |
| title | String @db.VarChar(200) | no | | |
| message | String @db.Text | no | | |
| data | Json @db.JsonB | no | `{}` | |
| isRead (`is_read`) | Boolean | no | false | |
| createdAt | DateTime @db.Timestamptz | no | now() | |

Relation: `user User @relation(fields:[userId])` (schema.prisma:446). Indexes: `idx_notifications_user`, `idx_notifications_read` (schema.prisma:448-449). Map: `notifications`.

### AuditEvent (`audit_events`) — schema.prisma:460-494
Fields: id (uuid PK), createdAt, eventType (`event_type` VarChar(100)), timestamp (default now()), traceId (`trace_id` VarChar(100)),
env VarChar(20), service VarChar(50), actorType (`actor_type` VarChar(20)), actorUserId (`actor_user_id` Uuid?),
entityType (`entity_type` VarChar(50)), entityId (`entity_id` Uuid), result VarChar(20), reasonCode (`reason_code` VarChar(100)?),
payload (Json, default `{}`), payloadVersion (`payload_version` Int, default 1). No FK relations declared (actorUserId/entityId are
loose references, not Prisma relations — intentional for an immutable append-only log). Indexes (schema.prisma:489-492):
`idx_audit_events_entity(entityType, entityId, timestamp DESC)`, `idx_audit_events_actor(actorUserId, timestamp DESC)`,
`idx_audit_events_trace(traceId)`, `idx_audit_events_type_time(eventType, timestamp DESC)`. Map: `audit_events`.

### ErrorEvent (`error_events`) — schema.prisma:498-539
Fields: id, createdAt, timestamp, traceId, env, service, errorCode (`error_code`), message (Text), severity VarChar(20),
httpStatus (`http_status` Int?), isBusinessError (`is_business_error` Boolean, default false), httpMethod/httpPath/httpQuery,
clientIp, userAgent, actorUserId, entityType, entityId, details (Json default `{}`), stack (Text?). No relations (loose refs).
Indexes: `idx_error_events_trace`, `idx_error_events_code_time`, `idx_error_events_actor`, `idx_error_events_entity`, `idx_error_events_http` (schema.prisma:533-537). Map: `error_events`.

### RequestLog (`request_logs`) — schema.prisma:543-579
Fields: id, createdAt, timestamp, traceId, env, service, httpMethod, httpPath (Text), httpStatus (Int), durationMs (`duration_ms` Int),
requestSizeBytes/responseSizeBytes (Int?), actorUserId, actorState (`actor_state` VarChar(50)?), clientIp, userAgent, clientApp (`client_app` VarChar(20)?),
entityType, entityId. No relations. Indexes: `idx_request_logs_trace`, `idx_request_logs_path_time`, `idx_request_logs_status_time`, `idx_request_logs_actor_time` (schema.prisma:574-577). Map: `request_logs`.

### SystemConfig (`system_config`) — schema.prisma:586-598
| Field | Type | Nullable | Default | Unique |
|---|---|---|---|---|
| key | String @db.VarChar(100) | no | | PK |
| value | String @db.Text | no | | |
| isSecret (`is_secret`) | Boolean | no | false | |
| category | String @db.VarChar(50) | no | `general` | |
| description | String? @db.Text | yes | | |
| updatedBy (`updated_by`) | String? @db.VarChar(255) | yes | | |
| createdAt/updatedAt | DateTime @db.Timestamptz | no | now()/@updatedAt | |

No relations (key-value store). Index `idx_system_config_category(category)` (schema.prisma:596). Map: `system_config`.
**No migration creates this table — see Drift §5.**

### CommissionConfig (`commission_config`) — schema.prisma:684-695
Fields: id (uuid PK), type (CommissionType), referenceId (`reference_id` VarChar(255)?), ratePercent (`rate_percent` Decimal(5,2)),
updatedBy (`updated_by` VarChar(255)), createdAt/updatedAt. No relations. Index `idx_commission_config_type(type)` (schema.prisma:693). Map: `commission_config`. **No migration — Drift §5.**

### CommissionRecord (`commission_records`) — schema.prisma:698-710
Fields: id (uuid PK), orderId (`order_id` unique, loose ref — **no Prisma relation to Order declared**), sellerId (`seller_id`, loose ref),
amount (Decimal(10,2)), ratePercent (`rate_percent` Decimal(5,2)), status (CommissionStatus, default PENDING), calculatedAt (`calculated_at`, default now()).
Indexes: `idx_commission_record_seller(sellerId)`, `idx_commission_record_status(status)` (schema.prisma:707-708). Map: `commission_records`. **No migration — Drift §5.**

### ModerationLog (`moderation_log`) — schema.prisma:719-730
Fields: id, auctionId (`auction_id`, loose ref, no relation), action (ModerationAction), reasonCode (`reason_code` VarChar(100)?), notes (Text?),
reviewedBy (`reviewed_by` VarChar(255)), createdAt. Index `idx_moderation_log_auction(auctionId)` (schema.prisma:728). Map: `moderation_log`. **No migration — Drift §5.**

### CfdiRecord (`cfdi_records`) — schema.prisma:741-755
Fields: id, orderId (`order_id` unique, loose ref, no relation), uuidSat (`uuid_sat` VarChar(100)?), xmlPath/pdfPath (Text?),
status (CfdiStatus, default PENDING), errorMessage (`error_message` Text?), emittedAt/cancelledAt (Timestamptz?), createdAt.
Index `idx_cfdi_record_status(status)` (schema.prisma:753). Map: `cfdi_records`. **No migration — Drift §5.**

### KycSubmission (`kyc_submissions`) — schema.prisma:766-779
Fields: id, userId (`user_id`, loose ref, no relation), status (KycStatus, default PENDING), docsJson (`docs_json` Json), reviewedBy (`reviewed_by` VarChar(255)?),
reviewNotes (`review_notes` Text?), submittedAt (default now()), updatedAt. Indexes: `idx_kyc_submission_user_status(userId,status)`, `idx_kyc_submission_status(status)` (schema.prisma:776-777). Map: `kyc_submissions`. **No migration — Drift §5.**

### NotificationCampaign (`notification_campaigns`) — schema.prisma:800-815
Fields: id, title (VarChar(200)), body (Text), segment (NotificationSegment), channelsJson (`channels_json` Json), scheduledAt/sentAt (Timestamptz?),
status (CampaignStatus, default DRAFT), recipientsCount (`recipients_count` Int, default 0), sentBy (`sent_by` VarChar(255)), createdAt.
Index `idx_notification_campaign_status(status)` (schema.prisma:813). Map: `notification_campaigns`. **No migration — Drift §5.**

### RefundRequest (`refund_requests`) — schema.prisma:828-843
| Field | Type | Nullable | Default | Unique |
|---|---|---|---|---|
| id | String @db.Uuid | no | uuid() | PK |
| orderId (`order_id`) | String @db.Uuid | no | | yes (1:1) |
| amount | Decimal @db.Decimal(10,2) | no | | |
| currency | String @db.VarChar(3) | no | **`MXN`** (schema.prisma:833) | |
| reason | String @db.Text | no | | |
| status | RefundStatus | no | PENDING_REFUND | |
| initiatedBy (`initiated_by`) | String @db.VarChar(255) | no | | |
| createdAt | DateTime @db.Timestamptz | no | now() | |
| resolvedAt (`resolved_at`) | DateTime? @db.Timestamptz | yes | | |

Relation: `order Order @relation(fields:[orderId])` (schema.prisma:831) — this is the one backoffice model that *does* declare a proper Prisma relation.
Indexes: `idx_refund_requests_order_id`, `idx_refund_requests_status` (schema.prisma:840-841). Map: `refund_requests`. **No migration — Drift §5.**

### SeoConfig (`seo_config`) — schema.prisma:849-861
Fields: id, page (VarChar(100) unique), title (default ""), description (default ""), ogTitle/ogDescription/ogImage (`og_*`, defaults ""), updatedAt,
updatedBy (`updated_by`, default "system"). No relations. Map: `seo_config`. **No migration — Drift §5.**

### CmsContent (`cms_content`) — schema.prisma:873-882
Fields: id, key (VarChar(150) unique), value (Text), type (CmsContentType, default TEXT), updatedAt, updatedBy (default "system"). No relations. Map: `cms_content`. **No migration — Drift §5.**

### UserPaymentMethod (`user_payment_methods`) — schema.prisma:885-896
| Field | Type | Nullable | Default | Unique |
|---|---|---|---|---|
| id | String @db.Uuid | no | uuid() | PK |
| createdAt | DateTime @db.Timestamptz | no | now() | |
| userId (`user_id`) | String @db.Uuid | no | | part of composite unique |
| referenceId (`reference_id`) | String @db.VarChar(255) | no | | part of composite unique |
| isActive (`is_active`) | Boolean | no | true | |

Relation: `user User @relation(fields:[userId], onDelete: Cascade)` (schema.prisma:892). Composite unique `@@unique([userId, referenceId])` (schema.prisma:894). Map: `user_payment_methods`. Created by migration `20260623_add_user_payment_methods`.

### Wallet (`wallets`) and Ledger (`ledger`) — see §6 (Money/Ledger Model) for full detail.

---

## 2. ENUMS

| Enum | Values | Used by | Schema lines |
|---|---|---|---|
| UserState | PENDING_VERIFICATION, ACTIVE, SUSPENDED, BANNED | User.state | schema.prisma:21-26 |
| AuctionStatus | DRAFT, PUBLISHED, ACTIVE, CLOSED, CANCELLED, SUSPENDED, PENDING_MODERATION | Auction.status | schema.prisma:29-37 |
| OrderStatus | PENDING_PAYMENT, PAID, SHIPPED, DELIVERED, CANCELLED, REFUNDED | Order.status | schema.prisma:239-246 |
| PaymentProvider | MERCADO_PAGO, PAYPAL, STRIPE, HEY_BANCO | Payment.provider | schema.prisma:281-286 |
| PaymentStatus | PENDING, COMPLETED, FAILED, REFUNDED | Payment.status | schema.prisma:289-294 |
| ShipmentStatus | PENDING, SHIPPED, DELIVERED, RETURNED | Shipment.status | schema.prisma:328-333 |
| ShipmentProvider | DHL, FEDEX, ESTAFETA, UPS, CUSTOM | Shipment.provider | schema.prisma:336-342 |
| DisputeStatus | OPEN, IN_MEDIATION, RESOLVED, CLOSED | Dispute.status | schema.prisma:396-401 |
| NotificationType | AUCTION_WON, AUCTION_LOST, BID_OUTBID, ORDER_PAID, ORDER_SHIPPED, DISPUTE_UPDATE, SYSTEM | Notification.type | schema.prisma:425-433 |
| LedgerType | DEPOSIT, WITHDRAWAL, HOLD_BID, RELEASE_BID, DEBIT_ORDER, CREDIT_SALE, FEE_PLATFORM, REFUND, ADJUSTMENT | Ledger.type | schema.prisma:605-615 |
| CommissionType | GLOBAL, CATEGORY, SELLER | CommissionConfig.type | schema.prisma:671-675 |
| CommissionStatus | PENDING, COLLECTED | CommissionRecord.status | schema.prisma:678-681 |
| ModerationAction | APPROVED, REJECTED | ModerationLog.action | schema.prisma:713-716 |
| CfdiStatus | PENDING, EMITTED, CANCELLED, ERROR | CfdiRecord.status | schema.prisma:733-738 |
| KycStatus | PENDING, APPROVED, REJECTED, CORRECTION_NEEDED | KycSubmission.status | schema.prisma:758-763 |
| NotificationSegment | ALL, BUYERS, SELLERS, WINNERS, DEBTORS, SUSPENDED | NotificationCampaign.segment | schema.prisma:782-789 |
| CampaignStatus | DRAFT, SCHEDULED, SENT, FAILED | NotificationCampaign.status | schema.prisma:792-797 |
| RefundStatus | PENDING_REFUND, PROCESSING, COMPLETED, FAILED | RefundRequest.status | schema.prisma:821-826 |
| CmsContentType | TEXT, HTML, JSON | CmsContent.type | schema.prisma:867-871 |

**18 enums total.**

---

## 3. RELATIONSHIPS MAP

Cardinality and `onDelete` behavior as declared in `schema.prisma` (the migration SQL is the ground truth for actual
constraint clauses where a migration exists — noted where it differs).

| Relation | Cardinality | onDelete (schema) | onDelete (migration SQL, if created) |
|---|---|---|---|
| User 1—1 Profile | 1—1 | not set in schema (defaults to RESTRICT per Prisma) | `ON DELETE CASCADE` (migration `20260106100011...`:238) |
| User 1—N Session | 1—N | not set | `ON DELETE CASCADE` (migration:241) |
| User 1—N Auction (as seller) | 1—N | not set | `ON DELETE RESTRICT` (migration:244) |
| User 1—N Bid (as bidder) | 1—N | not set | `ON DELETE RESTRICT` (bids migration:26) |
| Auction 1—N Bid | 1—N | not set | `ON DELETE RESTRICT` (bids migration:23) |
| User 1—N Watchlist, Auction 1—N Watchlist | 1—N each | not set | **no migration** |
| Auction 1—1 Order | 1—1 (unique auctionId) | not set | `ON DELETE RESTRICT` (orders migration:31) |
| User 1—N Order (buyer), User 1—N Order (seller) | 1—N each | not set | `ON DELETE RESTRICT` (orders migration:34,37) |
| Order 1—N Payment | 1—N | not set | `ON DELETE RESTRICT` (payments migration:33) |
| Order 1—1 Shipment | 1—1 (unique orderId) | not set | `ON DELETE RESTRICT` (shipments migration:33) |
| Order 1—N Rating | 1—N | not set | `ON DELETE RESTRICT` (ratings migration:25) |
| User 1—N Rating (author), User 1—N Rating (target) | 1—N each | not set | `ON DELETE RESTRICT` (ratings migration:28,31) |
| Order 1—1 Dispute | 1—1 (unique orderId) | not set | `ON DELETE RESTRICT` (disputes migration:32) |
| User 1—N Dispute (creator) | 1—N | not set | `ON DELETE RESTRICT` (disputes migration:35) |
| User 1—N Notification | 1—N | not set | `ON DELETE RESTRICT` (notifications migration:25) |
| User 1—1 Wallet | 1—1 (unique userId) | not set | `ON DELETE RESTRICT` (wallet migration:44) |
| Wallet 1—N Ledger | 1—N | not set | `ON DELETE RESTRICT` (wallet migration:47) |
| User 1—N UserPaymentMethod | 1—N | Cascade (schema.prisma:892, explicit) | `ON DELETE CASCADE` (`20260623...`:17) |
| Order 1—1 RefundRequest | 1—1 (unique orderId) | not set | **no migration** |
| CommissionRecord.orderId, ModerationLog.auctionId, CfdiRecord.orderId, KycSubmission.userId | loose reference (no Prisma `@relation`, no DB FK declared anywhere) | n/a | n/a |

Note: Prisma's default `onDelete` when unspecified is `RESTRICT` on required relations; the actual migrations
consistently use `RESTRICT` except `profiles`, `sessions` (both `CASCADE`, matching the intent of deleting
dependent auth artifacts when a user is deleted) and `user_payment_methods` (`CASCADE`, explicit in schema too).

---

## 4. MIGRATION HISTORY (chronological)

| # | Migration | Summary |
|---|---|---|
| 1 | `20260106100011_init_auctions_module` | Baseline: creates `UserState`, `AuctionStatus` (5 values only) enums; tables `users`, `profiles`, `sessions`, `auctions`, and the three observability tables `audit_events`, `error_events`, `request_logs`; all base indexes and the 3 initial FKs (`profiles`, `sessions` CASCADE; `auctions` RESTRICT). |
| 2 | `20260106111403_init_bids_module` | Adds `bids` table + indexes + FKs to `auctions`/`users`. |
| 3 | `20260106115351_init_orders_module` | Adds `OrderStatus` enum + `orders` table + FKs to `auctions`/`users` (buyer, seller). |
| 4 | `20260106123540_add_payments_module` | Adds `PaymentProvider` (2 values: MERCADO_PAGO, PAYPAL only), `PaymentStatus` enums + `payments` table; **currency default `'USD'`** (line 13) + FK to `orders`. |
| 5 | `20260106133716_add_shipments_module` | Adds `ShipmentStatus`, `ShipmentProvider` enums + `shipments` table + FK to `orders`. |
| 6 | `20260106135936_add_ratings_module` | Adds `ratings` table + FKs to `orders`/`users` (author, target). |
| 7 | `20260106141606_add_disputes_module` | Adds `DisputeStatus` enum + `disputes` table + FKs to `orders`/`users`. |
| 8 | `20260106142346_add_notifications_module` | Adds `NotificationType` enum (6 values, **no AUCTION_LOST yet**) + `notifications` table + FK to `users`. |
| 9 | `20260106154609_add_wallet_module` | Adds `LedgerType` enum (`DEPOSIT, WITHDRAWAL, HOLD, RELEASE, PURCHASE, REFUND, ADJUSTMENT`) + `wallets` table (**currency default `'USD'`**, line 12) + `ledger` table + FKs. |
| 10 | `20260107205455_audit_fixes_v0_3_0` | **Notable.** Adds enum value `AUCTION_LOST` to `NotificationType`; adds enum value `STRIPE` to `PaymentProvider`; adds `users.is_two_factor_enabled` + `users.two_factor_secret` columns; adds composite index `idx_bids_auction_amount`. |
| 11 | `20260108020207_update_ledger_types` | **Notable (ledger-type change).** Renames `LedgerType.HOLD`→`HOLD_BID`, `RELEASE`→`RELEASE_BID`; adds `DEBIT_ORDER`, `CREDIT_SALE`, `FEE_PLATFORM`; keeps `PURCHASE` for now. Done via the standard Postgres enum-swap pattern (`LedgerType_new` → rename → drop old). |
| 12 | `20260619_fix_wallet_currency_default_to_mxn` | **Notable (MXN currency fix, flagged in task).** `ALTER TABLE wallets ALTER COLUMN currency SET DEFAULT 'MXN'` + backfills existing `'USD'` rows to `'MXN'`. Comment cites "H-003". Fixes only `wallets.currency` — does **not** touch `payments.currency` (still defaulted `'USD'` at the DB level, per its original migration — see §5/§6). |
| 13 | `20260619_remove_purchase_ledger_type` | **Notable (ledger-type change, flagged in task).** Drops `PURCHASE` from `LedgerType` enum (comment: "DEBIT_ORDER is the canonical type (no existing PURCHASE rows in ledger)"). Final `LedgerType` = `DEPOSIT, WITHDRAWAL, HOLD_BID, RELEASE_BID, DEBIT_ORDER, CREDIT_SALE, FEE_PLATFORM, REFUND, ADJUSTMENT` — matches schema.prisma:606-614 exactly. |
| 14 | `20260623_add_user_payment_methods` | **Notable (flagged in task).** Adds `user_payment_methods` table (PT-029), composite unique `(user_id, reference_id)`, CASCADE FK to `users`. Matches schema.prisma:885-896 exactly. |

All 14 migrations are internally consistent with each other (no orphaned ALTERs) but do **not** account for
roughly a third of the models currently in `schema.prisma` — see Drift Check below.

---

## 5. DRIFT CHECK — schema.prisma vs. cumulative migrations

**Method**: every `CREATE TABLE`, `CREATE TYPE`, and `ALTER TYPE ... ADD VALUE` across all 14 migration.sql
files was enumerated and diffed against every model/enum/field in `schema.prisma`. Confirmed by direct grep of
the migrations directory for the table names / enum values in question (zero hits confirms absence).

### 5.1 Models present in `schema.prisma` with **no corresponding `CREATE TABLE` in any migration**

| Model | Table | Schema lines | Evidence of absence |
|---|---|---|---|
| Watchlist | `watchlist` | schema.prisma:222-236 | grep for `watchlist` across `src/api/prisma/migrations/**` → 0 hits |
| SystemConfig | `system_config` | schema.prisma:586-598 | grep for `system_config` → 0 hits |
| CommissionConfig | `commission_config` | schema.prisma:684-695 | grep for `commission_config` → 0 hits |
| CommissionRecord | `commission_records` | schema.prisma:698-710 | grep for `commission_records` → 0 hits |
| ModerationLog | `moderation_log` | schema.prisma:719-730 | grep for `moderation_log` → 0 hits |
| CfdiRecord | `cfdi_records` | schema.prisma:741-755 | grep for `cfdi_records` → 0 hits |
| KycSubmission | `kyc_submissions` | schema.prisma:766-779 | grep for `kyc_submissions` → 0 hits |
| NotificationCampaign | `notification_campaigns` | schema.prisma:800-815 | grep for `notification_campaigns` → 0 hits |
| RefundRequest | `refund_requests` | schema.prisma:828-843 | grep for `refund_requests` → 0 hits |
| SeoConfig | `seo_config` | schema.prisma:849-861 | grep for `seo_config` → 0 hits |
| CmsContent | `cms_content` | schema.prisma:873-882 | grep for `cms_content` → 0 hits |

**11 of 24 models (46%) have no migration-based provenance.** Their corresponding 9 enums
(`CommissionType`, `CommissionStatus`, `ModerationAction`, `CfdiStatus`, `KycStatus`, `NotificationSegment`,
`CampaignStatus`, `RefundStatus`, `CmsContentType`) are likewise absent from every migration.

### 5.2 Enum values present in `schema.prisma` never added by any migration

| Enum | Schema value(s) | Evidence |
|---|---|---|
| `AuctionStatus` | `SUSPENDED`, `PENDING_MODERATION` (schema.prisma:35-36) | Baseline migration only creates 5 values (`init_auctions_module`:5); grep for `PENDING_MODERATION` and `AuctionStatus.*SUSPENDED` across migrations → 0 hits. (`SUSPENDED` does exist as a `UserState` value from the baseline migration, but never as an `AuctionStatus` value.) |
| `PaymentProvider` | `HEY_BANCO` (schema.prisma:285) | Baseline payments migration has 2 values; `audit_fixes_v0_3_0` adds `STRIPE` only; grep for `HEY_BANCO` → 0 hits. |

### 5.3 Likely root cause

`src/api/package.json:27` exposes `"db:push": "npx prisma db push"` alongside `"db:migrate": "npx prisma migrate dev"`
(`package.json:24`). `db push` writes schema changes directly to the database and to `schema.prisma` **without**
generating a migration file. The pattern of missing tables/enum-values matches exactly the set of features added
after the initial 9 core modules (backoffice v1, PT-013 CMS/SEO/refunds, PT-0xx CFDI/KYC/commissions/moderation/
notifications-campaigns/watchlist/system-config) — consistent with these having been pushed directly to a shared
dev database rather than migrated. **Practical impact**: a fresh environment provisioned strictly via
`npm run db:migrate:deploy` (`prisma migrate deploy`, package.json:25) would **not** have these 11 tables, 2
enum-value additions, or the corresponding enum types — `prisma migrate deploy` only replays the 14 migration
files. Any environment relying solely on migrations is missing roughly half the schema.

### 5.4 Reverse check — migration changes not reflected in current schema

None found. Every `CREATE TABLE`/`CREATE TYPE`/`ALTER TYPE ADD VALUE`/`ALTER TABLE ADD COLUMN` in the 14
migrations has a matching field/model/enum-value in `schema.prisma` (e.g. `is_two_factor_enabled` and
`two_factor_secret` from migration 10 map to schema.prisma:51-52; the ledger-type renames/removals from
migrations 11 and 13 map exactly to `LedgerType` schema.prisma:605-615; `user_payment_methods` from migration 14
maps to schema.prisma:885-896). No orphaned migration-only artifacts detected.

### 5.5 Currency default drift (see also §6)

`payments.currency` default is `'USD'` at the DB/migration level (`20260106123540_add_payments_module/migration.sql:13`)
and was **never** altered by any subsequent migration — yet `schema.prisma:304` declares
`@default("MXN")`. This is a live schema-vs-migration-vs-DB three-way mismatch: Prisma Client (generated from
schema.prisma) will supply `'MXN'` as the application-level default when no `db push`/new migration reconciles
the column default, but the column's actual stored default in a database built strictly from migrations is
still `'USD'`. Compare with `wallets.currency`, whose default **was** explicitly fixed by migration 12
(`20260619_fix_wallet_currency_default_to_mxn`) — the same fix was never applied to `payments` or ported to a
tracked migration for `refund_requests.currency` (which also has no migration at all, §5.1).

---

## 6. MONEY / LEDGER MODEL

### Wallet (`wallets`) — schema.prisma:618-639
- `balance` — `Decimal @default(0) @db.Decimal(12,2)` (schema.prisma:628) — available funds.
- `heldFunds` (`held_funds`) — `Decimal @default(0) @db.Decimal(12,2)` (schema.prisma:629) — funds locked by active bids.
- `currency` — `String @default("MXN") @db.VarChar(3)` (schema.prisma:630).
- `isActive` (`is_active`) — `Boolean @default(false)` (schema.prisma:633) — wallet requires an initial deposit to activate.
- 1:1 with `User` via unique `userId` (schema.prisma:624-625).
- 1:N to `Ledger` via `ledgerEntries` (schema.prisma:636).
- **Currency history**: created with default `'USD'` (`20260106154609_add_wallet_module/migration.sql:12`); fixed to
  `'MXN'` with a backfill UPDATE by migration `20260619_fix_wallet_currency_default_to_mxn` (both the column default
  and existing `'USD'` rows are corrected). This is the only money table whose currency drift was migrated end-to-end.

### Ledger (`ledger`) — schema.prisma:642-664 — immutable financial history, append-only by convention (no `updatedAt`, no update path implied in schema)
- `walletId` (`wallet_id`) — FK to `Wallet`, `ON DELETE RESTRICT` (wallet migration:47).
- `type` — `LedgerType` enum. **Final values** (post migrations 9, 11, 13): `DEPOSIT, WITHDRAWAL, HOLD_BID, RELEASE_BID, DEBIT_ORDER, CREDIT_SALE, FEE_PLATFORM, REFUND, ADJUSTMENT` (schema.prisma:605-614) — matches migration 13 output exactly.
  - Evolution: baseline had `HOLD, RELEASE, PURCHASE` (migration 9) → renamed to `HOLD_BID, RELEASE_BID` and added `DEBIT_ORDER, CREDIT_SALE, FEE_PLATFORM` while `PURCHASE` was temporarily retained (migration 11) → `PURCHASE` dropped entirely, comment states "no existing PURCHASE rows in ledger" (migration 13).
- `amount`, `balanceBefore` (`balance_before`), `balanceAfter` (`balance_after`) — all `Decimal @db.Decimal(12,2)` (schema.prisma:652-654). No `currency` column on Ledger itself — inherits the Wallet's currency (implicit MXN).
- `referenceId`/`referenceType` (`reference_id`/`reference_type`) — free-text pointer to the originating entity (e.g. Auction/Payment id), not an enforced FK (schema.prisma:657-658).
- `description` — `String @db.Text`, required (schema.prisma:659).
- Indexes: `idx_ledger_wallet_time(walletId, createdAt DESC)`, `idx_ledger_reference(referenceId)` (schema.prisma:661-662).

### Payment (`payments`) — schema.prisma:297-321 — see full field catalog in §1
- `amount` — `Decimal @db.Decimal(10,2)` (note: **10,2** precision, smaller scale than Wallet/Ledger's **12,2**).
- `currency` — `String @default("MXN") @db.VarChar(3)` at the **schema** level (schema.prisma:304) but DB-level
  default is still `'USD'` per migration (§5.5) — **flagged inconsistency**.
- `provider` — `PaymentProvider` (`MERCADO_PAGO, PAYPAL, STRIPE, HEY_BANCO`) — `HEY_BANCO` has no migration (§5.2).
- `status` — `PaymentStatus` (`PENDING, COMPLETED, FAILED, REFUNDED`).
- `externalId`/`metadata` — external gateway correlation + JSON payload for provider-specific data.

### CommissionConfig / CommissionRecord (`commission_config`, `commission_records`) — schema.prisma:684-710 — **no migration** (§5.1)
- `CommissionConfig.ratePercent` — `Decimal @db.Decimal(5,2)` (schema.prisma:688) — percentage rate, no currency field (rate, not an amount).
- `CommissionRecord.amount` — `Decimal @db.Decimal(10,2)` (schema.prisma:702) — computed commission amount, **no currency column** — implicit MXN, unverifiable against a migration since none exists.
- `CommissionRecord.orderId` is `@unique` but has **no Prisma relation** to `Order` (no FK enforced even conceptually in the ORM layer, let alone the DB — since the table itself was never migrated).

### RefundRequest (`refund_requests`) — schema.prisma:828-843 — **no migration** (§5.1)
- `amount` — `Decimal @db.Decimal(10,2)` (schema.prisma:832).
- `currency` — `String @default("MXN") @db.VarChar(3)` (schema.prisma:833) — declared MXN at schema level; cannot be
  cross-checked against a migration default since the table was never migrated (unlike `wallets`/`payments`, there
  is no historical `'USD'` default to have drifted from — but there is also no guarantee the live DB column
  (created via `db push`) actually carries this default, since `db push` state is not captured anywhere in version control).
- Is the one backoffice-era model that **does** declare a real Prisma relation (`order Order @relation`, schema.prisma:831), FK-enforced conceptually — but again, the underlying constraint's existence in the live DB is unverifiable from migrations alone.

### CfdiRecord (`cfdi_records`) — schema.prisma:741-755 — **no migration** (§5.1)
- No monetary fields directly (invoice metadata: `uuidSat`, `xmlPath`, `pdfPath`, `status`) — financial amount is implicitly the linked Order's `totalAmount`, but `orderId` has no declared relation, so this cannot be verified structurally.

### Currency finding summary
- **Global standard** (per `CLAUDE.md`): "Currency: Standardized to MXN globally."
- **Confirmed MXN in schema.prisma**: `Payment.currency` (line 304, DB default drift — see below), `Wallet.currency` (line 630, DB-aligned via migration 12), `RefundRequest.currency` (line 833, unmigrated).
- **Residual inconsistency #1 (real)**: `payments.currency` DB column default is `'USD'` (never migrated to `'MXN'`) while `schema.prisma` declares `MXN` — a database built purely from `prisma migrate deploy` will silently default new `Payment` rows written via raw SQL/other tooling to `USD`, contradicting the schema and the platform-wide MXN standard. Application code that always sets `currency` explicitly at insert time would mask this, but the column-level default itself is wrong/stale.
- **Residual inconsistency #2 (unverifiable)**: `RefundRequest.currency` and any other unmigrated backoffice money-adjacent field cannot be confirmed to actually carry the `MXN` default in a live database, because their tables were never captured by a migration — their real DDL is only known if/however `db push` was last run.
- **No currency column exists** on `Auction`, `Order`, `Ledger`, `Bid`, or `CommissionRecord` — these all implicitly assume the wallet/payment currency (MXN) with no enforced/redundant per-row currency tag, which is consistent with a single-currency platform but means a future multi-currency expansion would require schema changes to every money-adjacent table, not just Wallet/Payment.
