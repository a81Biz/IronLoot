import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { WalletController } from '../../../src/modules/wallet/wallet.controller';
import { WalletService } from '../../../src/modules/wallet/wallet.service';
import { PaymentsService } from '../../../src/modules/payments/payments.service';
import { AccountVerificationService } from '../../../src/modules/wallet/account-verification.service';
import { WithdrawalsService } from '../../../src/modules/wallet/withdrawals.service';
import { PrismaService } from '../../../src/database/prisma.service';
import { WithdrawDto } from '../../../src/modules/wallet/dto/wallet.dto';
import { JwtAuthGuard } from '../../../src/modules/auth/guards/jwt-auth.guard';

describe('WalletController', () => {
  let controller: WalletController;
  let service: WalletService;
  let module: TestingModule;

  const mockWalletService = {
    getBalance: jest.fn(),
    getWallet: jest.fn(),
    deposit: jest.fn(),
    withdraw: jest.fn(),
    getHistory: jest.fn(),
    getDailyWithdrawals: jest.fn().mockResolvedValue(0),
  };

  const mockPrismaService = {
    ledger: {
      findMany: jest.fn(),
    },
  };

  const mockWithdrawalsService = {
    request: jest.fn(),
    listMine: jest.fn(),
  };

  const mockRequest = { user: { id: 'user-123' } } as any;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [WalletController],
      providers: [
        { provide: WalletService, useValue: mockWalletService },
        {
          provide: PaymentsService,
          useValue: {
            createCheckoutSession: jest.fn(),
            verifyPayment: jest.fn().mockResolvedValue({ status: 'COMPLETED', amount: 100 }),
            getUserPaymentMethod: jest.fn().mockResolvedValue(null),
          },
        },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: WithdrawalsService, useValue: mockWithdrawalsService },
        {
          // PT-092: el controlador expone la verificacion de cuenta de cobro.
          provide: AccountVerificationService,
          useValue: { start: jest.fn(), confirm: jest.fn() },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<WalletController>(WalletController);
    service = module.get<WalletService>(WalletService);
  });

  describe('getBalance', () => {
    it('should return balance', async () => {
      mockWalletService.getBalance.mockResolvedValue({
        available: 100,
        held: 0,
        pending: 0,
        currency: 'USD',
        isActive: true,
      });
      const result = await controller.getBalance(mockRequest);
      expect(result).toEqual({
        available: 100,
        held: 0,
        pending: 0,
        currency: 'USD',
        isActive: true,
      });
      expect(service.getBalance).toHaveBeenCalledWith('user-123');
    });
  });

  // PT-133 — `deposit` retirado con su endpoint. `WalletService.deposit()` SI se conserva:
  // es lo que usa `creditWallet` en la via real del ciclo de pago.

  describe('withdraw (PT-072 — delega en solicitud con aprobación)', () => {
    it('propaga el 400 de la solicitud cuando el método es inválido', async () => {
      mockWithdrawalsService.request.mockRejectedValueOnce(
        new BadRequestException('Método de pago inválido'),
      );
      const dto: WithdrawDto = { amount: 100, referenceId: 'ref_invalid' };
      await expect(controller.withdraw(mockRequest, dto)).rejects.toThrow(BadRequestException);
    });

    it('crea una solicitud (REQUESTED) mapeando referenceId → paymentMethodId', async () => {
      mockWithdrawalsService.request.mockResolvedValueOnce({ id: 'w1', status: 'REQUESTED' });
      const dto: WithdrawDto = { amount: 100, referenceId: 'ref_valid' };
      const result = await controller.withdraw(mockRequest, dto);
      expect(mockWithdrawalsService.request).toHaveBeenCalledWith('user-123', {
        amount: 100,
        paymentMethodId: 'ref_valid',
      });
      expect(result).toBeDefined();
    });
  });

  describe('getHistory', () => {
    it('should return history', async () => {
      // PT-229 (H-UI-044) — **El contrato de `getHistory` cambio de verdad, y este caso lo describia.**
      //
      // Devolvia un array plano y ahora devuelve `{ items, total, page, limit }`, porque sin `total` la
      // interfaz no puede paginar sin adivinar — que es lo que llevo al catalogo a la heuristica
      // `length >= 12` de H-UI-043. El caso se actualiza porque la forma cambio, no para que pase.
      const mockHistory = {
        items: [
          { id: 'tx-1', type: 'DEPOSIT', amount: 100, createdAt: new Date(), referenceId: 'ref-1' },
        ],
        total: 1,
        page: 1,
        limit: 10,
      };
      mockWalletService.getHistory.mockResolvedValue(mockHistory);

      const result = await controller.getHistory(mockRequest);
      expect(result.transactions).toBeDefined();
      expect(result.transactions[0].id).toBe('tx-1');
      // `total` viaja: es lo que permite dibujar la paginacion sin heuristicas.
      expect(result.total).toBe(1);
      // Y los dos parametros que el portal enviaba desde PT-067 y este controlador DESCARTABA.
      expect(service.getHistory).toHaveBeenCalledWith('user-123', undefined, undefined, undefined);
    });
  });
});
