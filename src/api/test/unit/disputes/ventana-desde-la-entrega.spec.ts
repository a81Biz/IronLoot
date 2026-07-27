import { BadRequestException } from '@nestjs/common';
import { DisputesService } from '../../../src/modules/disputes/disputes.service';

/**
 * PT-115 (PTSA H-011) — La ventana de 14 dias se cuenta desde la ENTREGA.
 *
 * `CR-007` lo declara en F-1 y el comentario del codigo lo repetia. El codigo hacia otra cosa:
 *
 *     order.status === 'DELIVERED' && (order as any).deliveredAt   // siempre undefined
 *       ? (order as any).deliveredAt
 *       : order.updatedAt;                                          // siempre esta rama
 *
 * `orders` **no tiene** `delivered_at` —ni en la BD ni en Prisma— asi que los dos `as any` hacian
 * que el acceso compilara y devolviera `undefined`. La rama que el comentario describia estaba
 * muerta, y la ventana respondia a `updatedAt`: **cualquier** modificacion del pedido (un cambio
 * de estado, la liquidacion al vendedor, un ajuste administrativo) la reiniciaba.
 *
 * El dato existia todo el tiempo, en otro sitio: `shipments.delivered_at`, poblado por
 * `shipments.service.ts:105` al marcar la entrega. El repositorio ya lo sabia —`ratings.service`
 * lee la entrega del envio— pero `disputes.service` la buscaba en el pedido.
 */
describe('La ventana de disputa se cuenta desde la entrega (PT-115)', () => {
  const COMPRADOR = 'buyer-1';
  const HOY = new Date();
  const haceDias = (n: number): Date => new Date(HOY.getTime() - n * 24 * 60 * 60 * 1000);

  let prisma: {
    order: { findUnique: jest.Mock };
    dispute: { create: jest.Mock };
  };
  let servicio: DisputesService;

  const pedido = (extra: Record<string, unknown>) => ({
    id: 'order-1',
    buyerId: COMPRADOR,
    sellerId: 'seller-1',
    status: 'DELIVERED',
    dispute: null,
    ...extra,
  });

  beforeEach(() => {
    prisma = {
      order: { findUnique: jest.fn() },
      dispute: { create: jest.fn().mockResolvedValue({ id: 'd-1' }) },
    };
    // El servicio pide un StructuredLogger y llama a `.child()` en el constructor.
    const logger = {
      child: () => ({
        info: jest.fn(),
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
      }),
    };
    servicio = new DisputesService(prisma as never, logger as never);
  });

  const abrir = () =>
    servicio.create(COMPRADOR, {
      orderId: 'order-1',
      reason: 'ITEM_NOT_AS_DESCRIBED',
      description: 'x',
    } as never);

  it('VD-01: entregado hace 2 dias -> ACEPTA, aunque el pedido lleve meses sin tocarse', async () => {
    prisma.order.findUnique.mockResolvedValue(
      pedido({ updatedAt: haceDias(200), shipment: { deliveredAt: haceDias(2) } }),
    );

    await abrir();

    expect(prisma.dispute.create).toHaveBeenCalled();
  });

  it('VD-02: entregado hace 20 dias -> RECHAZA, aunque el pedido se haya tocado hoy', async () => {
    // Este es el caso que el defecto dejaba pasar: `updatedAt` reciente reabria una ventana
    // que llevaba seis dias vencida.
    prisma.order.findUnique.mockResolvedValue(
      pedido({ updatedAt: HOY, shipment: { deliveredAt: haceDias(20) } }),
    );

    await expect(abrir()).rejects.toThrow(BadRequestException);
    expect(prisma.dispute.create).not.toHaveBeenCalled();
  });

  it('VD-03: sin envio registrado, se respalda en updatedAt', async () => {
    // `shipment` es una relacion OPCIONAL: un pedido puede estar DELIVERED sin envio.
    // El respaldo se conserva, pero ahora es una rama declarada y no la unica que corre.
    prisma.order.findUnique.mockResolvedValue(pedido({ updatedAt: haceDias(2), shipment: null }));

    await abrir();

    expect(prisma.dispute.create).toHaveBeenCalled();
  });

  it('VD-04: sin envio y con updatedAt viejo -> RECHAZA', async () => {
    prisma.order.findUnique.mockResolvedValue(pedido({ updatedAt: haceDias(30), shipment: null }));

    await expect(abrir()).rejects.toThrow(BadRequestException);
  });

  it('VD-05: la consulta del pedido INCLUYE el envio', async () => {
    // Sin esto, `order.shipment` seria siempre undefined y volveriamos al defecto original —
    // esta vez sin `as any` que lo delate.
    prisma.order.findUnique.mockResolvedValue(
      pedido({ updatedAt: haceDias(1), shipment: { deliveredAt: haceDias(1) } }),
    );

    await abrir();

    const include = prisma.order.findUnique.mock.calls[0][0].include;
    expect(include).toHaveProperty('shipment');
  });
});
