-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('PENDING', 'SHIPPED', 'DELIVERED', 'RETURNED');

-- CreateEnum
CREATE TYPE "ShipmentProvider" AS ENUM ('DHL', 'FEDEX', 'ESTAFETA', 'UPS', 'CUSTOM');

-- CreateTable
CREATE TABLE "shipments" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "provider" "ShipmentProvider" NOT NULL,
    "tracking_number" VARCHAR(100),
    "status" "ShipmentStatus" NOT NULL DEFAULT 'PENDING',
    "estimated_delivery" TIMESTAMPTZ,
    "shipped_at" TIMESTAMPTZ,
    "delivered_at" TIMESTAMPTZ,
    "order_id" UUID NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shipments_order_id_key" ON "shipments"("order_id");

-- CreateIndex
CREATE INDEX "idx_shipments_order" ON "shipments"("order_id");

-- CreateIndex
CREATE INDEX "idx_shipments_status" ON "shipments"("status");

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
