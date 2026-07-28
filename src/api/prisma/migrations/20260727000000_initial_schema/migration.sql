-- CreateEnum
CREATE TYPE "UserState" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'BANNED');

-- CreateEnum
CREATE TYPE "AuctionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ACTIVE', 'CLOSED', 'CANCELLED', 'SUSPENDED', 'PENDING_MODERATION');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('MERCADO_PAGO', 'PAYPAL', 'STRIPE', 'HEY_BANCO');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentCycleStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'SETTLED', 'FAILED', 'ANOMALY', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('PENDING', 'SHIPPED', 'DELIVERED', 'RETURNED');

-- CreateEnum
CREATE TYPE "ShipmentProvider" AS ENUM ('DHL', 'FEDEX', 'ESTAFETA', 'UPS', 'CUSTOM');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'IN_MEDIATION', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('AUCTION_WON', 'AUCTION_SOLD', 'AUCTION_LOST', 'BID_OUTBID', 'ORDER_PAID', 'ORDER_SHIPPED', 'DISPUTE_UPDATE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "LedgerType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'HOLD_BID', 'RELEASE_BID', 'DEBIT_ORDER', 'CREDIT_SALE', 'FEE_PLATFORM', 'REFUND', 'ADJUSTMENT', 'SETTLEMENT_RELEASE');

-- CreateEnum
CREATE TYPE "CommissionType" AS ENUM ('GLOBAL', 'CATEGORY', 'SELLER');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'COLLECTED');

-- CreateEnum
CREATE TYPE "ModerationAction" AS ENUM ('APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CfdiStatus" AS ENUM ('PENDING', 'EMITTED', 'CANCELLED', 'ERROR');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CORRECTION_NEEDED');

