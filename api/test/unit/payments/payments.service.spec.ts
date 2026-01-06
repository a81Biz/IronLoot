import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PaymentsService } from '../../../api/src/modules/payments/payments.service';
// import { PaymentsController } from '../../../src/modules/payments/payments.controller';
import { MercadoPagoProvider } from '../../../api/src/modules/payments/providers/mercadopago.provider';
import { PaypalProvider } from '../../../api/src/modules/payments/providers/paypal.provider';
import { PrismaService } from '../../../api/src/database/prisma.service';
import { OrdersService } from '../../../api/src/modules/orders/orders.service';
import { StructuredLogger } from '../../../api/src/common/observability';
import { PaymentProviderEnum } from '../../../api/src/modules/payments/interfaces';

// Mock Dependencies
const mockPrismaService = {
  payment: {
    create: jest.fn().mockResolvedValue({ id: 'payment-uuid' }),
  },
};

const mockOrdersService = {
  findOne: jest.fn(),
};

const mockLogger = {
  child: jest.fn().mockReturnThis(),
  info: jest.fn(),
  error: jest.fn(),
};

describe('PaymentsService', () => {
  let service: PaymentsService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let ordersService: OrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        MercadoPagoProvider,
        PaypalProvider,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OrdersService, useValue: mockOrdersService },
        { provide: StructuredLogger, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    ordersService = module.get<OrdersService>(OrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCheckoutSession', () => {
    it('should create a payment session for Mercado Pago', async () => {
      const userId = 'user-uuid';
      const dto = { orderId: 'order-uuid', provider: PaymentProviderEnum.MERCADO_PAGO };

      mockOrdersService.findOne.mockResolvedValue({
        id: 'order-uuid',
        totalAmount: 100,
        status: 'PENDING',
      });

      const result = await service.createCheckoutSession(userId, dto);

      expect(result).toBeDefined();
      expect(result.redirectUrl).toContain('mercadopago');
      expect(result.isIntegrated).toBeDefined(); // Should be false in default test env
      expect(mockPrismaService.payment.create).toHaveBeenCalled();
    });

    it('should throw error if order is already paid', async () => {
      mockOrdersService.findOne.mockResolvedValue({
        id: 'order-uuid',
        totalAmount: 100,
        status: 'PAID',
      });

      await expect(
        service.createCheckoutSession('user-uuid', {
          orderId: 'order-uuid',
          provider: PaymentProviderEnum.PAYPAL,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
