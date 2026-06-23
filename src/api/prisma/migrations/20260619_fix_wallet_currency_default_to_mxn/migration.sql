-- PT-028: Fix wallet.currency default from USD to MXN
-- Alinea con moneda global MXN (H-003)
ALTER TABLE "public"."wallets" ALTER COLUMN "currency" SET DEFAULT 'MXN';
UPDATE "public"."wallets" SET "currency" = 'MXN' WHERE "currency" = 'USD';
