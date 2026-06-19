import { WalletCalculation } from './wallet-calculation';

describe('WalletCalculation', () => {
  describe('getAvailableBalance', () => {
    it('should return balance minus held funds', () => {
      expect(WalletCalculation.getAvailableBalance(1000, 200)).toBe(800);
    });

    it('should return 0 when all balance is held', () => {
      expect(WalletCalculation.getAvailableBalance(500, 500)).toBe(0);
    });

    it('should handle zero balance', () => {
      expect(WalletCalculation.getAvailableBalance(0, 0)).toBe(0);
    });
  });

  describe('canLockFunds', () => {
    it('should return true when sufficient available balance', () => {
      expect(WalletCalculation.canLockFunds(1000, 200, 300)).toBe(true);
    });

    it('should return true for exact available balance', () => {
      expect(WalletCalculation.canLockFunds(500, 0, 500)).toBe(true);
    });

    it('should return false when amount exceeds available balance', () => {
      expect(WalletCalculation.canLockFunds(500, 300, 300)).toBe(false);
    });

    it('should return false when balance is 0', () => {
      expect(WalletCalculation.canLockFunds(0, 0, 100)).toBe(false);
    });

    it('should return false when amount is 0', () => {
      expect(WalletCalculation.canLockFunds(1000, 0, 0)).toBe(false);
    });

    it('should return false when amount is negative', () => {
      expect(WalletCalculation.canLockFunds(1000, 0, -50)).toBe(false);
    });
  });

  describe('calculateNewHeldFunds', () => {
    it('should add bid amount to current held funds', () => {
      expect(WalletCalculation.calculateNewHeldFunds(200, 300)).toBe(500);
    });

    it('should work when current held is 0', () => {
      expect(WalletCalculation.calculateNewHeldFunds(0, 150)).toBe(150);
    });

    it('should accumulate correctly over multiple bids', () => {
      const after1 = WalletCalculation.calculateNewHeldFunds(0, 100);
      const after2 = WalletCalculation.calculateNewHeldFunds(after1, 200);
      expect(after2).toBe(300);
    });
  });
});
