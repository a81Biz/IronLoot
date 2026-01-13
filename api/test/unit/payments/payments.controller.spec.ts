import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from '../../../src/modules/payments/payments.controller';
import { PaymentsService } from '../../../src/modules/payments/payments.service';
import { AuthenticatedUser } from '../../../src/modules/auth/decorators';
import { InitiatePaymentDto } from '../../../src/modules/payments/dto/initiate-payment.dto';
import { CreateCheckoutDto } from '../../../src/modules/payments/dto/create-checkout.dto';
import { JwtAuthGuard } from '../../../src/modules/auth/guards/jwt-auth.guard';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let service: PaymentsService;

  const mockPaymentsService = {
    createCheckoutSession: jest.fn(),
    initiatePayment: jest.fn(),
    handleWebhook: jest.fn(),
  };

  const mockUser: AuthenticatedUser = {
    id: 'user-123',
    email: 'test@example.com',
    username: 'test',
    state: 'ACTIVE',
    isSeller: false,
    emailVerified: true,
  };

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
    service = module.get<PaymentsService>(PaymentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createCheckout', () => {
    it('should call createCheckoutSession', async () => {
      // @ts-expect-error Incomplete DTO for test purposes
      const dto: CreateCheckoutDto = { orderId: 'order-1', amount: 100, provider: 'STRIPE' };
      const expectedResult = { externalId: 'ex-1', redirectUrl: 'http://url' };

      mockPaymentsService.createCheckoutSession.mockResolvedValue(expectedResult);

      const result = await controller.createCheckout(mockUser, dto);

      expect(service.createCheckoutSession).toHaveBeenCalledWith(mockUser.id, mockUser.email, dto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('initiate', () => {
    it('should call initiatePayment', async () => {
      const dto: InitiatePaymentDto = { amount: 50, provider: 'MERCADO_PAGO' };
      const expectedResult = { externalId: 'mp-1', redirectUrl: 'http://mp' };

      mockPaymentsService.initiatePayment.mockResolvedValue(expectedResult);

      const result = await controller.initiate(mockUser, dto);

      expect(service.initiatePayment).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.email,
        dto.amount,
        dto.provider,
      );
      expect(result).toEqual(expectedResult);
    });
  });
});
