import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import { EmailService } from '../../../src/modules/notifications/email.service';
import { StructuredLogger } from '../../../src/common/observability';

describe('EmailService', () => {
  let service: EmailService;

  const mockLogger = {
    child: jest.fn().mockReturnThis(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  const mockMailer = {
    sendMail: jest.fn().mockResolvedValue(undefined),
  };

  // Mock simulates the real ConfigService behaviour:
  // returns the configured value for BASE_URL, falls back to defaultValue for unknown keys.
  const mockConfig = {
    get: jest.fn().mockImplementation((key: string, defaultValue?: string) => {
      if (key === 'BASE_URL') return 'http://test-base.localhost';
      return defaultValue;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: MailerService, useValue: mockMailer },
        { provide: ConfigService, useValue: mockConfig },
        { provide: StructuredLogger, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  // ─── URL construction ────────────────────────────────────────────────────

  describe('sendVerificationEmail', () => {
    it('should generate verification URL pointing to BASE_URL', async () => {
      await service.sendVerificationEmail('user@example.com', 'abc123');

      expect(mockMailer.sendMail).toHaveBeenCalledTimes(1);
      const sentArgs = mockMailer.sendMail.mock.calls[0][0];
      expect(sentArgs.context.url).toMatch(/^http:\/\/test-base\.localhost/);
      expect(sentArgs.context.url).toContain('/auth/verify-email?token=abc123');
      expect(sentArgs.context.url).not.toContain('client');
      expect(sentArgs.context.url).not.toContain('5175');
      expect(sentArgs.context.url).not.toContain('5173');
    });

    it('propaga el fallo del envío — PT-183 (H-032)', async () => {
      // **Este caso afirmaba lo contrario** («should not throw when mailerService fails»), y por eso el
      // defecto sobrevivió: había una prueba verde fijándolo en su sitio. Es la misma forma que el caso de
      // `BASE_URL` unas líneas más abajo, que exigía el valor de reserva `localhost:5174` hasta PT-089.
      //
      // Absorber el error aquí anulaba el reintento de la cola —el `catch` de
      // `notification-queue.worker.ts` era inalcanzable— y hacía que el reenvío de verificación respondiera
      // «revisa tu bandeja» sin haber enviado nada. Quién captura y por qué, en `H-032 § Corrección`.
      mockMailer.sendMail.mockRejectedValueOnce(new Error('SMTP unreachable'));
      await expect(service.sendVerificationEmail('user@example.com', 'tok')).rejects.toThrow(
        'SMTP unreachable',
      );
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should generate reset-password URL pointing to BASE_URL', async () => {
      await service.sendPasswordResetEmail('user@example.com', 'xyz789');

      expect(mockMailer.sendMail).toHaveBeenCalledTimes(1);
      const sentArgs = mockMailer.sendMail.mock.calls[0][0];
      expect(sentArgs.context.url).toMatch(/^http:\/\/test-base\.localhost/);
      expect(sentArgs.context.url).toContain('/auth/reset-password?token=xyz789');
      expect(sentArgs.context.url).not.toContain('client');
      expect(sentArgs.context.url).not.toContain('5175');
      expect(sentArgs.context.url).not.toContain('5173');
    });

    it('propaga el fallo del envío — PT-183 (H-032)', async () => {
      // Igual que el de verificación: afirmaba «no lanza». Quien decide qué hacer con el fallo es el
      // llamante, y en la recuperación de contraseña `auth.service` **sí lo captura** — para no convertir una
      // caída del SMTP en un oráculo de enumeración. Esa captura está ahí, razonada y escrita.
      mockMailer.sendMail.mockRejectedValueOnce(new Error('SMTP unreachable'));
      await expect(service.sendPasswordResetEmail('user@example.com', 'tok')).rejects.toThrow(
        'SMTP unreachable',
      );
    });
  });

  // ─── Fallback default ─────────────────────────────────────────────────────

  describe('BASE_URL configuration', () => {
    it('lee BASE_URL de ConfigService, sin valor de reserva propio (PT-089)', () => {
      // Antes este test exigia el valor de reserva `http://localhost:5174`, fijando en piedra
      // el defecto: un enlace de verificacion o de reset que solo funciona en la maquina de
      // quien desplego. La reserva vive ahora en `public-origins` y es un subdominio, nunca
      // un puerto suelto — cubierto por `public-origins.spec.ts`.
      expect(mockConfig.get).toHaveBeenCalledWith('BASE_URL');
    });

    it('los enlaces de correo NUNCA apuntan a un localhost con puerto (PT-089)', async () => {
      // Es el criterio que importa: lo que recibe el usuario en su bandeja de entrada.
      await service.sendVerificationEmail('u@test.local', 'tok-123');

      const enviado = JSON.stringify(mockMailer.sendMail.mock.calls);
      expect(enviado).not.toMatch(/localhost:\d+/);
    });
  });
});
