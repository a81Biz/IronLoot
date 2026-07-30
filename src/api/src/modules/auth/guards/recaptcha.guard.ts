import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Endpoint de verificación de Google. */
const SITEVERIFY = 'https://www.google.com/recaptcha/api/siteverify';

/** Tope para la llamada a Google. Un registro no puede quedarse colgado esperando a un tercero. */
const TIMEOUT_MS = 5000;

@Injectable()
export class RecaptchaGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  /**
   * PT-182 (H-029) — **Este guard falla cerrado.**
   *
   * ## Qué hacía
   *
   * ```ts
   * if (!token) throw new ForbiddenException('CAPTCHA token required');
   * // TODO: Verify token with Google API
   * return true; // Mock success for now
   * ```
   *
   * Comprobaba que el token **existiera**, no que fuese **válido**. Con `RECAPTCHA_ENABLED=true`, la
   * cadena `"x"` pasaba igual que un token legítimo de Google. Y esto protege **`POST /auth/register`**.
   *
   * No había exposición mientras la variable estuviera en `false` —su valor por defecto—, y ahí estaba
   * justamente el peligro: **el día que alguien la encendiera, creería tener protección contra bots y no
   * la tendría.** Es la familia de H-004, la validación del método de pago comentada en el retiro: *un
   * control que aparenta proteger y no protege es peor que no tenerlo*, porque sustituye la desconfianza
   * por confianza infundada.
   *
   * ## Todas las salidas son «no pasa», salvo una
   *
   * Es el principio de **RULE-17**: un valor que convierte «mal configurado» en «configurado hacia ninguna
   * parte» es exactamente lo que esa regla nació para impedir.
   *
   *   - desactivado            → pasa (no hay captcha que verificar)
   *   - activado, sin token    → **no pasa**
   *   - activado, sin secreto  → **no pasa** — no se puede verificar nada
   *   - Google dice `false`    → **no pasa**
   *   - Google no responde     → **no pasa** — un timeout no puede ser una puerta
   *   - Google dice `true`     → pasa
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isEnabled = this.configService.get<boolean>('RECAPTCHA_ENABLED', false);
    if (!isEnabled) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = request.headers['x-recaptcha-token'] || request.body?.recaptchaToken;

    if (!token) {
      throw new ForbiddenException('CAPTCHA token required');
    }

    const secret = this.configService.get<string>('RECAPTCHA_SECRET');
    if (!secret) {
      // Activado sin secreto es la configuración a medias que producía el agujero. Se rechaza en vez de
      // dejar pasar: quien encienda el captcha tiene que terminar de encenderlo.
      throw new ForbiddenException(
        'CAPTCHA verification unavailable: RECAPTCHA_ENABLED is on but RECAPTCHA_SECRET is not set',
      );
    }

    if (!(await this.verificarConGoogle(secret, String(token)))) {
      throw new ForbiddenException('CAPTCHA verification failed');
    }

    return true;
  }

  /**
   * Pregunta a Google. Devuelve `false` ante cualquier duda.
   *
   * **Un fallo de red no puede convertirse en «adelante»**: sería el mismo agujero, accionable por
   * cualquiera que sepa provocar un timeout.
   */
  private async verificarConGoogle(secret: string, token: string): Promise<boolean> {
    const controlador = new AbortController();
    const reloj = setTimeout(() => controlador.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(SITEVERIFY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ secret, response: token }).toString(),
        signal: controlador.signal,
      });

      if (!res.ok) return false;

      const datos = (await res.json()) as { success?: boolean };
      return datos.success === true;
    } catch {
      // No se registra con el logger porque este guard no lo tiene inyectado y añadirlo cambiaría su
      // firma en todos los llamantes. El rechazo llega al cliente como 403 y queda en `request_logs`
      // con su `traceId`, así que **no es un silencio**: hay rastro de que la verificación no pasó.
      return false;
    } finally {
      clearTimeout(reloj);
    }
  }
}
