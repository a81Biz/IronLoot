import { Test } from '@nestjs/testing';
import { CommissionsService } from '@/modules/commissions/commissions.service';
import { PrismaService } from '@/database/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

// PT-042 (AUD-013): the commissions service previously had zero tests despite being a money path.
describe('CommissionsService', () => {
  let service: CommissionsService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prisma: any = {
    commissionConfig: { findFirst: jest.fn() },
    commissionRecord: { findUnique: jest.fn(), create: jest.fn() },
    order: { findUnique: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const mod = await Test.createTestingModule({
      providers: [CommissionsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = mod.get(CommissionsService);
  });

  describe('resolveRatePercent', () => {
    it('uses the seller override when present', async () => {
      prisma.commissionConfig.findFirst.mockResolvedValueOnce({ ratePercent: new Decimal(7.5) });
      expect(await service.resolveRatePercent('seller-1')).toBe(7.5);
    });

    it('falls back to the global rate when no seller override', async () => {
      prisma.commissionConfig.findFirst
        .mockResolvedValueOnce(null) // seller
        .mockResolvedValueOnce({ ratePercent: new Decimal(12) }); // global
      expect(await service.resolveRatePercent('seller-1')).toBe(12);
    });

    it('defaults to 10 when no config exists', async () => {
      prisma.commissionConfig.findFirst.mockResolvedValue(null);
      expect(await service.resolveRatePercent('seller-1')).toBe(10);
    });
  });

  describe('calculateForOrder', () => {
    it('is idempotent — does not recreate an existing record', async () => {
      prisma.commissionRecord.findUnique.mockResolvedValue({ id: 'c1' });
      await service.calculateForOrder('order-1');
      expect(prisma.commissionRecord.create).not.toHaveBeenCalled();
    });

    it('creates a record with amount = total * rate/100 (default 10%)', async () => {
      prisma.commissionRecord.findUnique.mockResolvedValue(null);
      prisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        sellerId: 'seller-1',
        totalAmount: new Decimal(200),
        auction: { id: 'a1' },
      });
      prisma.commissionConfig.findFirst.mockResolvedValue(null); // → default 10
      await service.calculateForOrder('order-1');
      expect(prisma.commissionRecord.create).toHaveBeenCalledTimes(1);
      const arg = prisma.commissionRecord.create.mock.calls[0][0];
      expect(arg.data.orderId).toBe('order-1');
      expect(Number(arg.data.amount)).toBe(20);
      expect(arg.data.status).toBe('PENDING');
    });
  });
});
