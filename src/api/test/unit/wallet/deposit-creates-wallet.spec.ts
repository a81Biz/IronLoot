import { WalletService } from '../../../src/modules/wallet/wallet.service';

/**
 * PT-087 — F-10: un depósito no puede fallar por no existir aún el monedero.
 *
 * Encontrado el 2026-07-27: un usuario recién registrado no tiene fila en `wallets` —se crea
 * de forma perezosa la primera vez que consulta su monedero— y `deposit()` exigía que ya
 * existiera. Resultado: se capturaron 321.50 MXN reales en PayPal y la acreditación murió con
 * «Wallet not found».
 *
 * Es peor por la vía garantizada, que corre en un cron: ahí no hay ningún usuario navegando
 * que provoque la creación perezosa. El dinero se cobra y nadie lo reclama.
 */
describe('WalletService.deposit — crea el monedero si no existe (PT-087)', () => {
  let service: WalletService;
  let findUnique: jest.Mock;
  let create: jest.Mock;
  let update: jest.Mock;
  let ledgerCreate: jest.Mock;

  const wallet = (over: Record<string, unknown> = {}) => ({
    id: 'w-1',
    userId: 'u-1',
    balance: '0',
    heldFunds: '0',
    currency: 'MXN',
    isActive: false,
    ...over,
  });

  beforeEach(() => {
    findUnique = jest.fn();
    create = jest.fn().mockResolvedValue(wallet());
    update = jest.fn().mockImplementation(({ data }) => wallet({ balance: data.balance }));
    ledgerCreate = jest.fn().mockResolvedValue({ id: 'l-1' });

    const tx = {
      wallet: { findUnique, create, update },
      ledger: { create: ledgerCreate },
    };

    const prisma = {
      $transaction: (cb: (t: unknown) => unknown) => cb(tx),
    };

    // `WalletService` deriva su propio logger con `child()`: el doble debe devolverse a sí mismo.
    const logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      child: jest.fn(),
    };
    logger.child.mockReturnValue(logger);

    service = new WalletService(prisma as never, logger as never);
  });

  it('W-01: sin monedero previo, el depósito lo crea y acredita', async () => {
    findUnique.mockResolvedValue(null);

    const r = await service.deposit('u-1', 321.5, 'DEP-u-1-1', 'DEPOSIT');

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: 'u-1' }) }),
    );
    expect(ledgerCreate).toHaveBeenCalled();
    expect(r.ledger).toBeDefined();
  });

  it('W-02: con monedero existente NO se crea otro', async () => {
    findUnique.mockResolvedValue(wallet({ balance: '100' }));

    await service.deposit('u-1', 50, 'DEP-u-1-2', 'DEPOSIT');

    expect(create).not.toHaveBeenCalled();
  });

  it('W-03: el asiento parte del saldo real, no de cero', async () => {
    findUnique.mockResolvedValue(wallet({ balance: '100' }));

    await service.deposit('u-1', 50, 'DEP-u-1-3', 'DEPOSIT');

    const asiento = ledgerCreate.mock.calls[0][0].data;
    expect(String(asiento.balanceBefore)).toBe('100');
    expect(String(asiento.balanceAfter)).toBe('150');
  });

  it('W-04: un importe no positivo se sigue rechazando', async () => {
    await expect(service.deposit('u-1', 0, 'DEP-u-1-4', 'DEPOSIT')).rejects.toThrow();
  });
});
