import { Test, TestingModule } from '@nestjs/testing';
import { WalletController } from '../../../src/modules/wallet/wallet.controller';
import { WalletService } from '../../../src/modules/wallet/wallet.service';
import { PrismaService } from '../../../src/database/prisma.service';
import { DepositDto } from '../../../src/modules/wallet/dto/wallet.dto';
import { JwtAuthGuard } from '../../../src/modules/auth/guards/jwt-auth.guard';

describe('WalletController', () => {
  let controller: WalletController;
  let service: WalletService;
  let prisma: PrismaService;

  const mockWalletService = {
    getBalance: jest.fn(),
    getWallet: jest.fn(),
    deposit: jest.fn(),
    withdraw: jest.fn(),
  };

  const mockPrismaService = {
    ledger: {
      findMany: jest.fn(),
    },
  };

  const mockRequest = { user: { id: 'user-123' } };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WalletController],
      providers: [
        { provide: WalletService, useValue: mockWalletService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<WalletController>(WalletController);
    service = module.get<WalletService>(WalletService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('getBalance', () => {
    it('should return balance', async () => {
      mockWalletService.getBalance.mockResolvedValue({ available: 100 });
      const result = await controller.getBalance(mockRequest);
      expect(result).toEqual({ available: 100 });
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

  describe('getHistory', () => {
    it('should return history', async () => {
      mockWalletService.getWallet.mockResolvedValue({ id: 'wallet-123' });
      mockPrismaService.ledger.findMany.mockResolvedValue([]);

      const result = await controller.getHistory(mockRequest);
      expect(result.walletId).toBe('wallet-123');
      expect(prisma.ledger.findMany).toHaveBeenCalled();
    });
  });
});
