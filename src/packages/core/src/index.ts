// Main entry point of @ironloot/core.
// Exports are added as domain logic is extracted from api/.
// Do not import Prisma, NestJS, Express, or Redis here.

export * from './domain';
// PT-042 (AUD-012): the application/ use-cases (PlaceBid/CloseAuction/ProcessPayment/ProcessRefund)
// were tested but never wired into the API (production re-implements the orchestration in the
// NestJS services). Removed to eliminate false-confidence coverage. Domain primitives, events,
// contracts and integrations remain.
export * from './events';
export * from './integrations';
export * from './contracts';
export * from './shared';
