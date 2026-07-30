// Domain events: plain TypeScript interfaces representing things that happened.
// Consumed by event handlers in the api/ service layer.

export * from "./auction-closed.event";

// PT-193 (TD-024) — **Cuatro eventos retirados: `BidPlaced`, `OrderCreated`, `PaymentCompleted`,
// `RefundProcessed`.** Estaban declarados y **nadie los emitia**. `AuctionClosedEvent` se queda porque
// SI se emite (`auction-scheduler.service.ts`): este fichero estaba medio vivo, que es la razon por la
// que se midio por simbolo y no por fichero.
//
// Un evento declarado que nadie emite no es una extension futura: es una promesa de contrato que un
// consumidor podria intentar escuchar para siempre.
