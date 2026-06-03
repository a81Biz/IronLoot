import { DisputeStatus } from './dispute-status.enum';

type DisputeTransitionMap = Partial<Record<DisputeStatus, ReadonlySet<DisputeStatus>>>;

const VALID_DISPUTE_TRANSITIONS: DisputeTransitionMap = {
  [DisputeStatus.OPEN]: new Set([DisputeStatus.IN_MEDIATION, DisputeStatus.CLOSED]),
  [DisputeStatus.IN_MEDIATION]: new Set([DisputeStatus.RESOLVED, DisputeStatus.CLOSED]),
  [DisputeStatus.RESOLVED]: new Set([DisputeStatus.CLOSED]),
  // CLOSED is terminal — no outbound transitions.
};

const DISPUTE_WINDOW_DAYS = 14;

export class DisputeStateMachine {
  /**
   * Returns true if transitioning from `from` to `to` is a valid dispute lifecycle transition.
   */
  static canTransition(from: DisputeStatus, to: DisputeStatus): boolean {
    return VALID_DISPUTE_TRANSITIONS[from]?.has(to) ?? false;
  }

  /**
   * Returns true if a dispute can be opened given the order delivery date.
   * Disputes must be opened within DISPUTE_WINDOW_DAYS of the delivery date.
   */
  static canOpenDispute(deliveredAt: Date, now: Date = new Date()): boolean {
    const windowMs = DISPUTE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    return now.getTime() - deliveredAt.getTime() <= windowMs;
  }

  /**
   * Returns the dispute window in days (business rule constant).
   */
  static get windowDays(): number {
    return DISPUTE_WINDOW_DAYS;
  }
}
