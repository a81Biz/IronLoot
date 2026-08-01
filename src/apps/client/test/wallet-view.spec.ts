import {
  WALLET_BALANCE_PATH,
  mapWalletBalance,
} from "../src/common/bff/wallet-view";

describe("wallet-view (PT-058 / BUG-QA-N01)", () => {
  it("W1: usa el endpoint real /api/v1/wallet/balance", () => {
    expect(WALLET_BALANCE_PATH).toBe("/api/v1/wallet/balance");
  });

  it("W2: mapea WalletBalanceDto (available/held) al modelo de vista (balance/held_funds)", () => {
    expect(
      mapWalletBalance({
        available: 5000,
        held: 700,
        currency: "MXN",
        isActive: true,
      }),
    ).toEqual({
      balance: 5000,
      held_funds: 700,
      // PT-206 — Este campo lo añade el mapeador desde ahora. La entrada de este caso no trae
      // `pending` (es la que escribió PT-058), así que resuelve a 0 y no a `undefined`: un saldo
      // ausente que llega a la plantilla como vacío es el silencio que PT-206 corrige.
      pending_balance: 0,
      currency: "MXN",
      isActive: true,
    });
  });

  it("W3: devuelve null si la respuesta es null/undefined (404 → apiGet null)", () => {
    expect(mapWalletBalance(null)).toBeNull();
    expect(mapWalletBalance(undefined)).toBeNull();
  });

  /**
   * PT-206 (R-025 · H-UI-011) — **El holdback del vendedor llegaba y se tiraba aquí.**
   *
   * `GET /wallet/balance` devuelve `pending` desde PT-071 y está documentado en el DTO como «ventas sin
   * liquidar (holdback)». La interfaz `WalletBalanceRaw` declaraba cuatro campos y este mapeador
   * construía el objeto sin él: **el dinero de las ventas del vendedor no aparecía en ninguna pantalla**.
   *
   * Lo que sí se mostraba —«Fondos retenidos en ofertas»— es `held`, que es dinero del COMPRADOR
   * bloqueado por pujas. Dos conceptos distintos, y el que faltaba era el suyo. En una plataforma cuya
   * propuesta declarada es custodia y transparencia, ocultar dinero custodiado es indistinguible de
   * haberlo perdido.
   */
  it("W4: conserva `pending` — el holdback de las ventas (RN-64)", () => {
    expect(
      mapWalletBalance({
        available: 5000,
        held: 700,
        pending: 12500,
        currency: "MXN",
        isActive: true,
      }),
    ).toEqual({
      balance: 5000,
      held_funds: 700,
      pending_balance: 12500,
      currency: "MXN",
      isActive: true,
    });
  });

  it("W5: un API que aún no envíe `pending` da 0, no undefined", () => {
    const vista = mapWalletBalance({
      available: 100,
      held: 0,
      currency: "MXN",
      isActive: true,
    } as never);
    expect(vista?.pending_balance).toBe(0);
  });
});
