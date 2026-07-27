/**
 * Contratos de repositorio (puertos de persistencia).
 *
 * PT-084 — **PREVISTOS Y NO ADOPTADOS.** Ninguna de estas interfaces se implementa ni se
 * referencia en `src/api`. La logica que iban a gobernar —pago de orden, cierre de subasta,
 * puja— vive hoy directamente en los servicios de la API y funciona.
 *
 * Se conservan, no se borran, porque la abstraccion puede volver a hacer falta: PT-080 revivio
 * el puerto `IPaymentProvider` de `integrations/` justo cuando aparecio una necesidad real
 * (cuatro adaptadores necesitaban un contrato comun y un registro necesitaba identidad).
 *
 * **Criterio para adoptarlos**: cuando exista mas de una implementacion de persistencia, o
 * cuando la logica de dominio deba probarse sin base de datos. Adoptarlos hoy significaria
 * reescribir una ruta de dinero que funciona, sin ganancia funcional. Ver ADR-033.
 */

// Contract interfaces: repository abstractions used by use cases.
// Prisma implementations satisfy these interfaces in api/src/modules/.

export * from "./auction-repository.interface";
export * from "./bid-repository.interface";
export * from "./wallet-repository.interface";
export * from "./order-repository.interface";
