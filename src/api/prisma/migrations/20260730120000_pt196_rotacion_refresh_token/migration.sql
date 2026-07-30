-- PT-196 — Rotacion del refresh token.
--
-- **Aditiva y compatible hacia atras a proposito.** Las dos columnas son anulables, asi que las
-- sesiones vivas en el momento del despliegue quedan con `previous_refresh_token = NULL` y **rotan en
-- su primer refresco**: nadie pierde la sesion por desplegar (CA-8).
--
-- El indice unico sobre `previous_refresh_token` existe por el mismo motivo que el del vigente: sin el,
-- dos sesiones podrian compartir «anterior», la busqueda por token seria ambigua y **se revocaria la
-- sesion equivocada** al detectar un reuso. En Postgres un indice unico admite varios NULL, asi que no
-- estorba a las filas que aun no han rotado.

-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "previous_refresh_token" VARCHAR(255),
ADD COLUMN     "rotated_at" TIMESTAMPTZ;

-- CreateIndex
CREATE UNIQUE INDEX "sessions_previous_refresh_token_key" ON "sessions"("previous_refresh_token");
