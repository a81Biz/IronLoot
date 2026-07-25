import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { WalletController } from '../../../src/modules/wallet/wallet.controller';
import { WalletService } from '../../../src/modules/wallet/wallet.service';
import { PaymentsService } from '../../../src/modules/payments/payments.service';
import { WithdrawalsService } from '../../../src/modules/wallet/withdrawals.service';
import { PrismaService } from '../../../src/database/prisma.service';
import { DepositDto, WithdrawDto } from '../../../src/modules/wallet/dto/wallet.dto';
import { JwtAuthGuard } from '../../../src/modules/auth/guards/jwt-auth.guard';

describe('WalletController', () => {
  let controller: WalletController;
  let service: WalletService;
  let module: TestingModule;

  const mockWalletService = {
    getBalance: jest.fn(),
    getWallet: jest.fn(),
    deposit: jest.fn(),
    withdraw: jest.fn(),
    getHistory: jest.fn(),
    getDailyWithdrawals: jest.fn().mockResolvedValue(0),
  };

  const mockPrismaService = {
    ledger: {
      findMany: jest.fn(),
    },
  };

  const mockWithdrawalsService = {
    request: jest.fn(),
    listMine: jest.fn(),
  };

  const mockRequest = { user: { id: 'user-123' } } as any;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [WalletController],
      providers: [
        { provide: WalletService, useValue: mockWalletService },
        {
          provide: PaymentsService,
          useValue: {
            createCheckoutSession: jest.fn(),
            verifyPayment: jest.fn().mockResolvedValue({ status: 'COMPLETED', amount: 100 }),
            getUserPaymentMethod: jest.fn().mockResolvedValue(null),
          },
        },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: WithdrawalsService, useValue: mockWithdrawalsService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<WalletController>(WalletController);
    service = module.get<WalletService>(WalletService);
  });

  describe('getBalance', () => {
    it('should return balance', async () => {
      mockWalletService.getBalance.mockResolvedValue({
        available: 100,
        held: 0,
        pending: 0,
        currency: 'USD',
        isActive: true,
      });
      const result = await controller.getBalance(mockRequest);
      expect(result).toEqual({
        available: 100,
        held: 0,
        pending: 0,
        currency: 'USD',
        isActive: true,
      });
      expect(service.getBalance).toHaveBeenCalledWith('user-123');
    });
  });

  describe('deposit', () => {
    it('should call service.deposit', async () => {
      const dto: DepositDto = { amount: 100, referenceId: 'ref-1' };
      await controller.deposit(mockRequest, dto);
      expect(service.deposit).toHaveBeenCalledWith('user-123', 100, 'ref-1');
    });
  });

  describe('withdraw (PT-072 — delega en solicitud con aprobación)', () => {
    it('propaga el 400 de la solicitud cuando el método es inválido', async () => {
      mockWithdrawalsService.request.mockRejectedValueOnce(
        new BadRequestException('Método de pago inválido'),
      );
      const dto: WithdrawDto = { amount: 100, referenceId: 'ref_invalid' };
      await expect(controller.withdraw(mockRequest, dto)).rejects.toThrow(BadRequestException);
    });

    it('crea una solicitud (REQUESTED) mapeando referenceId → paymentMethodId', async () => {
      mockWithdrawalsService.request.mockResolvedValueOnce({ id: 'w1', status: 'REQUESTED' });
      const dto: WithdrawDto = { amount: 100, referenceId: 'ref_valid' };
      const result = await controller.withdraw(mockRequest, dto);
      expect(mockWithdrawalsService.request).toHaveBeenCalledWith('user-123', {
        amount: 100,
        paymentMethodId: 'ref_valid',
      });
      expect(result).toBeDefined();
    });
  });

  describe('getHistory', () => {
    it('should return history', async () => {
      // Mock getWallet to return a wallet (impl detail, but verified via service)
      // Actually controller calls service.getHistory directly now.
      // And the service.getHistory returns an array of Ledgers.
      // The controller returns { transactions: [...] }

      const mockHistory = [
        { id: 'tx-1', type: 'DEPOSIT', amount: 100, createdAt: new Date(), referenceId: 'ref-1' },
      ];
      mockWalletService.getHistory.mockResolvedValue(mockHistory);

      const result = await controller.getHistory(mockRequest);
      expect(result.transactions).toBeDefined();
      expect(result.transactions[0].id).toBe('tx-1');
      expect(service.getHistory).toHaveBeenCalledWith('user-123', undefined);
    });
  });
});
