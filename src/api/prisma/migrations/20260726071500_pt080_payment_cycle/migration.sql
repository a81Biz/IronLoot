-- CreateEnum
CREATE TYPE "PaymentCycleStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'SETTLED', 'FAILED', 'ANOMALY', 'EXPIRED');

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
    "received_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "payment_cycle_events_pkey" PRIMARY KEY ("id")
);

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

-- AddForeignKey
ALTER TABLE "payment_cycle_events" ADD CONSTRAINT "payment_cycle_events_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "payment_cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

