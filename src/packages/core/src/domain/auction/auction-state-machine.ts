import { AuctionStatus } from "./auction-status.enum";

/**
 * Defines valid state transitions for auctions and scheduler rules.
 * All logic is pure — no side effects, no I/O.
 */

type TransitionMap = Partial<Record<AuctionStatus, ReadonlySet<AuctionStatus>>>;

const VALID_TRANSITIONS: TransitionMap = {
  [AuctionStatus.DRAFT]: new Set([
    AuctionStatus.PUBLISHED,
    AuctionStatus.CANCELLED,
  ]),
  [AuctionStatus.PUBLISHED]: new Set([
    AuctionStatus.ACTIVE,
    AuctionStatus.CANCELLED,
    // PT-191 (AUD-011) — El panel puede suspender o cerrar algo publicado que aun no ha arrancado. Faltaban
    // las dos, y el panel las hacia igual escribiendo `status` a mano: el mapa no describia el dominio, y
    // enforzarlo sin completarlo habria roto operaciones legitimas.
    AuctionStatus.SUSPENDED,
    AuctionStatus.CLOSED,
  ]),
  [AuctionStatus.ACTIVE]: new Set([
    AuctionStatus.CLOSED,
    AuctionStatus.CANCELLED,
    AuctionStatus.SUSPENDED,
  ]),
  [AuctionStatus.PENDING_MODERATION]: new Set([
    AuctionStatus.PUBLISHED,
    AuctionStatus.CANCELLED,
    // PT-191 (AUD-011) — **Rechazar devuelve el anuncio al vendedor como borrador.** Es el flujo central de
    // moderacion y el mapa no lo tenia: la maquina habria rechazado la operacion mas usada del panel.
    AuctionStatus.DRAFT,
  ]),
  [AuctionStatus.SUSPENDED]: new Set([
    AuctionStatus.PUBLISHED,
    // PT-191 (AUD-011) — Lo suspendido tiene que poder cancelarse; si no, queda atrapado.
    AuctionStatus.CANCELLED,
  ]),
  // CLOSED and CANCELLED are terminal — no outbound transitions.
};

/**
 * Statuses that the scheduler is NOT allowed to auto-advance.
 * Admin intervention is required for these statuses.
 */
const SCHEDULER_BLOCKED: ReadonlySet<AuctionStatus> = new Set([
  AuctionStatus.PENDING_MODERATION,
  AuctionStatus.SUSPENDED,
]);

export class AuctionStateMachine {
  /**
   * Returns true if transitioning from `from` to `to` is a valid domain transition.
   * Does not enforce who is allowed to trigger it (admin vs scheduler vs seller).
   */
  static canTransition(from: AuctionStatus, to: AuctionStatus): boolean {
    return VALID_TRANSITIONS[from]?.has(to) ?? false;
  }

  /**
   * Returns true if the scheduler is permitted to auto-advance an auction
   * currently in `status`. Auctions under moderation or admin suspension
   * must not be touched by the scheduler.
   */
  static isSchedulerAutoTransitionAllowed(status: AuctionStatus): boolean {
    return !SCHEDULER_BLOCKED.has(status);
  }
}
