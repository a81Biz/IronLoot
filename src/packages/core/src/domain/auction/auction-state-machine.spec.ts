import { AuctionStateMachine } from './auction-state-machine';
import { AuctionStatus } from './auction-status.enum';

describe('AuctionStateMachine', () => {
  describe('canTransition — valid transitions', () => {
    const validCases: [AuctionStatus, AuctionStatus][] = [
      [AuctionStatus.DRAFT, AuctionStatus.PUBLISHED],
      [AuctionStatus.DRAFT, AuctionStatus.CANCELLED],
      [AuctionStatus.PUBLISHED, AuctionStatus.ACTIVE],
      [AuctionStatus.PUBLISHED, AuctionStatus.CANCELLED],
      [AuctionStatus.ACTIVE, AuctionStatus.CLOSED],
      [AuctionStatus.ACTIVE, AuctionStatus.CANCELLED],
      [AuctionStatus.ACTIVE, AuctionStatus.SUSPENDED],
      [AuctionStatus.PENDING_MODERATION, AuctionStatus.PUBLISHED],
      [AuctionStatus.PENDING_MODERATION, AuctionStatus.CANCELLED],
      [AuctionStatus.SUSPENDED, AuctionStatus.PUBLISHED],
    ];

    it.each(validCases)('%s → %s should return true', (from, to) => {
      expect(AuctionStateMachine.canTransition(from, to)).toBe(true);
    });
  });

  describe('canTransition — invalid transitions', () => {
    const invalidCases: [AuctionStatus, AuctionStatus][] = [
      [AuctionStatus.CLOSED, AuctionStatus.ACTIVE],
      [AuctionStatus.CLOSED, AuctionStatus.PUBLISHED],
      [AuctionStatus.CLOSED, AuctionStatus.DRAFT],
      [AuctionStatus.CANCELLED, AuctionStatus.ACTIVE],
      [AuctionStatus.CANCELLED, AuctionStatus.PUBLISHED],
      [AuctionStatus.ACTIVE, AuctionStatus.DRAFT],
      [AuctionStatus.ACTIVE, AuctionStatus.PUBLISHED],
      [AuctionStatus.PUBLISHED, AuctionStatus.DRAFT],
      [AuctionStatus.DRAFT, AuctionStatus.ACTIVE],
      [AuctionStatus.SUSPENDED, AuctionStatus.ACTIVE],
      [AuctionStatus.SUSPENDED, AuctionStatus.CLOSED],
    ];

    it.each(invalidCases)('%s → %s should return false', (from, to) => {
      expect(AuctionStateMachine.canTransition(from, to)).toBe(false);
    });
  });

  describe('isSchedulerAutoTransitionAllowed', () => {
    it('should allow scheduler for PUBLISHED', () => {
      expect(AuctionStateMachine.isSchedulerAutoTransitionAllowed(AuctionStatus.PUBLISHED)).toBe(true);
    });

    it('should allow scheduler for ACTIVE', () => {
      expect(AuctionStateMachine.isSchedulerAutoTransitionAllowed(AuctionStatus.ACTIVE)).toBe(true);
    });

    it('should block scheduler for PENDING_MODERATION', () => {
      expect(AuctionStateMachine.isSchedulerAutoTransitionAllowed(AuctionStatus.PENDING_MODERATION)).toBe(false);
    });

    it('should block scheduler for SUSPENDED', () => {
      expect(AuctionStateMachine.isSchedulerAutoTransitionAllowed(AuctionStatus.SUSPENDED)).toBe(false);
    });

    it('should allow scheduler for DRAFT', () => {
      expect(AuctionStateMachine.isSchedulerAutoTransitionAllowed(AuctionStatus.DRAFT)).toBe(true);
    });

    it('should allow scheduler for CLOSED', () => {
      expect(AuctionStateMachine.isSchedulerAutoTransitionAllowed(AuctionStatus.CLOSED)).toBe(true);
    });
  });
});
