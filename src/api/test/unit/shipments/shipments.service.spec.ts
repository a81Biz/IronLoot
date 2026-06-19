import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { ShipmentsService } from '../../../src/modules/shipments/shipments.service';
import { PrismaService } from '../../../src/database/prisma.service';
import { OrdersService } from '../../../src/modules/orders/orders.service';
import { StructuredLogger } from '../../../src/common/observability';
import { ShipmentStatus, ShipmentProvider } from '@prisma/client';

const mockPrismaService = {
  order: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  shipment: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

const mockOrdersService = {};

const mockLogger = {
  child: jest.fn().mockReturnThis(),
  info: jest.fn(),
  error: jest.fn(),
};

describe('ShipmentsService', () => {
  let service: ShipmentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShipmentsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OrdersService, useValue: mockOrdersService },
        { provide: StructuredLogger, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<ShipmentsService>(ShipmentsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a shipment for a valid paid order by the seller', async () => {
      const userId = 'seller-id';
      const dto = {
        orderId: 'order-id',
        provider: ShipmentProvider.DHL,
        trackingNumber: '123456',
      };

      mockPrismaService.order.findUnique.mockResolvedValue({
        id: 'order-id',
        sellerId: 'seller-id',
        status: 'PAID',
      });
      mockPrismaService.shipment.findUnique.mockResolvedValue(null);
      mockPrismaService.shipment.create.mockResolvedValue({
        id: 'shipment-id',
        ...dto,
        status: ShipmentStatus.PENDING,
      });

      const result = await service.create(userId, dto);

      expect(result).toBeDefined();
      expect(result.id).toBe('shipment-id');
      expect(mockPrismaService.shipment.create).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user is not the seller', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        id: 'order-id',
        sellerId: 'other-seller',
      });

      await expect(
        service.create('user-id', {
          orderId: 'order-id',
          provider: ShipmentProvider.DHL,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if order is not PAID', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        id: 'order-id',
        sellerId: 'seller-id',
        status: 'PENDING_PAYMENT',
      });

      await expect(
        service.create('seller-id', {
          orderId: 'order-id',
          provider: ShipmentProvider.DHL,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should return shipment for buyer', async () => {
      mockPrismaService.shipment.findUnique.mockResolvedValue({
        id: 'shipment-id',
        order: { buyerId: 'buyer-id', sellerId: 'seller-id' },
      });

      const result = await service.findOne('buyer-id', 'shipment-id');
      expect(result).toBeDefined();
    });

    it('should throw ForbiddenException for unrelated user', async () => {
      mockPrismaService.shipment.findUnique.mockResolvedValue({
        id: 'shipment-id',
        order: { buyerId: 'buyer-id', sellerId: 'seller-id' },
      });

      await expect(service.findOne('other-user', 'shipment-id')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('updateStatus', () => {
    it('should update status and set deliveredAt', async () => {
      mockPrismaService.shipment.findUnique.mockResolvedValue({
        id: 'shipment-id',
        deliveredAt: null,
        order: { sellerId: 'seller-id' },
      });
      mockPrismaService.shipment.update.mockResolvedValue({
        id: 'shipment-id',
        status: ShipmentStatus.DELIVERED,
        deliveredAt: new Date(),
      });

      const result = await service.updateStatus('seller-id', 'shipment-id', {
        status: ShipmentStatus.DELIVERED,
      });

      expect(result.status).toBe(ShipmentStatus.DELIVERED);
      expect(mockPrismaService.shipment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ deliveredAt: expect.any(Date) }),
        }),
      );
    });
  });
});
