import { WALLET_BALANCE_PATH, mapWalletBalance } from '../src/common/bff/wallet-view';

describe('wallet-view (PT-058 / BUG-QA-N01)', () => {
  it('W1: usa el endpoint real /api/v1/wallet/balance', () => {
    expect(WALLET_BALANCE_PATH).toBe('/api/v1/wallet/balance');
  });

  it('W2: mapea WalletBalanceDto (available/held) al modelo de vista (balance/held_funds)', () => {
    expect(mapWalletBalance({ available: 5000, held: 700, currency: 'MXN', isActive: true })).toEqual({
      balance: 5000,
      held_funds: 700,
      currency: 'MXN',
      isActive: true,
    });
  });

  it('W3: devuelve null si la respuesta es null/undefined (404 → apiGet null)', () => {
    expect(mapWalletBalance(null)).toBeNull();
    expect(mapWalletBalance(undefined)).toBeNull();
  });
});
