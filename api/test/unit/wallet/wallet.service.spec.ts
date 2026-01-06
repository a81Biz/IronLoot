import { Test, TestingModule } from '@nestjs/testing';
import { WalletService } from '../../../api/src/modules/wallet/wallet.service';
import { PrismaService } from '../../../api/src/database/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { StructuredLogger } from '../../../api/src/common/observability';

// Mock types
const mockWallet = {
  id: 'wallet-123',
  userId: 'user-123',
  balance: new Decimal(100),
  heldFunds: new Decimal(0),
  currency: 'USD',
  isActive: true,
};

const mockTx = {
  wallet: {
    findUnique: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
  ledger: {
    create: jest.fn(),
  },
};

const mockPrismaService = {
  wallet: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  ledger: {
    create: jest.fn(),
  },
  $transaction: jest.fn((callback) => callback(mockTx)),
};

const mockStructuredLogger = {
  child: jest.fn().mockReturnValue({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
};

describe('WalletService', () => {
  let service: WalletService;
  let prisma: any; // Use any to avoid type errors with mock

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: StructuredLogger,
          useValue: mockStructuredLogger,
        },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getWallet', () => {
    it('should return existing wallet', async () => {
      jest.spyOn(prisma.wallet, 'findUnique').mockResolvedValue(mockWallet as any);

      const result = await service.getWallet('user-123');
      expect(result).toEqual(mockWallet);
    });

    it('should create new wallet if not found', async () => {
      jest.spyOn(prisma.wallet, 'findUnique').mockResolvedValue(null);
      jest.spyOn(prisma.wallet, 'create').mockResolvedValue(mockWallet as any);

      const result = await service.getWallet('user-123');
      expect(prisma.wallet.create).toHaveBeenCalled();
      expect(result).toEqual(mockWallet);
    });
  });

  describe('deposit', () => {
    it('should increase balance and create ledger entry', async () => {
      mockTx.wallet.findUnique.mockResolvedValue(mockWallet);
      mockTx.wallet.update.mockResolvedValue({ ...mockWallet, balance: new Decimal(200) });
      mockTx.ledger.create.mockResolvedValue({});

      await service.deposit('user-123', 100, 'ref-1');

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(mockTx.wallet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            balance: new Decimal(200),
            isActive: true,
          }),
        }),
      );
      expect(mockTx.ledger.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'DEPOSIT',
            amount: new Decimal(100),
          }),
        }),
      );
    });
  });

  describe('withdraw', () => {
    it('should decrease balance if sufficient funds', async () => {
      mockTx.wallet.findUnique.mockResolvedValue(mockWallet); // Balance 100
      mockTx.wallet.update.mockResolvedValue({ ...mockWallet, balance: new Decimal(50) });

      await service.withdraw('user-123', 50, 'ref-2');

      expect(mockTx.wallet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { balance: new Decimal(50) },
        }),
      );
    });

    it('should throw error if insufficient funds', async () => {
      mockTx.wallet.findUnique.mockResolvedValue(mockWallet); // Balance 100

      await expect(service.withdraw('user-123', 150, 'ref-3')).rejects.toThrow(BadRequestException);
    });
  });

  describe('holdFunds', () => {
    it('should move funds from balance to heldFunds', async () => {
      mockTx.wallet.findUnique.mockResolvedValue(mockWallet); // Balance 100
      mockTx.wallet.update.mockResolvedValue({});

      await service.holdFunds('user-123', 50, 'bid-1', 'Hold for bid');

      expect(mockTx.wallet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            balance: new Decimal(50),
            heldFunds: new Decimal(50),
          },
        }),
      );
    });

    it('should throw if wallet inactive', async () => {
      mockTx.wallet.findUnique.mockResolvedValue({ ...mockWallet, isActive: false });

      await expect(service.holdFunds('user-123', 50, 'bid-1', '')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('releaseFunds', () => {
    it('should move funds from heldFunds back to balance', async () => {
      const heldWallet = {
        ...mockWallet,
        balance: new Decimal(50),
        heldFunds: new Decimal(50),
      };
      mockTx.wallet.findUnique.mockResolvedValue(heldWallet);

      await service.releaseFunds('user-123', 50, 'bid-1', '');

      expect(mockTx.wallet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            balance: new Decimal(100),
            heldFunds: new Decimal(0),
          },
        }),
      );
    });
  });
});
