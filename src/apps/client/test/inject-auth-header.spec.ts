import { injectAuthHeader } from '../src/common/bff/inject-auth-header';

describe('injectAuthHeader (PT-038 / AUD-003)', () => {
  it('A1: inyecta Authorization: Bearer desde la cookie access_token', () => {
    const setHeader = jest.fn();
    injectAuthHeader({ setHeader }, { cookies: { access_token: 'tok-123' } });
    expect(setHeader).toHaveBeenCalledWith('Authorization', 'Bearer tok-123');
  });

  it('A2: no inyecta header si no hay cookie access_token', () => {
    const setHeader = jest.fn();
    injectAuthHeader({ setHeader }, { cookies: {} });
    expect(setHeader).not.toHaveBeenCalled();
  });

  it('A3: no lanza si cookies es undefined', () => {
    const setHeader = jest.fn();
    expect(() => injectAuthHeader({ setHeader }, {})).not.toThrow();
    expect(setHeader).not.toHaveBeenCalled();
  });
});
