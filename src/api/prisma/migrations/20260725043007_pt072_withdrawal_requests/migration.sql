-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('REQUESTED', 'APPROVED', 'PROCESSING', 'PAID', 'REJECTED', 'FAILED');

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

-- CreateIndex
CREATE INDEX "idx_withdrawal_user" ON "withdrawal_requests"("user_id");

-- CreateIndex
CREATE INDEX "idx_withdrawal_status" ON "withdrawal_requests"("status");
