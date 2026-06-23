-- PT-035: Remove deprecated LedgerType.PURCHASE enum value
-- DEBIT_ORDER is the canonical type (no existing PURCHASE rows in ledger)
ALTER TYPE "LedgerType" RENAME TO "LedgerType_old";
CREATE TYPE "LedgerType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'HOLD_BID', 'RELEASE_BID', 'DEBIT_ORDER', 'CREDIT_SALE', 'FEE_PLATFORM', 'REFUND', 'ADJUSTMENT');
ALTER TABLE "ledger" ALTER COLUMN "type" TYPE "LedgerType" USING "type"::text::"LedgerType";
DROP TYPE "LedgerType_old";
