import { ProcessRefundUseCase, ProcessRefundDto } from './process-refund.use-case';
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

const paidOrder: OrderSummary = {
  id: 'order-1',
  auctionId: 'auction-1',
  buyerId: 'buyer-1',
  sellerId: 'seller-1',
  totalAmount: 500,
  status: OrderStatus.PAID,
};

const validDto: ProcessRefundDto = {
  orderId: 'order-1',
  refundAmount: 500,
  initiatedBy: 'admin-1',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ProcessRefundUseCase', () => {
  it('happy path — should refund a PAID order and credit buyer wallet', async () => {
    const orderRepo = makeOrderRepo(paidOrder);
    const walletRepo = makeWalletRepo();
    const useCase = new ProcessRefundUseCase(orderRepo, walletRepo);

    const result = await useCase.execute(validDto);

    expect(result.success).toBe(true);
    expect(result.event?.eventName).toBe('refund.processed');
    expect(result.event?.refundAmount).toBe(500);
    expect(result.event?.buyerId).toBe('buyer-1');
    expect(orderRepo.updateStatus).toHaveBeenCalledWith('order-1', OrderStatus.REFUNDED);
    expect(walletRepo.creditBalance).toHaveBeenCalledWith('buyer-1', 500, 'order-1', 'REFUND');
  });

  it('should also refund a SHIPPED order', async () => {
    const shippedOrder: OrderSummary = { ...paidOrder, status: OrderStatus.SHIPPED };
    const useCase = new ProcessRefundUseCase(makeOrderRepo(shippedOrder), makeWalletRepo());

    const result = await useCase.execute(validDto);

    expect(result.success).toBe(true);
  });

  it('should also refund a DELIVERED order', async () => {
    const deliveredOrder: OrderSummary = { ...paidOrder, status: OrderStatus.DELIVERED };
    const useCase = new ProcessRefundUseCase(makeOrderRepo(deliveredOrder), makeWalletRepo());

    const result = await useCase.execute(validDto);

    expect(result.success).toBe(true);
  });

  it('should return error when order is not found', async () => {
    const useCase = new ProcessRefundUseCase(makeOrderRepo(null), makeWalletRepo());

    const result = await useCase.execute(validDto);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Order not found');
  });

  it('should return error when order status is CANCELLED (not refundable)', async () => {
    const cancelledOrder: OrderSummary = { ...paidOrder, status: OrderStatus.CANCELLED };
    const useCase = new ProcessRefundUseCase(makeOrderRepo(cancelledOrder), makeWalletRepo());

    const result = await useCase.execute(validDto);

    expect(result.success).toBe(false);
    expect(result.error).toContain('cannot be refunded');
  });

  it('should return error for zero refund amount', async () => {
    const useCase = new ProcessRefundUseCase(makeOrderRepo(paidOrder), makeWalletRepo());

    const result = await useCase.execute({ ...validDto, refundAmount: 0 });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid refund amount');
  });

  it('should return error when refund amount exceeds order total', async () => {
    const useCase = new ProcessRefundUseCase(makeOrderRepo(paidOrder), makeWalletRepo());

    const result = await useCase.execute({ ...validDto, refundAmount: 999 });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid refund amount');
  });

  it('should allow partial refund (less than totalAmount)', async () => {
    const orderRepo = makeOrderRepo(paidOrder);
    const walletRepo = makeWalletRepo();
    const useCase = new ProcessRefundUseCase(orderRepo, walletRepo);

    const result = await useCase.execute({ ...validDto, refundAmount: 200 });

    expect(result.success).toBe(true);
    expect(result.event?.refundAmount).toBe(200);
    expect(walletRepo.creditBalance).toHaveBeenCalledWith('buyer-1', 200, 'order-1', 'REFUND');
  });
});
