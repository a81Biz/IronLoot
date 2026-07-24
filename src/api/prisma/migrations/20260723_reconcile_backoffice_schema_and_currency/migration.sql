-- PT-037 (AUD-001 + AUD-008): reconcile backoffice schema that was applied via `prisma db push` without a migration.
-- Generated with: prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --script
-- Creates 11 backoffice tables, 9 enums, 3 enum values, 3 FKs, 18 indexes, missing columns on existing tables,
-- and sets payments.currency default to MXN (AUD-008).
-- Existing (db push) environments must baseline this migration once: prisma migrate resolve --applied 20260723_reconcile_backoffice_schema_and_currency

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

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuctionStatus" ADD VALUE 'SUSPENDED';
ALTER TYPE "AuctionStatus" ADD VALUE 'PENDING_MODERATION';

-- AlterEnum
ALTER TYPE "PaymentProvider" ADD VALUE 'HEY_BANCO';

-- AlterTable
ALTER TABLE "auctions" ADD COLUMN     "admin_notes" TEXT,
ADD COLUMN     "is_blocked" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "payments" ALTER COLUMN "currency" SET DEFAULT 'MXN';

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "legal_name" VARCHAR(150),
ADD COLUMN     "rfc" VARCHAR(13);

-- AlterTable
ALTER TABLE "user_payment_methods" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "settings" JSONB NOT NULL DEFAULT '{"language": "es", "notifications": {"email": true, "inApp": true}}';

-- CreateTable
CREATE TABLE "watchlist" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" UUID NOT NULL,
    "auction_id" UUID NOT NULL,

    CONSTRAINT "watchlist_pkey" PRIMARY KEY ("id")
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
    "order_id" UUID NOT NULL,
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

-- CreateIndex
CREATE INDEX "idx_watchlist_user" ON "watchlist"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "watchlist_user_id_auction_id_key" ON "watchlist"("user_id", "auction_id");

-- CreateIndex
CREATE INDEX "idx_system_config_category" ON "system_config"("category");

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

-- AddForeignKey
ALTER TABLE "watchlist" ADD CONSTRAINT "watchlist_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlist" ADD CONSTRAINT "watchlist_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "auctions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- PT-037 (AUD-008): normalize any residual USD rows to MXN.
UPDATE "payments" SET "currency" = 'MXN' WHERE "currency" = 'USD';
