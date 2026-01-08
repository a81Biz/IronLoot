-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'AUCTION_LOST';

-- AlterEnum
ALTER TYPE "PaymentProvider" ADD VALUE 'STRIPE';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "two_factor_secret" VARCHAR(100);

-- CreateIndex
CREATE INDEX "idx_bids_auction_amount" ON "bids"("auction_id", "amount" DESC);
