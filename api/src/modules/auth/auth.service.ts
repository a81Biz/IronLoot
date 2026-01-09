import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User, UserState } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import {
  StructuredLogger,
  ChildLogger,
  RequestContextService,
  MetricsService,
  InvalidCredentialsException,
  EmailAlreadyExistsException,
  UserNotFoundException,
  UserNotVerifiedException,
  UserSuspendedException,
  UserBannedException,
  TokenExpiredException,
  TokenInvalidException,
  ValidationException,
  AuditEventType,
  EntityType,
  AuditResult,
} from '../../common/observability';
import { AuditPersistenceService } from '../audit/audit-persistence.service';
import { EmailService } from '../notifications/email.service';
import { TwoFactorAuthService } from './two-factor-auth.service';
import {
  RegisterDto,
  LoginDto,
  AuthResponseDto,
  AuthTokensResponseDto,
  UserResponseDto,
} from './dto';
import { Prisma } from '@prisma/client';
import { JwtPayload, AuthenticatedUser } from './decorators';

/**
 * AuthService
 *
 * Handles all authentication operations:
 * - User registration
 * - Login/Logout
 * - JWT token management
 * - Password reset
 * - Email verification
 */
@Injectable()
export class AuthService {
  private readonly log: ChildLogger;
  private readonly saltRounds = 12;
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;
  private readonly accessTokenExpirySeconds: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly jwtService: JwtService,
    private readonly logger: StructuredLogger,
    private readonly ctx: RequestContextService,
    private readonly metrics: MetricsService,
    private readonly audit: AuditPersistenceService,
    private readonly emailService: EmailService,
    private readonly twoFactorAuthService: TwoFactorAuthService,
  ) {
    // Initialize log AFTER logger is injected
    this.log = this.logger.child('AuthService');
    this.accessTokenExpiry = this.config.get<string>('JWT_ACCESS_EXPIRY', '15m');
    this.refreshTokenExpiry = this.config.get<string>('JWT_REFRESH_EXPIRY', '7d');
    this.accessTokenExpirySeconds = this.parseExpiryToSeconds(this.accessTokenExpiry);
  }

  // ===========================================
  // REGISTER
  // ===========================================

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const traceId = this.ctx.getTraceId();

    // Normalize inputs early to ensure checks and persistence use the same canonical form
    const email = (dto.email || '').trim().toLowerCase();
    const username = (dto.username || '').trim().toLowerCase();
    const displayName = dto.displayName ? dto.displayName.trim() : undefined;

    this.log.info('Attempting user registration', { email, username });

    // Check if email already exists (use findFirst for robustness)
    const existingEmail = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });

    this.log.debug('Existing email check', {
      email,
      found: !!existingEmail,
      existingId: existingEmail?.id,
    });

    if (existingEmail) {
      this.log.warn('Registration failed: email already exists', { email });
      this.metrics.increment('auth_register_failed', 1, { reason: 'email_exists' });
      throw new EmailAlreadyExistsException();
    }

    // Check if username already exists (use findFirst for robustness)
    const existingUsername = await this.prisma.user.findFirst({
      where: { username: { equals: username, mode: 'insensitive' } },
    });

    this.log.debug('Existing username check', {
      username,
      found: !!existingUsername,
      existingId: existingUsername?.id,
    });

    if (existingUsername) {
      this.log.warn('Registration failed: username already exists', { username });
      this.metrics.increment('auth_register_failed', 1, { reason: 'username_exists' });
      throw new ValidationException('Username already taken');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, this.saltRounds);

    // Generate email verification token
    const emailVerificationToken = this.generateSecureToken();
    const emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user (handle unique constraint at DB level as a fallback)
    // Extra DB-level check using raw SQL as an additional guard
    try {
      const rawCount: any = await this.prisma.$queryRaw`
        SELECT count(1) as cnt FROM "users" WHERE lower(email) = ${email}
      `;
      const cnt = rawCount && rawCount[0] ? parseInt(Object.values(rawCount[0])[0] as any, 10) : 0;
      if (cnt > 0) {
        this.log.warn('Registration failed: email already exists (raw-check)', {
          email,
          count: cnt,
        });
        this.metrics.increment('auth_register_failed', 1, { reason: 'email_exists' });
        throw new EmailAlreadyExistsException();
      }
    } catch (err) {
      // If raw query fails, continue and let the DB or Prisma handle uniqueness
      this.log.debug('Raw email existence check failed', { err: (err as any)?.message });
    }

    let user;
    try {
      this.log.debug('Creating user in DB', { email, username });

      user = await this.prisma.user.create({
        data: {
          email,
          username,
          passwordHash,
          displayName,
          state: UserState.PENDING_VERIFICATION,
          emailVerificationToken,
          emailVerificationExpiresAt,
        },
      });
    } catch (e) {
      // Log Prisma error details for debugging and instrumentation
      const err = e as any;
      this.log.error('Prisma create user error', {
        message: err?.message,
        code: (err as any)?.code,
        meta: (err as any)?.meta,
      } as any);

      // Prisma unique constraint error
      if ((err as Prisma.PrismaClientKnownRequestError)?.code === 'P2002') {
        const meta = err.meta || {};
        const target = meta.target || [];
        if (Array.isArray(target) && target.includes('email')) {
          this.log.warn('Registration failed: email already exists (db)', { email: dto.email });
          throw new EmailAlreadyExistsException();
        }
        if (Array.isArray(target) && target.includes('username')) {
          this.log.warn('Registration failed: username already exists (db)', {
            username: dto.username,
          });
          throw new ValidationException('Username already taken');
        }
      }

      // Re-throw unexpected errors
      throw e;
    }

    this.log.info('User registered successfully', { userId: user.id });
    this.log.debug('Created user record', { email: user.email, userId: user.id });
    this.metrics.increment('auth_register_success');

    // Audit event
    await this.audit.recordAudit(
      traceId,
      AuditEventType.USER_REGISTERED,
      EntityType.USER,
      user.id,
      AuditResult.SUCCESS,
      { actorUserId: user.id, payload: { email, username } },
    );

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Send verification email
    await this.emailService.sendVerificationEmail(user.email, emailVerificationToken);

    return {
      user: this.mapUserToResponse(user),
      tokens,
    };
  }

  // ===========================================
  // LOGIN
  // ===========================================

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string): Promise<AuthResponseDto> {
    const traceId = this.ctx.getTraceId();
    this.log.info('Login attempt', { email: dto.email });

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) {
      this.log.warn('Login failed: user not found', { email: dto.email });
      this.metrics.increment('auth_login_failed', 1, { reason: 'not_found' });
      throw new InvalidCredentialsException();
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isValidPassword) {
      this.log.warn('Login failed: invalid password', { userId: user.id });
      this.metrics.increment('auth_login_failed', 1, { reason: 'invalid_password' });

      await this.audit.recordAudit(
        traceId,
        AuditEventType.USER_LOGGED_IN,
        EntityType.USER,
        user.id,
        AuditResult.FAIL,
        { reasonCode: 'INVALID_PASSWORD' },
      );

      throw new InvalidCredentialsException();
    }

    // Check 2FA
    if (user.isTwoFactorEnabled) {
      if (!dto.twoFactorCode) {
        // We could throw a specific exception here that clients interpret as "Please ask for 2FA"
        // For now, simpler approach:
        throw new ValidationException('2FA code required');
      }

      const is2faValid = await this.twoFactorAuthService.validateToken(user.id, dto.twoFactorCode);
      if (!is2faValid) {
        this.log.warn('Login failed: invalid 2FA code', { userId: user.id });
        this.metrics.increment('auth_login_failed', 1, { reason: 'invalid_2fa' });
        throw new InvalidCredentialsException();
      }
    }

    // Check user state
    this.validateUserState(user);

    // Update context with user
    this.ctx.setUser(user.id, user.state);

    this.log.info('User logged in successfully', { userId: user.id });
    this.metrics.increment('auth_login_success');

    // Audit event
    await this.audit.recordAudit(
      traceId,
      AuditEventType.USER_LOGGED_IN,
      EntityType.USER,
      user.id,
      AuditResult.SUCCESS,
      { actorUserId: user.id },
    );

    // Generate tokens and create session
    const tokens = await this.generateTokens(user, ipAddress, userAgent);

    return {
      user: this.mapUserToResponse(user),
      tokens,
    };
  }

  // ===========================================
  // REFRESH TOKEN
  // ===========================================

  async refreshToken(refreshToken: string): Promise<AuthTokensResponseDto> {
    this.ctx.getTraceId();
    this.log.debug('Refreshing token');

    // Find session
    const session = await this.prisma.session.findUnique({
      where: { refreshToken },
      include: {
        user: {
          include: { profile: true },
        },
      },
    });

    if (!session) {
      this.log.warn('Refresh failed: session not found');
      this.metrics.increment('auth_refresh_failed', 1, { reason: 'session_not_found' });
      throw new TokenInvalidException();
    }

    // Check if session is revoked
    if (session.revokedAt) {
      this.log.warn('Refresh failed: session revoked', { sessionId: session.id });
      this.metrics.increment('auth_refresh_failed', 1, { reason: 'session_revoked' });
      throw new TokenInvalidException();
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      this.log.warn('Refresh failed: session expired', { sessionId: session.id });
      this.metrics.increment('auth_refresh_failed', 1, { reason: 'session_expired' });
      throw new TokenExpiredException();
    }

    // Check user state
    this.validateUserState(session.user);

    // Update session last used
    await this.prisma.session.update({
      where: { id: session.id },
      data: { lastUsedAt: new Date() },
    });

    // Generate new access token (keep same refresh token)
    // Map from session.user (which now includes profile)
    const uDto = this.mapUserToResponse(session.user as any); // Cast because session.user type might be inferred strictly

    const payload: JwtPayload = {
      sub: session.user.id,
      email: session.user.email,
      username: session.user.username,
      state: session.user.state,
      displayName: uDto.displayName,
      avatarUrl: uDto.avatarUrl,
      isSeller: uDto.isSeller,
      emailVerified: uDto.emailVerified,
      profile: uDto.profile,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.accessTokenExpiry,
    });

    this.log.debug('Token refreshed successfully', { userId: session.user.id });
    this.metrics.increment('auth_refresh_success');

    return {
      accessToken,
      refreshToken: session.refreshToken,
      expiresIn: this.accessTokenExpirySeconds,
    };
  }

  // ===========================================
  // LOGOUT
  // ===========================================

  async logout(userId: string, refreshToken?: string): Promise<void> {
    const traceId = this.ctx.getTraceId();
    this.log.info('User logging out', { userId });

    if (refreshToken) {
      // Revoke specific session
      await this.prisma.session.updateMany({
        where: { userId, refreshToken },
        data: { revokedAt: new Date() },
      });
    } else {
      // Revoke all sessions
      await this.prisma.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    this.log.info('User logged out successfully', { userId });
    this.metrics.increment('auth_logout_success');

    await this.audit.recordAudit(
      traceId,
      AuditEventType.USER_LOGGED_OUT,
      EntityType.USER,
      userId,
      AuditResult.SUCCESS,
      { actorUserId: userId },
    );
  }

  // ===========================================
  // VERIFY EMAIL
  // ===========================================

  async verifyEmail(token: string): Promise<UserResponseDto> {
    const traceId = this.ctx.getTraceId();
    this.log.info('Verifying email');

    const user = await this.prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpiresAt: { gt: new Date() },
      },
    });

    if (!user) {
      this.log.warn('Email verification failed: invalid or expired token');
      this.metrics.increment('auth_verify_email_failed', 1, { reason: 'invalid_token' });
      throw new TokenInvalidException();
    }

    // Update user
    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        state: UserState.ACTIVE,
        emailVerifiedAt: new Date(),
        emailVerificationToken: null,
        emailVerificationExpiresAt: null,
      },
    });

    this.log.info('Email verified successfully', { userId: user.id });
    this.metrics.increment('auth_verify_email_success');

    await this.audit.recordAudit(
      traceId,
      AuditEventType.USER_VERIFIED,
      EntityType.USER,
      user.id,
      AuditResult.SUCCESS,
      { actorUserId: user.id },
    );

    return this.mapUserToResponse(updatedUser);
  }

  // ===========================================
  // FORGOT PASSWORD
  // ===========================================

  async forgotPassword(email: string): Promise<void> {
    const traceId = this.ctx.getTraceId();
    this.log.info('Password reset requested', { email });

    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      this.log.debug('Password reset: user not found (silent)', { email });
      return;
    }

    // Generate reset token
    const resetToken = this.generateSecureToken();
    const resetExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpiresAt: resetExpiresAt,
      },
    });

    this.log.info('Password reset token generated', { userId: user.id });
    this.metrics.increment('auth_forgot_password_success');

    await this.audit.recordAudit(
      traceId,
      AuditEventType.USER_PASSWORD_RESET,
      EntityType.USER,
      user.id,
      AuditResult.SUCCESS,
      { actorUserId: user.id },
    );

    // Send password reset email
    await this.emailService.sendPasswordResetEmail(user.email, resetToken);
  }

  // ===========================================
  // RESET PASSWORD
  // ===========================================

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const traceId = this.ctx.getTraceId();
    this.log.info('Resetting password');

    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpiresAt: { gt: new Date() },
      },
    });

    if (!user) {
      this.log.warn('Password reset failed: invalid or expired token');
      this.metrics.increment('auth_reset_password_failed', 1, { reason: 'invalid_token' });
      throw new TokenInvalidException();
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, this.saltRounds);

    // Update user and revoke all sessions
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          passwordResetToken: null,
          passwordResetExpiresAt: null,
        },
      }),
      this.prisma.session.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    this.log.info('Password reset successfully', { userId: user.id });
    this.metrics.increment('auth_reset_password_success');

    await this.audit.recordAudit(
      traceId,
      AuditEventType.USER_PASSWORD_CHANGED,
      EntityType.USER,
      user.id,
      AuditResult.SUCCESS,
      { actorUserId: user.id },
    );
  }

  // ===========================================
  // CHANGE PASSWORD
  // ===========================================

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const traceId = this.ctx.getTraceId();
    this.log.info('Changing password', { userId });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UserNotFoundException(userId);
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValidPassword) {
      this.log.warn('Password change failed: invalid current password', { userId });
      this.metrics.increment('auth_change_password_failed', 1, { reason: 'invalid_password' });
      throw new InvalidCredentialsException();
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, this.saltRounds);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    this.log.info('Password changed successfully', { userId });
    this.metrics.increment('auth_change_password_success');

    await this.audit.recordAudit(
      traceId,
      AuditEventType.USER_PASSWORD_CHANGED,
      EntityType.USER,
      userId,
      AuditResult.SUCCESS,
      { actorUserId: userId },
    );
  }

  // ===========================================
  // VALIDATE USER (for JWT Strategy)
  // ===========================================

  async validateUser(payload: JwtPayload): Promise<AuthenticatedUser | null> {
    // We could just return payload if we want to be purely stateless/trusting the token
    // But usually we want to verify user still exists/isn't banned.
    // Let's broaden the select to include roles/profile if we are fetching from DB.
    // OR we can merge payload info?
    // For now, let's fetch the data to ensure "freshness" on every request if adhering to validateUser pattern,
    // although "User requested to use JWT data".
    // "en lugar de usar el api /api/v1/users/me usemos la info de jwt" -> This refers to the frontend not calling the endpoint.
    // The backend `req.user` should be populated.

    // If we want req.user to have all fields from the DB to be super fresh:
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { profile: true },
    });

    if (!user || user.state === UserState.BANNED) {
      return null;
    }

    // Map to AuthenticatedUser
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      state: user.state,
      displayName: user.displayName || undefined,
      avatarUrl: user.avatarUrl || undefined,
      isSeller: user.isSeller,
      emailVerified: !!user.emailVerifiedAt,
      profile: user.profile
        ? {
            phone: user.profile.phone || undefined,
            address: user.profile.address || undefined,
            city: user.profile.city || undefined,
            country: user.profile.country || undefined,
            postalCode: user.profile.postalCode || undefined,
            legalName: (user.profile as any).legalName || undefined,
          }
        : undefined,
    };
  }

  // ===========================================
  // GET CURRENT USER
  // ===========================================

  async getMe(userId: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      throw new UserNotFoundException(userId);
    }

    return this.mapUserToResponse(user);
  }

  // ===========================================
  // HELPERS
  // ===========================================

  private async generateTokens(
    user: User,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthTokensResponseDto> {
    // Helper to map
    const dto = this.mapUserToResponse(user);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      state: user.state,
      displayName: dto.displayName,
      avatarUrl: dto.avatarUrl,
      isSeller: dto.isSeller,
      emailVerified: dto.emailVerified,
      profile: dto.profile,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.accessTokenExpiry,
    });

    const refreshToken = this.generateSecureToken();
    const refreshExpiresAt = new Date(
      Date.now() + this.parseExpiryToSeconds(this.refreshTokenExpiry) * 1000,
    );

    // Create session
    await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt: refreshExpiresAt,
        ipAddress,
        userAgent,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessTokenExpirySeconds,
    };
  }

  private validateUserState(user: User): void {
    switch (user.state) {
      case UserState.PENDING_VERIFICATION:
        throw new UserNotVerifiedException(user.id);
      case UserState.SUSPENDED:
        throw new UserSuspendedException(user.id, user.suspendedReason || undefined);
      case UserState.BANNED:
        throw new UserBannedException(user.id, user.bannedReason || undefined);
    }
  }

  private generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private parseExpiryToSeconds(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 3600; // default 1 hour

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 60 * 60 * 24;
      default:
        return 3600;
    }
  }

  private mapUserToResponse(
    user: User & {
      profile?: {
        phone: string | null;
        address: string | null;
        city: string | null;
        country: string | null;
        postalCode: string | null;
      } | null;
    },
  ): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName || undefined,
      avatarUrl: user.avatarUrl || undefined,
      state: user.state,
      emailVerified: !!user.emailVerifiedAt,
      isSeller: user.isSeller,
      createdAt: user.createdAt,
      profile: user.profile
        ? {
            phone: user.profile.phone || undefined,
            address: user.profile.address || undefined,
            city: user.profile.city || undefined,
            country: user.profile.country || undefined,
            postalCode: user.profile.postalCode || undefined,
            legalName: (user.profile as any).legalName || undefined,
          }
        : undefined,
    };
  }
}
