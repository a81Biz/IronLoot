/*
  Warnings:

  - The values [HOLD,RELEASE] on the enum `LedgerType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "LedgerType_new" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'HOLD_BID', 'RELEASE_BID', 'PURCHASE', 'DEBIT_ORDER', 'CREDIT_SALE', 'FEE_PLATFORM', 'REFUND', 'ADJUSTMENT');
ALTER TABLE "ledger" ALTER COLUMN "type" TYPE "LedgerType_new" USING ("type"::text::"LedgerType_new");
ALTER TYPE "LedgerType" RENAME TO "LedgerType_old";
ALTER TYPE "LedgerType_new" RENAME TO "LedgerType";
DROP TYPE "LedgerType_old";
COMMIT;
