import { WithdrawalsService } from '../../../src/modules/wallet/withdrawals.service';

/**
 * PT-072 — Máquina de estados y gates del retiro.
 */
describe('WithdrawalsService (PT-072)', () => {
  let service: WithdrawalsService;
  let prisma: any;
  let wallet: any;
  let kyc: any;
  let payments: any;
  let payout: any;

  beforeEach(() => {
    prisma = {
      withdrawalRequest: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
    };
    wallet = {
      getBalance: jest.fn().mockResolvedValue({ available: 5000 }),
      getDailyWithdrawals: jest.fn().mockResolvedValue(0),
      withdraw: jest.fn(),
      refundWithdrawal: jest.fn(),
    };
    kyc = {
      getUserKycStatus: jest.fn().mockResolvedValue('APPROVED'),
      isApproved: (s: string) => s === 'APPROVED',
    };
    payments = {
      getUserPaymentMethod: jest
        .fn()
        .mockResolvedValue({ id: 'm1', clabe: '00201', holderName: 'X' }),
    };
    payout = {
      execute: jest.fn().mockResolvedValue({ success: true, reference: 'WR-1', mode: 'MANUAL' }),
    };
    service = new WithdrawalsService(prisma, wallet, kyc, payments, payout);
  });

  it('request: valida y reserva (withdraw)', async () => {
    prisma.withdrawalRequest.create.mockResolvedValue({ id: 'w1', status: 'REQUESTED' });
    const r = await service.request('u1', { amount: 1000, paymentMethodId: 'm1' });
    expect(r.status).toBe('REQUESTED');
    expect(wallet.withdraw).toHaveBeenCalledWith('u1', 1000, 'WR-w1');
  });

  // PT-083 — La puerta de KYC obligatorio (ADR-021 / RN-62) se ejercita en todos sus estados,
  // no solo en PENDING. Es la misma regla que aplica `enableSeller` (cubierta en PT-079): si
  // una de las dos implementaciones se rompe, su suite debe notarlo igual que la otra.
  it.each([['PENDING'], ['REJECTED'], ['CORRECTION_NEEDED'], [null]])(
    'request: KYC en estado %s → error y sin reservar fondos',
    async (estado) => {
      kyc.getUserKycStatus.mockResolvedValue(estado);
      await expect(service.request('u1', { amount: 100, paymentMethodId: 'm1' })).rejects.toThrow(
        /KYC/,
      );
      expect(wallet.withdraw).not.toHaveBeenCalled();
    },
  );

  it('request: KYC APPROVED sí permite reservar', async () => {
    // Contraprueba del caso anterior: sin ella, un test que siempre lanza pasaría igual.
    prisma.withdrawalRequest.create.mockResolvedValue({ id: 'w9', status: 'REQUESTED' });
    kyc.getUserKycStatus.mockResolvedValue('APPROVED');

    await service.request('u1', { amount: 100, paymentMethodId: 'm1' });

    expect(wallet.withdraw).toHaveBeenCalled();
  });

  it('request: saldo insuficiente → error', async () => {
    wallet.getBalance.mockResolvedValue({ available: 50 });
    await expect(service.request('u1', { amount: 100, paymentMethodId: 'm1' })).rejects.toThrow(
      /insuficiente/i,
    );
  });

  it('reject: reintegra fondos y marca REJECTED', async () => {
    prisma.withdrawalRequest.findUnique.mockResolvedValue({
      id: 'w1',
      userId: 'u1',
      amount: 500,
      status: 'REQUESTED',
    });
    prisma.withdrawalRequest.update.mockResolvedValue({ id: 'w1', status: 'REJECTED' });
    await service.reject('w1', 'admin', 'motivo');
    expect(wallet.refundWithdrawal).toHaveBeenCalledWith('u1', 500, 'WR-w1');
  });

  it('markPaid: sólo desde APPROVED', async () => {
    prisma.withdrawalRequest.findUnique.mockResolvedValue({
      id: 'w1',
      userId: 'u1',
      amount: 500,
      status: 'REQUESTED',
      paymentMethodId: 'm1',
    });
    await expect(service.markPaid('w1', 'admin')).rejects.toThrow(/APPROVED/);
  });
});
