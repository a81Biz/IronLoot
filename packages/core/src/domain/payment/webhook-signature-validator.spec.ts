import * as crypto from 'crypto';
import { WebhookSignatureValidator } from './webhook-signature-validator';

const SECRET = 'test-webhook-secret-32chars-long!!';
const PAYLOAD = JSON.stringify({ event: 'payment.completed', amount: 500 });

function computeValidSignature(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

describe('WebhookSignatureValidator', () => {
  describe('validateHmacSignature', () => {
    it('should return true for a valid HMAC signature', () => {
      const signature = computeValidSignature(PAYLOAD, SECRET);
      expect(WebhookSignatureValidator.validateHmacSignature(PAYLOAD, signature, SECRET)).toBe(true);
    });

    it('should return false for an invalid HMAC signature (wrong secret)', () => {
      const signature = computeValidSignature(PAYLOAD, 'wrong-secret');
      expect(WebhookSignatureValidator.validateHmacSignature(PAYLOAD, signature, SECRET)).toBe(false);
    });

    it('should return false when the payload has been tampered with', () => {
      const signature = computeValidSignature(PAYLOAD, SECRET);
      const tamperedPayload = PAYLOAD + ' ';
      expect(WebhookSignatureValidator.validateHmacSignature(tamperedPayload, signature, SECRET)).toBe(false);
    });

    it('should return false for a signature of wrong length (not valid hex of expected size)', () => {
      // A short hex string will produce a shorter buffer than the computed HMAC-SHA256.
      expect(WebhookSignatureValidator.validateHmacSignature(PAYLOAD, 'deadbeef', SECRET)).toBe(false);
    });

    it('should return false for an empty signature', () => {
      expect(WebhookSignatureValidator.validateHmacSignature(PAYLOAD, '', SECRET)).toBe(false);
    });

    it('should return false for a non-hex signature string', () => {
      // Buffer.from with non-hex input produces unexpected bytes — caught by length check or try/catch.
      expect(WebhookSignatureValidator.validateHmacSignature(PAYLOAD, 'not-hex!!', SECRET)).toBe(false);
    });

    it('should be deterministic — same inputs always yield same result', () => {
      const signature = computeValidSignature(PAYLOAD, SECRET);
      expect(WebhookSignatureValidator.validateHmacSignature(PAYLOAD, signature, SECRET)).toBe(true);
      expect(WebhookSignatureValidator.validateHmacSignature(PAYLOAD, signature, SECRET)).toBe(true);
    });
  });
});
