import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { StructuredLogger, ChildLogger } from '../../common/observability';
import { baseOrigin } from '../../common/config/public-origins';

@Injectable()
export class EmailService {
  private readonly log: ChildLogger;
  private readonly frontendUrl: string;

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
    private readonly logger: StructuredLogger,
  ) {
    this.log = this.logger.child('EmailService');
    // PT-089 — Sin BASE_URL, esto apuntaba a `localhost:5174`: un enlace de verificacion
    // o de reset que solo funciona en la maquina de quien desplego. No falla al arrancar,
    // falla cuando el usuario ya recibio el correo.
    this.frontendUrl = baseOrigin(this.configService.get<string>('BASE_URL'));
  }

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const verificationUrl = `${this.frontendUrl}/auth/verify-email?token=${token}`;

    try {
      await this.mailerService.sendMail({
        to,
        subject: 'Verifica tu cuenta de Iron Loot',
        template: 'verification',
        context: {
          url: verificationUrl,
          username: to, // simplified for now
        },
      });
      this.log.info('Verification email sent', { to });
    } catch (error: any) {
      this.log.error('Failed to send verification email', { error: error.message, to } as any);
      // PT-183 (H-032) — **Este servicio no decide por sus llamantes.**
      //
      // Aquí había un `catch` que registraba y **no relanzaba**, con su propia duda escrita al lado:
      // *«Don't rethrow to avoid breaking registration flow?»*. La duda era buena; la respuesta, para todos
      // a la vez, no puede serlo — porque **la respuesta correcta es distinta en cada llamante**.
      //
      // Y absorbía dos mecanismos de recuperación completos:
      //
      //   - `resendVerificationEmail` respondía «revisa tu bandeja» con el envío fallado. Mismo síntoma que
      //     H-030, en otro fichero.
      //   - `notification-queue.worker.ts` tiene un `catch` que cuenta intentos y **relanza para que BullMQ
      //     reintente**. Era **inalcanzable**: un envío fallido marcaba el trabajo como completado. Familia
      //     de H-014/H-015/H-027 — *un mecanismo que no se ejecuta no avisa de nada*.
      //
      // Se propaga. El `log.error` de arriba se conserva: propagar no es dejar de dejar rastro.
      throw error;
    }
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const resetUrl = `${this.frontendUrl}/auth/reset-password?token=${token}`;

    try {
      await this.mailerService.sendMail({
        to,
        subject: 'Recuperar contraseña - Iron Loot',
        template: 'reset-password',
        context: {
          url: resetUrl,
          username: to,
        },
      });
      this.log.info('Password reset email sent', { to });
    } catch (error: any) {
      this.log.error('Failed to send password reset email', { error: error.message, to } as any);
      // PT-183 (H-032) — El mismo `catch` estaba duplicado aquí. Corregir sólo el de arriba habría dejado la
      // mitad del defecto en pie, y ésta es la otra vía de recuperación de una cuenta.
      throw error;
    }
  }
}
