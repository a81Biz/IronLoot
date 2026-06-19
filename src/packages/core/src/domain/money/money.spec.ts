import { Money, InsufficientFundsError, CurrencyMismatchError } from './money';

describe('Money', () => {
  describe('constructor', () => {
    it('should create Money with centavos and currency', () => {
      const m = new Money(100, 'MXN');
      expect(m.centavos).toBe(100);
      expect(m.currency).toBe('MXN');
    });

    it('should normalize currency to uppercase', () => {
      const m = new Money(100, 'mxn');
      expect(m.currency).toBe('MXN');
    });

    it('should allow zero centavos', () => {
      const m = new Money(0, 'MXN');
      expect(m.centavos).toBe(0);
    });

    it('should throw when centavos is negative', () => {
      expect(() => new Money(-1, 'MXN')).toThrow();
    });

    it('should throw when centavos is not an integer', () => {
      expect(() => new Money(1.5, 'MXN')).toThrow();
    });
  });

  describe('fromDecimal', () => {
    it('should convert 1.00 to 100 centavos', () => {
      expect(Money.fromDecimal(1.0, 'MXN').centavos).toBe(100);
    });

    it('should convert 0.01 to 1 centavo', () => {
      expect(Money.fromDecimal(0.01, 'MXN').centavos).toBe(1);
    });

    it('should round floating point imprecision', () => {
      // 0.1 + 0.2 = 0.30000000000000004 in JS
      expect(Money.fromDecimal(0.1 + 0.2, 'MXN').centavos).toBe(30);
    });

    it('should accept objects with toNumber()', () => {
      const prismaDecimal = { toNumber: () => 5.5 };
      expect(Money.fromDecimal(prismaDecimal, 'MXN').centavos).toBe(550);
    });
  });

  describe('add', () => {
    it('should sum two Money values', () => {
      const a = new Money(100, 'MXN');
      const b = new Money(50, 'MXN');
      expect(a.add(b).centavos).toBe(150);
    });

    it('should return a new Money instance (immutable)', () => {
      const a = new Money(100, 'MXN');
      const b = new Money(50, 'MXN');
      const result = a.add(b);
      expect(result).not.toBe(a);
      expect(a.centavos).toBe(100);
    });

    it('should throw CurrencyMismatchError for different currencies', () => {
      const a = new Money(100, 'MXN');
      const b = new Money(100, 'USD');
      expect(() => a.add(b)).toThrow(CurrencyMismatchError);
    });
  });

  describe('subtract', () => {
    it('should subtract two Money values', () => {
      const a = new Money(150, 'MXN');
      const b = new Money(50, 'MXN');
      expect(a.subtract(b).centavos).toBe(100);
    });

    it('should allow subtracting same amount (result = 0)', () => {
      const a = new Money(100, 'MXN');
      const b = new Money(100, 'MXN');
      expect(a.subtract(b).centavos).toBe(0);
    });

    it('should throw InsufficientFundsError when result would be negative', () => {
      const a = new Money(50, 'MXN');
      const b = new Money(100, 'MXN');
      expect(() => a.subtract(b)).toThrow(InsufficientFundsError);
    });

    it('should throw CurrencyMismatchError for different currencies', () => {
      const a = new Money(100, 'MXN');
      const b = new Money(50, 'USD');
      expect(() => a.subtract(b)).toThrow(CurrencyMismatchError);
    });
  });

  describe('greaterThanOrEqual', () => {
    it('should return true when greater', () => {
      expect(new Money(200, 'MXN').greaterThanOrEqual(new Money(100, 'MXN'))).toBe(true);
    });

    it('should return true when equal', () => {
      expect(new Money(100, 'MXN').greaterThanOrEqual(new Money(100, 'MXN'))).toBe(true);
    });

    it('should return false when less', () => {
      expect(new Money(50, 'MXN').greaterThanOrEqual(new Money(100, 'MXN'))).toBe(false);
    });

    it('should throw CurrencyMismatchError for different currencies', () => {
      expect(() =>
        new Money(100, 'MXN').greaterThanOrEqual(new Money(100, 'USD')),
      ).toThrow(CurrencyMismatchError);
    });
  });

  describe('greaterThan', () => {
    it('should return true when strictly greater', () => {
      expect(new Money(200, 'MXN').greaterThan(new Money(100, 'MXN'))).toBe(true);
    });

    it('should return false when equal', () => {
      expect(new Money(100, 'MXN').greaterThan(new Money(100, 'MXN'))).toBe(false);
    });

    it('should return false when less', () => {
      expect(new Money(50, 'MXN').greaterThan(new Money(100, 'MXN'))).toBe(false);
    });
  });

  describe('equals', () => {
    it('should return true for same centavos and currency', () => {
      expect(new Money(100, 'MXN').equals(new Money(100, 'MXN'))).toBe(true);
    });

    it('should return false for different centavos', () => {
      expect(new Money(100, 'MXN').equals(new Money(200, 'MXN'))).toBe(false);
    });

    it('should return false for different currencies', () => {
      expect(new Money(100, 'MXN').equals(new Money(100, 'USD'))).toBe(false);
    });
  });

  describe('toDecimal', () => {
    it('should convert 100 centavos to 1.0', () => {
      expect(new Money(100, 'MXN').toDecimal()).toBe(1.0);
    });

    it('should convert 1 centavo to 0.01', () => {
      expect(new Money(1, 'MXN').toDecimal()).toBe(0.01);
    });

    it('should convert 0 centavos to 0.0', () => {
      expect(new Money(0, 'MXN').toDecimal()).toBe(0);
    });
  });

  describe('toCentavos', () => {
    it('should return the raw centavos value', () => {
      expect(new Money(100, 'MXN').toCentavos()).toBe(100);
    });
  });
});
