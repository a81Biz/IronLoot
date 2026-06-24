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

    it('should not throw when mailerService fails', async () => {
      mockMailer.sendMail.mockRejectedValueOnce(new Error('SMTP unreachable'));
      await expect(
        service.sendVerificationEmail('user@example.com', 'tok'),
      ).resolves.toBeUndefined();
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

    it('should not throw when mailerService fails', async () => {
      mockMailer.sendMail.mockRejectedValueOnce(new Error('SMTP unreachable'));
      await expect(
        service.sendPasswordResetEmail('user@example.com', 'tok'),
      ).resolves.toBeUndefined();
    });
  });

  // ─── Fallback default ─────────────────────────────────────────────────────

  describe('BASE_URL configuration', () => {
    it('should read BASE_URL from ConfigService with correct default fallback', () => {
      // Verifies the exact contract: key = 'BASE_URL', fallback = 'http://localhost:5174'
      expect(mockConfig.get).toHaveBeenCalledWith('BASE_URL', 'http://localhost:5174');
    });
  });
});
