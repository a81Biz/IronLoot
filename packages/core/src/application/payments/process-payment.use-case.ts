import { IOrderRepository } from '../../contracts/order-repository.interface';
import { IWalletRepository } from '../../contracts/wallet-repository.interface';
import { OrderStatus } from '../../domain/order/order-status.enum';
import { PaymentCompletedEvent } from '../../events/payment-completed.event';

export interface ProcessPaymentDto {
  orderId: string;
  paymentId: string;
  externalId: string;
  amount: number;
  provider: string;
  /** Pre-validated by the caller (controller/webhook handler) before invoking this use case. */
  isSignatureValid: boolean;
}

export interface ProcessPaymentResult {
  success: boolean;
  alreadyProcessed?: boolean;
  event?: PaymentCompletedEvent;
  error?: string;
}

export class ProcessPaymentUseCase {
  constructor(
    private readonly orderRepo: IOrderRepository,
    private readonly walletRepo: IWalletRepository,
  ) {}

  async execute(dto: ProcessPaymentDto): Promise<ProcessPaymentResult> {
    if (!dto.isSignatureValid) {
      return { success: false, error: 'Invalid webhook signature' };
    }

    const order = await this.orderRepo.findById(dto.orderId);
    if (!order) return { success: false, error: 'Order not found' };

    // Idempotency guard: webhook may be delivered more than once.
    if (order.status === OrderStatus.PAID) {
      return { success: true, alreadyProcessed: true };
    }

    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      return { success: false, error: `Order is in unexpected status: ${order.status}` };
    }

    await this.orderRepo.updateStatus(dto.orderId, OrderStatus.PAID);
    await this.walletRepo.creditBalance(order.sellerId, dto.amount, dto.orderId, 'CREDIT_SALE');

    const event: PaymentCompletedEvent = {
      eventName: 'payment.completed',
      orderId: dto.orderId,
      paymentId: dto.paymentId,
      amount: dto.amount,
      provider: dto.provider,
      occurredAt: new Date(),
    };

    return { success: true, event };
  }
}
