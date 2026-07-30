// Domain layer: pure business rules, state machines, and value object calculations.
// No framework, ORM, or infrastructure dependencies allowed.

export * from "./auction";
export * from "./bid";
export * from "./wallet";
export * from "./order";
export * from "./payment";
export * from "./dispute";

// PT-191 (AUD-012) — `money/` retirado. El VO `Money` no lo importaba **ningun** servicio del API, y
// cablearlo habria sido peor que no tenerlo, por tres razones medidas:
//
//   1. **No puede representar el descubierto.** Su constructor rechaza importes negativos, y desde
//      PT-191 el monedero del vendedor puede quedar en negativo cuando una disputa se resuelve a favor
//      del comprador y el holdback ya se libero (`WalletService.reversarVenta`).
//   2. **Su aritmetica es peor que la que hay.** Guarda centavos en un `number` y convierte con
//      `Math.round(n * 100)` sobre un flotante; las columnas son `Decimal(12,2)` y el API opera con
//      `Prisma.Decimal`, que es decimal de precision arbitraria. Migrar habria sido una regresion.
//   3. **Su garantia principal no aplica.** `CurrencyMismatchError` protege de sumar monedas distintas,
//      y la plataforma esta estandarizada en MXN.
//
// Mismo criterio y mismo fichero que PT-042 aplico a los casos de uso: **lo que no se cablea, se
// retira**; conservarlo produce cobertura que no cubre nada (`money.spec.ts` tenia 30 casos verdes
// sobre codigo que no corria en produccion).
