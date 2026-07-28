import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from '../../../src/modules/payments/payments.controller';
import { PaymentCycleService } from '../../../src/modules/payments/payment-cycle.service';
import { PaymentsService } from '../../../src/modules/payments/payments.service';
import { AuthenticatedUser, Role } from '../../../src/modules/auth/decorators';
import { InitiatePaymentDto } from '../../../src/modules/payments/dto/initiate-payment.dto';
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
    role: Role.USER,
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
        {
          // PT-088: el controlador consulta el estado del deposito para la pagina de retorno.
          provide: PaymentCycleService,
          useValue: { statusFor: jest.fn() },
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

  // PT-133 — `createCheckout` retirado con su endpoint: ningun cliente lo invocaba.

  describe('initiate', () => {
    it('should call initiatePayment', async () => {
      const dto: InitiatePaymentDto = { amount: 50, provider: 'MERCADO_PAGO' as any };
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
