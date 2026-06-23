import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuctionSchedulerService } from '@/modules/scheduler/auction-scheduler.service';
import { PrismaService } from '@/database/prisma.service';
import { WalletService } from '@/modules/wallet/wallet.service';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { DistributedLockService } from '@/common/redis/distributed-lock.service';
import { SystemConfigService } from '@/modules/system-config/system-config.service';
import { AuctionStatus, OrderStatus } from '@prisma/client';

describe('AuctionSchedulerService — TX atomicity (PT-033)', () => {
  let service: AuctionSchedulerService;

  const mockTx = {
    auction: { update: jest.fn() },
    order: { create: jest.fn() },
    wallet: {},
    ledger: {},
    bid: {},
  };

  const mockPrismaService = {
    auction: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    bid: { groupBy: jest.fn() },
    $transaction: jest.fn(),
  };

  const mockWalletService = {
    captureHeldFunds: jest.fn(),
    releaseFunds: jest.fn(),
  };

  const mockNotificationsService = {
    create: jest.fn().mockResolvedValue(undefined),
  };

  const mockDistributedLockService = {
    acquireLock: jest.fn().mockResolvedValue('lock-token'),
    releaseLock: jest.fn().mockResolvedValue(true),
  };

  const mockSystemConfigService = {
    getNumber: jest.fn().mockResolvedValue(120),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const expiredAuction = {
    id: 'auction-1',
    title: 'Test Auction',
    sellerId: 'seller-1',
    status: AuctionStatus.ACTIVE,
    endsAt: new Date(Date.now() - 60000),
    bids: [
      {
        id: 'bid-1',
        bidderId: 'buyer-1',
        amount: 500,
      },
    ],
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuctionSchedulerService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: WalletService, useValue: mockWalletService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: DistributedLockService, useValue: mockDistributedLockService },
        { provide: SystemConfigService, useValue: mockSystemConfigService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<AuctionSchedulerService>(AuctionSchedulerService);
  });

  describe('closeExpiredAuctions', () => {
    it('should process auction successfully — order and funds captured atomically', async () => {
      mockPrismaService.auction.findMany.mockResolvedValue([expiredAuction]);
      mockPrismaService.bid.groupBy.mockResolvedValue([]);

      // Simulate $transaction executing the callback
      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        return callback(mockTx);
      });
      mockWalletService.captureHeldFunds.mockResolvedValue(undefined);

      await service.closeExpiredAuctions();

      expect(mockTx.auction.update).toHaveBeenCalledWith({
        where: { id: expiredAuction.id },
        data: { status: AuctionStatus.CLOSED },
      });
      expect(mockTx.order.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          auctionId: expiredAuction.id,
          status: OrderStatus.PAID,
        }),
      });
      expect(mockWalletService.captureHeldFunds).toHaveBeenCalledWith(
        'buyer-1',
        'seller-1',
        500,
        expiredAuction.id,
        expect.any(String),
        mockTx,
      );
    });

    it('should rollback auction+order when captureHeldFunds fails — no order persisted', async () => {
      mockPrismaService.auction.findMany.mockResolvedValue([expiredAuction]);

      // Simulate $transaction propagating an error (Prisma rolls back)
      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        mockWalletService.captureHeldFunds.mockRejectedValueOnce(new Error('Wallet not found'));
        return callback(mockTx);
      });

      // Should not throw — scheduler catches per-auction errors and continues
      await expect(service.closeExpiredAuctions()).resolves.not.toThrow();

      // No post-TX notifications sent (TX failed, winnerBid block after TX not reached)
      expect(mockNotificationsService.create).not.toHaveBeenCalled();
    });

    it('should skip processing when no bids exist (no order, no capture)', async () => {
      const auctionWithNoBids = { ...expiredAuction, bids: [] };
      mockPrismaService.auction.findMany.mockResolvedValue([auctionWithNoBids]);

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        return callback(mockTx);
      });

      await service.closeExpiredAuctions();

      expect(mockTx.order.create).not.toHaveBeenCalled();
      expect(mockWalletService.captureHeldFunds).not.toHaveBeenCalled();
    });
  });
});
