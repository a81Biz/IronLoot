import { Test, TestingModule } from '@nestjs/testing';
import { AuctionStatus, UserState } from '@prisma/client';
import { AuctionsService } from '@/modules/auctions/auctions.service';
import { PrismaService } from '@/database/prisma.service';
import {
  StructuredLogger,
  MetricsService,
  ValidationException,
  ForbiddenException,
  AuctionNotFoundException,
  RequestContextService,
} from '@/common/observability';
import { CreateAuctionDto } from '@/modules/auctions/dto';

describe('AuctionsService', () => {
  let service: AuctionsService;

  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    username: 'seller_user',
    isSeller: true,
    state: UserState.ACTIVE,
  };

  const mockAuction = {
    id: 'auc-123',
    title: 'Test Auction',
    status: AuctionStatus.DRAFT,
    sellerId: mockUser.id,
    slug: 'test-auction',
    currentPrice: 100,
    startingPrice: 100,
    seller: {
      displayName: 'Test Seller',
    },
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    auction: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockLoggerService = {
    child: jest.fn().mockReturnThis(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  const mockRequestContext = {
    getTraceId: jest.fn().mockReturnValue('trace-123'),
    setUser: jest.fn(),
    getUserId: jest.fn(),
  };

  const mockMetrics = {
    increment: jest.fn(),
    startTimer: jest.fn().mockReturnValue(() => {}),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuctionsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: StructuredLogger,
          useValue: mockLoggerService,
        },
        {
          provide: RequestContextService,
          useValue: mockRequestContext,
        },
        {
          provide: MetricsService,
          useValue: mockMetrics,
        },
      ],
    }).compile();

    service = module.get<AuctionsService>(AuctionsService);
  });

  describe('create', () => {
    it('should create an auction if user is a seller', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.auction.create.mockResolvedValue(mockAuction);
      mockPrismaService.auction.count.mockResolvedValue(0); // For slug generation

      const dto: CreateAuctionDto = {
        title: 'Test Auction',
        description: 'Desc',
        startingPrice: 100,
        startsAt: new Date().toISOString(),
        endsAt: new Date().toISOString(),
        images: [],
      };

      const result = await service.create(mockUser.id, dto);

      expect(result).toBeDefined();
      expect(mockPrismaService.auction.create).toHaveBeenCalled();
      expect(result.status).toBe(AuctionStatus.DRAFT);
    });

    it('should throw ForbiddenException if user is not a seller', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ ...mockUser, isSeller: false });

      const dto: CreateAuctionDto = {
        title: 'Test Auction',
        description: 'Desc',
        startingPrice: 100,
        startsAt: new Date().toISOString(),
        endsAt: new Date().toISOString(),
        images: [],
      };

      await expect(service.create(mockUser.id, dto)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findAll', () => {
    it('should return list of auctions', async () => {
      mockPrismaService.auction.findMany.mockResolvedValue([mockAuction]);
      mockPrismaService.auction.count.mockResolvedValue(1);

      const result = await service.findAll({});

      expect(result.data.length).toBe(1);
      expect(result.data[0].id).toBe(mockAuction.id);
      expect(result.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return auction details', async () => {
      mockPrismaService.auction.findUnique.mockResolvedValue(mockAuction);

      const result = await service.findOne(mockAuction.id);

      expect(result.id).toBe(mockAuction.id);
    });

    it('should throw AuctionNotFoundException if auction not found', async () => {
      mockPrismaService.auction.findUnique.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(AuctionNotFoundException);
    });
  });

  describe('update', () => {
    it('should update auction if owner and in DRAFT state', async () => {
      mockPrismaService.auction.findUnique.mockResolvedValue(mockAuction);
      mockPrismaService.auction.update.mockResolvedValue({ ...mockAuction, title: 'Updated' });

      const result = await service.update(mockUser.id, mockAuction.id, { title: 'Updated' });

      expect(result.title).toBe('Updated');
    });

    it('should throw ForbiddenException if not owner', async () => {
      mockPrismaService.auction.findUnique.mockResolvedValue(mockAuction);

      await expect(service.update('other-user', mockAuction.id, {})).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ValidationException if not in DRAFT state', async () => {
      mockPrismaService.auction.findUnique.mockResolvedValue({
        ...mockAuction,
        status: AuctionStatus.ACTIVE,
      });

      await expect(service.update(mockUser.id, mockAuction.id, {})).rejects.toThrow(
        ValidationException,
      );
    });
  });
});
