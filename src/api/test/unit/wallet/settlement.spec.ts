import { LedgerType } from '@prisma/client';

/**
 * PT-071 — releaseSettlement mueve el neto de pendingBalance a disponible (balance)
 * y registra SETTLEMENT_RELEASE. Es idempotente si no hay suficiente pendiente.
 */
describe('WalletService.releaseSettlement (PT-071)', () => {
  let WalletService: any;
  let service: any;
  let tx: any;

  beforeAll(async () => {
    WalletService = (await import('../../../src/modules/wallet/wallet.service')).WalletService;
  });

  beforeEach(() => {
    tx = {
      wallet: { findUnique: jest.fn(), update: jest.fn() },
      ledger: { create: jest.fn() },
    };
    // prisma.$transaction ejecuta el callback con el tx mock
    const prisma = { $transaction: (fn: any) => fn(tx) };
    service = new WalletService(
      prisma as any,
      { child: () => ({ info: jest.fn(), error: jest.fn() }) } as any,
    );
  });

  it('libera el neto: pending↓, balance↑, ledger SETTLEMENT_RELEASE', async () => {
    tx.wallet.findUnique.mockResolvedValue({ id: 'w1', balance: '100', pendingBalance: '2700' });
    await service.releaseSettlement('seller-1', 2700, 'order-1');
    expect(tx.ledger.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: LedgerType.SETTLEMENT_RELEASE,
          amount: expect.anything(),
        }),
      }),
    );
    const upd = tx.wallet.update.mock.calls[0][0].data;
    expect(Number(upd.balance)).toBe(2800);
    expect(Number(upd.pendingBalance)).toBe(0);
  });

  it('idempotente: si pending < monto, no hace nada', async () => {
    tx.wallet.findUnique.mockResolvedValue({ id: 'w1', balance: '100', pendingBalance: '0' });
    await service.releaseSettlement('seller-1', 2700, 'order-1');
    expect(tx.wallet.update).not.toHaveBeenCalled();
    expect(tx.ledger.create).not.toHaveBeenCalled();
  });
});
