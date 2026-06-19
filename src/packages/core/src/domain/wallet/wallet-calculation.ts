/**
 * Pure calculations for wallet balance and fund locking.
 * All methods are stateless — they take values and return values.
 */
export class WalletCalculation {
  /**
   * Returns the spendable balance (total balance minus funds locked by active bids).
   */
  static getAvailableBalance(balance: number, heldFunds: number): number {
    return balance - heldFunds;
  }

  /**
   * Returns true if locking `amount` additional funds is possible given
   * the current balance and already-held funds.
   */
  static canLockFunds(balance: number, heldFunds: number, amount: number): boolean {
    if (amount <= 0) return false;
    return WalletCalculation.getAvailableBalance(balance, heldFunds) >= amount;
  }

  /**
   * Returns the new held-funds total after adding a new bid lock.
   * Does not validate whether the wallet has enough balance — callers
   * must call `canLockFunds` first.
   */
  static calculateNewHeldFunds(currentHeld: number, bidAmount: number): number {
    return currentHeld + bidAmount;
  }
}
