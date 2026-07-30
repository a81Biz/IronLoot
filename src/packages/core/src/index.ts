// Main entry point of @ironloot/core.
// Exports are added as domain logic is extracted from api/.
// Do not import Prisma, NestJS, Express, or Redis here.

export * from "./domain";
// PT-042 (AUD-012): the application/ use-cases (PlaceBid/CloseAuction/ProcessPayment/ProcessRefund)
// were tested but never wired into the API (production re-implements the orchestration in the
// NestJS services). Removed to eliminate false-confidence coverage. Domain primitives, events,
// contracts remain (ADR-033).
//
// PT-193 (TD-024) — **`integrations/` retirado entero.** Declaraba `IPaymentProvider`,
// `IEmailService`, `IStorageService` y los tipos del CFDI, y **ninguno tenia implementadores**. El
// caso grave era el de pagos: los cuatro adaptadores implementan el `PaymentProvider` que declara
// el API (`modules/payments/interfaces/`), asi que quien leyera este paquete para saber que debe
// cumplir una pasarela obtenia **una respuesta que no se aplica en ninguna parte** y que podia
// divergir sin que nada protestara. Eso no es codigo muerto: es documentacion falsa ejecutable,
// la familia de H-016.
//
// ADR-033 afirmaba que PT-080 «revivio IPaymentProvider porque habia una necesidad real».
// Medido: **cero implementadores**. PT-080 escribio un contrato NUEVO en el API; no revivio este.
// La ADR lleva su nota de enmienda.
export * from "./events";
export * from "./contracts";

// PT-193 (TD-024) — **`shared/` retirado entero.** Se quedo sin contenido propio: `money.dto.ts` salio
// con el VO `Money` (PT-191) y `pagination.dto.ts` con esta limpieza, porque el API usa sus propios DTO
// de paginacion. Un directorio que solo contiene un `index.ts` de reexportaciones vacias no es un punto
// de extension: es un sitio donde alguien volvera a poner algo sin consumidores.
