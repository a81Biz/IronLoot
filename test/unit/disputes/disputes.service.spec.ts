import { Test, TestingModule } from '@nestjs/testing';
import { DisputesService } from '../../../src/modules/disputes/disputes.service';
import { PrismaService } from '../../../src/database/prisma.service';
import { StructuredLogger } from '../../../src/common/observability';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CreateDisputeDto } from '../../../src/modules/disputes/dto';

describe('DisputesService', () => {
  let service: DisputesService;
  let prisma: any; // Mocked Prisma

  const mockLogger = {
    child: jest.fn().mockReturnThis(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };

  const mockPrisma = {
    order: {
      findUnique: jest.fn(),
    },
    dispute: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DisputesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StructuredLogger, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<DisputesService>(DisputesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const userId = 'user-1';
    const dto: CreateDisputeDto = {
      orderId: 'order-1',
      reason: 'Not received',
      description: 'Where is it?',
    };

    it('should create a dispute successfully', async () => {
      // Mock order exists, user is buyer, no existing dispute
      prisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        buyerId: userId,
        sellerId: 'user-2',
        dispute: null,
      });

      prisma.dispute.create.mockResolvedValue({
        id: 'dispute-1',
        ...dto,
        creatorId: userId,
      });

      const result = await service.create(userId, dto);

      expect(result.id).toBe('dispute-1');
      expect(prisma.dispute.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if order does not exist', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await expect(service.create(userId, dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not participant', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        buyerId: 'other',
        sellerId: 'other-2',
        dispute: null,
      });

      await expect(service.create(userId, dto)).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if dispute already exists', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        buyerId: userId,
        sellerId: 'user-2',
        dispute: { id: 'existing' },
      });

      await expect(service.create(userId, dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAllByUser', () => {
    it('should return many disputes', async () => {
      prisma.dispute.findMany.mockResolvedValue([{ id: '1' }]);
      const result = await service.findAllByUser('user-1');
      expect(result).toHaveLength(1);
      expect(prisma.dispute.findMany).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return dispute if user is creator', async () => {
      prisma.dispute.findUnique.mockResolvedValue({
        id: 'd1',
        creatorId: 'u1',
        order: { buyerId: 'u2', sellerId: 'u3' },
      });

      const res = await service.findOne('u1', 'd1');
      expect(res.id).toBe('d1');
    });

    it('should throw Forbidden if user is unrelated', async () => {
      prisma.dispute.findUnique.mockResolvedValue({
        id: 'd1',
        creatorId: 'u2',
        order: { buyerId: 'u3', sellerId: 'u4' },
      });

      await expect(service.findOne('u1', 'd1')).rejects.toThrow(ForbiddenException);
    });
  });
});