-- CreateEnum
CREATE TYPE "NotificationSegment" AS ENUM ('ALL', 'BUYERS', 'SELLERS', 'WINNERS', 'DEBTORS', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING_REFUND', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "CmsContentType" AS ENUM ('TEXT', 'HTML', 'JSON');

-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('REQUESTED', 'APPROVED', 'PROCESSING', 'PAID', 'REJECTED', 'FAILED');

-- CreateEnum
CREATE TYPE "PaymentMethodType" AS ENUM ('CLABE', 'PAYPAL', 'DEBIT_CARD');

-- CreateEnum
CREATE TYPE "AccountVerificationStatus" AS ENUM ('PENDING', 'SENT', 'VERIFIED', 'BLOCKED', 'EXPIRED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "two_factor_secret" VARCHAR(100),
    "is_two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
    "display_name" VARCHAR(100),
    "avatar_url" TEXT,
    "state" "UserState" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "suspended_reason" TEXT,
    "banned_reason" TEXT,
    "settings" JSONB NOT NULL DEFAULT '{"language": "es", "notifications": {"email": true, "inApp": true}}',
    "is_seller" BOOLEAN NOT NULL DEFAULT false,
    "seller_enabled_at" TIMESTAMPTZ,
    "email_verified_at" TIMESTAMPTZ,
    "email_verification_token" VARCHAR(255),
    "email_verification_expires_at" TIMESTAMPTZ,
    "password_reset_token" VARCHAR(255),
    "password_reset_expires_at" TIMESTAMPTZ,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "user_id" UUID NOT NULL,
    "phone" VARCHAR(20),
    "legal_name" VARCHAR(150),
    "address" TEXT,
    "city" VARCHAR(100),
    "country" VARCHAR(100),
    "postal_code" VARCHAR(20),
    "rfc" VARCHAR(13),

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" UUID NOT NULL,
    "refresh_token" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "ip_address" VARCHAR(50),
    "user_agent" TEXT,
    "last_used_at" TIMESTAMPTZ,
    "revoked_at" TIMESTAMPTZ,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auctions" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "images" JSONB NOT NULL DEFAULT '[]',
    "starting_price" DECIMAL(10,2) NOT NULL,
    "current_price" DECIMAL(10,2) NOT NULL,
    "starts_at" TIMESTAMPTZ NOT NULL,
    "ends_at" TIMESTAMPTZ NOT NULL,
    "status" "AuctionStatus" NOT NULL DEFAULT 'DRAFT',
    "is_blocked" BOOLEAN NOT NULL DEFAULT false,
    "admin_notes" TEXT,
    "seller_id" UUID NOT NULL,

    CONSTRAINT "auctions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bids" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "auction_id" UUID NOT NULL,
    "bidder_id" UUID NOT NULL,

    CONSTRAINT "bids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchlist" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" UUID NOT NULL,
    "auction_id" UUID NOT NULL,

    CONSTRAINT "watchlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "seller_net" DECIMAL(12,2),
    "seller_settled_at" TIMESTAMPTZ,
    "auction_id" UUID NOT NULL,
    "buyer_id" UUID NOT NULL,
    "seller_id" UUID NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'MXN',
    "provider" "PaymentProvider" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "external_id" VARCHAR(255),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "order_id" UUID,
    "reference" VARCHAR(255),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_cycles" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "reference" VARCHAR(255) NOT NULL,
    "user_id" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'MXN',
    "provider_ref" VARCHAR(255),
    "status" "PaymentCycleStatus" NOT NULL DEFAULT 'REQUESTED',
    "canonical_payment_id" VARCHAR(255),
    "response_snapshot" JSONB,
    "anomaly_reason" TEXT,
    "requested_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMPTZ,
    "settled_at" TIMESTAMPTZ,
    "next_check_at" TIMESTAMPTZ,
    "check_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "payment_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_cycle_events" (
    "id" UUID NOT NULL,
    "cycle_id" UUID,
    "provider" "PaymentProvider" NOT NULL,
    "external_id" VARCHAR(255) NOT NULL,
    "format" VARCHAR(20) NOT NULL,
    "outcome" VARCHAR(20) NOT NULL,
    "detail" TEXT,
    "reference" VARCHAR(255),
    "direction" VARCHAR(10),
    "step" VARCHAR(40),
    "endpoint" VARCHAR(255),
    "http_status" INTEGER,
    "duration_ms" INTEGER,
    "trace_id" VARCHAR(100),
    "redacted_fields" JSONB,
    "received_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "payment_cycle_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processed_webhook_events" (
    "id" UUID NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "payment_id" VARCHAR(255) NOT NULL,
    "processed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "provider" "ShipmentProvider" NOT NULL,
    "tracking_number" VARCHAR(100),
    "status" "ShipmentStatus" NOT NULL DEFAULT 'PENDING',
    "estimated_delivery" TIMESTAMPTZ,
    "shipped_at" TIMESTAMPTZ,
    "delivered_at" TIMESTAMPTZ,
    "order_id" UUID NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ratings" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "score" SMALLINT NOT NULL,
    "comment" TEXT,
    "order_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "target_id" UUID NOT NULL,

    CONSTRAINT "ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disputes" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "creator_id" UUID NOT NULL,
    "reason" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "event_type" VARCHAR(100) NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trace_id" VARCHAR(100) NOT NULL,
    "env" VARCHAR(20) NOT NULL,
    "service" VARCHAR(50) NOT NULL,
    "actor_type" VARCHAR(20) NOT NULL,
    "actor_user_id" UUID,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID NOT NULL,
    "result" VARCHAR(20) NOT NULL,
    "reason_code" VARCHAR(100),
    "payload" JSONB NOT NULL DEFAULT '{}',
    "payload_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "error_events" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trace_id" VARCHAR(100) NOT NULL,
    "env" VARCHAR(20) NOT NULL,
    "service" VARCHAR(50) NOT NULL,
    "error_code" VARCHAR(100) NOT NULL,
    "message" TEXT NOT NULL,
    "severity" VARCHAR(20) NOT NULL,
    "http_status" INTEGER,
    "is_business_error" BOOLEAN NOT NULL DEFAULT false,
    "http_method" VARCHAR(10),
    "http_path" TEXT,
    "http_query" TEXT,
    "client_ip" VARCHAR(50),
    "user_agent" TEXT,
    "actor_user_id" UUID,
    "entity_type" VARCHAR(50),
    "entity_id" UUID,
    "details" JSONB NOT NULL DEFAULT '{}',
    "stack" TEXT,

    CONSTRAINT "error_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_logs" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trace_id" VARCHAR(100) NOT NULL,
    "env" VARCHAR(20) NOT NULL,
    "service" VARCHAR(50) NOT NULL,
    "http_method" VARCHAR(10) NOT NULL,
    "http_path" TEXT NOT NULL,
    "http_status" INTEGER NOT NULL,
    "duration_ms" INTEGER NOT NULL,
    "request_size_bytes" INTEGER,
    "response_size_bytes" INTEGER,
    "actor_user_id" UUID,
    "actor_state" VARCHAR(50),
    "client_ip" VARCHAR(50),
    "user_agent" TEXT,
    "client_app" VARCHAR(20),
    "entity_type" VARCHAR(50),
    "entity_id" UUID,

    CONSTRAINT "request_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_config" (
    "key" VARCHAR(100) NOT NULL,
    "value" TEXT NOT NULL,
    "is_secret" BOOLEAN NOT NULL DEFAULT false,
    "category" VARCHAR(50) NOT NULL DEFAULT 'general',
    "description" TEXT,
    "updated_by" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "user_id" UUID NOT NULL,
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "held_funds" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "pending_balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'MXN',
    "is_active" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "wallet_id" UUID NOT NULL,
    "type" "LedgerType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "balance_before" DECIMAL(12,2) NOT NULL,
    "balance_after" DECIMAL(12,2) NOT NULL,
    "reference_id" VARCHAR(100),
    "reference_type" VARCHAR(50),
    "description" TEXT NOT NULL,

    CONSTRAINT "ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_config" (
    "id" UUID NOT NULL,
    "type" "CommissionType" NOT NULL,
    "reference_id" VARCHAR(255),
    "rate_percent" DECIMAL(5,2) NOT NULL,
    "updated_by" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "commission_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_records" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "seller_id" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "rate_percent" DECIMAL(5,2) NOT NULL,
    "status" "CommissionStatus" NOT NULL DEFAULT 'PENDING',
    "calculated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commission_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moderation_log" (
    "id" UUID NOT NULL,
    "auction_id" UUID NOT NULL,
    "action" "ModerationAction" NOT NULL,
    "reason_code" VARCHAR(100),
    "notes" TEXT,
    "reviewed_by" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cfdi_records" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "uuid_sat" VARCHAR(100),
    "xml_path" TEXT,
    "pdf_path" TEXT,
    "status" "CfdiStatus" NOT NULL DEFAULT 'PENDING',
    "error_message" TEXT,
    "emitted_at" TIMESTAMPTZ,
    "cancelled_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cfdi_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kyc_submissions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "KycStatus" NOT NULL DEFAULT 'PENDING',
    "docs_json" JSONB NOT NULL,
    "reviewed_by" VARCHAR(255),
    "review_notes" TEXT,
    "submitted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "kyc_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_campaigns" (
    "id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" TEXT NOT NULL,
    "segment" "NotificationSegment" NOT NULL,
    "channels_json" JSONB NOT NULL,
    "scheduled_at" TIMESTAMPTZ,
    "sent_at" TIMESTAMPTZ,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "recipients_count" INTEGER NOT NULL DEFAULT 0,
    "sent_by" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund_requests" (
    "id" UUID NOT NULL,
    "order_id" UUID,
    "payment_reference" VARCHAR(255),
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'MXN',
    "reason" TEXT NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING_REFUND',
    "initiated_by" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ,

    CONSTRAINT "refund_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seo_config" (
    "id" UUID NOT NULL,
    "page" VARCHAR(100) NOT NULL,
    "title" VARCHAR(200) NOT NULL DEFAULT '',
    "description" VARCHAR(500) NOT NULL DEFAULT '',
    "og_title" VARCHAR(200) NOT NULL DEFAULT '',
    "og_description" VARCHAR(500) NOT NULL DEFAULT '',
    "og_image" VARCHAR(500) NOT NULL DEFAULT '',
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" VARCHAR(255) NOT NULL DEFAULT 'system',

    CONSTRAINT "seo_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_content" (
    "id" UUID NOT NULL,
    "key" VARCHAR(150) NOT NULL,
    "value" TEXT NOT NULL,
    "type" "CmsContentType" NOT NULL DEFAULT 'TEXT',
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" VARCHAR(255) NOT NULL DEFAULT 'system',

    CONSTRAINT "cms_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdrawal_requests" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "user_id" UUID NOT NULL,
    "payment_method_id" VARCHAR(255) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'REQUESTED',
    "reviewed_by" VARCHAR(255),
    "reviewed_at" TIMESTAMPTZ,
    "paid_at" TIMESTAMPTZ,
    "payout_reference" VARCHAR(255),
    "notes" TEXT,

    CONSTRAINT "withdrawal_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_payment_methods" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" UUID NOT NULL,
    "reference_id" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "type" "PaymentMethodType" NOT NULL DEFAULT 'CLABE',
    "paypal_email" VARCHAR(255),
    "card_last4" VARCHAR(4),
    "bank_name" VARCHAR(120),
    "clabe" VARCHAR(18),
    "holder_name" VARCHAR(255),
    "alias" VARCHAR(80),
    "is_verified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "user_payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_verifications" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "payment_method_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" VARCHAR(16) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'MXN',
    "status" "AccountVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "movement_ref" VARCHAR(255),
    "refund_ref" VARCHAR(255),
    "refund_pending" BOOLEAN NOT NULL DEFAULT false,
    "sent_at" TIMESTAMPTZ,
    "verified_at" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "account_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "idx_users_email" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_username" ON "users"("username");

-- CreateIndex
CREATE INDEX "idx_users_state" ON "users"("state");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_user_id_key" ON "profiles"("user_id");

-- CreateIndex
CREATE INDEX "idx_profiles_user" ON "profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refresh_token_key" ON "sessions"("refresh_token");

-- CreateIndex
CREATE INDEX "idx_sessions_user" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "idx_sessions_token" ON "sessions"("refresh_token");

-- CreateIndex
CREATE INDEX "idx_sessions_expires" ON "sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "auctions_slug_key" ON "auctions"("slug");

-- CreateIndex
CREATE INDEX "idx_auctions_seller" ON "auctions"("seller_id");

-- CreateIndex
CREATE INDEX "idx_auctions_status" ON "auctions"("status");

-- CreateIndex
CREATE INDEX "idx_auctions_ends_at" ON "auctions"("ends_at");

-- CreateIndex
CREATE INDEX "idx_bids_auction" ON "bids"("auction_id");

-- CreateIndex
CREATE INDEX "idx_bids_bidder" ON "bids"("bidder_id");

-- CreateIndex
CREATE INDEX "idx_bids_amount" ON "bids"("amount");

-- CreateIndex
CREATE INDEX "idx_bids_auction_amount" ON "bids"("auction_id", "amount" DESC);

-- CreateIndex
CREATE INDEX "idx_watchlist_user" ON "watchlist"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "watchlist_user_id_auction_id_key" ON "watchlist"("user_id", "auction_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_auction_id_key" ON "orders"("auction_id");

-- CreateIndex
CREATE INDEX "idx_orders_buyer" ON "orders"("buyer_id");

-- CreateIndex
CREATE INDEX "idx_orders_seller" ON "orders"("seller_id");

-- CreateIndex
CREATE INDEX "idx_orders_status" ON "orders"("status");

-- CreateIndex
CREATE UNIQUE INDEX "payments_reference_key" ON "payments"("reference");

-- CreateIndex
CREATE INDEX "idx_payments_order" ON "payments"("order_id");

-- CreateIndex
CREATE INDEX "idx_payments_external_id" ON "payments"("external_id");

-- CreateIndex
CREATE INDEX "idx_payments_status" ON "payments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "payment_cycles_reference_key" ON "payment_cycles"("reference");

-- CreateIndex
CREATE INDEX "idx_payment_cycle_pending" ON "payment_cycles"("status", "next_check_at");

-- CreateIndex
CREATE INDEX "idx_payment_cycle_payment" ON "payment_cycles"("canonical_payment_id");

-- CreateIndex
CREATE INDEX "idx_payment_cycle_user" ON "payment_cycles"("user_id");

-- CreateIndex
CREATE INDEX "idx_payment_cycle_event_cycle" ON "payment_cycle_events"("cycle_id");

-- CreateIndex
CREATE INDEX "idx_payment_cycle_event_external" ON "payment_cycle_events"("external_id");

-- CreateIndex
CREATE INDEX "idx_payment_cycle_event_reference" ON "payment_cycle_events"("reference", "received_at");

-- CreateIndex
CREATE INDEX "idx_payment_cycle_event_trace" ON "payment_cycle_events"("trace_id");

-- CreateIndex
CREATE UNIQUE INDEX "processed_webhook_events_provider_payment_id_key" ON "processed_webhook_events"("provider", "payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_order_id_key" ON "shipments"("order_id");

-- CreateIndex
CREATE INDEX "idx_shipments_order" ON "shipments"("order_id");

-- CreateIndex
CREATE INDEX "idx_shipments_status" ON "shipments"("status");

-- CreateIndex
CREATE INDEX "idx_ratings_order" ON "ratings"("order_id");

-- CreateIndex
CREATE INDEX "idx_ratings_author" ON "ratings"("author_id");

-- CreateIndex
CREATE INDEX "idx_ratings_target" ON "ratings"("target_id");

-- CreateIndex
CREATE UNIQUE INDEX "disputes_order_id_key" ON "disputes"("order_id");

-- CreateIndex
CREATE INDEX "idx_disputes_order" ON "disputes"("order_id");

-- CreateIndex
CREATE INDEX "idx_disputes_creator" ON "disputes"("creator_id");

-- CreateIndex
CREATE INDEX "idx_disputes_status" ON "disputes"("status");

-- CreateIndex
CREATE INDEX "idx_notifications_user" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "idx_notifications_read" ON "notifications"("is_read");

-- CreateIndex
CREATE INDEX "idx_audit_events_entity" ON "audit_events"("entity_type", "entity_id", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "idx_audit_events_actor" ON "audit_events"("actor_user_id", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "idx_audit_events_trace" ON "audit_events"("trace_id");

-- CreateIndex
CREATE INDEX "idx_audit_events_type_time" ON "audit_events"("event_type", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "idx_error_events_trace" ON "error_events"("trace_id");

-- CreateIndex
CREATE INDEX "idx_error_events_code_time" ON "error_events"("error_code", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "idx_error_events_actor" ON "error_events"("actor_user_id", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "idx_error_events_entity" ON "error_events"("entity_type", "entity_id", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "idx_error_events_http" ON "error_events"("http_status", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "idx_request_logs_trace" ON "request_logs"("trace_id");

-- CreateIndex
CREATE INDEX "idx_request_logs_path_time" ON "request_logs"("http_path", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "idx_request_logs_status_time" ON "request_logs"("http_status", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "idx_request_logs_actor_time" ON "request_logs"("actor_user_id", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "idx_system_config_category" ON "system_config"("category");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_user_id_key" ON "wallets"("user_id");

-- CreateIndex
CREATE INDEX "idx_ledger_wallet_time" ON "ledger"("wallet_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_ledger_reference" ON "ledger"("reference_id");

-- CreateIndex
CREATE INDEX "idx_commission_config_type" ON "commission_config"("type");

-- CreateIndex
CREATE UNIQUE INDEX "commission_records_order_id_key" ON "commission_records"("order_id");

-- CreateIndex
CREATE INDEX "idx_commission_record_seller" ON "commission_records"("seller_id");

-- CreateIndex
CREATE INDEX "idx_commission_record_status" ON "commission_records"("status");

-- CreateIndex
CREATE INDEX "idx_moderation_log_auction" ON "moderation_log"("auction_id");

-- CreateIndex
CREATE UNIQUE INDEX "cfdi_records_order_id_key" ON "cfdi_records"("order_id");

-- CreateIndex
CREATE INDEX "idx_cfdi_record_status" ON "cfdi_records"("status");

-- CreateIndex
CREATE INDEX "idx_kyc_submission_user_status" ON "kyc_submissions"("user_id", "status");

-- CreateIndex
CREATE INDEX "idx_kyc_submission_status" ON "kyc_submissions"("status");

-- CreateIndex
CREATE INDEX "idx_notification_campaign_status" ON "notification_campaigns"("status");

-- CreateIndex
CREATE UNIQUE INDEX "refund_requests_order_id_key" ON "refund_requests"("order_id");

-- CreateIndex
CREATE INDEX "idx_refund_requests_order_id" ON "refund_requests"("order_id");

-- CreateIndex
CREATE INDEX "idx_refund_requests_status" ON "refund_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "seo_config_page_key" ON "seo_config"("page");

-- CreateIndex
CREATE UNIQUE INDEX "cms_content_key_key" ON "cms_content"("key");

-- CreateIndex
CREATE INDEX "idx_withdrawal_user" ON "withdrawal_requests"("user_id");

-- CreateIndex
CREATE INDEX "idx_withdrawal_status" ON "withdrawal_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "user_payment_methods_user_id_reference_id_key" ON "user_payment_methods"("user_id", "reference_id");

-- CreateIndex
CREATE INDEX "idx_account_verification_method" ON "account_verifications"("payment_method_id");

-- CreateIndex
CREATE INDEX "idx_account_verification_pending" ON "account_verifications"("status", "expires_at");

-- CreateIndex
CREATE INDEX "idx_account_verification_user" ON "account_verifications"("user_id");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bids" ADD CONSTRAINT "bids_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "auctions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bids" ADD CONSTRAINT "bids_bidder_id_fkey" FOREIGN KEY ("bidder_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlist" ADD CONSTRAINT "watchlist_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlist" ADD CONSTRAINT "watchlist_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "auctions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "auctions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_cycle_events" ADD CONSTRAINT "payment_cycle_events_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "payment_cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger" ADD CONSTRAINT "ledger_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_payment_methods" ADD CONSTRAINT "user_payment_methods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_verifications" ADD CONSTRAINT "account_verifications_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "user_payment_methods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

