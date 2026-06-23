-- PT-029: Add user_payment_methods table for withdrawal method validation
CREATE TABLE "user_payment_methods" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" UUID NOT NULL,
    "reference_id" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "user_payment_methods_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_payment_methods_user_id_reference_id_key"
    ON "user_payment_methods"("user_id", "reference_id");

ALTER TABLE "user_payment_methods"
    ADD CONSTRAINT "user_payment_methods_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
