-- AlterTable
ALTER TABLE "payment_cycle_events" ADD COLUMN     "direction" VARCHAR(10),
ADD COLUMN     "duration_ms" INTEGER,
ADD COLUMN     "endpoint" VARCHAR(255),
ADD COLUMN     "http_status" INTEGER,
ADD COLUMN     "redacted_fields" JSONB,
ADD COLUMN     "reference" VARCHAR(255),
ADD COLUMN     "step" VARCHAR(40),
ADD COLUMN     "trace_id" VARCHAR(100);

-- CreateIndex
CREATE INDEX "idx_payment_cycle_event_reference" ON "payment_cycle_events"("reference", "received_at");

-- CreateIndex
CREATE INDEX "idx_payment_cycle_event_trace" ON "payment_cycle_events"("trace_id");

