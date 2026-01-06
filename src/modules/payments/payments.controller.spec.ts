import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../../modules/auth/guards';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  // let service: PaymentsService;

  const mockPaymentsService = {
    createCheckoutSession: jest.fn(),
    handleWebhook: jest.fn(),
  };

  const mockUser = { id: 'user-id' } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: mockPaymentsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PaymentsController>(PaymentsController);
    // service = module.get<PaymentsService>(PaymentsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createCheckout', () => {
    it('should create checkout session', async () => {
      const dto = { orderId: 'order-1', provider: 'MERCADO_PAGO' } as any;
      const result = { redirectUrl: 'http://paypal.com/checkout' };

      mockPaymentsService.createCheckoutSession.mockResolvedValue(result);

      expect(await controller.createCheckout(mockUser, dto)).toBe(result);
      expect(mockPaymentsService.createCheckoutSession).toHaveBeenCalledWith(mockUser.id, dto);
    });
  });

  describe('webhook', () => {
    it('should handle webhook', async () => {
      const payload = { test: 'data' };
      const result = { received: true };

      mockPaymentsService.handleWebhook.mockResolvedValue(result);

      expect(await controller.webhook('paypal', payload)).toBe(result);
      expect(mockPaymentsService.handleWebhook).toHaveBeenCalledWith('paypal', payload);
    });
  });
});
