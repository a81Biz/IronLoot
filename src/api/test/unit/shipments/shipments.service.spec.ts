import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { OrderStateMachine, OrderStatus as CoreOrderStatus } from '@ironloot/core';
import { ShipmentsService } from '../../../src/modules/shipments/shipments.service';
import { PrismaService } from '../../../src/database/prisma.service';
import { OrdersService } from '../../../src/modules/orders/orders.service';
import { NotificationsService } from '../../../src/modules/notifications/notifications.service';
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

// PT-174 — El aviso al comprador cuando el vendedor declara el envio.
const mockNotificationsService = { create: jest.fn().mockResolvedValue(undefined) };

const mockLogger = {
  child: jest.fn().mockReturnThis(),
  info: jest.fn(),
  warn: jest.fn(),
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
        { provide: NotificationsService, useValue: mockNotificationsService },
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
    // Corregido dos veces, y las dos por un motivo distinto:
    //
    //   - **PT-173**: pasaba `order: { sellerId }` **sin estado**, asi que no habia transicion que
    //     validar. La prueba fijaba el defecto.
    //   - **PT-174**: pasaba el **vendedor** como actor de `DELIVERED`, que es exactamente la vulneracion
    //     que PT-174 cierra. Ahora lo confirma el **comprador**.
    //
    // Una prueba que afirma lo incorrecto es peor que no tenerla: convierte el arreglo en una regresion
    // aparente y presiona para revertirlo.
    it('should update status and set deliveredAt', async () => {
      mockPrismaService.shipment.findUnique.mockResolvedValue({
        id: 'shipment-id',
        orderId: 'order-id',
        deliveredAt: null,
        order: { id: 'order-id', sellerId: 'seller-id', buyerId: 'buyer-id', status: 'SHIPPED' },
      });
      mockPrismaService.shipment.update.mockResolvedValue({
        id: 'shipment-id',
        status: ShipmentStatus.DELIVERED,
        deliveredAt: new Date(),
      });

      const result = await service.updateStatus('buyer-id', 'shipment-id', {
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
      //
      // El actor es el **comprador** desde PT-174: con el vendedor no se llegaria a comprobar la
      // transicion, porque el 403 salta antes. Se deja dicho para que nadie lo "arregle" al reves.
      mockPrismaService.shipment.findUnique.mockResolvedValue(envioPendiente('PAID'));

      await expect(
        service.updateStatus('buyer-id', 'shipment-id', { status: ShipmentStatus.DELIVERED }),
      ).rejects.toThrow(BadRequestException);
    });

    it('C2: y con la transicion rechazada NO se toca el envio', async () => {
      // Sin esto quedaria un envio DELIVERED con su pedido en PAID: peor que el fallo original,
      // porque el sistema se contradiria a si mismo.
      mockPrismaService.shipment.findUnique.mockResolvedValue(envioPendiente('PAID'));

      await expect(
        service.updateStatus('buyer-id', 'shipment-id', { status: ShipmentStatus.DELIVERED }),
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

  /**
   * PT-174 — La recepcion la confirma quien recibe.
   *
   * Hasta aqui **todo** cambio de estado era del vendedor (`shipments.service.ts:114`), incluido
   * `DELIVERED`. Encadenado con `releaseMaturedSettlements`, que liberaba en cuanto el pedido estaba
   * `DELIVERED`, eso significaba que **el vendedor liberaba su propio holdback**: marcaba entregado su
   * propio envio y cobraba, sin que nadie confirmara nada.
   *
   * **El holdback existe para proteger al comprador durante la ventana de disputa, y lo podia desactivar
   * la unica parte de la que protege.**
   *
   * La llave se parte por transicion, no por rol global:
   *
   *   - `PENDING -> SHIPPED`   -> el **vendedor**, que es quien envia.
   *   - `SHIPPED -> DELIVERED` -> el **comprador**, que es quien recibe.
   */
  describe('PT-174 — la llave se parte por transicion', () => {
    const envio = (estadoPedido: string) => ({
      id: 'shipment-id',
      orderId: 'order-id',
      status: estadoPedido === 'SHIPPED' ? ShipmentStatus.SHIPPED : ShipmentStatus.PENDING,
      shippedAt: estadoPedido === 'SHIPPED' ? new Date() : null,
      deliveredAt: null,
      order: { id: 'order-id', sellerId: 'seller-id', buyerId: 'buyer-id', status: estadoPedido },
    });

    beforeEach(() => {
      mockPrismaService.shipment.update.mockResolvedValue({
        id: 'shipment-id',
        status: ShipmentStatus.DELIVERED,
        deliveredAt: new Date(),
      });
    });

    it('C1: el VENDEDOR no puede marcar DELIVERED — es el defecto que cierra este PT', async () => {
      mockPrismaService.shipment.findUnique.mockResolvedValue(envio('SHIPPED'));

      await expect(
        service.updateStatus('seller-id', 'shipment-id', { status: ShipmentStatus.DELIVERED }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('C2: el COMPRADOR si puede marcar DELIVERED', async () => {
      mockPrismaService.shipment.findUnique.mockResolvedValue(envio('SHIPPED'));

      const r = await service.updateStatus('buyer-id', 'shipment-id', {
        status: ShipmentStatus.DELIVERED,
      });

      expect(r.status).toBe(ShipmentStatus.DELIVERED);
    });

    it('C3: el COMPRADOR no puede marcar SHIPPED — no es quien envia', async () => {
      mockPrismaService.shipment.findUnique.mockResolvedValue(envio('PAID'));

      await expect(
        service.updateStatus('buyer-id', 'shipment-id', { status: ShipmentStatus.SHIPPED }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('C4: el VENDEDOR si puede marcar SHIPPED', async () => {
      mockPrismaService.shipment.findUnique.mockResolvedValue(envio('PAID'));
      mockPrismaService.shipment.update.mockResolvedValue({
        id: 'shipment-id',
        status: ShipmentStatus.SHIPPED,
        shippedAt: new Date(),
      });

      const r = await service.updateStatus('seller-id', 'shipment-id', {
        status: ShipmentStatus.SHIPPED,
      });

      expect(r.status).toBe(ShipmentStatus.SHIPPED);
    });

    it('C5: un tercero no puede ninguna de las dos', async () => {
      mockPrismaService.shipment.findUnique.mockResolvedValue(envio('SHIPPED'));
      await expect(
        service.updateStatus('otro', 'shipment-id', { status: ShipmentStatus.DELIVERED }),
      ).rejects.toThrow(ForbiddenException);

      mockPrismaService.shipment.findUnique.mockResolvedValue(envio('PAID'));
      await expect(
        service.updateStatus('otro', 'shipment-id', { status: ShipmentStatus.SHIPPED }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('C6: la confirmacion del comprador sella `deliveredAt`', async () => {
      // Es la fecha de la que cuelga la espera de 72 h. Si no se sella, la liberacion no tiene reloj
      // — y es el defecto que H-011 encontro al medir la ventana de disputa desde `updatedAt`.
      mockPrismaService.shipment.findUnique.mockResolvedValue(envio('SHIPPED'));

      await service.updateStatus('buyer-id', 'shipment-id', {
        status: ShipmentStatus.DELIVERED,
      });

      expect(mockPrismaService.shipment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ deliveredAt: expect.any(Date) }),
        }),
      );
    });

    describe('casos de control', () => {
      it('AC-01: el mensaje del 403 dice QUIEN debe hacerlo, no solo que no puedes', async () => {
        // Un 403 que no dice quien deja al vendedor pensando que es un fallo del sistema.
        mockPrismaService.shipment.findUnique.mockResolvedValue(envio('SHIPPED'));

        await expect(
          service.updateStatus('seller-id', 'shipment-id', { status: ShipmentStatus.DELIVERED }),
        ).rejects.toThrow(/buyer/i);
      });

      it('AC-03: al declarar el envio se avisa al COMPRADOR, con el tipo del evento', async () => {
        // Leccion de H-012: el aviso al vendedor reutilizaba el tipo del comprador, y los dos
        // significaban cosas distintas. Aqui se comprueba destinatario Y tipo.
        mockPrismaService.shipment.findUnique.mockResolvedValue(envio('PAID'));
        mockPrismaService.shipment.update.mockResolvedValue({
          id: 'shipment-id',
          status: ShipmentStatus.SHIPPED,
        });

        await service.updateStatus('seller-id', 'shipment-id', {
          status: ShipmentStatus.SHIPPED,
        });

        expect(mockNotificationsService.create).toHaveBeenCalledWith(
          'buyer-id',
          'ORDER_SHIPPED',
          expect.any(String),
          expect.any(String),
          expect.objectContaining({ orderId: 'order-id' }),
        );
      });

      it('AC-04: si el aviso falla, el envio se declara igual — y NO en silencio', async () => {
        // Un apunte de notificacion no puede costarle al vendedor la declaracion de su envio. Pero el
        // fallo se registra: un `catch` mudo es lo que vigila el checkpoint D3.
        mockPrismaService.shipment.findUnique.mockResolvedValue(envio('PAID'));
        mockPrismaService.shipment.update.mockResolvedValue({
          id: 'shipment-id',
          status: ShipmentStatus.SHIPPED,
        });
        mockNotificationsService.create.mockRejectedValueOnce(new Error('sin correo'));

        const r = await service.updateStatus('seller-id', 'shipment-id', {
          status: ShipmentStatus.SHIPPED,
        });

        expect(r.status).toBe(ShipmentStatus.SHIPPED);
        expect(mockLogger.error).toHaveBeenCalled();
      });

      it('AC-02: la autorizacion se mira ANTES de la transicion', async () => {
        // Si se mirara despues, un vendedor con una transicion invalida recibiria 400 en vez de 403 y
        // aprenderia que el problema es el estado, no el permiso.
        mockPrismaService.shipment.findUnique.mockResolvedValue(envio('PAID'));

        await expect(
          service.updateStatus('seller-id', 'shipment-id', { status: ShipmentStatus.DELIVERED }),
        ).rejects.toThrow(ForbiddenException);
      });
    });
  });
});
