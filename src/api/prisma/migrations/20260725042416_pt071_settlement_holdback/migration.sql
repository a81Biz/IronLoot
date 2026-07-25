-- AlterEnum
ALTER TYPE "LedgerType" ADD VALUE 'SETTLEMENT_RELEASE';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "seller_net" DECIMAL(12,2),
ADD COLUMN     "seller_settled_at" TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "wallets" ADD COLUMN     "pending_balance" DECIMAL(12,2) NOT NULL DEFAULT 0;
