import { readFileSync } from 'fs';
import { join } from 'path';
import { MAIL_TIMEOUTS_MS } from '@/modules/notifications/mail-timeouts';

/**
 * PT-183 (H-033) — **El transporte de correo declara sus topes.**
 *
 * Sin declararlos, nodemailer aplica los suyos: **dos minutos** para conectar. Medido en vivo parando Mailhog
 * y pidiendo el reenvío de verificación:
 *
 * ```
 * reenvio con SMTP caido      HTTP 500  {"message": "Connection timeout"}
 * real    2m1.490s
 * ```
 *
 * La espera era **preexistente** y estaba tapada por H-032: con el `catch` que se comía el error, los dos
 * minutos también pasaban, pero al final se respondía `200 «Verification email sent»` — así que nadie
 * relacionaba la lentitud con el correo. Corregir H-032 no creó la espera: **la hizo visible**.
 *
 * Los valores no se eligen a ojo: salen de lo que este sistema ya usa para esperar a un tercero — 5 000 ms en
 * `recaptcha.guard.ts`, 2 000 ms en la comprobación de Redis. Y se comprueban **en el módulo**, porque un
 * valor definido y no cableado no espera nada: es el defecto de RULE-17 en otra forma.
 */
describe('El transporte de correo declara sus topes — H-033 (PT-183)', () => {
  const MODULO = readFileSync(
    join(__dirname, '..', '..', '..', 'src', 'modules', 'notifications', 'notifications.module.ts'),
    'utf-8',
  );

  it('C1: los tres topes existen y ninguno llega al minuto', () => {
    // Dos minutos es el valor de fábrica que produjo el hallazgo. Cualquier tope que se le acerque
    // reproduciría el problema con otro número.
    for (const [nombre, ms] of Object.entries(MAIL_TIMEOUTS_MS)) {
      expect(typeof ms).toBe('number');
      expect(ms).toBeGreaterThan(0);
      expect(ms).toBeLessThan(60_000);
      expect(nombre).toMatch(/connection|greeting|socket/);
    }

    expect(Object.keys(MAIL_TIMEOUTS_MS).sort()).toEqual([
      'connectionTimeout',
      'greetingTimeout',
      'socketTimeout',
    ]);
  });

  it('C2: están CABLEADOS en el transporte, no sólo definidos', () => {
    // Un tope declarado en un fichero que nadie importa no espera nada. Es lo que hace que este caso mire el
    // módulo y no sólo la constante.
    expect(MODULO).toContain('MAIL_TIMEOUTS_MS');
    expect(MODULO).toMatch(/transport:\s*\{[\s\S]{0,400}MAIL_TIMEOUTS_MS/);
  });

  it('C3: el tope de sesión no es menor que el de conexión', () => {
    // Un `socketTimeout` por debajo del de conexión cortaría envíos que iban bien: el defecto contrario, y
    // más difícil de ver porque sólo aparece con un servidor lento.
    expect(MAIL_TIMEOUTS_MS.socketTimeout).toBeGreaterThanOrEqual(
      MAIL_TIMEOUTS_MS.connectionTimeout,
    );
  });

  describe('casos de control', () => {
    it('AC-01: el resto del transporte sigue en pie', () => {
      // El arreglo añade topes; no toca cómo se conecta. Si esto se rompiera, el correo dejaría de salir y el
      // caso lo diría en vez de dejarlo a la prueba en vivo.
      expect(MODULO).toContain("host: config.get('MAIL_HOST')");
      expect(MODULO).toContain("port: config.get('MAIL_PORT')");
    });

    it('AC-02: los valores son del orden de los que el sistema ya usa con terceros', () => {
      // 5 000 ms en `recaptcha.guard.ts`, 2 000 ms en la comprobación de Redis. Este caso ancla el criterio
      // para que nadie los suba «un poco» hasta volver a los dos minutos.
      expect(MAIL_TIMEOUTS_MS.connectionTimeout).toBeLessThanOrEqual(10_000);
    });
  });
});
