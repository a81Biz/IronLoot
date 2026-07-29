import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { OrderStateMachine, OrderStatus as CoreOrderStatus } from '@ironloot/core';
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
  // PT-173 — Las dos escrituras (envio y pedido) van en una transaccion: un fallo entre ambas dejaba el
  // envio en un estado y el pedido en otro. El doble se cablea abajo, fuera del literal, porque
  // referenciarse a si mismo dentro del inicializador deja el tipo en `any` (TS7022).
  $transaction: jest.fn(),
};

mockPrismaService.$transaction.mockImplementation((cb: (tx: unknown) => unknown) =>
  cb(mockPrismaService),
);

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
    // PT-173 — Este caso pasaba `order: { sellerId }` sin estado, asi que no habia transicion que
    // validar: **la prueba fijaba el defecto**. Ahora el pedido llega en `SHIPPED`, que es el unico
    // estado desde el que `DELIVERED` es legal. Una prueba que afirma lo incorrecto es peor que no
    // tenerla, porque convierte el arreglo en una regresion aparente.
    it('should update status and set deliveredAt', async () => {
      mockPrismaService.shipment.findUnique.mockResolvedValue({
        id: 'shipment-id',
        orderId: 'order-id',
        deliveredAt: null,
        order: { id: 'order-id', sellerId: 'seller-id', status: 'SHIPPED' },
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

  /**
   * PT-173 — `shipments` se saltaba la maquina de estados del pedido.
   *
   * `OrderStateMachine` existe en `@ironloot/core`, dice lo correcto
   * (`PAID -> SHIPPED -> DELIVERED`) y **se usa** en `orders.service.ts:160` y
   * `refunds.service.ts:20`. Lo que hacia `shipments.service` era escribir `order.status` a mano:
   *
   *     await this.prisma.order.update({ where: { id: shipment.orderId }, data: { status: 'DELIVERED' } });
   *
   * **Dos puertas al mismo estado y solo una con cerradura.** Familia de AUD-005, el doble mecanismo de
   * comision que cerro PT-042: dos caminos para lo mismo, uno sin control.
   *
   * Consecuencia medida: un pedido `PAID` pasaba directo a `DELIVERED` sin pasar por `SHIPPED`, y con
   * eso el cron liberaba el holdback del vendedor.
   */
  describe('PT-173 — la transicion del pedido pasa por la maquina de estados', () => {
    const envioPendiente = (estadoPedido: string) => ({
      id: 'shipment-id',
      orderId: 'order-id',
      status: ShipmentStatus.PENDING,
      shippedAt: null,
      deliveredAt: null,
      order: { id: 'order-id', sellerId: 'seller-id', buyerId: 'buyer-id', status: estadoPedido },
    });

    it('C1: un pedido PAID no puede saltar a DELIVERED sin pasar por SHIPPED', async () => {
      // El defecto exacto: `PAID -> DELIVERED` no esta en la maquina, y se aceptaba.
      mockPrismaService.shipment.findUnique.mockResolvedValue(envioPendiente('PAID'));

      await expect(
        service.updateStatus('seller-id', 'shipment-id', { status: ShipmentStatus.DELIVERED }),
      ).rejects.toThrow(BadRequestException);
    });

    it('C2: y con la transicion rechazada NO se toca el envio', async () => {
      // Sin esto quedaria un envio DELIVERED con su pedido en PAID: peor que el fallo original,
      // porque el sistema se contradiria a si mismo.
      mockPrismaService.shipment.findUnique.mockResolvedValue(envioPendiente('PAID'));

      await expect(
        service.updateStatus('seller-id', 'shipment-id', { status: ShipmentStatus.DELIVERED }),
      ).rejects.toThrow();

      expect(mockPrismaService.shipment.update).not.toHaveBeenCalled();
    });

    it('C3: PAID -> SHIPPED si es valida, y mueve el pedido', async () => {
      mockPrismaService.shipment.findUnique.mockResolvedValue(envioPendiente('PAID'));
      mockPrismaService.shipment.update.mockResolvedValue({
        id: 'shipment-id',
        status: ShipmentStatus.SHIPPED,
        shippedAt: new Date(),
      });

      const r = await service.updateStatus('seller-id', 'shipment-id', {
        status: ShipmentStatus.SHIPPED,
      });

      expect(r.status).toBe(ShipmentStatus.SHIPPED);
      expect(mockPrismaService.order.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'SHIPPED' }) }),
      );
    });

    describe('casos de control', () => {
      it('AC-01: la maquina de core es la que decide, y dice lo que creemos', () => {
        // Si esto cambiara, C1 dejaria de significar lo que cree significar.
        expect(
          OrderStateMachine.canTransition(CoreOrderStatus.PAID, CoreOrderStatus.DELIVERED),
        ).toBe(false);
        expect(OrderStateMachine.canTransition(CoreOrderStatus.PAID, CoreOrderStatus.SHIPPED)).toBe(
          true,
        );
        expect(
          OrderStateMachine.canTransition(CoreOrderStatus.SHIPPED, CoreOrderStatus.DELIVERED),
        ).toBe(true);
      });

      it('AC-02: un envio que no existe sigue dando 404 antes de mirar transiciones', async () => {
        mockPrismaService.shipment.findUnique.mockResolvedValue(null);

        await expect(
          service.updateStatus('seller-id', 'nope', { status: ShipmentStatus.SHIPPED }),
        ).rejects.toThrow(NotFoundException);
      });
    });
  });
});
