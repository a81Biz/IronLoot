import { Test, TestingModule } from '@nestjs/testing';
import { AuctionsController } from '@/modules/auctions/auctions.controller';
import { AuctionsService } from '@/modules/auctions/auctions.service';
import { AuthenticatedUser } from '@/modules/auth/decorators';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '@/modules/auth/guards';
import { AuctionStatus, UserState } from '@prisma/client';

describe('AuctionsController', () => {
  let controller: AuctionsController;

  const mockUser: AuthenticatedUser = {
    id: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
    state: UserState.ACTIVE,
  };

  const mockAuction = {
    id: 'auc-123',
    title: 'Test Auction',
    status: AuctionStatus.DRAFT,
    sellerId: mockUser.id,
    currentPrice: 100,
    startingPrice: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
    startsAt: new Date(),
    endsAt: new Date(),
    slug: 'test-auction',
    description: 'desc',
    images: [],
    sellerName: 'Test Seller',
  };

  const mockAuctionsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    publish: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuctionsController],
      providers: [
        {
          provide: AuctionsService,
          useValue: mockAuctionsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(OptionalJwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuctionsController>(AuctionsController);
  });

  describe('create', () => {
    it('should create an auction', async () => {
      mockAuctionsService.create.mockResolvedValue(mockAuction);
      const dto = {
        title: 'Test',
        startingPrice: 100,
        description: 'desc',
        startsAt: new Date().toISOString(),
        endsAt: new Date().toISOString(),
        images: [],
      };

      const result = await controller.create(mockUser, dto);

      expect(result).toEqual(mockAuction);
      expect(mockAuctionsService.create).toHaveBeenCalledWith(mockUser.id, dto);
    });
  });

  describe('findAll', () => {
    it('should return list of auctions', async () => {
      mockAuctionsService.findAll.mockResolvedValue([mockAuction]);

      const result = await controller.findAll(undefined, AuctionStatus.ACTIVE);

      expect(result).toHaveLength(1);
      expect(mockAuctionsService.findAll).toHaveBeenCalledWith({
        status: AuctionStatus.ACTIVE,
        sellerId: undefined,
        mine: false,
        currentUserId: undefined,
        page: undefined,
        limit: undefined,
      });
    });
  });

  describe('findOne', () => {
    it('should return auction details', async () => {
      mockAuctionsService.findOne.mockResolvedValue(mockAuction);

      const result = await controller.findOne('auc-123');

      expect(result).toEqual(mockAuction);
      expect(mockAuctionsService.findOne).toHaveBeenCalledWith('auc-123');
    });
  });

  describe('update', () => {
    it('should update auction', async () => {
      mockAuctionsService.update.mockResolvedValue({ ...mockAuction, title: 'Updated' });
      const dto = { title: 'Updated' };

      const result = await controller.update(mockUser, 'auc-123', dto);

      expect(result.title).toBe('Updated');
      expect(mockAuctionsService.update).toHaveBeenCalledWith(mockUser.id, 'auc-123', dto);
    });
  });

  describe('publish', () => {
    it('should publish auction', async () => {
      mockAuctionsService.publish.mockResolvedValue({
        ...mockAuction,
        status: AuctionStatus.PUBLISHED,
      });

      const result = await controller.publish(mockUser, 'auc-123');

      expect(result.status).toBe(AuctionStatus.PUBLISHED);
      expect(mockAuctionsService.publish).toHaveBeenCalledWith(mockUser.id, 'auc-123');
    });
  });
});
