import { DisputeStateMachine } from './dispute-state-machine';
import { DisputeStatus } from './dispute-status.enum';

describe('DisputeStateMachine', () => {
  describe('canTransition — valid transitions', () => {
    const validCases: [DisputeStatus, DisputeStatus][] = [
      [DisputeStatus.OPEN, DisputeStatus.IN_MEDIATION],
      [DisputeStatus.OPEN, DisputeStatus.CLOSED],
      [DisputeStatus.IN_MEDIATION, DisputeStatus.RESOLVED],
      [DisputeStatus.IN_MEDIATION, DisputeStatus.CLOSED],
      [DisputeStatus.RESOLVED, DisputeStatus.CLOSED],
    ];

    it.each(validCases)('%s → %s should return true', (from, to) => {
      expect(DisputeStateMachine.canTransition(from, to)).toBe(true);
    });
  });

  describe('canTransition — invalid transitions', () => {
    const invalidCases: [DisputeStatus, DisputeStatus][] = [
      [DisputeStatus.CLOSED, DisputeStatus.OPEN],
      [DisputeStatus.CLOSED, DisputeStatus.IN_MEDIATION],
      [DisputeStatus.CLOSED, DisputeStatus.RESOLVED],
      [DisputeStatus.RESOLVED, DisputeStatus.OPEN],
      [DisputeStatus.RESOLVED, DisputeStatus.IN_MEDIATION],
      [DisputeStatus.IN_MEDIATION, DisputeStatus.OPEN],
      [DisputeStatus.OPEN, DisputeStatus.RESOLVED],
    ];

    it.each(invalidCases)('%s → %s should return false', (from, to) => {
      expect(DisputeStateMachine.canTransition(from, to)).toBe(false);
    });
  });

  describe('terminal state — CLOSED', () => {
    it('should have no outbound transitions from CLOSED', () => {
      const allStatuses = Object.values(DisputeStatus);
      allStatuses.forEach((to) => {
        expect(DisputeStateMachine.canTransition(DisputeStatus.CLOSED, to)).toBe(false);
      });
    });
  });

  describe('canOpenDispute — 14-day window', () => {
    it('should allow opening dispute on the day of delivery', () => {
      const deliveredAt = new Date();
      expect(DisputeStateMachine.canOpenDispute(deliveredAt)).toBe(true);
    });

    it('should allow opening dispute within 14 days', () => {
      const deliveredAt = new Date();
      deliveredAt.setDate(deliveredAt.getDate() - 13);
      expect(DisputeStateMachine.canOpenDispute(deliveredAt)).toBe(true);
    });

    it('should allow opening dispute on exactly day 14', () => {
      const now = new Date();
      const deliveredAt = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      expect(DisputeStateMachine.canOpenDispute(deliveredAt, now)).toBe(true);
    });

    it('should reject opening dispute after 14 days', () => {
      const now = new Date();
      const deliveredAt = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
      expect(DisputeStateMachine.canOpenDispute(deliveredAt, now)).toBe(false);
    });

    it('should reject opening dispute 30 days after delivery', () => {
      const deliveredAt = new Date();
      deliveredAt.setDate(deliveredAt.getDate() - 30);
      expect(DisputeStateMachine.canOpenDispute(deliveredAt)).toBe(false);
    });
  });

  describe('windowDays constant', () => {
    it('should return 14', () => {
      expect(DisputeStateMachine.windowDays).toBe(14);
    });
  });
});
