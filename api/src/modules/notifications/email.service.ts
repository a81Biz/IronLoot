import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { StructuredLogger, ChildLogger } from '../../common/observability';

@Injectable()
export class EmailService {
  private readonly log: ChildLogger;

  constructor(
    private readonly mailerService: MailerService,
    private readonly logger: StructuredLogger,
  ) {
    this.log = this.logger.child('EmailService');
  }

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const verificationUrl = `http://localhost:5173/auth/verify-email?token=${token}`;

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
      // Don't rethrow to avoid breaking registration flow?
      // Ideally should queue or retry. For now log error.
    }
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const resetUrl = `http://localhost:5173/auth/reset-password?token=${token}`;

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
    }
  }
}
