import * as crypto from 'crypto';

/**
 * Timing-safe HMAC-SHA256 signature validation for payment provider webhooks.
 * Uses crypto.timingSafeEqual to prevent timing-based signature oracle attacks.
 */
export class WebhookSignatureValidator {
  /**
   * Validates an HMAC-SHA256 signature.
   * @param payload - Raw request body as a string (before JSON.parse).
   * @param signature - Hex-encoded HMAC signature provided by the payment provider.
   * @param secret - Shared webhook secret configured in the payment provider dashboard.
   * @returns true only if the computed HMAC matches the provided signature.
   */
  static validateHmacSignature(payload: string, signature: string, secret: string): boolean {
    try {
      const computed = crypto.createHmac('sha256', secret).update(payload).digest('hex');

      // timingSafeEqual requires buffers of equal byte length.
      // Mismatched lengths would throw — we return false instead of exposing length info.
      const computedBuf = Buffer.from(computed, 'hex');
      const signatureBuf = Buffer.from(signature, 'hex');

      if (computedBuf.length !== signatureBuf.length) {
        return false;
      }

      return crypto.timingSafeEqual(computedBuf, signatureBuf);
    } catch {
      // Malformed hex, empty strings, or any other crypto error → treat as invalid.
      return false;
    }
  }
}
