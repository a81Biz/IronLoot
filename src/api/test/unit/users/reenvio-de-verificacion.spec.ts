import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '@/modules/users/users.service';
import { PrismaService } from '@/database/prisma.service';
import { StructuredLogger, RequestContextService, MetricsService } from '@/common/observability';
import { AuditPersistenceService } from '@/modules/audit/audit-persistence.service';
import { KycService } from '@/modules/kyc/kyc.service';
import { EmailService } from '@/modules/notifications/email.service';

/**
 * PT-182 (H-030) — **«Verification email sent» tenía que enviar el correo.**
 *
 * ## Qué había
 *
 * ```ts
 * // TODO: Send actual email when NotificationsModule is ready
 * // await this.emailService.sendVerificationEmail(user.email, emailVerificationToken);
 *
 * return { message: 'Verification email sent. Please check your inbox.' };
 * ```
 *
 * Devolvía que el correo se envió **sin enviar nada**, y `UsersService` no tenía ningún servicio de correo
 * inyectado: no podría haberlo enviado aunque quisiera.
 *
 * ## Por qué es ALTA
 *
 * Porque es **el camino de recuperación de una cuenta que no se puede activar**. El correo del registro sí
 * se envía —la suite QA lo comprueba de punta a punta—; esto es el **reintento**, y lo pide exactamente
 * quien no recibió el primero. A esa persona el sistema le respondía «revisa tu bandeja» y la dejaba
 * esperando **para siempre**, sin cuenta activa y sin vía alternativa.
 *
 * Y la condición del `TODO` —*«when NotificationsModule is ready»*— **ya se cumplía**:
 * `notifications/email.service.ts:24` tiene `sendVerificationEmail(to, token)` implementado y en uso.
 */
describe('El reenvio de verificacion envia de verdad — H-030 (PT-182)', () => {
  const usuario = {
    id: 'u1',
    email: 'alguien@test.local',
    emailVerified: false,
    emailVerificationToken: 'tok-123',
    state: 'ACTIVE',
  };

  const mockPrisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue(usuario),
      update: jest.fn().mockResolvedValue(usuario),
    },
  };
  const mockEmail = { sendVerificationEmail: jest.fn().mockResolvedValue(undefined) };

  let service: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.user.findUnique.mockResolvedValue(usuario);
    mockEmail.sendVerificationEmail.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: StructuredLogger,
          useValue: {
            child: jest.fn().mockReturnThis(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
          },
        },
        { provide: RequestContextService, useValue: { getTraceId: jest.fn() } },
        { provide: MetricsService, useValue: { increment: jest.fn(), recordHistogram: jest.fn() } },
        { provide: AuditPersistenceService, useValue: { recordAudit: jest.fn() } },
        { provide: KycService, useValue: { getStatus: jest.fn() } },
        { provide: EmailService, useValue: mockEmail },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  it('C1: se llama al servicio de correo con el destinatario y el token', async () => {
    // El defecto exacto: la llamada estaba comentada y la respuesta decia que si.
    await service.resendVerificationEmail('u1');

    expect(mockEmail.sendVerificationEmail).toHaveBeenCalledWith(usuario.email, expect.any(String));
  });

  it('C2: si el envio FALLA, no se responde exito', async () => {
    // Un `catch` que se coma el fallo reproduciria el defecto por otra via: el usuario volveria a leer
    // «revisa tu bandeja» sin que nada haya salido.
    mockEmail.sendVerificationEmail.mockRejectedValueOnce(new Error('smtp caido'));

    await expect(service.resendVerificationEmail('u1')).rejects.toThrow();
  });

  describe('casos de control', () => {
    it('AC-01: un correo ya verificado no reenvia nada', async () => {
      // El campo del esquema es `emailVerifiedAt` (`schema.prisma:75`), no `emailVerified`. Con el nombre
      // inventado el caso pasaba **por el motivo equivocado**: no reenviaba porque el servicio no veia la
      // verificacion, no porque la respetara.
      mockPrisma.user.findUnique.mockResolvedValue({ ...usuario, emailVerifiedAt: new Date() });

      await expect(service.resendVerificationEmail('u1')).rejects.toThrow();
      expect(mockEmail.sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('AC-02: un usuario que no existe no reenvia nada', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.resendVerificationEmail('nadie')).rejects.toThrow();
      expect(mockEmail.sendVerificationEmail).not.toHaveBeenCalled();
    });
  });
});
