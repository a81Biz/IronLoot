-- PT-078: la clave de deduplicacion pasa a ser el identificador de PAGO del proveedor.
-- Renombrado real (no DROP+ADD) para no perder datos: el generador de Prisma propone
-- eliminar y recrear la columna, lo que destruiria las reservas ya registradas.

ALTER TABLE "processed_webhook_events" RENAME COLUMN "event_id" TO "payment_id";

ALTER INDEX "processed_webhook_events_provider_event_id_key"
  RENAME TO "processed_webhook_events_provider_payment_id_key";
