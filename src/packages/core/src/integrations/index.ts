// Integration interfaces: contracts for external services (payment providers, email, storage, CFDI PAC).
// Concrete implementations live in api/src/modules/, never in this package.

export * from './payment-provider.interface';
export * from './email-service.interface';
export * from './storage-service.interface';
export * from './cfdi-pac-provider.interface';
