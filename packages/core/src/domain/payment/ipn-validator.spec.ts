import { buildIpnVerificationPayload, validateIpnResponse } from './ipn-validator';

describe('buildIpnVerificationPayload', () => {
  it('should prepend cmd=_notify-validate& to the raw body', () => {
    const rawBody = 'payment_status=Completed&txn_id=ABC123&invoice=DEP-user1-1234567890';
    const result = buildIpnVerificationPayload(rawBody);
    expect(result).toBe(`cmd=_notify-validate&${rawBody}`);
  });

  it('should handle empty string body', () => {
    const result = buildIpnVerificationPayload('');
    expect(result).toBe('cmd=_notify-validate&');
  });

  it('should not mutate the input rawBody', () => {
    const rawBody = 'payment_status=Completed';
    buildIpnVerificationPayload(rawBody);
    expect(rawBody).toBe('payment_status=Completed');
  });

  it('should handle body with special characters (URL-encoded)', () => {
    const rawBody = 'item_name=Iron+Loot+Deposit&amount=100.00';
    const result = buildIpnVerificationPayload(rawBody);
    expect(result.startsWith('cmd=_notify-validate&')).toBe(true);
    expect(result).toContain(rawBody);
  });
});

describe('validateIpnResponse', () => {
  it('should return true for exact VERIFIED response', () => {
    expect(validateIpnResponse('VERIFIED')).toBe(true);
  });

  it('should return true for VERIFIED with leading/trailing whitespace', () => {
    expect(validateIpnResponse('  VERIFIED  ')).toBe(true);
    expect(validateIpnResponse('VERIFIED\n')).toBe(true);
    expect(validateIpnResponse('\tVERIFIED\t')).toBe(true);
  });

  it('should return false for INVALID', () => {
    expect(validateIpnResponse('INVALID')).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(validateIpnResponse('')).toBe(false);
  });

  it('should return false for whitespace-only string', () => {
    expect(validateIpnResponse('   ')).toBe(false);
  });

  it('should be case-sensitive (lowercase verified is not valid)', () => {
    expect(validateIpnResponse('verified')).toBe(false);
    expect(validateIpnResponse('Verified')).toBe(false);
    expect(validateIpnResponse('VERIF IED')).toBe(false);
  });

  it('should return false for unrelated strings', () => {
    expect(validateIpnResponse('null')).toBe(false);
    expect(validateIpnResponse('true')).toBe(false);
    expect(validateIpnResponse('OK')).toBe(false);
  });
});
