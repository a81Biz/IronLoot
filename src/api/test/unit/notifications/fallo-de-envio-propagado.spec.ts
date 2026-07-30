import { Test, TestingModule } from '@nestjs/testing';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '@/modules/notifications/email.service';
import { StructuredLogger } from '@/common/observability';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * PT-183 (H-032) — **Un fallo de envío tiene que llegar a quien llamó.**
 *
 * `EmailService` capturaba cualquier error dentro y no lo relanzaba, con este comentario:
 *
 * ```ts
 * // Don't rethrow to avoid breaking registration flow?
 * // Ideally should queue or retry. For now log error.
 * ```
 *
 * Hay `log.error`, así que no era un silencio. Pero el flujo continuaba como si el correo hubiera salido, y
 * eso rompía dos cosas:
 *
 * 1. **El reenvío de verificación respondía «revisa tu bandeja»** con el envío fallado — el mismo síntoma de
 *    H-030 por otra vía, en otro fichero.
 * 2. **El reintento de la cola no podía ocurrir nunca.** `notification-queue.worker.ts` tiene un `catch` que
 *    cuenta intentos y **relanza para que BullMQ reintente**; ese `catch` era inalcanzable porque lo que
 *    llamaba por debajo no lanzaba. Un envío fallido marcaba el trabajo como **completado**. Es la familia de
 *    H-014/H-015/H-027: *un mecanismo que no se ejecuta no avisa de nada* — y aquí había tres capas de
 *    recuperación anuladas por la de abajo.
 *
 * La regla que sale: **el servicio de correo no decide por sus llamantes.** Propaga, y cada llamante declara
 * qué hace con el fallo, porque la respuesta correcta es distinta en cada uno (ver H-032 § Corrección).
 */
describe('EmailService propaga el fallo de envío — H-032 (PT-183)', () => {
  let service: EmailService;
  const mailer = { sendMail: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const modulo: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: MailerService, useValue: mailer },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('http://base.ironloot.local') },
        },
        {
          provide: StructuredLogger,
          useValue: {
            child: jest
              .fn()
              .mockReturnValue({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }),
          },
        },
      ],
    }).compile();

    service = modulo.get(EmailService);
  });

  it('C1: si el envío de verificación falla, la excepción SALE', async () => {
    // Era el defecto. El `catch` de dentro la absorbía y el llamante veía una promesa resuelta.
    mailer.sendMail.mockRejectedValue(new Error('SMTP 421 service not available'));

    await expect(service.sendVerificationEmail('a@b.test', 'tok')).rejects.toThrow(
      'SMTP 421 service not available',
    );
  });

  it('C2: si el envío de recuperación falla, la excepción SALE', async () => {
    // El mismo `catch` estaba duplicado en el segundo método. Corregir sólo uno habría dejado la mitad.
    mailer.sendMail.mockRejectedValue(new Error('SMTP 550 mailbox unavailable'));

    await expect(service.sendPasswordResetEmail('a@b.test', 'tok')).rejects.toThrow(
      'SMTP 550 mailbox unavailable',
    );
  });

  it('C3: el error se registra ANTES de propagarse — no se cambia rastro por excepción', async () => {
    // El `log.error` que ya existía era la única cosa correcta del bloque original. Se conserva: propagar no
    // significa dejar de dejar rastro, y el `to` es lo que permite saber a quién no le llegó.
    const registrado: unknown[] = [];
    const logger = {
      child: jest.fn().mockReturnValue({
        info: jest.fn(),
        warn: jest.fn(),
        error: (...args: unknown[]) => registrado.push(args),
      }),
    };

    const modulo = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: MailerService, useValue: mailer },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('http://x') } },
        { provide: StructuredLogger, useValue: logger },
      ],
    }).compile();

    mailer.sendMail.mockRejectedValue(new Error('boom'));

    await expect(
      modulo.get(EmailService).sendVerificationEmail('quien@no.recibio', 'tok'),
    ).rejects.toThrow('boom');

    expect(registrado).toHaveLength(1);
    expect(JSON.stringify(registrado[0])).toContain('quien@no.recibio');
  });

  describe('casos de control', () => {
    it('AC-01: un envío que funciona sigue resolviendo sin ruido', async () => {
      mailer.sendMail.mockResolvedValue(undefined);

      await expect(service.sendVerificationEmail('a@b.test', 'tok')).resolves.toBeUndefined();
      expect(mailer.sendMail).toHaveBeenCalledTimes(1);
    });

    it('AC-02: el enlace sigue construyéndose desde BASE_URL, no desde un localhost', async () => {
      // PT-089 dejó esto medido: sin `BASE_URL` el enlace apuntaba a `localhost:5174` y sólo funcionaba en la
      // máquina de quien desplegó. Se comprueba aquí porque este PT toca el mismo método.
      mailer.sendMail.mockResolvedValue(undefined);

      await service.sendVerificationEmail('a@b.test', 'tok-123');

      const enviado = mailer.sendMail.mock.calls[0][0];
      expect(enviado.context.url).toBe(
        'http://base.ironloot.local/auth/verify-email?token=tok-123',
      );
    });
  });
});

/**
 * La otra mitad de H-032: **quien captura, lo declara.** Propagar desde el servicio sólo es correcto si los
 * dos llamantes que deben absorber el fallo lo siguen absorbiendo — el registro (la cuenta ya existe) y la
 * recuperación de contraseña (la respuesta es opaca a propósito). Si alguien retirara esas capturas, un SMTP
 * caído tumbaría registros y abriría un oráculo de enumeración, que es peor que el defecto que se corrigió.
 *
 * Se comprueba leyendo el fichero porque es una decisión estructural, no un comportamiento de una llamada: lo
 * que hay que impedir es que la captura desaparezca, y con ella su motivo.
 */
