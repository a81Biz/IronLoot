import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RefundsService } from '@/modules/refunds/refunds.service';
import { PrismaService } from '@/database/prisma.service';
import { WalletService } from '@/modules/wallet/wallet.service';

// PT-042 (AUD-013): the production refunds service previously had zero tests (only the unwired
// core ProcessRefundUseCase was tested). These cover the money guards that actually run.
//
// PT-191 (AUD-010) — Los cinco casos son de RECHAZO y ninguno llega a mover dinero, así que el
// hallazgo no los invalida: sólo hace falta el proveedor nuevo. Se anota porque la pregunta correcta
// ante una prueba que hay que tocar es «¿estaba sosteniendo el defecto?» —lo estuvo en H-032, con un
// `should not throw when mailerService fails`— y aquí la respuesta, medida, es que no. La conservación
// del dinero se prueba en `test/unit/disputes/resolver-mueve-dinero.spec.ts`.
describe('RefundsService', () => {
  let service: RefundsService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prisma: any = { order: { findUnique: jest.fn() }, $transaction: jest.fn() };
  const wallet = { reversarVenta: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const mod = await Test.createTestingModule({
      providers: [
        RefundsService,
        { provide: PrismaService, useValue: prisma },
        { provide: WalletService, useValue: wallet },
      ],
    }).compile();
    service = mod.get(RefundsService);
  });

  const paidOrder = {
    id: 'o1',
    status: 'PAID',
    totalAmount: 100,
    buyerId: 'b1',
    refundRequest: null,
  };

  it('rejects when the order does not exist', async () => {
    prisma.order.findUnique.mockResolvedValue(null);
    await expect(service.createRefund('o1', 50, 'r', 'admin')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects a second refund for the same order (one per order)', async () => {
    prisma.order.findUnique.mockResolvedValue({ ...paidOrder, refundRequest: { id: 'rr1' } });
    await expect(service.createRefund('o1', 50, 'r', 'admin')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects an over-refund (amount > total)', async () => {
    prisma.order.findUnique.mockResolvedValue(paidOrder);
    await expect(service.createRefund('o1', 150, 'r', 'admin')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects a non-positive amount', async () => {
    prisma.order.findUnique.mockResolvedValue(paidOrder);
    await expect(service.createRefund('o1', 0, 'r', 'admin')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects a refund from a non-refundable status (PENDING_PAYMENT)', async () => {
    prisma.order.findUnique.mockResolvedValue({ ...paidOrder, status: 'PENDING_PAYMENT' });
    await expect(service.createRefund('o1', 50, 'r', 'admin')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
