-- AlterTable
ALTER TABLE "user_payment_methods" ADD COLUMN     "alias" VARCHAR(80),
ADD COLUMN     "bank_name" VARCHAR(120),
ADD COLUMN     "clabe" VARCHAR(18),
ADD COLUMN     "holder_name" VARCHAR(255),
ADD COLUMN     "is_verified" BOOLEAN NOT NULL DEFAULT false;