describe('Las dos capturas razonadas siguen en pie — H-032 (PT-183)', () => {
  const AUTH = readFileSync(
    join(__dirname, '..', '..', '..', 'src', 'modules', 'auth', 'auth.service.ts'),
    'utf-8',
  );

  /**
   * Devuelve el bloque `try { ... } catch (...) { ... }` que **envuelve inmediatamente** a la llamada, junto
   * con las líneas de comentario que lo preceden —ahí vive el motivo—. `null` si la llamada no está dentro de
   * ninguna captura.
   *
   * Se acota así, y no por una ventana de caracteres alrededor, porque **las dos primeras versiones de estos
   * casos no sabían fallar**:
   *
   *   1. La primera recortaba 1200 caracteres a cada lado, y dentro caían otras menciones a «H-032»: quitar
   *      la captura dejaba el caso en verde.
   *   2. La segunda buscaba el `try {` anterior con `lastIndexOf` **sin comprobar que fuera el que envuelve**.
   *      Al sabotear el `try` del registro, encontraba uno anterior ya cerrado y el recorte seguía
   *      conteniendo la llamada: verde otra vez.
   *
   * De ahí las dos condiciones de abajo. Se vio fallar por el motivo correcto antes de darlo por bueno — es
   * la misma lección que C7 de `liberacion-de-liquidacion` y que H-031: *una guarda que nadie ha visto fallar
   * no es una guarda*.
   */
  function bloqueTryQueEnvuelve(fuente: string, llamada: string): string | null {
    const i = fuente.indexOf(llamada);
    if (i < 0) return null;

    let abre = fuente.lastIndexOf('try {', i);
    if (abre < 0) return null;

    // (1) Entre ese `try {` y la llamada no puede haber un `catch` ni un cierre a la indentación del cuerpo
    //     del método: si lo hay, el `try` encontrado está cerrado y **no envuelve** a la llamada.
    const entre = fuente.slice(abre + 'try {'.length, i);
    if (/catch|\n {4}\}/.test(entre)) return null;

    // (2) Y justo después de la llamada tiene que venir el cierre con su `catch`.
    if (!/\n\s*\}\s*catch/.test(fuente.slice(i, i + 600))) return null;

    // El motivo de una captura se escribe **encima** del `try`, no dentro. Así que el bloque incluye las
    // líneas de comentario contiguas que la preceden: es donde vive la mitad que estos casos exigen.
    const lineas = fuente.slice(0, abre).split('\n');
    let n = lineas.length - 1;
    while (n > 0 && lineas[n - 1].trim().startsWith('//')) n--;
    abre -= lineas.slice(n, lineas.length - 1).join('\n').length + (n < lineas.length - 1 ? 1 : 0);

    const cierra = fuente.indexOf('\n    }', fuente.indexOf('catch', i));
    if (cierra < 0) return null;

    return fuente.slice(abre, cierra);
  }

  it('C4: el registro captura el fallo del correo y NO tumba la cuenta ya creada', () => {
    const bloque = bloqueTryQueEnvuelve(AUTH, 'sendVerificationEmail(user.email');

    expect(bloque).not.toBeNull();
    expect(bloque).toMatch(/catch/);
    // El motivo tiene que estar escrito DENTRO del bloque: una captura sin razon es indistinguible del
    // defecto que este PT corrige.
    expect(bloque).toContain('H-032');
    expect(bloque).toMatch(/resend|reenv/i);
    // Y tiene que dejar rastro. Capturar en silencio seria cambiar un defecto por otro.
    expect(bloque).toMatch(/this\.log\.error/);
  });

  it('C5: la recuperacion de contrasena captura, y su motivo es la opacidad de la respuesta', () => {
    const bloque = bloqueTryQueEnvuelve(AUTH, 'sendPasswordResetEmail(user.email');

    expect(bloque).not.toBeNull();
    expect(bloque).toMatch(/catch/);
    expect(bloque).toContain('H-032');
    expect(bloque).toMatch(/enumeraci|opac/i);
    expect(bloque).toMatch(/this\.log\.error/);
  });

  it('C6: el worker de la cola relanza en el camino del CORREO, no en otro', () => {
    const worker = readFileSync(
      join(
        __dirname,
        '..',
        '..',
        '..',
        'src',
        'modules',
        'notifications',
        'notification-queue.worker.ts',
      ),
      'utf-8',
    );

    // Se acota a `processEmail`. La primera version buscaba `catch ... throw err` en todo el fichero y pasaba
    // por el `catch` de `processCampaignInApp`: quitar el del correo la dejaba verde. Mismo error que en C4.
    const desde = worker.indexOf('private async processEmail');
    const hasta = worker.indexOf('private async processCampaignInApp');

    expect(desde).toBeGreaterThan(-1);
    expect(hasta).toBeGreaterThan(desde);

    const processEmail = worker.slice(desde, hasta);

    // Su `catch` era inalcanzable mientras el servicio absorbia el error. Ahora se alcanza, y tiene que
    // seguir relanzando: es lo que hace que BullMQ reintente.
    expect(processEmail).toMatch(/catch[\s\S]{0,300}throw err/);
  });
});
