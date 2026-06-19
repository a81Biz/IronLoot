import { OrderStatus } from './order-status.enum';

type OrderTransitionMap = Partial<Record<OrderStatus, ReadonlySet<OrderStatus>>>;

const VALID_ORDER_TRANSITIONS: OrderTransitionMap = {
  [OrderStatus.PENDING_PAYMENT]: new Set([OrderStatus.PAID, OrderStatus.CANCELLED]),
  [OrderStatus.PAID]: new Set([OrderStatus.SHIPPED, OrderStatus.REFUNDED]),
  [OrderStatus.SHIPPED]: new Set([OrderStatus.DELIVERED]),
  [OrderStatus.DELIVERED]: new Set([OrderStatus.REFUNDED]),
  // CANCELLED and REFUNDED are terminal — no outbound transitions.
};

export class OrderStateMachine {
  /**
   * Returns true if transitioning from `from` to `to` is a valid order lifecycle transition.
   */
  static canTransition(from: OrderStatus, to: OrderStatus): boolean {
    return VALID_ORDER_TRANSITIONS[from]?.has(to) ?? false;
  }
}
