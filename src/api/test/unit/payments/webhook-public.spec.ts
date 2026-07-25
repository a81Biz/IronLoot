import { Reflector } from '@nestjs/core';
import { PaymentsController } from '../../../src/modules/payments/payments.controller';
import { IS_PUBLIC_KEY } from '../../../src/modules/auth/decorators/auth.decorators';

/**
 * PT-063 (BUG CRÍTICO) — El webhook de pasarela debe ser público: el guard JWT global
 * rechazaría con 401 a MP/PayPal/HeyBanco (que no envían JWT). La autenticidad la da la firma HMAC.
 */
describe('PaymentsController.webhook — @Public (PT-063)', () => {
  it('el endpoint webhook está marcado como público (salta el guard JWT global)', () => {
    const reflector = new Reflector();
    const isPublic = reflector.get<boolean>(IS_PUBLIC_KEY, PaymentsController.prototype.webhook);
    expect(isPublic).toBe(true);
  });
});
