-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_order_id_fkey";

-- DropForeignKey
ALTER TABLE "refund_requests" DROP CONSTRAINT "refund_requests_order_id_fkey";

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "reference" VARCHAR(255),
ALTER COLUMN "order_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "refund_requests" ADD COLUMN     "payment_reference" VARCHAR(255),
ALTER COLUMN "order_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "idx_payments_reference" ON "payments"("reference");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

