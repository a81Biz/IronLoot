import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { StructuredLogger, ChildLogger } from '../../common/observability';

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
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
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
      // Don't rethrow to avoid breaking registration flow?
      // Ideally should queue or retry. For now log error.
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
    }
  }
}
