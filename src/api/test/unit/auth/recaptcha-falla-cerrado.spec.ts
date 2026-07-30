import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RecaptchaGuard } from '@/modules/auth/guards/recaptcha.guard';

/**
 * PT-182 (H-029) — **El guard de reCAPTCHA falla cerrado.**
 *
 * ## Qué había
 *
 * ```ts
 * if (!token) throw new ForbiddenException('CAPTCHA token required');
 * // TODO: Verify token with Google API
 * return true; // Mock success for now
 * ```
 *
 * Comprobaba que el token **existiera** y no que fuese **válido**: con `RECAPTCHA_ENABLED=true`, la cadena
 * `"x"` pasaba igual que un token legítimo. Y el guard protege **`POST /auth/register`**.
 *
 * Hoy no había exposición —la variable es `false` por defecto—, y ahí estaba el peligro: **el día que
 * alguien la encendiera creería tener protección contra bots y no la tendría.** Familia de H-004, la
 * validación del método de pago comentada en el retiro: *un control que aparenta proteger y no protege es
 * peor que no tenerlo*, porque sustituye la desconfianza por confianza infundada.
 *
 * ## La corrección es el principio de RULE-17: fallar cerrado
 *
 * Un valor que convierte «mal configurado» en «configurado hacia ninguna parte» es exactamente lo que
 * RULE-17 nació para impedir. Activado sin secreto **no arranca**; activado con secreto **verifica de
 * verdad**; y una verificación que Google rechaza **no pasa**.
 */
describe('El guard de reCAPTCHA falla cerrado — H-029 (PT-182)', () => {
  const contexto = (headers: Record<string, string>, body: Record<string, unknown> = {}) =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ headers, body }) }),
    }) as unknown as ExecutionContext;

  const config = (vals: Record<string, unknown>) =>
    ({ get: (k: string, def?: unknown) => (k in vals ? vals[k] : def) }) as ConfigService;

  const guard = (vals: Record<string, unknown>) => new RecaptchaGuard(config(vals));

  afterEach(() => {
    (global.fetch as unknown) = undefined;
  });

  it('C1: desactivado, pasa sin mirar nada — no cambia el comportamiento por defecto', async () => {
    await expect(guard({}).canActivate(contexto({}))).resolves.toBe(true);
  });

  it('C2: activado y SIN token, sigue rechazando', async () => {
    await expect(
      guard({ RECAPTCHA_ENABLED: true, RECAPTCHA_SECRET: 's' }).canActivate(contexto({})),
    ).rejects.toThrow(ForbiddenException);
  });

  it('C3: activado con un token BASURA, ya NO pasa — es el defecto', async () => {
    // Antes: `return true; // Mock success for now`. La cadena "x" entraba como un token de Google.
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ success: false }) }) as never;

    await expect(
      guard({ RECAPTCHA_ENABLED: true, RECAPTCHA_SECRET: 's' }).canActivate(
        contexto({ 'x-recaptcha-token': 'x' }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('C4: activado con un token que Google valida, pasa', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ success: true }) }) as never;

    await expect(
      guard({ RECAPTCHA_ENABLED: true, RECAPTCHA_SECRET: 's' }).canActivate(
        contexto({ 'x-recaptcha-token': 'bueno' }),
      ),
    ).resolves.toBe(true);
  });

  it('C5: activado SIN secreto, rechaza — no pasa por defecto', async () => {
    // Fallar cerrado. Un captcha sin secreto no puede verificar nada, y dejar pasar seria repetir el
    // defecto con otra forma.
    await expect(
      guard({ RECAPTCHA_ENABLED: true }).canActivate(contexto({ 'x-recaptcha-token': 'x' })),
    ).rejects.toThrow(ForbiddenException);
  });

  describe('casos de control', () => {
    it('AC-01: si Google no responde, NO se deja pasar', async () => {
      // Un fallo de red no puede convertirse en «adelante»: seria el mismo agujero, activado por
      // cualquiera que sepa provocar un timeout.
      global.fetch = jest.fn().mockRejectedValue(new Error('ETIMEDOUT')) as never;

      await expect(
        guard({ RECAPTCHA_ENABLED: true, RECAPTCHA_SECRET: 's' }).canActivate(
          contexto({ 'x-recaptcha-token': 'x' }),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('AC-02: el token tambien se acepta en el cuerpo, como antes', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValue({ ok: true, json: async () => ({ success: true }) }) as never;

      await expect(
        guard({ RECAPTCHA_ENABLED: true, RECAPTCHA_SECRET: 's' }).canActivate(
          contexto({}, { recaptchaToken: 'bueno' }),
        ),
      ).resolves.toBe(true);
    });
  });
});
