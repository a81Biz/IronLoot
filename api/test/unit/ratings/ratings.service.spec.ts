import { Test, TestingModule } from '@nestjs/testing';
import { RatingsService } from '../../../api/src/modules/ratings/ratings.service';
import { PrismaService } from '../../../api/src/database/prisma.service';
import { StructuredLogger } from '../../../api/src/common/observability';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';

const mockPrismaService = {
  order: {
    findUnique: jest.fn(),
  },
  rating: {
    findFirst: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
  },
};

const mockLogger = {
  child: jest.fn().mockReturnThis(),
  info: jest.fn(),
  error: jest.fn(),
};

describe('RatingsService', () => {
  let service: RatingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RatingsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: StructuredLogger, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<RatingsService>(RatingsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a rating successfully', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        id: 'order-id',
        buyerId: 'buyer-id',
        sellerId: 'seller-id',
        shipment: { status: 'DELIVERED' },
      });
      mockPrismaService.rating.findFirst.mockResolvedValue(null);
      mockPrismaService.rating.create.mockResolvedValue({ id: 'rating-id' });

      const result = await service.create('buyer-id', {
        orderId: 'order-id',
        score: 5,
        comment: 'Great!',
      });

      expect(result).toBeDefined();
      expect(mockPrismaService.rating.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            authorId: 'buyer-id',
            targetId: 'seller-id',
            score: 5,
          }),
        }),
      );
    });

    it('should throw NotFoundException if order not found', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(service.create('user-id', { orderId: 'order-id', score: 5 })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user not participant', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        id: 'order-id',
        buyerId: 'buyer-id',
        sellerId: 'seller-id',
        shipment: { status: 'DELIVERED' },
      });

      await expect(service.create('other-user', { orderId: 'order-id', score: 5 })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException if shipment not delivered', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        id: 'order-id',
        buyerId: 'buyer-id',
        shipment: { status: 'SHIPPED' },
      });

      await expect(service.create('buyer-id', { orderId: 'order-id', score: 5 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if already rated', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        id: 'order-id',
        buyerId: 'buyer-id',
        shipment: { status: 'DELIVERED' },
      });
      mockPrismaService.rating.findFirst.mockResolvedValue({ id: 'existing-rating' });

      await expect(service.create('buyer-id', { orderId: 'order-id', score: 5 })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAllByTarget', () => {
    it('should return ratings', async () => {
      const ratings = [{ id: '1', score: 5 }];
      mockPrismaService.rating.findMany.mockResolvedValue(ratings);

      const result = await service.findAllByTarget('user-id');
      expect(result).toEqual(ratings);
    });
  });
});
