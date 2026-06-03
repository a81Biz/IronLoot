export class InsufficientFundsError extends Error {
  constructor(available: number, requested: number, currency: string) {
    super(
      `Insufficient funds: requested ${requested} ${currency} but only ${available} ${currency} available`,
    );
    this.name = 'InsufficientFundsError';
  }
}

export class CurrencyMismatchError extends Error {
  constructor(a: string, b: string) {
    super(`Cannot operate on different currencies: ${a} and ${b}`);
    this.name = 'CurrencyMismatchError';
  }
}

/**
 * Immutable value object representing a monetary amount in centavos.
 * All arithmetic is performed on integers to avoid floating-point errors.
 * Example: new Money(100, 'MXN') = $1.00 MXN
 */
export class Money {
  private readonly _centavos: number;
  private readonly _currency: string;

  constructor(centavos: number, currency: string) {
    if (!Number.isInteger(centavos)) {
      throw new Error(`Money centavos must be an integer, got: ${centavos}`);
    }
    if (centavos < 0) {
      throw new Error(`Money centavos cannot be negative, got: ${centavos}`);
    }
    this._centavos = centavos;
    this._currency = currency.toUpperCase();
  }

  static fromDecimal(amount: number | { toNumber(): number }, currency: string): Money {
    const num = typeof amount === 'number' ? amount : amount.toNumber();
    return new Money(Math.round(num * 100), currency);
  }

  get centavos(): number {
    return this._centavos;
  }

  get currency(): string {
    return this._currency;
  }

  private assertSameCurrency(other: Money): void {
    if (this._currency !== other._currency) {
      throw new CurrencyMismatchError(this._currency, other._currency);
    }
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this._centavos + other._centavos, this._currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    if (other._centavos > this._centavos) {
      throw new InsufficientFundsError(this._centavos, other._centavos, this._currency);
    }
    return new Money(this._centavos - other._centavos, this._currency);
  }

  greaterThanOrEqual(other: Money): boolean {
    this.assertSameCurrency(other);
    return this._centavos >= other._centavos;
  }

  greaterThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this._centavos > other._centavos;
  }

  equals(other: Money): boolean {
    return this._currency === other._currency && this._centavos === other._centavos;
  }

  toDecimal(): number {
    return this._centavos / 100;
  }

  toCentavos(): number {
    return this._centavos;
  }

  toString(): string {
    return `${this.toDecimal().toFixed(2)} ${this._currency}`;
  }
}
