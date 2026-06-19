import { ProcessPaymentUseCase, ProcessPaymentDto } from './process-payment.use-case';
import { IOrderRepository, OrderSummary } from '../../contracts/order-repository.interface';
import { IWalletRepository } from '../../contracts/wallet-repository.interface';
import { OrderStatus } from '../../domain/order/order-status.enum';

// ---------------------------------------------------------------------------
// Stubs
// ---------------------------------------------------------------------------

function makeOrderRepo(order: OrderSummary | null): IOrderRepository {
  return {
    findById: jest.fn().mockResolvedValue(order),
    findByAuctionId: jest.fn().mockResolvedValue(null),
    create: jest.fn(),
    updateStatus: jest.fn().mockResolvedValue(undefined),
  };
}

function makeWalletRepo(): IWalletRepository {
  return {
    findByUserId: jest.fn(),
    lockFunds: jest.fn(),
    releaseFunds: jest.fn(),
    creditBalance: jest.fn().mockResolvedValue(undefined),
  };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const pendingOrder: OrderSummary = {
  id: 'order-1',
  auctionId: 'auction-1',
  buyerId: 'buyer-1',
  sellerId: 'seller-1',
  totalAmount: 500,
  status: OrderStatus.PENDING_PAYMENT,
};

const validDto: ProcessPaymentDto = {
  orderId: 'order-1',
  paymentId: 'pay-abc',
  externalId: 'ext-xyz',
  amount: 500,
  provider: 'MERCADO_PAGO',
  isSignatureValid: true,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ProcessPaymentUseCase', () => {
  it('happy path — should mark order as PAID and credit seller wallet', async () => {
    const orderRepo = makeOrderRepo(pendingOrder);
    const walletRepo = makeWalletRepo();
    const useCase = new ProcessPaymentUseCase(orderRepo, walletRepo);

    const result = await useCase.execute(validDto);

    expect(result.success).toBe(true);
    expect(result.alreadyProcessed).toBeUndefined();
    expect(result.event?.eventName).toBe('payment.completed');
    expect(result.event?.provider).toBe('MERCADO_PAGO');
    expect(orderRepo.updateStatus).toHaveBeenCalledWith('order-1', OrderStatus.PAID);
    expect(walletRepo.creditBalance).toHaveBeenCalledWith('seller-1', 500, 'order-1', 'CREDIT_SALE');
  });

  it('should return error when webhook signature is invalid', async () => {
    const useCase = new ProcessPaymentUseCase(makeOrderRepo(pendingOrder), makeWalletRepo());

    const result = await useCase.execute({ ...validDto, isSignatureValid: false });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid webhook signature');
  });

  it('should return alreadyProcessed=true for idempotent duplicate webhook', async () => {
    const paidOrder: OrderSummary = { ...pendingOrder, status: OrderStatus.PAID };
    const orderRepo = makeOrderRepo(paidOrder);
    const useCase = new ProcessPaymentUseCase(orderRepo, makeWalletRepo());

    const result = await useCase.execute(validDto);

    expect(result.success).toBe(true);
    expect(result.alreadyProcessed).toBe(true);
    expect(orderRepo.updateStatus).not.toHaveBeenCalled();
  });

  it('should return error when order is not found', async () => {
    const useCase = new ProcessPaymentUseCase(makeOrderRepo(null), makeWalletRepo());

    const result = await useCase.execute(validDto);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Order not found');
  });

  it('should return error when order is in an unexpected status (e.g., SHIPPED)', async () => {
    const shippedOrder: OrderSummary = { ...pendingOrder, status: OrderStatus.SHIPPED };
    const useCase = new ProcessPaymentUseCase(makeOrderRepo(shippedOrder), makeWalletRepo());

    const result = await useCase.execute(validDto);

    expect(result.success).toBe(false);
    expect(result.error).toContain('unexpected status');
  });
});
