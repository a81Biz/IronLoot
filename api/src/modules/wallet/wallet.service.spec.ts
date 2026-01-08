import { Test, TestingModule } from '@nestjs/testing';
import { WalletService } from './wallet.service';
import { PrismaService } from '../../database/prisma.service';
import { StructuredLogger } from '../../common/observability';
import { InsufficientBalanceException } from '../../common/observability';
import { Decimal } from '@prisma/client/runtime/library';

describe('WalletService Exceptions', () => {
  let service: WalletService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        {
          provide: PrismaService,
          useValue: {
            wallet: { findUnique: jest.fn(), update: jest.fn() },
            $transaction: jest.fn((cb) =>
              cb({
                wallet: { findUnique: jest.fn(), update: jest.fn() },
                ledger: { create: jest.fn() },
              }),
            ),
          },
        },
        {
          provide: StructuredLogger,
          useValue: { child: jest.fn().mockReturnValue({ info: jest.fn(), error: jest.fn() }) },
        },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should throw InsufficientBalanceException on withdraw if balance is low', async () => {
    const mockTx = {
      wallet: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: '1', balance: new Decimal(10), userId: 'user1' }),
        update: jest.fn(),
      },
      ledger: { create: jest.fn() },
    };
    (prisma.$transaction as jest.Mock).mockImplementation((cb) => cb(mockTx));

    await expect(service.withdraw('user1', 100, 'ref1')).rejects.toThrow(
      InsufficientBalanceException,
    );
  });
});
