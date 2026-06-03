import { IOrderRepository } from '../../contracts/order-repository.interface';
import { IWalletRepository } from '../../contracts/wallet-repository.interface';
import { OrderStatus } from '../../domain/order/order-status.enum';
import { RefundProcessedEvent } from '../../events/refund-processed.event';

export interface ProcessRefundDto {
  orderId: string;
  refundAmount: number;
  initiatedBy: string;
}

export interface ProcessRefundResult {
  success: boolean;
  event?: RefundProcessedEvent;
  error?: string;
}

const REFUNDABLE_STATUSES: ReadonlySet<OrderStatus> = new Set([
  OrderStatus.PAID,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
]);

export class ProcessRefundUseCase {
  constructor(
    private readonly orderRepo: IOrderRepository,
    private readonly walletRepo: IWalletRepository,
  ) {}

  async execute(dto: ProcessRefundDto): Promise<ProcessRefundResult> {
    const order = await this.orderRepo.findById(dto.orderId);
    if (!order) return { success: false, error: 'Order not found' };

    if (!REFUNDABLE_STATUSES.has(order.status)) {
      return { success: false, error: `Order cannot be refunded from status: ${order.status}` };
    }

    if (dto.refundAmount <= 0 || dto.refundAmount > order.totalAmount) {
      return { success: false, error: 'Invalid refund amount' };
    }

    await this.orderRepo.updateStatus(dto.orderId, OrderStatus.REFUNDED);
    await this.walletRepo.creditBalance(order.buyerId, dto.refundAmount, dto.orderId, 'REFUND');

    const event: RefundProcessedEvent = {
      eventName: 'refund.processed',
      orderId: dto.orderId,
      refundAmount: dto.refundAmount,
      buyerId: order.buyerId,
      occurredAt: new Date(),
    };

    return { success: true, event };
  }
}
