import { OrderStateMachine } from './order-state-machine';
import { OrderStatus } from './order-status.enum';

describe('OrderStateMachine', () => {
  describe('canTransition — valid transitions', () => {
    const validCases: [OrderStatus, OrderStatus][] = [
      [OrderStatus.PENDING_PAYMENT, OrderStatus.PAID],
      [OrderStatus.PENDING_PAYMENT, OrderStatus.CANCELLED],
      [OrderStatus.PAID, OrderStatus.SHIPPED],
      [OrderStatus.PAID, OrderStatus.REFUNDED],
      [OrderStatus.SHIPPED, OrderStatus.DELIVERED],
      [OrderStatus.DELIVERED, OrderStatus.REFUNDED],
    ];

    it.each(validCases)('%s → %s should return true', (from, to) => {
      expect(OrderStateMachine.canTransition(from, to)).toBe(true);
    });
  });

  describe('canTransition — invalid transitions', () => {
    const invalidCases: [OrderStatus, OrderStatus][] = [
      [OrderStatus.CANCELLED, OrderStatus.PAID],
      [OrderStatus.CANCELLED, OrderStatus.PENDING_PAYMENT],
      [OrderStatus.REFUNDED, OrderStatus.PAID],
      [OrderStatus.DELIVERED, OrderStatus.SHIPPED],
      [OrderStatus.PAID, OrderStatus.PENDING_PAYMENT],
      [OrderStatus.SHIPPED, OrderStatus.PAID],
      [OrderStatus.PENDING_PAYMENT, OrderStatus.DELIVERED],
      [OrderStatus.PENDING_PAYMENT, OrderStatus.SHIPPED],
    ];

    it.each(invalidCases)('%s → %s should return false', (from, to) => {
      expect(OrderStateMachine.canTransition(from, to)).toBe(false);
    });
  });

  describe('terminal states', () => {
    it('should have no outbound transitions from CANCELLED', () => {
      const allStatuses = Object.values(OrderStatus);
      allStatuses.forEach((to) => {
        expect(OrderStateMachine.canTransition(OrderStatus.CANCELLED, to)).toBe(false);
      });
    });

    it('should have no outbound transitions from REFUNDED', () => {
      const allStatuses = Object.values(OrderStatus);
      allStatuses.forEach((to) => {
        expect(OrderStateMachine.canTransition(OrderStatus.REFUNDED, to)).toBe(false);
      });
    });
  });
});
