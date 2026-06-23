import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { WalletController } from '../../../src/modules/wallet/wallet.controller';
import { WalletService } from '../../../src/modules/wallet/wallet.service';
import { PaymentsService } from '../../../src/modules/payments/payments.service';
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
        currency: 'USD',
        isActive: true,
      });
      const result = await controller.getBalance(mockRequest);
      expect(result).toEqual({ available: 100, held: 0, currency: 'USD', isActive: true });
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

  describe('withdraw (PT-029)', () => {
    it('should return 400 when payment method is not registered', async () => {
      // getUserPaymentMethod returns null — unregistered method
      const dto: WithdrawDto = { amount: 100, referenceId: 'ref_invalid' };
      await expect(controller.withdraw(mockRequest, dto)).rejects.toThrow(BadRequestException);
    });

    it('should proceed when payment method is registered', async () => {
      const mockMethod = {
        id: 'pm-1',
        userId: 'user-123',
        referenceId: 'ref_valid',
        isActive: true,
      };
      const paymentsService = module.get(PaymentsService);
      jest.spyOn(paymentsService, 'getUserPaymentMethod').mockResolvedValue(mockMethod as any);
      mockWalletService.withdraw.mockResolvedValue({ success: true });

      const dto: WithdrawDto = { amount: 100, referenceId: 'ref_valid' };
      const result = await controller.withdraw(mockRequest, dto);
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
