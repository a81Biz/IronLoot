import { readFileSync } from 'fs';
import { join } from 'path';
import { raizDelMonorepo } from '../../../scripts/raiz-monorepo';

/**
 * PT-191 (AUD-027) — **El correo se configura por un solo sitio, y ese sitio es el que el mailer lee.**
 *
 * ## Lo que había, y no era «dos rutas de configuración»
 *
 * El enunciado del hallazgo decía *«dos rutas de config SMTP»*, y eso sonaba a duplicación cosmética. Medido, era
 * otra cosa:
 *
 * - `SystemConfig` sembraba `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_FROM`.
 * - El panel de ADMIN tenía un **formulario completo** para editarlos, con su `POST /settings/smtp`, que
 *   guardaba y redirigía a `?saved=1`.
 * - **El mailer no leía ninguno.** `notifications.module.ts` construye el transporte con `MAIL_*` del entorno.
 *
 * Es decir: un administrador cambiaba el servidor de correo, veía «guardado», y **no pasaba absolutamente
 * nada** — ni entonces ni tras reiniciar. Es exactamente la familia de H-029 (el captcha que no verificaba) y
 * H-030 (el correo que decía «enviado» sin enviar): **un control que aparenta funcionar**.
 *
 * ## Por qué se retira el formulario en vez de cablearlo
 *
 * `ADR-011` dice que `SystemConfig` es «seed desde env, **override runtime** en Admin», y para claves como
 * `AUCTION_MIN_INCREMENT_AMOUNT` eso funciona: `bids.service` la lee **en cada puja**. El correo no puede: el
 * transporte de `MailerModule` se construye **una vez al arrancar**, así que un override no sería runtime — sería
 * «al próximo reinicio», y hasta entonces el panel seguiría mintiendo, sólo que más despacio.
 *
 * Se aplica el precedente de **ADR-047**: *un endpoint sin llamantes se retira, no se pule*. Aquí el llamante que
 * falta es el consumidor: nadie lee esas claves.
 *
 * **La alternativa está escrita porque es reversible**: si se quiere el override de verdad, hay que construir el
 * transporte por envío leyendo `SystemConfig`, y eso es un cambio de diseño, no una casilla más en un formulario.
 */
const RAIZ = raizDelMonorepo();
const SYSTEM_CONFIG = join(
  RAIZ,
  'src',
  'api',
  'src',
  'modules',
  'system-config',
  'system-config.service.ts',
);
const MODULO_CORREO = join(
  RAIZ,
  'src',
  'api',
  'src',
  'modules',
  'notifications',
  'notifications.module.ts',
);
const ADMIN_CONTROLLER = join(
  RAIZ,
  'src',
  'admin',
  'src',
  'modules',
  'configuration',
  'configuration.controller.ts',
);
const ADMIN_VISTA = join(RAIZ, 'src', 'admin', 'views', 'pages', 'settings.html');

/** Las claves que el mailer lee de verdad. */
const CONTRATO = ['MAIL_HOST', 'MAIL_PORT', 'MAIL_USER', 'MAIL_PASSWORD', 'MAIL_FROM'];

describe('El correo tiene una sola ruta de configuracion — AUD-027 (PT-191)', () => {
  it('C1: `SystemConfig` no siembra claves SMTP que nadie lee', () => {
    // Sembrarlas invita a editarlas, y editarlas no hace nada.
    const src = readFileSync(SYSTEM_CONFIG, 'utf-8');
    const sinComentarios = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .map((l) => l.replace(/\/\/.*$/, ''))
      .join('\n');

    expect(sinComentarios).not.toMatch(/key:\s*'SMTP_/);
  });

  it('C2: el panel de ADMIN no ofrece un formulario SMTP que no llega a ninguna parte', () => {
    const controlador = readFileSync(ADMIN_CONTROLLER, 'utf-8')
      .split('\n')
      .map((l) => l.replace(/\/\/.*$/, ''))
      .join('\n');
    const vista = readFileSync(ADMIN_VISTA, 'utf-8').replace(/<!--[\s\S]*?-->/g, '');

    expect(controlador).not.toContain('settings/smtp');
    expect(vista).not.toMatch(/name="SMTP_/);
  });

  it('C3: el transporte del mailer sigue leyendo el contrato real, `MAIL_*`', () => {
    // El arreglo retira una ruta muerta; **no** puede tocar la que funciona. Si esto se rompiera, el correo
    // dejaría de salir y la prueba lo diría en vez de dejarlo a una comprobación en vivo.
    const modulo = readFileSync(MODULO_CORREO, 'utf-8');

    for (const clave of CONTRATO) {
      expect(modulo).toContain(clave);
    }
  });

  describe('casos de control', () => {
    it('AC-01: `SystemConfig` conserva las claves que SI se leen en caliente', () => {
      // `AUCTION_MIN_INCREMENT_AMOUNT` la lee `bids.service` en cada puja: ahí el override de ADR-011 es real.
      // Este caso existe para que nadie «limpie» SystemConfig entero creyendo que todo es como el SMTP.
      const src = readFileSync(SYSTEM_CONFIG, 'utf-8');

      expect(src).toContain('AUCTION_MIN_INCREMENT_AMOUNT');
      expect(src).toContain('REQUIRE_EMAIL_VERIFICATION');
    });

    it('AC-02: el motivo queda escrito donde se retira, no solo aquí', () => {
      // Una retirada sin motivo escrito es indistinguible de un borrado por descuido, y el siguiente que pase
      // volverá a añadir el formulario.
      const src = readFileSync(SYSTEM_CONFIG, 'utf-8');

      expect(src).toMatch(/AUD-027/);
    });
  });
});
