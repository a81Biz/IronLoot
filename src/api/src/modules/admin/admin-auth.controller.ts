import { Controller, Post, Body, UnauthorizedException, HttpCode, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../auth/decorators';
import { authenticator } from 'otplib';
import { AuditPersistenceService } from '../audit/audit-persistence.service';
import { AuditEventType, EntityType, AuditResult } from '../../common/observability';
import { randomUUID } from 'crypto';

@ApiTags('admin')
@Controller('admin/auth')
@Public()
@SkipThrottle()
export class AdminAuthController {
  private readonly logger = new Logger(AdminAuthController.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditPersistenceService,
  ) {}

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Admin login — validates credentials + optional TOTP, returns JWT' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['username', 'password'],
      properties: {
        username: { type: 'string' },
        password: { type: 'string' },
        totp: { type: 'string', description: 'TOTP code (required if ADMIN_TOTP_SECRET is set)' },
      },
    },
  })
  async login(
    @Body() body: { username: string; password: string; totp?: string },
  ): Promise<{ access_token: string; expires_in: number }> {
    const expectedUser = this.config.get<string>('ADMIN_USERNAME', 'admin');
    const expectedPass = this.config.get<string>('ADMIN_PASSWORD', 'admin');
    const totpSecret = this.config.get<string>('ADMIN_TOTP_SECRET', '');
    const traceId = randomUUID();

    if (body.username !== expectedUser || body.password !== expectedPass) {
      this.logger.warn(`Admin login failed for user: ${body.username}`);
      await this.audit
        .recordAudit(
          traceId,
          AuditEventType.ADMIN_LOGIN_FAILED,
          EntityType.SESSION,
          `admin:${body.username}`,
          AuditResult.FAIL,
          {
            payload: { reason: 'invalid_credentials', username: body.username },
          },
        )
        .catch(() => null);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (totpSecret) {
      if (!body.totp) {
        throw new UnauthorizedException('TOTP code required');
      }
      const isValid = authenticator.verify({ token: body.totp, secret: totpSecret });
      if (!isValid) {
        this.logger.warn(`Admin TOTP failed for user: ${body.username}`);
        await this.audit
          .recordAudit(
            traceId,
            AuditEventType.ADMIN_LOGIN_FAILED,
            EntityType.SESSION,
            `admin:${body.username}`,
            AuditResult.FAIL,
            {
              payload: { reason: 'invalid_totp', username: body.username },
            },
          )
          .catch(() => null);
        throw new UnauthorizedException('Invalid TOTP code');
      }
    }

    const expiresIn = 8 * 60 * 60; // 8 hours in seconds
    const token = this.jwtService.sign(
      {
        sub: `admin:${body.username}`,
        username: body.username,
        role: 'admin',
        type: 'admin-session',
      },
      { expiresIn },
    );

    this.logger.log(`Admin login successful: ${body.username}`);
    await this.audit
      .recordAudit(
        traceId,
        AuditEventType.ADMIN_LOGGED_IN,
        EntityType.SESSION,
        `admin:${body.username}`,
        AuditResult.SUCCESS,
        {
          payload: { username: body.username, mfa: !!totpSecret },
        },
      )
      .catch(() => null);

    return { access_token: token, expires_in: expiresIn };
  }
}
