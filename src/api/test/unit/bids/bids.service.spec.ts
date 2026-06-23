import { Test, TestingModule } from '@nestjs/testing';
import { BidsService } from '@/modules/bids/bids.service';
import { PrismaService } from '@/database/prisma.service';
import { StructuredLogger, RequestContextService } from '@/common/observability';
import { WalletService } from '@/modules/wallet/wallet.service';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { AuditPersistenceService } from '@/modules/audit/audit-persistence.service';
import { AuctionsGateway } from '@/modules/auctions/auctions.gateway';
import { SystemConfigService } from '@/modules/system-config/system-config.service';

jest.mock('@ironloot/core', () => ({
  BidValidation: { validate: jest.fn().mockReturnValue({ valid: true }) },
  AuctionStatus: {
    DRAFT: 'DRAFT',
    PUBLISHED: 'PUBLISHED',
    ACTIVE: 'ACTIVE',
    SOFT_CLOSE: 'SOFT_CLOSE',
    CLOSED: 'CLOSED',
  },
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPrismaService: any = {
  auction: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  bid: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
};
mockPrismaService.$transaction = jest.fn((cb: (tx: typeof mockPrismaService) => Promise<unknown>) =>
  cb(mockPrismaService),
);

const mockLogger = {
  child: jest.fn().mockReturnThis(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

const mockRequestContext = {
  getUserId: jest.fn(),
  getTraceId: jest.fn().mockReturnValue('trace-123'),
};

const mockSystemConfigService = {
  getNumber: jest.fn().mockResolvedValue(120),
};

const mockWalletService = {
  holdFunds: jest.fn().mockResolvedValue(undefined),
  releaseFunds: jest.fn().mockResolvedValue(undefined),
};

const mockNotificationsService = {
  create: jest.fn().mockResolvedValue(undefined),
};

const mockAuditService = {
  recordAudit: jest.fn().mockResolvedValue(undefined),
};

const mockAuctionsGateway = {
  emitNewBid: jest.fn(),
  emitAuctionExtended: jest.fn(),
};

describe('BidsService', () => {
  let service: BidsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BidsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: StructuredLogger, useValue: mockLogger },
        { provide: RequestContextService, useValue: mockRequestContext },
        { provide: WalletService, useValue: mockWalletService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: AuditPersistenceService, useValue: mockAuditService },
        { provide: AuctionsGateway, useValue: mockAuctionsGateway },
        { provide: SystemConfigService, useValue: mockSystemConfigService },
      ],
    }).compile();

    service = module.get<BidsService>(BidsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('placeBid — soft-close extension (PT-026)', () => {
    const buildAuction = (endsAt: Date) => ({
      id: 'auction-1',
      status: 'ACTIVE',
      endsAt,
      currentPrice: 100,
      sellerId: 'seller-1',
      title: 'Test Auction',
      bids: [],
    });

    const mockBid = {
      id: 'bid-1',
      amount: 200,
      auctionId: 'auction-1',
      bidderId: 'buyer-1',
      createdAt: new Date(),
    };

    it('should extend auction by config value (120s) — not hardcoded 300s', async () => {
      const auctionEndsAt = new Date(Date.now() + 60 * 1000); // 60s from now — within soft-close
      mockPrismaService.auction.findUnique.mockResolvedValue(buildAuction(auctionEndsAt));
      mockPrismaService.bid.create.mockResolvedValue(mockBid);
      mockPrismaService.auction.update.mockResolvedValue({});
      mockSystemConfigService.getNumber.mockResolvedValue(120);

      await service.placeBid('buyer-1', 'auction-1', { amount: 200 });

      const expectedEndsAt = new Date(auctionEndsAt.getTime() + 120 * 1000);
      expect(mockPrismaService.auction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ endsAt: expectedEndsAt }),
        }),
      );
    });

    it('should read soft-close window from SystemConfigService with correct key and default', async () => {
      const auctionEndsAt = new Date(Date.now() + 60 * 1000);
      mockPrismaService.auction.findUnique.mockResolvedValue(buildAuction(auctionEndsAt));
      mockPrismaService.bid.create.mockResolvedValue(mockBid);
      mockPrismaService.auction.update.mockResolvedValue({});

      await service.placeBid('buyer-1', 'auction-1', { amount: 200 });

      expect(mockSystemConfigService.getNumber).toHaveBeenCalledWith(
        'AUCTION_SOFT_CLOSE_WINDOW_SEC',
        120,
      );
    });

    it('should not extend auction when bid is outside soft-close window', async () => {
      const auctionEndsAt = new Date(Date.now() + 300 * 1000); // 300s from now — outside 120s window
      mockPrismaService.auction.findUnique.mockResolvedValue(buildAuction(auctionEndsAt));
      mockPrismaService.bid.create.mockResolvedValue(mockBid);
      mockPrismaService.auction.update.mockResolvedValue({});
      mockSystemConfigService.getNumber.mockResolvedValue(120);

      await service.placeBid('buyer-1', 'auction-1', { amount: 200 });

      // endsAt should remain the original auction end time
      expect(mockPrismaService.auction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ endsAt: auctionEndsAt }),
        }),
      );
    });
  });
});
